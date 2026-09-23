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
            <Title>What are we building today?</Title>
            <Subtitle>
              Start from scratch, follow a tutorial, or open a real program.
              Everything stays in this browser until you deploy.
            </Subtitle>
          </Lead>

          <Prompt type="button" onClick={onAskAssistant} $tight={active !== "start"}>
            <PromptPlaceholder>Ask anything about Solana…</PromptPlaceholder>
            <PromptActions>
              <PromptLeft>
                <PromptChip aria-hidden="true">{ICONS.plus}</PromptChip>
                <PromptChip aria-hidden="true">{ICONS.globe}</PromptChip>
              </PromptLeft>
              <ModePill>
                <Glyph aria-hidden="true">{ICONS.cpu}</Glyph>
                Assistant
              </ModePill>
            </PromptActions>
          </Prompt>

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
                    All {PgTutorial.all.length} tutorials
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
    gap: 0.75rem;
    text-align: center;
    overflow: hidden;
    opacity: ${$shown ? 1 : 0};
    max-height: ${$shown ? "12rem" : "0"};
    margin-bottom: ${$shown ? "0" : "-1rem"};
    transition: opacity 0.18s ease, max-height 0.28s ease, margin-bottom 0.28s ease;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
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

const PanelLabel = styled.span`
  ${({ theme }) => css`
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
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



const Title = styled.h1`
  ${({ theme }) => css`
    margin: 0;
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Subtitle = styled.p`
  ${({ theme }) => css`
    margin: 0;
    max-width: 34rem;
    font-size: 1rem;
    line-height: 1.5;
    color: ${theme.colors.default.textSecondary};
  `}
`;

/* Shaped like the composer it stands in for. Clicking it opens the assistant
   rather than accepting a sentence with nowhere to send it. */
const Prompt = styled.button<{ $tight?: boolean }>`
  ${({ theme, $tight }) => css`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: min(42.5rem, 100%);
    padding: ${$tight ? "0.875rem 1rem" : "1.25rem"};
    transition: padding 0.28s ease, border-color 0.15s ease;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
    border: 1px solid ${theme.colors.default.border};
    border-radius: 16px;
    background: ${theme.colors.default.bgSecondary};
    font-family: inherit;
    text-align: left;
    cursor: text;

    &:hover {
      border-color: ${theme.colors.state.hover.bg};
    }
  `}
`;

const PromptPlaceholder = styled.span`
  ${({ theme }) => css`
    font-size: 0.9375rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const PromptActions = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const PromptLeft = styled.span`
  display: flex;
  gap: 0.5rem;
`;

const PromptChip = styled.span`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 8px;
    background: ${theme.colors.default.bgPrimary};
    color: ${theme.colors.default.textSecondary};

    & > svg {
      width: 1rem;
      height: 1rem;
    }
  `}
`;

const ModePill = styled.span`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    background: ${theme.colors.default.bgPrimary};
    color: ${theme.colors.default.textPrimary};
    font-size: 0.8125rem;
    font-weight: 600;
  `}
`;

