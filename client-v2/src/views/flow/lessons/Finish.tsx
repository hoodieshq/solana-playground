import { useEffect, useState } from "react";
import type { FC, FormEvent } from "react";
import styled, { css } from "styled-components";

import { PgKora } from "./kora";
import Receipt from "./Receipt";
import TutorialCover from "../gallery/TutorialCover";
import type { KoraTx } from "./kora";
import type { LessonState } from "./store";
import { BrandPill, PlayIcon } from "../stages/EmptyStage";
import { gradientStroke } from "../components/gradient";
import { BRAND } from "../tokens";
import { HEADLINE_FONT } from "../../../themes/solana-v3/theme";
import Button from "../../../components/Button";
import PlaygroundMarkNext from "../../../components/PlaygroundMarkNext";
import { PgTutorial } from "../../../utils";

/** What each step taught, in the path's order */
const LEARNED = [
  "Declaring a program and its instructions",
  "Deploying through Kora with 0 SOL",
  "Calling a program from TypeScript",
  "Passing arguments to an instruction",
];

const NEXT = {
  name: "Counter PDA Tutorial",
  meta: "Beginner · Anchor",
  framework: "Anchor",
};

/** Longest name the call takes: any name, and one line of log */
const NAME_MAX = 32;

interface FinishProps {
  state: LessonState;
  onTutorials: () => void;
  onOpenProject: () => void;
}

/**
 * The end of a tutorial, which used to just stop: the band went away and the
 * step rail filled up. It opens on the program saying your name back (step
 * 4's `hello(name)`, the moment the tutorial builds up to), then what the
 * learner did, what they learned, and the one tutorial to take next. The
 * project stays a press away.
 */
const Finish: FC<FinishProps> = ({ state, onTutorials, onOpenProject }) => {
  const [tx, setTx] = useState<KoraTx | null>(() => PgKora.lastTx);
  useEffect(() => PgKora.onDidChange(() => setTx(PgKora.lastTx)).dispose, []);
  // The finish is the result; the terminal left open by the last step would
  // cover it
  useEffect(() => PgKora.askRoom(), []);
  const [name, setName] = useState("");
  const [calling, setCalling] = useState(false);

  const steps = state.path?.steps.length ?? 0;
  const proved = state.progress.completedStepIds.length;
  const skipped = state.progress.skippedStepIds?.length ?? 0;
  const named = tx?.name ? tx : null;
  // Step 4 is proved by its build; until the new build is deployed, devnet
  // still runs the program without the name
  const behind = PgKora.behind;

  const call = async (e: FormEvent) => {
    e.preventDefault();
    const said = name.trim();
    if (!said || calling) return;
    setCalling(true);
    try {
      // The receipt below shows the call; the terminal stays where it was
      await PgKora.callHello(said, { quiet: true });
    } finally {
      setCalling(false);
    }
  };

  return (
    <Wrapper>
      <Column>
        <Mark aria-hidden>
          <PlaygroundMarkNext />
        </Mark>
        <Title>Tutorial complete</Title>
        <Lead>
          {behind
            ? "Hello Anchor is built with a name. Call hello and it goes to devnet first."
            : "Hello Anchor is live on devnet."}
        </Lead>

        <Stats>
          <Stat>
            <StatLabel>steps proved</StatLabel>
            <StatValue>
              {proved}/{steps}
            </StatValue>
          </Stat>
          <Stat>
            <StatLabel>skipped</StatLabel>
            <StatValue>{skipped}</StatValue>
          </Stat>
          <Stat title="Kora covered the rent and the fees">
            <StatLabel>you paid</StatLabel>
            <StatValue>0 SOL</StatValue>
          </Stat>
        </Stats>

        <Card aria-labelledby="finish-hello">
          <CardTitle id="finish-hello">Say hello to your program</CardTitle>
          <CardLine>
            Call <code>hello</code> with your name. It comes back in the
            transaction's log, from the <code>msg!</code> you wrote.
          </CardLine>
          <Form onSubmit={call}>
            <Field
              value={name}
              maxLength={NAME_MAX}
              placeholder="Your name"
              aria-label="Your name"
              data-shot="hello-name"
              onChange={(e) => setName(e.target.value)}
            />
            <BrandPill
              kind="primary"
              type="submit"
              data-shot="call-hello"
              disabled={!name.trim() || calling}
              rightIcon={calling ? undefined : <PlayIcon />}
            >
              {calling ? "Calling..." : "Call hello"}
            </BrandPill>
          </Form>
          {named && <Receipt key={named.signature} tx={named} />}
        </Card>

        <Section aria-labelledby="finish-learned">
          <SectionTitle id="finish-learned">What you learned</SectionTitle>
          <List>
            {/* A skipped step taught nothing yet: it stays on the list,
                unticked, as the one to come back to */}
            {LEARNED.map((l, i) => {
              const id = state.path?.steps[i]?.id;
              const skippedHere =
                !!id &&
                !state.progress.completedStepIds.includes(id) &&
                !!state.progress.skippedStepIds?.includes(id);
              return (
                <Item key={l} $muted={skippedHere}>
                  {skippedHere ? (
                    <Open aria-hidden />
                  ) : (
                    <Tick aria-hidden viewBox="0 0 16 16">
                      <path d="M3.5 8.5l3 3 6-7" />
                    </Tick>
                  )}
                  {l}
                  {skippedHere && <SkippedNote>skipped</SkippedNote>}
                </Item>
              );
            })}
          </List>
        </Section>

        <Section aria-labelledby="finish-next">
          <SectionTitle id="finish-next">Up next</SectionTitle>
          <Next
            type="button"
            onClick={() => PgTutorial.open(NEXT.name)}
            aria-label={`Start ${NEXT.name}`}
          >
            <Thumb name={NEXT.name} framework={NEXT.framework} />
            <NextText>
              <NextName>{NEXT.name}</NextName>
              <NextMeta>{NEXT.meta}</NextMeta>
            </NextText>
            <NextGo>Start</NextGo>
          </Next>
        </Section>

        <Actions>
          <Button kind="outline" onClick={onTutorials}>
            Back to tutorials
          </Button>
          <Button kind="outline" onClick={onOpenProject}>
            Open the project
          </Button>
        </Actions>
      </Column>
    </Wrapper>
  );
};

export default Finish;

/* Over the stage, as the reader is, scrolling on its own */
const Wrapper = styled.div`
  ${({ theme }) => css`
    background: ${theme.colors.default.bgSecondary};
  `}
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 2.5rem 1.5rem 3rem;
`;

const Column = styled.div`
  width: 100%;
  max-width: 34rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  /* The wrapper scrolls; nothing in the column may shrink to fit it instead */
  & > * {
    flex-shrink: 0;
  }
  animation: finish-rise 220ms cubic-bezier(0.2, 0, 0, 1) both;

  @keyframes finish-rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* The mark in the brand's ring: the gradient on the stroke, as for what is
   selected, so the one finished thing on screen wears it */
const Mark = styled.div`
  ${({ theme }) => css`
    ${gradientStroke(theme.colors.state.hover.bg, "1.5px")}
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${theme.colors.default.textPrimary};

    & > svg {
      width: 1.75rem;
      height: auto;
    }
  `}
`;

const Title = styled.h2`
  ${({ theme }) => css`
    margin: 1rem 0 0;
    font-family: ${HEADLINE_FONT};
    font-size: 1.75rem;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Lead = styled.p`
  ${({ theme }) => css`
    margin: 0.375rem 0 0;
    font-size: 0.9375rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Stats = styled.dl`
  ${({ theme }) => css`
    width: 100%;
    margin: 1.5rem 0 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    overflow: hidden;
  `}
`;

const Stat = styled.div`
  ${({ theme }) => css`
    padding: 0.875rem 0.5rem;
    display: flex;
    /* A term comes before its value in a list; the value reads first */
    flex-direction: column-reverse;
    gap: 0.125rem;

    & + & {
      border-left: 1px solid ${theme.colors.default.border};
    }
  `}
`;

const StatValue = styled.dd`
  ${({ theme }) => css`
    margin: 0;
    font-family: ${HEADLINE_FONT};
    font-size: 1.25rem;
    font-variant-numeric: tabular-nums;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const StatLabel = styled.dt`
  ${({ theme }) => css`
    font-size: 0.75rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Card = styled.section`
  ${({ theme }) => css`
    width: 100%;
    margin-top: 1rem;
    padding: 1.125rem 1.25rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.components.tooltip.bg};
    text-align: left;
  `}
`;

const CardTitle = styled.h3`
  ${({ theme }) => css`
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 500;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const CardLine = styled.p`
  ${({ theme }) => css`
    margin: 0.25rem 0 0;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Form = styled.form`
  margin-top: 0.875rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Field = styled.input`
  ${({ theme }) => css`
    flex: 1 1 10rem;
    min-width: 0;
    height: 2.25rem;
    padding: 0 0.75rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    font-size: 0.875rem;

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }
  `}
`;





const Section = styled.section`
  width: 100%;
  margin-top: 1.75rem;
  text-align: left;
`;

const SectionTitle = styled.h3`
  ${({ theme }) => css`
    margin: 0 0 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const Item = styled.li<{ $muted?: boolean }>`
  ${({ theme, $muted }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: ${$muted
      ? theme.colors.default.textSecondary
      : theme.colors.default.textPrimary};
  `}
`;

const Open = styled.span`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 0.75rem;
    height: 0.75rem;
    margin: 0 0.0625rem;
    border: 1.5px solid ${theme.colors.default.textSecondary};
    border-radius: 999px;
    box-sizing: border-box;
  `}
`;

const SkippedNote = styled.span`
  ${({ theme }) => css`
    font-size: 0.75rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Tick = styled.svg`
  flex-shrink: 0;
  width: 0.875rem;
  height: 0.875rem;
  fill: none;
  stroke: ${BRAND.green};
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

const Next = styled.button`
  ${({ theme }) => css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: ${theme.colors.state.hover.bg};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }
  `}
`;

/* The gallery's thumbnail, so the cover reads the same here */
const Thumb = styled(TutorialCover)`
  width: 3.5rem;
  height: 2.625rem;
  border-radius: 8px;
`;

const NextText = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const NextName = styled.span`
  ${({ theme }) => css`
    font-size: 0.875rem;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const NextMeta = styled.span`
  ${({ theme }) => css`
    font-size: 0.75rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const NextGo = styled.span`
  ${({ theme }) => css`
    font-size: 0.8125rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Actions = styled.div`
  margin-top: 1.75rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
`;
