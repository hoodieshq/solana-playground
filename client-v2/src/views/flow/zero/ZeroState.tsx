import { FC, useState } from "react";
import styled, { css } from "styled-components";

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
  /** Opens the project gallery, optionally on one of its tabs */
  onOpenGallery: () => void;
  /** Opens the assistant column so a question has somewhere to go */
  onAskAssistant: () => void;
}

type Switch = "start" | "tutorials" | "programs";

const ZeroState: FC<ZeroStateProps> = ({ onOpenGallery, onAskAssistant }) => {
  const [active, setActive] = useState<Switch>("start");

  const pick = (id: Switch) => {
    setActive(id);
    // Both of the others live in the gallery, which is a modal; the switch
    // returns to Start when it closes, which is where the page still is.
    if (id !== "start") {
      onOpenGallery();
      setActive("start");
    }
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
              aria-selected={active === id}
              $active={active === id}
              onClick={() => pick(id)}
            >
              {label}
            </Tab>
          ))}
        </Switches>

        <TopRight>
          <SearchBox type="button" onClick={onOpenGallery}>
            <Glyph aria-hidden="true">{ICONS.search}</Glyph>
            Search tutorials and programs
          </SearchBox>
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

      <Stage>
        <Lead>
          <Title>What are we building today?</Title>
          <Subtitle>
            Start from scratch, follow a tutorial, or open a real program.
            Everything stays in this browser until you deploy.
          </Subtitle>
        </Lead>

        <Prompt type="button" onClick={onAskAssistant}>
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

        <Suggested>
          <SuggestedLabel>Ways to start</SuggestedLabel>
          <Cards>
            {CARDS.map(({ id, icon, title, body }) => (
              <Card key={id} type="button" onClick={onOpenGallery}>
                <CardIcon aria-hidden="true">{icon}</CardIcon>
                <CardTitle>{title}</CardTitle>
                <CardBody>{body}</CardBody>
              </Card>
            ))}
          </Cards>
        </Suggested>
      </Stage>
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

const CARDS = [
  {
    id: "blank",
    icon: ICONS.blank,
    title: "Blank canvas",
    body: "A working starter in Anchor, Native or Seahorse.",
  },
  {
    id: "tutorial",
    icon: ICONS.book,
    title: "Follow a tutorial",
    body: "Sixteen of them, from hello world to on-chain automation.",
  },
  {
    id: "program",
    icon: ICONS.code,
    title: "Open a program",
    body: "Thirty-four real programs to read, run and change.",
  },
];

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

const Stage = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3rem;
  padding: 3rem 2rem;
  overflow-y: auto;
`;

const Lead = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
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
const Prompt = styled.button`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: min(42.5rem, 100%);
    padding: 1.25rem;
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

const Suggested = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const SuggestedLabel = styled.span`
  ${({ theme }) => css`
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: ${theme.colors.state.disabled.color};
  `}
`;

const Cards = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
`;

const Card = styled.button`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 15rem;
    padding: 1.5rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 16px;
    background: ${theme.colors.default.bgSecondary};
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease;

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
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 8px;
    background: ${theme.colors.default.bgPrimary};
    color: ${theme.colors.default.textPrimary};

    & > svg {
      width: 1.25rem;
      height: 1.25rem;
    }
  `}
`;

const CardTitle = styled.span`
  ${({ theme }) => css`
    font-size: 1rem;
    font-weight: 600;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const CardBody = styled.span`
  ${({ theme }) => css`
    font-size: 0.8125rem;
    line-height: 1.45;
    color: ${theme.colors.default.textSecondary};
  `}
`;
