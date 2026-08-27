import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import { groupWorkspaces } from "./workspaces";
import type { WorkspaceEntry } from "./workspaces";
import { getLessonPath, PgLesson } from "../lessons";
import { stepNumber } from "../lessons/progress";
import { useOnClickOutside, useRenderOnChange } from "../../../hooks";
import { PgExplorer, PgTutorial } from "../../../utils";

interface ProjectSwitcherProps {
  onOpenGallery: () => void;
}

/**
 * The one place a project is chosen, lessons included.
 *
 * A started lesson is a workspace, so it is already in
 * `allWorkspaceNames`. Choosing one has to go through
 * `PgTutorial.open`, which restores its route and page --
 * `switchWorkspace` alone would land the user in a lesson's files with
 * no lesson around them.
 *
 * Only existing workspaces are listed. Starting something new stays
 * `Browse gallery`, so this never grows into a catalog.
 */
const ProjectSwitcher: FC<ProjectSwitcherProps> = ({ onOpenGallery }) => {
  useRenderOnChange(PgExplorer.onDidSwitchWorkspace);
  const [, setLesson] = useState(PgLesson.state);
  useEffect(() => PgLesson.onDidChange(setLesson).dispose, []);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setOpen(false), []);
  useOnClickOutside(wrapperRef, closeMenu, open);

  // Same pattern as `StatusChips.tsx`'s profile popover: Escape closes,
  // no `role="menu"` -- this is a popover of plain buttons, not the full
  // WAI-ARIA menu pattern (which would also need roving arrow-key focus).
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, closeMenu]);

  const current = PgExplorer.currentWorkspaceName ?? null;
  const { lessons, projects } = groupWorkspaces(
    PgExplorer.allWorkspaceNames ?? [],
    (name) => PgTutorial.isWorkspaceTutorial(name),
    describeProgress
  );

  const choose = async (entry: WorkspaceEntry) => {
    setOpen(false);
    if (entry.name === current) return;
    if (entry.isLesson) await PgTutorial.open(entry.name);
    else await PgExplorer.switchWorkspace(entry.name);
  };

  const label = current
    ? `${current}${
        describeProgress(current) ? ` - ${describeProgress(current)}` : ""
      }`
    : "No project";

  return (
    <Wrapper ref={wrapperRef}>
      <Trigger
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Name>{label}</Name>
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
      </Trigger>

      {open && (
        <Menu aria-label="Projects and lessons">
          {lessons.length > 0 && <Group>Lessons</Group>}
          {lessons.map((entry) => (
            <Row
              key={entry.name}
              $active={entry.name === current}
              onClick={() => choose(entry)}
            >
              <RowName>{entry.name}</RowName>
              {entry.progress && <RowMeta>{entry.progress}</RowMeta>}
            </Row>
          ))}

          {projects.length > 0 && <Group>Projects</Group>}
          {projects.map((entry) => (
            <Row
              key={entry.name}
              $active={entry.name === current}
              onClick={() => choose(entry)}
            >
              <RowName>{entry.name}</RowName>
            </Row>
          ))}

          <Separator />
          <Row
            $active={false}
            onClick={() => {
              setOpen(false);
              onOpenGallery();
            }}
          >
            <RowName>Browse gallery</RowName>
          </Row>
        </Menu>
      )}
    </Wrapper>
  );
};

export default ProjectSwitcher;

/**
 * The lesson you are in shows live progress, because `PgLesson` already
 * holds it. Every other lesson shows its length: their progress is on
 * disk in their own workspace and reading it would mean an async fan-out
 * every time the menu opens.
 */
const describeProgress = (name: string) => {
  const path = getLessonPath(name);
  if (!path) return null;

  const lesson = PgLesson.state;
  if (lesson.path?.tutorial === name) {
    return `${stepNumber(path, lesson.progress)} of ${path.steps.length}`;
  }

  return `${path.steps.length} steps`;
};

const Wrapper = styled.div`
  position: relative;
`;

const Trigger = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    max-width: 16rem;
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

const Menu = styled.div`
  ${({ theme }) => css`
    position: absolute;
    top: calc(100% + 0.375rem);
    left: 0;
    z-index: 5;
    min-width: 14rem;
    padding: 0.25rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
    box-shadow: ${theme.default.boxShadow};
  `}
`;

const Group = styled.div`
  ${({ theme }) => css`
    padding: 0.5rem 0.5rem 0.25rem;
    font-size: ${theme.font.other.size.small};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Row = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    padding: 0.5rem;
    border: none;
    border-radius: ${theme.default.borderRadius};
    background: ${$active ? theme.colors.default.bgPrimary : "transparent"};
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: ${theme.colors.default.bgPrimary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
    }
  `}
`;

const RowName = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RowMeta = styled.span`
  ${({ theme }) => css`
    flex-shrink: 0;
    font-size: ${theme.font.other.size.small};
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Separator = styled.div`
  height: 1px;
  margin: 0.25rem;
  background: ${({ theme }) => theme.colors.default.border};
`;
