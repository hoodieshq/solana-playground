import { useEffect, useState } from "react";
import styled, { css } from "styled-components";

import Chat from "./Chat";
import Grounding from "./Grounding";
import Plan from "./Plan";
import { PgBuildOutput } from "../bridge/build-output";
import { PgConnection, PgExplorer } from "../../../../utils";

type Tab = "chat" | "sources" | "plan";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "chat", label: "Chat" },
  { id: "sources", label: "Sources" },
  { id: "plan", label: "What we're building" },
];

const Assistant = () => {
  const [tab, setTab] = useState<Tab>("chat");

  // Mirrors the two inputs `Chat.tsx`'s own CONTEXT row reads off
  // (`PgExplorer.currentFilePath`, `PgBuildOutput.latest?.failed`) so the
  // header chip can never claim something the chat context does not also
  // see -- kept live here rather than imported, since the header renders
  // above `Chat` and outlives a backend not being connected yet.
  const [currentFilePath, setCurrentFilePath] = useState(
    PgExplorer.currentFilePath
  );
  const [buildFailed, setBuildFailed] = useState(
    !!PgBuildOutput.latest?.failed
  );
  const [cluster, setCluster] = useState(PgConnection.cluster);

  useEffect(() => {
    const a = PgExplorer.onDidOpenFile(() =>
      setCurrentFilePath(PgExplorer.currentFilePath)
    );
    const b = PgBuildOutput.onDidChange((out) => setBuildFailed(!!out?.failed));
    const c = PgConnection.onDidChangeCluster(setCluster);
    return () => {
      a.dispose();
      b.dispose();
      c.dispose();
    };
  }, []);

  const fileName = currentFilePath
    ? PgExplorer.getItemNameFromPath(currentFilePath)
    : null;
  const statusLabel = buildFailed ? "build error" : cluster;

  return (
    <Wrapper>
      <Header>
        <HeaderEyebrow>Assistant</HeaderEyebrow>
        <HeaderMeta>
          {fileName && <HeaderChip>{fileName}</HeaderChip>}
          {statusLabel && <HeaderChip>{statusLabel}</HeaderChip>}
        </HeaderMeta>
      </Header>

      <Tabs role="tablist" aria-label="Assistant sections">
        {TABS.map(({ id, label }) => (
          <TabButton
            key={id}
            role="tab"
            aria-selected={tab === id}
            $active={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </TabButton>
        ))}
      </Tabs>

      {tab === "chat" && <Chat />}
      {tab === "sources" && <Grounding />}
      {tab === "plan" && <Plan />}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  /* Fill the sidebar whether it hands us a flex slot or a definite height */
  flex: 1;
  height: 100%;
  max-height: 100%;
  min-height: 0;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem 0.5rem;
  flex-shrink: 0;
`;

const HeaderEyebrow = styled.span`
  ${({ theme }) => css`
    font-size: ${theme.font.other.size.xsmall};
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const HeaderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  overflow: hidden;
`;

const HeaderChip = styled.span`
  ${({ theme }) => css`
    overflow: hidden;
    max-width: 8rem;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0.0625rem 0.4375rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.xsmall};
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Tabs = styled.div`
  ${({ theme }) => css`
    display: flex;
    gap: 0.25rem;
    padding: 0 0.75rem;
    flex-shrink: 0;
    /* Three labels overflow the narrowest sidebar width */
    overflow-x: auto;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const TabButton = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    padding: 0.4375rem 0.5625rem 0.375rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid
      ${$active ? theme.colors.default.primary : "transparent"};
    color: ${$active
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font: inherit;
    font-size: ${theme.font.code.size.xsmall};
    white-space: nowrap;
    cursor: pointer;
    transition: color ${theme.default.transition.duration.medium}
        ${theme.default.transition.type},
      border-color ${theme.default.transition.duration.medium}
        ${theme.default.transition.type};

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 1px solid ${theme.colors.default.primary};
      outline-offset: -1px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

export default Assistant;
