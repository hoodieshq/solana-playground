import { FC, ReactNode, useEffect, useState } from "react";
import styled, { css } from "styled-components";

import { PgExplorer } from "../../../utils";

/**
 * The outermost column: who you are, where you can go, and one suggestion.
 *
 * The Figma's version of this list is a template's — Dashboard, Inbox,
 * Calendar, Reports — none of which this product has. Every row here goes
 * somewhere that already exists, because a nav item that does nothing is worse
 * than no nav item: it teaches people the sidebar is decoration.
 */

interface NavSidebarProps {
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  onToggleAssistant: () => void;
  assistantOpen: boolean;
  /** Cluster, wallet and account — rendered at the foot of this column. */
  status?: ReactNode;
}

const QUICKSTART_DISMISSED = "quickstart-card-dismissed";

const NavSidebar: FC<NavSidebarProps> = ({
  onOpenGallery,
  onOpenSettings,
  onToggleAssistant,
  assistantOpen,
  status,
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
      <Brand>
        <Mark aria-hidden="true" />
        <BrandName>Playground</BrandName>
      </Brand>

      <Group>
        <Row onClick={onOpenGallery} type="button">
          <Glyph aria-hidden="true">{ICONS.plus}</Glyph>
          New project
        </Row>
        <Row
          onClick={onToggleAssistant}
          type="button"
          $current={assistantOpen}
          aria-pressed={assistantOpen}
        >
          <Glyph aria-hidden="true">{ICONS.sparkle}</Glyph>
          Assistant
        </Row>
        <Row as="a" href="/tutorials">
          <Glyph aria-hidden="true">{ICONS.book}</Glyph>
          Tutorials
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
                $current={name === current}
                onClick={() => PgExplorer.switchWorkspace(name)}
              >
                <Glyph aria-hidden="true">{ICONS.folder}</Glyph>
                <Label>{name}</Label>
              </Row>
            ))}
          </Section>
        )}
      </Scroll>

      <Foot>
        {status && <Account>{status}</Account>}

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
          <Card>
            <CardTop>
              <Plate aria-hidden="true">{ICONS.cube}</Plate>
              <Dismiss
                type="button"
                onClick={dismissQuickstart}
                aria-label="Dismiss the quickstart suggestion"
              >
                {ICONS.close}
              </Dismiss>
            </CardTop>
            <CardTitle>Quickstart Solana</CardTitle>
            <CardBody>
              Create a devnet project and deploy your first program.
            </CardBody>
            <CardAction type="button" onClick={onOpenGallery}>
              Open quickstart
            </CardAction>
          </Card>
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
    padding: 0.75rem 0.5rem 0.5rem;
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
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-top: 0.5rem;
`;

/* The cluster, wallet and account controls were a row of pills in the title
   bar. In a column they stack and stretch, so they read as part of this list
   rather than as chips that wandered in. The child selector reaches the
   wrapper inside StatusChips, which lays itself out as a row by default. */
const Account = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    padding-bottom: 0.5rem;
    margin-bottom: 0.25rem;
    border-bottom: 1px solid ${theme.colors.default.border};

    & > div {
      flex-direction: column;
      align-items: stretch;
      gap: 1px;
    }

    & button,
    & a {
      justify-content: flex-start;
      gap: 0.625rem;
      width: 100%;
      height: 2.125rem;
      padding: 0 0.625rem;
      border: none;
      border-radius: 8px;
      color: ${theme.colors.default.textSecondary};
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 400;
      white-space: nowrap;
    }

    /* The chips carried their own typeface and a pill radius from the title
       bar they used to live in; in a list of rows that reads as three
       different components stacked. */
    & * {
      font-family: inherit;
    }

    & button:hover {
      background: ${theme.colors.state.hover.bg};
    }
  `}
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.5rem;
  padding: 0 0.625rem;
  margin-bottom: 0.75rem;
`;

const Mark = styled.div`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    background: ${theme.colors.default.primary};
  `}
`;

const BrandName = styled.span`
  ${({ theme }) => css`
    font-size: 0.9375rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: ${theme.colors.default.textPrimary};
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
    border: none;
    border-radius: 8px;
    background: ${$current ? theme.colors.state.hover.bg : "transparent"};
    color: ${$current
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: ${$current ? 500 : 400};
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

/* The one suggestion. It dismisses and stays dismissed, because a card that
   comes back after you close it is an advert. */
const Card = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.875rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 12px;
    background: ${theme.colors.default.bgSecondary};
  `}
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`;

const Plate = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 8px;
    background: ${theme.colors.default.bgPrimary};
    color: ${theme.colors.default.primary};

    & > svg {
      width: 1.0625rem;
      height: 1.0625rem;
    }
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

const CardTitle = styled.div`
  ${({ theme }) => css`
    font-size: ${theme.font.other.size.small};
    font-weight: 600;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const CardBody = styled.p`
  ${({ theme }) => css`
    margin: 0;
    font-size: ${theme.font.other.size.xsmall};
    line-height: 1.45;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const CardAction = styled.button`
  ${({ theme }) => css`
    margin-top: 0.125rem;
    padding: 0.5rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 8px;
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    font-family: inherit;
    font-size: ${theme.font.other.size.xsmall};
    font-weight: 500;
    cursor: pointer;

    &:hover {
      background: ${theme.colors.state.hover.bg};
    }
  `}
`;
