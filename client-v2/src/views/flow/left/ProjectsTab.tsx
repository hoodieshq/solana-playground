import type { FC } from "react";
import styled, { css } from "styled-components";

import Eyebrow from "./Eyebrow";
import { useRenderOnChange } from "../../../hooks";
import { PgExplorer } from "../../../utils";

interface ProjectsTabProps {
  onNew: () => void;
}

const ProjectsTab: FC<ProjectsTabProps> = ({ onNew }) => {
  useRenderOnChange(PgExplorer.onDidSwitchWorkspace);
  const names = PgExplorer.allWorkspaceNames ?? [];
  const current = PgExplorer.currentWorkspaceName;

  return (
    <Wrapper>
      <Eyebrow>Projects</Eyebrow>
      <List>
        {names.map((name) => (
          <Row
            key={name}
            $active={name === current}
            onClick={() => PgExplorer.switchWorkspace(name)}
          >
            {name}
          </Row>
        ))}
      </List>
      <NewButton onClick={onNew}>+ New project</NewButton>
    </Wrapper>
  );
};

export default ProjectsTab;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const Row = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    text-align: left;
    padding: 0.5rem 0.625rem;
    border: none;
    border-radius: ${theme.default.borderRadius};
    background: ${$active ? theme.colors.default.bgSecondary : "transparent"};
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    cursor: pointer;
    &:hover {
      background: ${theme.colors.default.bgSecondary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
    }
  `}
`;

const NewButton = styled.button`
  ${({ theme }) => css`
    margin: 0.5rem;
    padding: 0.625rem;
    border: 1px dashed ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    cursor: pointer;
    &:hover {
      border-color: ${theme.colors.default.primary};
    }
  `}
`;
