import { FC, useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import ProgramsTab from "../gallery/ProgramsTab";
import type { ProgramListing } from "../gallery/ProgramsTab";
import StartFromScratch from "../gallery/StartFromScratch";
import TutorialsTab from "../gallery/TutorialsTab";
import Composer from "../components/Composer";
import { HEAD_HEIGHT, HEAD_INSET } from "../tokens";
import { HEADLINE_FONT } from "../../../themes/solana-v3/theme";
import { PgCommon, PgTutorial } from "../../../utils";

/**
 * What you meet with no project open: a head that names the list you are on,
 * and one column under it — a question, the composer, three ways in, and the
 * list itself.
 *
 * The head used to carry the whole navigation: Start / Tutorials / Programs as
 * switches, and a search field in the middle. Both moved. The switches were
 * destinations, so they are rows in the sidebar with the other destinations,
 * and "Start" turned out to be a second name for Home. Search filters one
 * list, so it sits on that list rather than in a bar above everything — it was
 * offering to search a page that had no list on it at all.
 *
 * What is left in the head is the name of what you are looking at, in the same
 * place a project's name sits in the same row of the same column.
 */

interface ZeroStateProps {
  /** Opens the assistant column so a question has somewhere to go */
  onAskAssistant: () => void;
  /** Whether the nav column is showing — this head offers the way back */
  sidebarOpen: boolean;
  onShowSidebar: () => void;
  /** Which list is showing. The sidebar drives it; this draws it. */
  section: ZeroSection;
  onSection: (section: ZeroSection) => void;
}

export type ZeroSection = "home" | "tutorials" | "programs";

const SECTION_TITLE: Record<ZeroSection, string> = {
  home: "Home",
  tutorials: "Tutorials",
  programs: "Programs",
};

const PROGRAMS_URL = "/programs/programs.json";

const ZeroState: FC<ZeroStateProps> = ({
  onAskAssistant,
  sidebarOpen,
  onShowSidebar,
  section,
  onSection,
}) => {
  const [query, setQuery] = useState("");
  const [programs, setPrograms] = useState<ProgramListing[] | null>(null);
  /** Whether the scratch row is open under the cards */
  const [scratchOpen, setScratchOpen] = useState(false);

  // Same fetch the gallery modal did, now that the list lives on the page
  useEffect(() => {
    let live = true;
    PgCommon.fetchJSON(PROGRAMS_URL)
      .then((data: ProgramListing[]) => live && setPrograms(data))
      .catch(() => live && setPrograms([]));
    return () => {
      live = false;
    };
  }, []);

  // Each list keeps its own empty search rather than the last one's text
  useEffect(() => setQuery(""), [section]);

  const onStart = section === "home";

  return (
    <Shell>
      <TopBar>
        {!sidebarOpen && (
          <IconButton
            type="button"
            onClick={onShowSidebar}
            aria-label="Show the sidebar"
          >
            {ICONS.sidebar}
          </IconButton>
        )}
        <BarTitle>{SECTION_TITLE[section]}</BarTitle>
      </TopBar>

      <Body>
        <Stage>
          <Lead $shown={onStart}>
            <Title>Where should we begin?</Title>
          </Lead>

          <ComposerSlot>
            <Composer compact={!onStart} onActivate={onAskAssistant} />
          </ComposerSlot>

          {onStart && (
            <Cards>
              <Card
                type="button"
                aria-expanded={scratchOpen}
                $on={scratchOpen}
                onClick={() => setScratchOpen((o) => !o)}
              >
                <CardIcon aria-hidden="true">{ICONS.plus}</CardIcon>
                <CardTitle>New project</CardTitle>
                <CardSub>Anchor, Native or Seahorse</CardSub>
              </Card>
              <Card type="button" onClick={() => onSection("tutorials")}>
                <CardIcon aria-hidden="true">{ICONS.book}</CardIcon>
                <CardTitle>Follow a tutorial</CardTitle>
                <CardSub>{PgTutorial.all.length} guided paths</CardSub>
              </Card>
              <Card type="button" onClick={() => onSection("programs")}>
                <CardIcon aria-hidden="true">{ICONS.code}</CardIcon>
                <CardTitle>Open a program</CardTitle>
                <CardSub>
                  {programs ? programs.length : "…"} real programs
                </CardSub>
              </Card>
            </Cards>
          )}

          <Panel
            id="zero-panel"
            aria-label={SECTION_TITLE[section]}
            key={section + (scratchOpen ? "-scratch" : "")}
          >
            {onStart && scratchOpen && <StartFromScratch />}
            {onStart && (
              <>
                <PanelHead>
                  <PanelLabel>Or learn from one of these</PanelLabel>
                  <PanelMore
                    type="button"
                    onClick={() => onSection("tutorials")}
                  >
                    All {PgTutorial.all.length}
                  </PanelMore>
                </PanelHead>
                <Clip $rows={2}>
                  <TutorialsTab query="" />
                </Clip>
              </>
            )}
            {!onStart && (
              <ListHead>
                <SearchWrap>
                  <Glyph aria-hidden="true">{ICONS.search}</Glyph>
                  <SearchInput
                    type="search"
                    value={query}
                    autoFocus
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${SECTION_TITLE[
                      section
                    ].toLowerCase()}`}
                    aria-label={`Search ${SECTION_TITLE[
                      section
                    ].toLowerCase()}`}
                  />
                </SearchWrap>
              </ListHead>
            )}
            {section === "tutorials" && <TutorialsTab query={query} />}
            {section === "programs" && (
              <ProgramsTab query={query} programs={programs} />
            )}
          </Panel>
        </Stage>
      </Body>
    </Shell>
  );
};

export default ZeroState;

/* ── icons: one stroke set, one weight ─────────────────────────────────── */

const svg = (d: JSX.Element) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

const ICONS = {
  asterisk: svg(<path d="M12 4v16M4.9 7.5l14.2 9M19.1 7.5l-14.2 9" />),
  sidebar: svg(
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M9.5 4.5v15" />
    </>
  ),
  search: svg(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  help: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2-2.4 3.6" />
      <path d="M12 17.2h.01" />
    </>
  ),
  plus: svg(
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  grid: svg(
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  send: svg(<path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8z" />),
  chevron: svg(<path d="m6 9 6 6 6-6" />),
  mic: svg(
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  up: svg(
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  spark: svg(
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
  code: svg(
    <>
      <path d="m9 17-5-5 5-5" />
      <path d="m15 7 5 5-5 5" />
    </>
  ),
};

/* ── layout ────────────────────────────────────────────────────────────── */

const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
`;

/* Its own column, not a passenger in the layout's grid. This used to be
   `display: contents` so that the bar could take the window-wide `top` row
   Flow drew for it; there is no such row now — every panel heads itself — so
   the start screen stacks its own bar over its own body. */
const Shell = styled.div`
  grid-area: body;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

/* The name of what you are looking at, in the row and the column a project's
   name uses, at the height the sidebar's head uses beside it. */
const TopBar = styled.header`
  ${({ theme }) => css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: ${HEAD_HEIGHT};
    padding: 0 0.5rem 0 calc(${HEAD_INSET} - 0.125rem);
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const Glyph = styled.span`
  display: flex;
  flex-shrink: 0;
  width: 0.9375rem;
  height: 0.9375rem;

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

const searchShape = css`
  ${({ theme }) => css`
    justify-self: center;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 20rem;
    height: 1.875rem;
    padding: 0 0.625rem 0 0.75rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 8px;
    background: ${theme.colors.default.bgSecondary};
    color: ${theme.colors.state.disabled.color};
    font-family: inherit;
    font-size: 0.875rem;
  `}
`;

/* Search sits on the list it filters. In the bar it offered to search a page
   that had no list on it. */
const ListHead = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
`;

const BarTitle = styled.h1`
  ${({ theme }) => css`
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const SearchWrap = styled.div`
  ${searchShape}
  ${({ theme }) => css`
    border-color: ${theme.colors.default.textSecondary}44;
  `}
`;

const SearchInput = styled.input`
  ${({ theme }) => css`
    flex: 1;
    min-width: 0;
    border: none;
    background: none;
    color: ${theme.colors.default.textPrimary};
    font: inherit;

    &::placeholder {
      color: ${theme.colors.state.disabled.color};
    }

    &:focus {
      outline: none;
    }
  `}
`;

const IconButton = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.875rem;
    height: 1.875rem;
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
  `}
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
`;

const Stage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  /* One measure for the whole column — 50rem less its gutters, which is the
     reference's own. The composer used to be 46rem inside a 60rem stage while
     the lists ran the full width, so three things on one page had three
     different left edges. */
  width: min(50rem, 100%);
  margin: 0 auto;
  padding: 5rem 2rem 4rem;
`;

/* Collapses out of the way on a list tab rather than disappearing: height and
   opacity run together, so the composer rises into the space. */
const Lead = styled.div<{ $shown: boolean }>`
  ${({ $shown }) => css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    overflow: hidden;
    opacity: ${$shown ? 1 : 0};
    max-height: ${$shown ? "6rem" : "0"};
    margin-bottom: ${$shown ? "0.5rem" : "-1.25rem"};
    transition: opacity 0.18s ease, max-height 0.28s ease,
      margin-bottom 0.28s ease;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

/* 1.375rem, regular. The reference asks its question at reading size and lets
   the composer carry the page. */
const Title = styled.h1`
  ${({ theme }) => css`
    margin: 0;
    font-family: ${HEADLINE_FONT};
    font-size: 1.75rem;
    font-weight: 400;
    letter-spacing: -0.015em;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const ComposerSlot = styled.div`
  width: 100%;
`;

/* Three equal cards, the reference's own arrangement: glyph top-left, a title,
   one line under it. Hairline, no fill until you point at one. */
const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  width: 100%;
  margin-top: 0.75rem;
  animation: ${rise} 0.22s ease both;

  @media (max-width: 40rem) {
    grid-template-columns: 1fr;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Card = styled.button<{ $on?: boolean }>`
  ${({ theme, $on }) => css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem;
    padding: 1.125rem 1.125rem 1rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 12px;
    background: ${$on
      ? theme.colors.state.hover.bg
      : theme.colors.default.bgSecondary};
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease;

    &:hover {
      background: ${theme.colors.state.hover.bg};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }
  `}
`;

const CardIcon = styled.span`
  ${({ theme }) => css`
    display: flex;
    width: 1.125rem;
    height: 1.125rem;
    margin-bottom: 0.625rem;
    color: ${theme.colors.default.textSecondary};

    & > svg {
      width: 100%;
      height: 100%;
    }
  `}
`;

const CardTitle = styled.span`
  ${({ theme }) => css`
    font-size: 0.9375rem;
    font-weight: 500;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const CardSub = styled.span`
  ${({ theme }) => css`
    font-size: 0.8125rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  margin-top: 1.5rem;
  animation: ${rise} 0.22s ease both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const PanelHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
`;

/* Sentence case, the same size and colour as the sidebar's section headings */
const PanelLabel = styled.span`
  ${({ theme }) => css`
    font-size: 0.8125rem;
    color: ${theme.colors.state.disabled.color};
  `}
`;

const PanelMore = styled.button`
  ${({ theme }) => css`
    padding: 0;
    border: none;
    background: none;
    color: ${theme.colors.default.textSecondary};
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }
  `}
`;

/* Start shows the first couple of rows of the tutorial grid and hands the rest
   to its own tab, so the page under the composer stays short. */
const Clip = styled.div<{ $rows: number }>`
  ${({ $rows }) => css`
    max-height: ${$rows * 8.5}rem;
    overflow: hidden;
    mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
  `}
`;
