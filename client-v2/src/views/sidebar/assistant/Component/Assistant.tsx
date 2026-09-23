import { useEffect, useState } from "react";
import styled, { css } from "styled-components";

import Chat from "./Chat";
import Grounding from "./Grounding";
import { PgAssistant } from "../store";
import { PgBuildOutput } from "../bridge/build-output";
import { PgExplorer } from "../../../../utils";

type Tab = "chat" | "sources";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "chat", label: "Chat" },
  { id: "sources", label: "Sources" },
];

interface AssistantProps {
  /** Hides the pane; the host offers a way to bring it back */
  onCollapse?: () => void;
}

const Assistant = ({ onCollapse }: AssistantProps) => {
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

  // Ask the gateway what it serves and what those servers offer. Has to happen
  // here rather than only in the Sources tab: `createTools` reads the result,
  // so a model connected before this ran would be offered no MCP tool at all,
  // with nothing on screen to say why.
  useEffect(() => {
    PgAssistant.initMcp();
  }, []);

  // A prompt raised from another tab (a Sources tool call, say) lands in the
  // composer, which is no use while that other tab is still on screen
  useEffect(() => {
    return PgAssistant.onDidRequestPrompt(() => setTab("chat")).dispose;
  }, []);

  useEffect(() => {
    const a = PgExplorer.onDidOpenFile(() =>
      setCurrentFilePath(PgExplorer.currentFilePath)
    );
    const b = PgBuildOutput.onDidChange((out) => setBuildFailed(!!out?.failed));
    return () => {
      a.dispose();
      b.dispose();
    };
  }, []);

  const fileName = currentFilePath
    ? PgExplorer.getItemNameFromPath(currentFilePath)
    : null;
  // The cluster lives in the app header; only the build state is worth
  // repeating here.
  const statusLabel = buildFailed ? "build error" : null;

  return (
    <Wrapper>
      <Header>
        <HeaderTitle>Assistant</HeaderTitle>
        <HeaderMeta>
          {fileName && <HeaderChip>{fileName}</HeaderChip>}
          {statusLabel && <HeaderChip>{statusLabel}</HeaderChip>}
          {/* The backend, model, effort and key live behind this, and it is
              here whether or not anything is connected yet. Moving that form
              out of the way of the composer is right; leaving no way back to
              it is not, and for one build that is what this was. */}
          <SettingsButton
            type="button"
            aria-label="Backend, model and effort"
            title="Backend, model and effort"
            onClick={() => PgAssistant.pickBackend()}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
            </svg>
          </SettingsButton>
          {onCollapse && (
            <SettingsButton
              type="button"
              aria-label="Hide the assistant"
              title="Hide the assistant"
              onClick={onCollapse}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2.5" />
                <path d="M9 4v16" />
              </svg>
            </SettingsButton>
          )}
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
  /* A host may reserve room on the left for its own control (Flow's
     collapse handle sets --flow-handle-inset); elsewhere it is 0. */
  height: 2.75rem;
  padding: 0 0.5rem 0 0.875rem;
  flex-shrink: 0;
`;

/* Sentence case, 14px, semibold — the same voice as every other pane title.
   The tracked small caps made this pane look like a different app. */
const HeaderTitle = styled.span`
  ${({ theme }) => css`
    font-size: 0.875rem;
    font-weight: 500;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const HeaderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  overflow: hidden;
`;

const SettingsButton = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;

    & > svg {
      width: 0.875rem;
      height: 0.875rem;
    }

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }
  `}
`;

const HeaderChip = styled.span`
  ${({ theme }) => css`
    overflow: hidden;
    max-width: 8rem;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0.0625rem 0.4375rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 6px;
    font-size: 0.75rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Tabs = styled.div`
  ${({ theme }) => css`
    display: flex;
    gap: 0.25rem;
    padding: 0 0.75rem;
    flex-shrink: 0;
    /* Labels can still overflow the narrowest sidebar width */
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
