import { FC, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import styled, { css } from "styled-components";

import ProjectList from "./ProjectList";
import { ICONS } from "./icons";
import {
  fadeIn,
  Glyph,
  Heading,
  NavContext,
  RAIL_WIDTH,
  RailButton,
  Row,
  shortcut,
  SIDEBAR_WIDTH,
} from "./parts";
import { HEAD_HEIGHT } from "../tokens";
import BrandIcon from "../../../components/BrandIcon";
import type { BrandIconName } from "../../../components/BrandIcon";
import PlaygroundLogoNext from "../../../components/PlaygroundLogoNext";
import PlaygroundMarkNext from "../../../components/PlaygroundMarkNext";
import { PgExplorer, PgTutorial } from "../../../utils";

/**
 * The outermost column: where you can go, and the projects you have.
 *
 * Destinations and lists only — Home, New project, then the projects, with
 * the session pinned at the foot. The assistant is not here: it is the main
 * surface, always on, and a row that toggles a pane reads as a place and then
 * makes something disappear.
 *
 * It also carries the brand and the account, because the window has no bar
 * across the top any more. The Figma (node 2:4) puts the wordmark and the
 * avatar at the head of this column, above a hairline, and gives every other
 * panel its own head too — nothing spans. That is the fix for a bar that
 * existed in one view and not the other, and that held a stepper belonging to
 * the workspace two columns away.
 *
 * The Figma's version of this list is a template's — Dashboard, Inbox,
 * Calendar, Reports — none of which this product has. Every row here goes
 * somewhere that already exists, because a nav item that does nothing is worse
 * than no nav item: it teaches people the sidebar is decoration.
 *
 * Collapsed, it folds to a rail rather than vanishing: the mark, the four
 * destinations as icons, and the session. Hidden outright, the only way back
 * was a button that each neighbouring view had to remember to draw.
 */

interface NavSidebarProps {
  /** Back to the start screen, without closing anything */
  onHome: () => void;
  homeActive: boolean;
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  /** Opens a project by name and switches to the project view */
  onOpenProject: (name: string) => void;
  /** Which start-screen list is showing, or null inside a project */
  section: "home" | "tutorials" | "programs" | null;
  onSection: (section: "home" | "tutorials" | "programs") => void;
  /** Folds this column to its rail, and opens it again */
  onToggleSidebar: () => void;
  /** Folded to the rail: icons only. The mark at its head opens it again. */
  collapsed?: boolean;
  /** Cluster, wallet, account — the session, which belongs to this column */
  status?: ReactNode;
}

interface Destination {
  id: string;
  label: string;
  icon: BrandIconName;
  current: boolean;
  onClick: () => void;
  /** Hook for the walkthrough recorder (`walkthrough/playground-tour.json`) */
  shot?: string;
}

const NavSidebar: FC<NavSidebarProps> = ({
  onHome,
  homeActive,
  onOpenGallery,
  onOpenSettings,
  onOpenProject,
  onToggleSidebar,
  collapsed = false,
  status,
  section,
  onSection,
}) => {
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
      // Renaming or deleting a project that is not open switches nothing, so
      // neither would otherwise reach this list
      PgExplorer.onDidRenameWorkspace(read),
      PgExplorer.onDidDeleteWorkspace(read),
    ];
    return () => subs.forEach((sub) => sub.dispose());
  }, []);

  /* Whether the column has changed shape since it mounted: what replaces what
     fades in then, and not on first paint. Read during render, because it has
     to be right in the very render that swaps the content. */
  const shape = useRef({ collapsed, changed: false });
  if (shape.current.collapsed !== collapsed) {
    shape.current = { collapsed, changed: true };
  }
  const animate = shape.current.changed;
  const nav = useMemo(() => ({ collapsed, animate }), [collapsed, animate]);

  /* A started lesson is a workspace too, but opening one has to go through
     `PgTutorial.open`, which restores its route and page — a bare switch lands
     in the lesson's files with nothing of the lesson around them (see
     `header/ProjectSwitcher.tsx`). Unless it is the lesson already showing, in
     which case `open` returns early and only the view has to move. */
  const openWorkspace = (name: string) => {
    if (
      PgTutorial.isWorkspaceTutorial(name) &&
      PgTutorial.current?.name !== name
    ) {
      PgTutorial.open(name).catch(() => onOpenProject(name));
    } else {
      onOpenProject(name);
    }
  };

  /* These were switches in the start screen's own bar, where "Start" was a
     second name for Home. They are destinations, so they live with the
     destinations, and Home is the one that was Start. */
  const destinations: Destination[] = [
    {
      id: "home",
      label: "Home",
      icon: "home",
      current: homeActive && section === "home",
      onClick: onHome,
      shot: "nav-home",
    },
    {
      id: "new",
      label: "New project",
      icon: "new",
      current: false,
      onClick: onOpenGallery,
    },
    {
      id: "tutorials",
      label: "Tutorials",
      icon: "tutorial",
      current: section === "tutorials",
      onClick: () => onSection("tutorials"),
      shot: "nav-tutorials",
    },
    {
      id: "programs",
      label: "Programs",
      icon: "programs",
      current: section === "programs",
      onClick: () => onSection("programs"),
      shot: "nav-programs",
    },
  ];

  // Flow's own ⌘B, said where the control is
  const toggleTitle = `${collapsed ? "Expand" : "Collapse"} sidebar`;
  const toggleHint = `${toggleTitle} (${shortcut("B")})`;

  return (
    <NavContext.Provider value={nav}>
      <Aside aria-label="Main" $collapsed={collapsed}>
        {collapsed ? (
          <RailHead key="rail-head" $animate={animate}>
            <RailBrand
              type="button"
              onClick={onToggleSidebar}
              aria-label="Expand the sidebar"
              title={toggleHint}
            >
              <Mark />
              <Expand aria-hidden="true">{ICONS.sidebar}</Expand>
            </RailBrand>
          </RailHead>
        ) : (
          <Head key="head" $animate={animate}>
            <Brand
              type="button"
              onClick={onHome}
              aria-label="Solana Playground, home"
            >
              <Logo />
            </Brand>
            <HeadButton
              type="button"
              onClick={onToggleSidebar}
              aria-label="Collapse the sidebar"
              title={toggleHint}
            >
              {ICONS.sidebar}
            </HeadButton>
          </Head>
        )}

        {collapsed ? (
          <Rail key="rail" aria-label="Destinations" $animate={animate}>
            {destinations.map((d) => (
              <RailButton
                key={d.id}
                type="button"
                data-shot={d.shot}
                $current={d.current}
                aria-current={d.current ? "page" : undefined}
                aria-label={d.label}
                title={d.label}
                onClick={d.onClick}
              >
                <BrandIcon name={d.icon} />
              </RailButton>
            ))}
          </Rail>
        ) : (
          <Column key="column" $animate={animate}>
            <Group aria-label="Destinations">
              {destinations.map((d) => (
                <Row
                  key={d.id}
                  type="button"
                  data-shot={d.shot}
                  $current={d.current}
                  aria-current={d.current ? "page" : undefined}
                  onClick={d.onClick}
                >
                  <Glyph aria-hidden="true">
                    <BrandIcon name={d.icon} />
                  </Glyph>
                  {d.label}
                </Row>
              ))}
            </Group>

            <Scroll>
              {projects.length > 0 && (
                <Section aria-label="Projects">
                  <Heading>Projects</Heading>
                  <ProjectList
                    projects={projects}
                    current={current}
                    homeActive={homeActive}
                    onOpen={openWorkspace}
                  />
                </Section>
              )}
            </Scroll>
          </Column>
        )}

        {/* Keyed and last in both shapes, so the session is the same instance
            open or folded — a sign-in in flight survives the fold. It draws
            its own rule, with the setup list above it. */}
        <Foot key="foot" $collapsed={collapsed}>
          {status ?? (
            <Fallback $collapsed={collapsed}>
              {collapsed ? (
                <RailButton
                  type="button"
                  onClick={onOpenSettings}
                  aria-label="Settings"
                  title="Settings"
                >
                  {ICONS.gear}
                </RailButton>
              ) : (
                <Row type="button" onClick={onOpenSettings}>
                  <Glyph aria-hidden="true">{ICONS.gear}</Glyph>
                  Settings
                </Row>
              )}
            </Fallback>
          )}
        </Foot>
      </Aside>
    </NavContext.Provider>
  );
};

export default NavSidebar;

/* The width is the column's own, in both shapes, and it moves between them:
   the grid track beside it is `auto`, so the rest of the window follows. */
const Aside = styled.aside<{ $collapsed: boolean }>`
  ${({ theme, $collapsed }) => css`
    flex-shrink: 0;
    width: ${$collapsed ? RAIL_WIDTH : SIDEBAR_WIDTH};
    display: flex;
    flex-direction: column;
    background: ${theme.colors.default.bgPrimary};
    /* One hairline, no panel fill: in the reference the sidebar is part of
       the same ground as the content and is separated by a line, not a box. */
    border-right: 1px solid ${theme.colors.default.border};
    overflow: hidden;
    transition: width 200ms cubic-bezier(0.2, 0, 0, 1);

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

/* Each part is laid out at its final width and clipped while the column
   moves, so nothing rewraps on the way. Less the border's pixel. */
const fixed = (width: string) => css`
  flex-shrink: 0;
  width: calc(${width} - 1px);
`;

/* Brand left, the fold right, a hairline under both — the head of the column
   and the only place the product says its name. Its height is the window's,
   not its own. The rule stays put while what sits on it fades in. */
const Head = styled.div<{ $animate: boolean }>`
  ${({ theme, $animate }) => css`
    ${fixed(SIDEBAR_WIDTH)}
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    height: ${HEAD_HEIGHT};
    padding: 0 0.5rem 0 0.75rem;
    border-bottom: 1px solid ${theme.colors.default.border};

    ${$animate &&
    css`
      & > * {
        ${fadeIn}
      }
    `}
  `}
`;

/* The supplied lockup, drawn — the mark with "Solana Playground" beside it.
   At 1.75rem the wordmark's two lines still read at a glance without the
   lockup crowding the shared 2.75rem head. */
const Logo = styled(PlaygroundLogoNext)`
  display: block;
  flex-shrink: 0;
  height: 1.75rem;
  width: auto;
  transition: opacity 0.12s;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* No fill on hover: a lockup this size in a tint would all but touch the
   rule. It dims a little instead. Its padding puts the mark on the rows'
   icon column. */
const Brand = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    flex-shrink: 0;
    height: 2.25rem;
    padding: 0 0.25rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    cursor: pointer;

    &:hover > svg {
      opacity: 0.82;
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 0;
    }
  `}
`;

const HeadButton = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.875rem;
    height: 1.875rem;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;

    & > svg {
      width: 1rem;
      height: 1rem;
    }

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }
  `}
`;

/* The rail's head: the same row and rule, the mark alone */
const RailHead = styled.div<{ $animate: boolean }>`
  ${({ theme, $animate }) => css`
    ${fixed(RAIL_WIDTH)}
    display: flex;
    align-items: center;
    justify-content: center;
    height: ${HEAD_HEIGHT};
    border-bottom: 1px solid ${theme.colors.default.border};

    ${$animate &&
    css`
      & > * {
        ${fadeIn}
      }
    `}
  `}
`;

const Mark = styled(PlaygroundMarkNext)`
  display: block;
  width: 1.75rem;
  height: auto;
`;

const Expand = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;

  & > svg {
    width: 1.125rem;
    height: 1.125rem;
  }
`;

/* The mark is the way back: pointed at or focused, it turns into the sidebar
   glyph the fold button wears when the column is open, in the same corner —
   as ChatGPT's and Claude's rails do. ⌘B works either way. */
const RailBrand = styled.button`
  ${({ theme }) => css`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    cursor: pointer;
    transition: background 0.1s;

    & > ${Mark}, & > ${Expand} {
      transition: opacity 0.12s;
    }

    &:hover,
    &:focus-visible {
      background: ${theme.colors.state.hover.bg};

      & > ${Mark} {
        opacity: 0;
      }
      & > ${Expand} {
        opacity: 1;
      }
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }

    @media (prefers-reduced-motion: reduce) {
      &,
      & > ${Mark}, & > ${Expand} {
        transition: none;
      }
    }
  `}
`;

const Rail = styled.nav<{ $animate: boolean }>`
  ${({ $animate }) => css`
    ${fixed(RAIL_WIDTH)}
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    flex: 1;
    min-height: 0;
    padding-top: 0.75rem;
    ${$animate && fadeIn}
  `}
`;

/* Everything under the head, inset. */
const Column = styled.div<{ $animate: boolean }>`
  ${({ $animate }) => css`
    ${fixed(SIDEBAR_WIDTH)}
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding: 0.75rem 0.5rem 0.25rem;
    overflow: hidden;
    ${$animate && fadeIn}
  `}
`;

const Group = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

/* The list of projects takes whatever height is left, and scrolls on its own
   so the foot never leaves the window. */
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
  margin-top: 1.25rem;
`;

/* The session's own rows lay themselves out, rule included */
const Foot = styled.div<{ $collapsed: boolean }>`
  ${({ $collapsed }) => css`
    ${fixed($collapsed ? RAIL_WIDTH : SIDEBAR_WIDTH)}
  `}
`;

/* Only when Flow hands over no session: Settings has to stay reachable */
const Fallback = styled.div<{ $collapsed: boolean }>`
  ${({ theme, $collapsed }) => css`
    display: flex;
    flex-direction: column;
    align-items: ${$collapsed ? "center" : "stretch"};
    padding: 0.375rem ${$collapsed ? "0" : "0.5rem"} 0.5rem;
    border-top: 1px solid ${theme.colors.default.border};
  `}
`;
