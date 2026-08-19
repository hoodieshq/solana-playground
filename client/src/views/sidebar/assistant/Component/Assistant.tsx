import { useState } from "react";
import styled, { css } from "styled-components";

import Chat from "./Chat";
import Plan from "./Plan";

type Tab = "chat" | "plan";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "chat", label: "Chat" },
  { id: "plan", label: "What we're building" },
];

const Assistant = () => {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <Wrapper>
      <Tabs>
        {TABS.map(({ id, label }) => (
          <TabButton key={id} active={tab === id} onClick={() => setTab(id)}>
            {label}
          </TabButton>
        ))}
      </Tabs>

      {tab === "chat" ? <Chat /> : <Plan />}
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

const Tabs = styled.div`
  ${({ theme }) => css`
    display: flex;
    gap: 0.25rem;
    padding: 0 0.75rem;
    flex-shrink: 0;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const TabButton = styled.button<{ active: boolean }>`
  ${({ theme, active }) => css`
    padding: 0.5rem 0.625rem 0.4375rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid
      ${active ? theme.colors.default.primary : "transparent"};
    color: ${active
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font: inherit;
    font-size: ${theme.font.code.size.small};
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }
  `}
`;

export default Assistant;
