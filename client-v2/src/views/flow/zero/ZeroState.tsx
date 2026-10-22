import { FC, useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import BrandIcon from "../../../components/BrandIcon";

import ProgramsTab from "../gallery/ProgramsTab";
import type { ProgramListing } from "../gallery/ProgramsTab";
import StartFromScratch from "../gallery/StartFromScratch";
import TutorialsTab, { filterTutorials } from "../gallery/TutorialsTab";
import type { FrameworkFilter as FrameworkFilterValue } from "../gallery/TutorialsTab";
import Menu, { useMenu } from "../components/Menu";
import StartHere from "../gallery/StartHere";
import Composer from "../components/Composer";
import PhoneHome, { GalleryRow } from "./PhoneHome";
import { HEAD_HEIGHT, HEAD_INSET } from "../tokens";
import { HEADLINE_FONT } from "../../../themes/solana-v3/theme";
import { PgCommon, PgExplorer, PgTutorial } from "../../../utils";
import { PHONE, PHONE_SIZE, PHONE_TYPE, usePhone } from "../phone";

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
  /** Which list is showing. The sidebar drives it; this draws it. */
  section: ZeroSection;
  onSection: (section: ZeroSection) => void;
  /** Opens a project, for the phone's quickstart that continues the last */
  onOpenProject?: (name: string) => void;
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
  section,
  onSection,
  onOpenProject,
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

  const [framework, setFramework] = useState<FrameworkFilterValue>("all");

  // Each list keeps its own empty search rather than the last one's text
  useEffect(() => {
    setQuery("");
    setFramework("all");
  }, [section]);

  const onStart = section === "home";
  /* On a phone the composer is the page's foot, under the thumb, as in the
     phone's own chat apps. The start screen is Claude's there: the question
     in the middle, quickstarts over the composer, and the composer's own top
     row to the gallery; the lists keep their page. */
  const phone = usePhone();
  const phoneStart = phone && onStart;
  /* Tutorials is for picking one: its own search sits right under where a
     composer would, and a question there had nowhere better to go than the
     chat Home already offers (Almaz, 2026-10-22) */
  const asks = section !== "tutorials";
  const composer = (
    <Composer
      compact={!onStart}
      onActivate={onAskAssistant}
      banner={
        phoneStart ? (
          <GalleryRow programs={programs ? programs.length : null} />
        ) : undefined
      }
    />
  );

  return (
    <Shell>
      <TopBar>
        {/* The page's own heading names Tutorials; the bar's name steps down
            so the page keeps one h1 */}
        <BarTitle as={section === "tutorials" ? "p" : "h1"}>
          {SECTION_TITLE[section]}
        </BarTitle>
      </TopBar>

      <Body>
        {phoneStart ? (
          <PhoneStage>
            <PhoneHome
              onOpenProject={
                onOpenProject ?? ((name) => PgExplorer.switchWorkspace(name))
              }
            />
          </PhoneStage>
        ) : (
          <Stage $start={onStart}>
            {/* Folded away off Home, and out of the reading order with it */}
            <Lead $shown={onStart} aria-hidden={!onStart}>
              <Title>Where should we begin?</Title>
            </Lead>

            {!phone && asks && <ComposerSlot>{composer}</ComposerSlot>}

            {onStart && (
              <Cards>
                <Card
                  type="button"
                  aria-expanded={scratchOpen}
                  $on={scratchOpen}
                  onClick={() => setScratchOpen((o) => !o)}
                >
                  <CardIcon aria-hidden="true">
                    <BrandIcon name="new" />
                  </CardIcon>
                  <CardTitle>New project</CardTitle>
                  <CardSub>Anchor, Native or Seahorse</CardSub>
                </Card>
                <Card type="button" onClick={() => onSection("tutorials")}>
                  <CardIcon aria-hidden="true">
                    <BrandIcon name="tutorial" />
                  </CardIcon>
                  <CardTitle>Follow a tutorial</CardTitle>
                  <CardSub>{PgTutorial.all.length} guided paths</CardSub>
                </Card>
                <Card type="button" onClick={() => onSection("programs")}>
                  <CardIcon aria-hidden="true">
                    <BrandIcon name="programs" />
                  </CardIcon>
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
                  {/* Four whole cards, two rows of the column's two, never a
                      third cut off and faded: "All 16" has the rest */}
                  <TutorialsTab query="" limit={4} />
                </>
              )}
              {!onStart && (
                <ListHead>
                  {section === "tutorials" && (
                    <PageTitle>{SECTION_TITLE[section]}</PageTitle>
                  )}
                  <SearchWrap>
                    <Glyph aria-hidden="true">
                      <BrandIcon name="search" />
                    </Glyph>
                    <SearchInput
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={
                        section === "tutorials"
                          ? framework === "all"
                            ? `Search ${PgTutorial.all.length} tutorials`
                            : `Search ${framework} tutorials`
                          : `Search ${SECTION_TITLE[section].toLowerCase()}`
                      }
                      aria-label={`Search ${SECTION_TITLE[
                        section
                      ].toLowerCase()}`}
                    />
                  </SearchWrap>
                  {section === "tutorials" && (
                    <FrameworkFilter
                      value={framework}
                      onChange={setFramework}
                    />
                  )}
                </ListHead>
              )}
              {/* The banner is for browsing: narrowed to a search or a
                  framework, the list comes first */}
              {section === "tutorials" && !query && framework === "all" && (
                <StartHere />
              )}
              {section === "tutorials" && (query || framework !== "all") && (
                <Results role="status">
                  {resultsLine(
                    filterTutorials(query, framework).length,
                    query,
                    framework
                  )}
                </Results>
              )}
              {section === "tutorials" && (
                <TutorialsTab query={query} framework={framework} byLevel />
              )}
              {section === "programs" && (
                <ProgramsTab query={query} programs={programs} />
              )}
            </Panel>
          </Stage>
        )}
      </Body>
      {phone && asks && <PhoneComposer>{composer}</PhoneComposer>}
    </Shell>
  );
};

export default ZeroState;

const FRAMEWORKS: FrameworkFilterValue[] = [
  "all",
  "Anchor",
  "Seahorse",
  "Native",
];

/** "3 results", or "No Seahorse tutorials match “vault”" */
const resultsLine = (
  count: number,
  query: string,
  framework: FrameworkFilterValue
) => {
  const kind = framework === "all" ? "tutorials" : `${framework} tutorials`;
  const q = query.trim();
  if (!count) return q ? `No ${kind} match “${q}”` : `No ${kind} yet`;
  return `${count} ${count === 1 ? "result" : "results"}`;
};

/**
 * The framework filter behind one square beside the search. A dot on it says
 * a filter is on, so a short list never looks like the whole catalogue
 */
const FrameworkFilter: FC<{
  value: FrameworkFilterValue;
  onChange: (value: FrameworkFilterValue) => void;
}> = ({ value, onChange }) => {
  const menu = useMenu();
  const on = value !== "all";
  return (
    <>
      <FilterButton
        ref={menu.anchorRef}
        type="button"
        $on={on}
        aria-label={on ? `Framework: ${value}` : "Filter by framework"}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        onClick={menu.toggle}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 4v8M6 16v4M12 4v2M12 10v10M18 4v10M18 18v2" />
          <circle cx="6" cy="14" r="2" />
          <circle cx="12" cy="8" r="2" />
          <circle cx="18" cy="16" r="2" />
        </svg>
        {on && <FilterDot aria-hidden />}
      </FilterButton>
      {menu.open && (
        <Menu
          title="Framework"
          anchorRef={menu.anchorRef}
          onClose={menu.close}
          placement="bottom-end"
          minWidth="11rem"
          rows={FRAMEWORKS.map((f) => ({
            id: f,
            label: f === "all" ? "All" : f,
            checked: f === value,
            onSelect: () => onChange(f),
          }))}
        />
      )}
    </>
  );
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
  /* Beside the assistant's column it takes the rest of the row */
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  /* A phone's page is a column, not a grid: the whole of it */
  ${PHONE} {
    flex: 1;
  }
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

    /* A phone's bar already names where you are */
    ${PHONE} {
      display: none;
    }
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
    /* The page's own search, so a control's full height: 40px, at the
       reading weight, and the filter beside it to match */
    height: 2.5rem;
    padding: 0 0.75rem 0 0.875rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 8px;
    background: ${theme.colors.default.bgSecondary};
    transition: border-color 0.15s ease;

    /* Focus shows on the box itself: a line a step stronger */
    &:focus-within {
      border-color: ${theme.colors.default.textSecondary};
    }

    ${PHONE} {
      justify-self: stretch;
      width: 100%;
      height: ${PHONE_SIZE.target};
      padding: 0 0.875rem;
      border-radius: 12px;
      ${PHONE_TYPE.body}
    }
    /* The hint and the glass in the secondary grey a step down, 4.9:1, not
       the disabled grey at 3.4:1 that AA does not allow */
    color: ${theme.colors.default.textSecondary}cc;
    font-family: inherit;
    /* The Styleguide's desktop row size; the phone's body size above keeps
       16px, under which iOS zooms the page on a tap into the field */
    font-size: 0.8125rem;
    font-weight: 350;
  `}
`;

/* Search sits on the list it filters. In the bar it offered to search a page
   that had no list on it. */
const ListHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

/* The list's name on the left, Home's question face, with its search and
   filter pushed to the right of the same row. On a phone it takes a row of
   its own over them */
const PageTitle = styled.h1`
  ${({ theme }) => css`
    margin: 0 auto 0 0;
    font-family: ${HEADLINE_FONT};
    font-size: 1.75rem;
    font-weight: 400;
    letter-spacing: -0.015em;
    color: ${theme.colors.default.textPrimary};

    ${PHONE} {
      flex-basis: 100%;
      margin-bottom: 0.5rem;
      ${PHONE_TYPE.display}
    }
  `}
`;

/* An icon beside the search, not a second box: the search's height to hit,
   the glass's grey at rest, the text's white under the pointer or when a
   filter is on */
const FilterButton = styled.button<{ $on: boolean }>`
  ${({ theme, $on }) => css`
    position: relative;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${$on
      ? theme.colors.default.textPrimary
      : `${theme.colors.default.textSecondary}cc`};
    cursor: pointer;
    transition: color 0.15s ease;

    & > svg {
      width: 1.375rem;
      height: 1.375rem;
    }

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }

    ${PHONE} {
      width: ${PHONE_SIZE.target};
      height: ${PHONE_SIZE.target};
    }
  `}
`;

const FilterDot = styled.span`
  ${({ theme }) => css`
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 999px;
    background: ${theme.colors.default.primary};
  `}
`;

const Results = styled.p`
  ${({ theme }) => css`
    margin: 0;
    font-size: 0.8125rem;
    color: ${theme.colors.default.textSecondary};
  `}
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

  /* The rest of the row, beside the filter, not the whole of it */
  ${PHONE} {
    flex: 1;
    min-width: 0;
    width: auto;
  }
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
      color: ${theme.colors.default.textSecondary}cc;
    }

    &:focus {
      outline: none;
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

const Stage = styled.div<{ $start: boolean }>`
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
  /* Home's air is for its question. A list already has the bar naming it,
     so its first row sits a step under that bar rather than 80px down */
  padding: ${({ $start }) => ($start ? "5rem" : "2rem")} 2rem 4rem;

  ${PHONE} {
    gap: 1rem;
    padding: ${({ $start }) => ($start ? "2.5rem" : "1rem")} 1.25rem
      calc(2rem + env(safe-area-inset-bottom, 0px));
  }
`;

/* The phone's start screen: the whole height, the question in the middle of
   what the quickstarts leave above the composer */
const PhoneStage = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 0 1rem;
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

    ${PHONE} {
      ${PHONE_TYPE.display}
    }
  `}
`;

const ComposerSlot = styled.div`
  width: 100%;
`;

/* A phone's composer, pinned under the page and clear of the screen's edge.
   What scrolls under it fades out rather than ending on a cut. */
const PhoneComposer = styled.div`
  ${({ theme }) => css`
    position: relative;
    flex-shrink: 0;
    padding: 0.5rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
    background: ${theme.colors.default.bgPrimary};

    &::before {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 100%;
      height: 1.5rem;
      background: linear-gradient(
        to bottom,
        transparent,
        ${theme.colors.default.bgPrimary}
      );
      pointer-events: none;
    }
  `}
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

    ${PHONE} {
      gap: 0.25rem;
      padding: 1rem 1.125rem;
      border-radius: 16px;
      -webkit-tap-highlight-color: transparent;
    }
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

    ${PHONE} {
      width: 22px;
      height: 22px;
      margin-bottom: 0.5rem;
    }

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

    ${PHONE} {
      ${PHONE_TYPE.body}
      font-weight: 440;
    }
  `}
`;

const CardSub = styled.span`
  ${({ theme }) => css`
    font-size: 0.8125rem;
    color: ${theme.colors.default.textSecondary};

    ${PHONE} {
      ${PHONE_TYPE.secondary}
    }
  `}
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  margin-top: 1.5rem;
  animation: ${rise} 0.22s ease both;

  ${PHONE} {
    gap: 0.5rem;
    margin-top: 1.25rem;
  }

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

    ${PHONE} {
      ${PHONE_TYPE.label}
    }
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

    ${PHONE} {
      min-height: ${PHONE_SIZE.target};
      margin-right: -0.625rem;
      padding: 0 0.625rem;
      ${PHONE_TYPE.control}
    }
  `}
`;
