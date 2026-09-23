import { FC, useEffect, useState } from "react";
import styled, { css } from "styled-components";

import { PgExplorer } from "../../../utils";
import { gradientStroke } from "../components/gradient";

/**
 * The outermost column: where you can go, and the projects you have.
 *
 * Destinations and lists only — Home, New project, then the projects, with
 * the account and Settings pinned at the foot. The assistant is not here: it
 * is the main surface, always on, and a row that toggles a pane reads as a
 * place and then makes something disappear.
 *
 * The Figma's version of this list is a template's — Dashboard, Inbox,
 * Calendar, Reports — none of which this product has. Every row here goes
 * somewhere that already exists, because a nav item that does nothing is worse
 * than no nav item: it teaches people the sidebar is decoration.
 */

interface NavSidebarProps {
  /** Back to the start screen, without closing anything */
  onHome: () => void;
  homeActive: boolean;
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  /** Opens a project by name and switches to the project view */
  onOpenProject: (name: string) => void;
}

const QUICKSTART_DISMISSED = "quickstart-card-dismissed";

const NavSidebar: FC<NavSidebarProps> = ({
  onHome,
  homeActive,
  onOpenGallery,
  onOpenSettings,
  onOpenProject,
}) => {
  const [quickstartGone, setQuickstartGone] = useState(() => {
    try {
      return localStorage.getItem(QUICKSTART_DISMISSED) === "1";
    } catch {
      return false;
    }
  });

  // The real list, not a placeholder one: the explorer already knows every
  // workspace this browser has, and which one is open.
  const [projects, setProjects] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | undefined>();
  useEffect(() => {
    const read = () => {
      setProjects(PgExplorer.allWorkspaceNames ?? []);
      setCurrent(PgExplorer.currentWorkspaceName);
    };
    read();
    const subs = [
      PgExplorer.onDidInit(read),
      PgExplorer.onDidCreateWorkspace(read),
      PgExplorer.onDidSwitchWorkspace(read),
    ];
    return () => subs.forEach((sub) => sub.dispose());
  }, []);

  const dismissQuickstart = () => {
    setQuickstartGone(true);
    try {
      localStorage.setItem(QUICKSTART_DISMISSED, "1");
    } catch {}
  };

  return (
    <Aside aria-label="Main">
      <Group>
        <Row
          onClick={onHome}
          type="button"
          $current={homeActive}
          aria-current={homeActive ? "page" : undefined}
        >
          <Glyph aria-hidden="true">{ICONS.home}</Glyph>
          Home
        </Row>
        <Row onClick={onOpenGallery} type="button">
          <Glyph aria-hidden="true">{ICONS.plus}</Glyph>
          New project
        </Row>
      </Group>

      <Scroll>
        {projects.length > 0 && (
          <Section>
            <Heading>Projects</Heading>
            {projects.map((name) => (
              <Row
                key={name}
                type="button"
                $current={!homeActive && name === current}
                onClick={() => onOpenProject(name)}
              >
                <Glyph aria-hidden="true">{ICONS.folder}</Glyph>
                <Label>{name}</Label>
              </Row>
            ))}
          </Section>
        )}
      </Scroll>

      <Foot>
        <Row
          as="a"
          href="https://solana.com/docs"
          target="_blank"
          rel="noreferrer"
        >
          <Glyph aria-hidden="true">{ICONS.help}</Glyph>
          Docs
        </Row>
        <Row onClick={onOpenSettings} type="button">
          <Glyph aria-hidden="true">{ICONS.gear}</Glyph>
          Settings
        </Row>

        {!quickstartGone && (
          <Suggestion>
            <SuggestionHead>
              <SuggestionTitle>Quickstart Solana</SuggestionTitle>
              <Dismiss
                type="button"
                onClick={dismissQuickstart}
                aria-label="Dismiss the quickstart suggestion"
              >
                {ICONS.close}
              </Dismiss>
            </SuggestionHead>
            <SuggestionBody>
              Create a devnet project and deploy your first program.
            </SuggestionBody>
            <Row onClick={onOpenGallery} type="button">
              <Glyph aria-hidden="true">{ICONS.cube}</Glyph>
              Open quickstart
            </Row>
          </Suggestion>
        )}
      </Foot>
    </Aside>
  );
};

export default NavSidebar;

/* Stroke icons at 18px, one weight, so the column reads as one set rather
   than a collection of borrowed glyphs. */
const svg = (d: JSX.Element) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

const ICONS = {
  home: svg(
    <>
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" />
      <path d="M9.5 20.5v-6h5v6" />
    </>
  ),
  plus: svg(
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  folder: svg(
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  ),
  sparkle: svg(
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5 13.6 11 16 12l-2.4 1-1.6 2.5L10.4 13 8 12l2.4-1z" />
    </>
  ),
  book: svg(
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5z" />
      <path d="M19 18v2H5.5A1.5 1.5 0 0 1 4 18.5" />
    </>
  ),
  help: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2-2.4 3.6" />
      <path d="M12 17.2h.01" />
    </>
  ),
  gear: svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
  cube: svg(
    <>
      <path d="M12 3.5 20 8v8l-8 4.5L4 16V8z" />
      <path d="M12 12 20 8M12 12v8.5M12 12 4 8" />
    </>
  ),
  close: svg(
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
};

const Aside = styled.aside`
  ${({ theme }) => css`
    width: 15.5rem;
    display: flex;
    flex-direction: column;
    padding: 0.75rem 0.5rem 0.625rem;
    background: ${theme.colors.default.bgPrimary};
    /* One hairline, no panel fill: in the reference the sidebar is part of the
       same ground as the content and is separated by a line, not by a box. */
    border-right: 1px solid ${theme.colors.default.border};
    overflow: hidden;
  `}
`;

/* The list of projects takes whatever height is left, and scrolls on its own
   so the footer and the card below it never leave the window. */
const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
`;

const Section = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 1.5rem;
`;

const Heading = styled.h2`
  ${({ theme }) => css`
    margin: 0 0 0.375rem;
    padding: 0 0.625rem;
    font-size: 0.8125rem;
    font-weight: 400;
    color: ${theme.colors.state.disabled.color};
  `}
`;

/* A project name can be long; it truncates rather than wrapping, because a
   two-line row breaks the rhythm of every row above it. */
const Label = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Foot = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid ${theme.colors.default.border};
  `}
`;

const Group = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

/* One row shape for every destination, whether it is a button or a link —
   the eye should not be able to tell which is which. */
const Row = styled.button<{ $current?: boolean }>`
  ${({ theme, $current }) => css`
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    height: 2.125rem;
    padding: 0 0.625rem;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    ${$current && gradientStroke(theme.colors.default.bgPrimary)}
    color: ${$current
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    text-align: left;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;

const Glyph = styled.span`
  flex-shrink: 0;
  display: flex;
  width: 16px;
  height: 16px;

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

/* A suggestion, not a card: the same hairline the foot uses, a title, a line,
   and the action as an ordinary row — so the bottom of the column is made of
   the same parts as the rest of it. */
const Suggestion = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.5rem;
    padding-top: 0.625rem;
    border-top: 1px solid ${theme.colors.default.border};
  `}
`;

const SuggestionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0 0.625rem;
`;

const SuggestionTitle = styled.div`
  ${({ theme }) => css`
    font-size: 0.875rem;
    font-weight: 500;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const SuggestionBody = styled.p`
  ${({ theme }) => css`
    margin: 0 0 0.25rem;
    padding: 0 0.625rem;
    font-size: 0.8125rem;
    line-height: 1.45;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Dismiss = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;

    & > svg {
      width: 12px;
      height: 12px;
    }

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }
  `}
`;

