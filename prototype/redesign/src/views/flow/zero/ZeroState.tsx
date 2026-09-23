import { FC, ReactNode, useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import ProgramsTab from "../gallery/ProgramsTab";
import type { ProgramListing } from "../gallery/ProgramsTab";
import StartFromScratch from "../gallery/StartFromScratch";
import TutorialsTab from "../gallery/TutorialsTab";
import Composer from "../components/Composer";
import { gradientStroke } from "../components/gradient";
import { PgCommon, PgTutorial } from "../../../utils";

/**
 * What you meet with no project open: a bar across the top of the window, and
 * one column in the middle — a mark, a question, the composer, three ways in,
 * and the gallery under them.
 *
 * Positions follow the reference product screen by screen: the mark and the
 * switches on the left of the bar, search in its centre with the shortcut
 * shown, the composer at 46rem with its controls along the bottom edge, three
 * equal cards beneath it. What each thing *is* stays ours — Start, Tutorials,
 * Programs; New project, Follow a tutorial, Open a program — because those are
 * the things this product actually has.
 *
 * Rendered as `display: contents`, so the bar and the body take their places
 * in the layout grid Flow draws around the sidebar.
 */

interface ZeroStateProps {
  /** Opens the assistant column so a question has somewhere to go */
  onAskAssistant: () => void;
  /** Cluster, wallet and account — the right end of the bar, as in a project */
  status?: ReactNode;
}

type Switch = "start" | "tutorials" | "programs";

const PROGRAMS_URL = "/programs/programs.json";

const ZeroState: FC<ZeroStateProps> = ({ onAskAssistant, status }) => {
  const [active, setActive] = useState<Switch>("start");
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

  // A switch changes what is under the composer; it never opens a window
  const pick = (id: Switch) => {
    setActive(id);
    setQuery("");
  };

  const onStart = active === "start";

  return (
    <Shell>
      <TopBar>
        <BarLeft>
          <Wordmark type="button" onClick={() => pick("start")}>
            Playground
          </Wordmark>
          <Switches role="tablist" aria-label="Where to start">
            {SWITCHES.map(({ id, label, icon }) => (
              <Tab
                key={id}
                type="button"
                role="tab"
                id={`zero-tab-${id}`}
                aria-selected={active === id}
                aria-controls="zero-panel"
                $active={active === id}
                onClick={() => pick(id)}
              >
                <Glyph aria-hidden="true">{icon}</Glyph>
                {label}
              </Tab>
            ))}
          </Switches>
        </BarLeft>

        {onStart ? (
          <SearchButton type="button" onClick={() => pick("tutorials")}>
            <Glyph aria-hidden="true">{ICONS.search}</Glyph>
            <span>Search</span>
            <Kbd>⌘K</Kbd>
          </SearchButton>
        ) : (
          <SearchWrap>
            <Glyph aria-hidden="true">{ICONS.search}</Glyph>
            <SearchInput
              type="search"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${active}`}
              aria-label={`Search ${active}`}
            />
            <Kbd>⌘K</Kbd>
          </SearchWrap>
        )}

        <BarRight>
          {status}
          <IconButton
            as="a"
            href="https://solana.com/docs"
            target="_blank"
            rel="noreferrer"
            aria-label="Documentation"
          >
            {ICONS.help}
          </IconButton>
        </BarRight>
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
              <Card type="button" onClick={() => pick("tutorials")}>
                <CardIcon aria-hidden="true">{ICONS.book}</CardIcon>
                <CardTitle>Follow a tutorial</CardTitle>
                <CardSub>{PgTutorial.all.length} guided paths</CardSub>
              </Card>
              <Card type="button" onClick={() => pick("programs")}>
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
            role="tabpanel"
            aria-labelledby={`zero-tab-${active}`}
            key={active + (scratchOpen ? "-scratch" : "")}
          >
            {onStart && scratchOpen && <StartFromScratch />}
            {onStart && (
              <>
                <PanelHead>
                  <PanelLabel>Or learn from one of these</PanelLabel>
                  <PanelMore type="button" onClick={() => pick("tutorials")}>
                    All {PgTutorial.all.length}
                  </PanelMore>
                </PanelHead>
                <Clip $rows={2}>
                  <TutorialsTab query="" />
                </Clip>
              </>
            )}
            {active === "tutorials" && <TutorialsTab query={query} />}
            {active === "programs" && (
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

const SWITCHES: Array<{ id: Switch; label: string; icon: JSX.Element }> = [
  { id: "start", label: "Start", icon: ICONS.spark },
  { id: "tutorials", label: "Tutorials", icon: ICONS.book },
  { id: "programs", label: "Programs", icon: ICONS.code },
];

/* ── layout ────────────────────────────────────────────────────────────── */

const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
`;

const Shell = styled.div`
  display: contents;
`;

/* 3.5rem, the width of the window, sidebar included. Mark and switches left,
   search dead centre, the rest on the right. */
const TopBar = styled.header`
  ${({ theme }) => css`
    grid-area: top;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    height: 3.5rem;
    padding: 0 0.75rem 0 1rem;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const BarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  /* The zones either side may shrink; the search field in the middle keeps
     its width, which is what stopped it being squeezed to 247px. */
  min-width: 0;
  overflow: hidden;
`;

const BarRight = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  min-width: 0;
  overflow: hidden;
`;

/* The brand says its name here too, and clicking it returns to Start. */
const Wordmark = styled.button`
  ${({ theme }) => css`
    flex-shrink: 0;
    height: 1.875rem;
    margin-right: 0.375rem;
    padding: 0 0.5rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    font-family: inherit;
    font-size: 0.9375rem;
    font-weight: 700;
    letter-spacing: -0.015em;
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      background: ${theme.colors.state.hover.bg};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }
  `}
`;

const Switches = styled.div`
  display: flex;
  align-items: center;
  gap: 0.125rem;
`;

/* The current one is a filled pill; the others are plain text with their
   glyph. One way of saying "this one", used again by the framework picker. */
const Tab = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    height: 1.875rem;
    padding: 0 0.75rem;
    border: 1px solid transparent;
    border-radius: 999px;
    background: transparent;
    ${$active && gradientStroke(theme.colors.state.hover.bg)}
    color: ${$active
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: ${$active ? 600 : 500};
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
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

const SearchButton = styled.button`
  ${searchShape}
  text-align: left;
  cursor: pointer;

  /* The label, not the glyph — both are spans, and a rule on the tag alone
     gave the icon half the box and pushed the word to the middle. */
  & > span:not([aria-hidden]) {
    flex: 1;
    text-align: left;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.default.textSecondary};
  }
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

const Kbd = styled.kbd`
  ${({ theme }) => css`
    font-family: inherit;
    font-size: 0.75rem;
    color: ${theme.colors.state.disabled.color};
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
  grid-area: body;
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
    font-size: 1.375rem;
    font-weight: 400;
    letter-spacing: -0.01em;
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
    font-weight: 600;
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
