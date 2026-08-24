import type { FC } from "react";
import styled, { css } from "styled-components";

import { useRenderOnChange } from "../../../hooks";
import { PgExplorer } from "../../../utils";

interface ProjectSwitcherProps {
  onOpenGallery: () => void;
}

/** Current workspace name; opens the project gallery on click. */
const ProjectSwitcher: FC<ProjectSwitcherProps> = ({ onOpenGallery }) => {
  useRenderOnChange(PgExplorer.onDidSwitchWorkspace);
  return (
    <Button onClick={onOpenGallery} aria-haspopup="dialog">
      <Name>{PgExplorer.currentWorkspaceName ?? "No project"}</Name>
      <Caret viewBox="0 0 12 8" width="10" height="7" aria-hidden>
        <path
          d="M1 1.5L6 6.5L11 1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Caret>
    </Button>
  );
};

export default ProjectSwitcher;

const Button = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    max-width: 14rem;
    border: none;
    border-radius: ${theme.default.borderRadius};
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    font-family: ${theme.font.other.family};
    font-weight: 600;
    cursor: pointer;
    transition: background 140ms ease;

    &:hover {
      background: ${theme.colors.default.bgSecondary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const Name = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Caret = styled.svg`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.default.textSecondary};
`;
