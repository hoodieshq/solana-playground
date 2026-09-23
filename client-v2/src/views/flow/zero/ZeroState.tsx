import { FC, useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import ProgramsTab from "../gallery/ProgramsTab";
import type { ProgramListing } from "../gallery/ProgramsTab";
import StartFromScratch from "../gallery/StartFromScratch";
import TutorialsTab from "../gallery/TutorialsTab";
import { PgCommon, PgTutorial } from "../../../utils";

/**
 * What you meet with no project open.
 *
 * Built from the zero-state frame in the Figma (node 23:4): a top bar of
 * switches, one question in the middle, a prompt box under it, and a row of
 * suggestions below that. Two things are ours rather than the frame's.
 *
 * The switches are Start, Tutorials and Programs, not Chat/Agent/Code/Design —
 * those are another product's modes, and the ones here match content this app
 * actually has (the gallery's own two tabs, plus the page you are on).
 *
 * The suggestions are the three ways a Playground project actually begins,
 * and each opens the thing it names. The frame's Create/Develop/Collaborate
 * describe a product that does not exist here.
 */

interface ZeroStateProps {
  /** Opens the assistant column so a question has somewhere to go */
  onAskAssistant: () => void;
}

type Switch = "start" | "tutorials" | "programs";

const PROGRAMS_URL = "/programs/programs.json";

const ZeroState: FC<ZeroStateProps> = ({ onAskAssistant }) => {
  const [active, setActive] = useState<Switch>("start");
  const [query, setQuery] = useState("");
  const [programs, setPrograms] = useState<ProgramListing[] | null>(null);

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

  // A switch changes what is under the prompt; it never opens a window over it
  const pick = (id: Switch) => {
    setActive(id);
    setQuery("");
  };

  return (
    <Wrapper>
      <TopBar>
        <Switches role="tablist" aria-label="Where to start">
          {SWITCHES.map(({ id, label }) => (
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
              {label}
              {id === "tutorials" && <Count>{PgTutorial.all.length}</Count>}
              {id === "programs" && (
                <Count>{programs ? programs.length : "…"}</Count>
              )}
            </Tab>
          ))}
        </Switches>

        <TopRight>
          {active === "start" ? (
            <SearchBox type="button" onClick={() => pick("tutorials")}>
              <Glyph aria-hidden="true">{ICONS.search}</Glyph>
              Search tutorials and programs
            </SearchBox>
          ) : (
            <SearchField
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${active}`}
              aria-label={`Search ${active}`}
            />
          )}
          <IconButton
            as="a"
            href="https://solana.com/docs"
            target="_blank"
            rel="noreferrer"
            aria-label="Documentation"
          >
            <Glyph aria-hidden="true">{ICONS.help}</Glyph>
          </IconButton>
        </TopRight>
      </TopBar>

      <Scroll>
        <Stage>
          {/* The lead and the prompt belong to Start. Moving to a list slides
              them out rather than cutting, so the two states read as one
              surface rearranging rather than two pages swapping. */}
          <Lead $shown={active === "start"}>
            <Mark aria-hidden="true">{ICONS.asterisk}</Mark>
            <Title>Where should we begin?</Title>
          </Lead>

          <Composer $tight={active !== "start"}>
            <ComposerInput
              type="button"
              onClick={onAskAssistant}
              aria-label="Ask the assistant"
            >
              Ask anything…
            </ComposerInput>
            <ComposerBar>
              <BarLeft>
                <Chip type="button" onClick={onAskAssistant} aria-label="Attach">
                  {ICONS.plus}
                </Chip>
                <Chip type="button" onClick={onAskAssistant} aria-label="Tools">
                  {ICONS.grid}
                </Chip>
                <ModeButton type="button" onClick={onAskAssistant}>
                  <Glyph aria-hidden="true">{ICONS.send}</Glyph>
                  Assistant
                </ModeButton>
              </BarLeft>
              <BarRight>
                <ModelButton type="button" onClick={onAskAssistant}>
                  <Glyph aria-hidden="true">{ICONS.asterisk}</Glyph>
                  Model
                  <Glyph aria-hidden="true">{ICONS.chevron}</Glyph>
                </ModelButton>
                <Send type="button" onClick={onAskAssistant} aria-label="Send">
                  {ICONS.up}
                </Send>
              </BarRight>
            </ComposerBar>
          </Composer>

          <Panel
            id="zero-panel"
            role="tabpanel"
            aria-labelledby={`zero-tab-${active}`}
            key={active}
          >
            {active === "start" && (
              <>
                <StartFromScratch />
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
      </Scroll>
    </Wrapper>
  );
};

export default ZeroState;

const SWITCHES: Array<{ id: Switch; label: string }> = [
  { id: "start", label: "Start" },
  { id: "tutorials", label: "Tutorials" },
  { id: "programs", label: "Programs" },
];

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
  globe: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
    </>
  ),
  asterisk: svg(
    <>
      <path d="M12 4v16M4.9 7.5l14.2 9M19.1 7.5l-14.2 9" />
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
  up: svg(
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  cpu: svg(
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </>
  ),
  blank: svg(
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
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

const Wrapper = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex: 1;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
    background: ${theme.colors.default.bgPrimary};
  `}
`;

const TopBar = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    height: 4rem;
    flex-shrink: 0;
    padding: 0 2rem;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const Switches = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

/* Pills, not underlines: the frame marks the current one with a filled shape,
   which survives on a dark ground where a 2px rule under text does not. */
const Tab = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 999px;
    background: ${$active ? theme.colors.default.bgSecondary : "transparent"};
    color: ${$active
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: ${theme.font.other.size.small};
    font-weight: ${$active ? 600 : 500};
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

const TopRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SearchBox = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 17rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 8px;
    background: ${theme.colors.default.bgSecondary};
    color: ${theme.colors.state.disabled.color};
    font-family: inherit;
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;

    &:hover {
      border-color: ${theme.colors.default.border};
      color: ${theme.colors.default.textSecondary};
    }
  `}
`;

const IconButton = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: none;
    border-radius: 999px;
    background: ${theme.colors.default.bgSecondary};
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }
  `}
`;

const Glyph = styled.span`
  display: flex;
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

/* Motion: one surface rearranging, not two pages swapping. Everything moves
   on the same short curve, and anyone who has asked their system not to
   animate gets none of it. */
const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
`;

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
`;

/* Collapses out of the way on a list tab rather than disappearing: the height
   and the fade run together, so the prompt rises into the space. */
const Lead = styled.div<{ $shown: boolean }>`
  ${({ $shown }) => css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.875rem;
    text-align: center;
    overflow: hidden;
    opacity: ${$shown ? 1 : 0};
    max-height: ${$shown ? "8rem" : "0"};
    margin-bottom: ${$shown ? "0" : "-1rem"};
    transition: opacity 0.18s ease, max-height 0.28s ease, margin-bottom 0.28s ease;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

/* The composer. Two rows: where you type, and the controls under it. Sized off
   the reference — 14px radius, a 3.5rem typing area, 2rem control chips — so
   it reads as one object rather than a box with buttons parked in it. */
const Composer = styled.div<{ $tight?: boolean }>`
  ${({ theme, $tight }) => css`
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    width: min(44rem, 100%);
    padding: ${$tight ? "0.75rem" : "0.875rem"};
    border: 1px solid ${theme.colors.default.border};
    border-radius: 14px;
    background: ${theme.colors.default.bgSecondary};
    transition: padding 0.28s ease, border-color 0.15s ease;

    &:hover {
      border-color: ${theme.colors.state.hover.bg};
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const ComposerInput = styled.button`
  ${({ theme }) => css`
    display: block;
    width: 100%;
    min-height: 3.25rem;
    padding: 0.5rem 0.5rem 0;
    border: none;
    background: none;
    color: ${theme.colors.state.disabled.color};
    font-family: inherit;
    font-size: 0.9375rem;
    text-align: left;
    cursor: text;
  `}
`;

const ComposerBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const BarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const BarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const Chip = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
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
  `}
`;

const ModeButton = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    height: 2rem;
    padding: 0 0.625rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }
  `}
`;

const ModelButton = styled(ModeButton)``;

const Send = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: ${theme.colors.default.primary};
    color: #fff;
    cursor: pointer;

    & > svg {
      width: 0.9375rem;
      height: 0.9375rem;
    }

    &:hover {
      filter: brightness(1.1);
    }
  `}
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
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

/* Sentence case, same size and colour as the sidebar's section headings. The
   uppercase tracked version read as a second typeface at a glance, which is
   most of what "not consistent" meant. */
const PanelLabel = styled.span`
  ${({ theme }) => css`
    font-size: 0.8125rem;
    font-weight: 400;
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
    font-size: ${theme.font.other.size.xsmall};
    cursor: pointer;

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }
  `}
`;

/* Start shows the first couple of rows of the tutorial grid and hands the rest
   to its own tab, so the page below the prompt stays short. */
const Clip = styled.div<{ $rows: number }>`
  ${({ $rows }) => css`
    max-height: ${$rows * 8.5}rem;
    overflow: hidden;
    mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
  `}
`;

const Count = styled.span`
  ${({ theme }) => css`
    margin-left: 0.4375rem;
    font-size: 0.6875rem;
    font-weight: 500;
    color: ${theme.colors.state.disabled.color};
  `}
`;

const SearchField = styled.input`
  ${({ theme }) => css`
    width: 17rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 8px;
    background: ${theme.colors.default.bgSecondary};
    color: ${theme.colors.default.textPrimary};
    font-family: inherit;
    font-size: 0.8125rem;

    &::placeholder {
      color: ${theme.colors.state.disabled.color};
    }

    &:focus {
      outline: none;
      border-color: ${theme.colors.default.border};
    }
  `}
`;

const Stage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.75rem;
  width: min(64rem, 100%);
  margin: 0 auto;
  padding: 3rem 2rem 4rem;
`;



/* 1.375rem, regular weight. The reference asks a question at reading size and
   lets the composer below it carry the page; a 40px bold headline made the
   same words shout. */
const Title = styled.h1`
  ${({ theme }) => css`
    margin: 0;
    font-size: 1.375rem;
    font-weight: 400;
    letter-spacing: -0.01em;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Mark = styled.span`
  ${({ theme }) => css`
    display: flex;
    width: 1.5rem;
    height: 1.5rem;
    color: ${theme.colors.default.textPrimary};

    & > svg {
      width: 100%;
      height: 100%;
    }
  `}
`;

/* Shaped like the composer it stands in for. Clicking it opens the assistant
   rather than accepting a sentence with nowhere to send it. */
