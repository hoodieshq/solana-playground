import type { FC } from "react";
import { useState } from "react";
import styled, { css } from "styled-components";

import ProjectsTab from "./ProjectsTab";
import Explorer from "../../sidebar/explorer/Component";

type Tab = "projects" | "files";

interface LeftPanelProps {
  onNewProject: () => void;
}

const LeftPanel: FC<LeftPanelProps> = ({ onNewProject }) => {
  const [tab, setTab] = useState<Tab>("files");
  return (
    <Wrapper>
      <Tabs role="tablist">
        {(["projects", "files"] as const).map((t) => (
          <TabButton
            key={t}
            id={`flow-left-tab-${t}`}
            role="tab"
            aria-selected={tab === t}
            aria-controls="flow-left-tabpanel"
            $active={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "projects" ? "Projects" : "Files"}
          </TabButton>
        ))}
      </Tabs>
      <Body
        id="flow-left-tabpanel"
        role="tabpanel"
        aria-labelledby={`flow-left-tab-${tab}`}
      >
        {tab === "projects" ? (
          <ProjectsTab onNew={onNewProject} />
        ) : (
          <ExplorerContainer>
            <Explorer />
          </ExplorerContainer>
        )}
      </Body>
    </Wrapper>
  );
};

export default LeftPanel;

const Wrapper = styled.aside`
  ${({ theme }) => css`
    width: 14.5rem;
    display: flex;
    flex-direction: column;
    border-right: 1px solid ${theme.colors.default.border};
    background: ${theme.colors.default.bgPrimary};
  `}
`;

const Tabs = styled.div`
  ${({ theme }) => css`
    display: flex;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const TabButton = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    flex: 1;
    padding: 0.625rem;
    border: none;
    border-bottom: 2px solid
      ${$active ? theme.colors.default.primary : "transparent"};
    background: transparent;
    color: ${$active
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font: inherit;
    font-size: ${theme.font.other.size.small};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
`;

/**
 * Hides the explorer's "Build" and "Deploy" section buttons: the Flow
 * header's stepper now owns those actions. The upstream `SectionButton`s
 * carry no stable `title`/`aria-label` for "Build"/"Deploy" (only their
 * text differs, and their generated class names are not stable), so this
 * targets the "Program" section's entire button row via `#root-dir`
 * (`PgView.ids.ROOT_DIR`, a stable id upstream itself relies on) -- that
 * row is always the first child of the root explorer element. This also
 * hides the "+" add-program button in the rare case a project has no `src`
 * folder yet; "Run" and "Test" live in a separate ("Client") section row
 * and are unaffected.
 */
const ExplorerContainer = styled.div`
  #root-dir > div:first-child button {
    display: none;
  }
`;
