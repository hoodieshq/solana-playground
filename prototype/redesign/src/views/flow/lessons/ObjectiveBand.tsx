import { useEffect, useState } from "react";
import type { FC } from "react";
import { frosted } from "../components/frosted";
import styled, { css } from "styled-components";

import { assistantLabel, describeStep } from "./band-copy";
import { PgLessonHints } from "./hints";
import {
  canStepBack,
  canStepForward,
  currentStep,
  stepNumber,
} from "./progress";
import { PgLesson } from "./store";
import type { LessonState } from "./store";
import { PgAssistant } from "../../sidebar/assistant/store";
import { brandAction, GRADIENT_FLAT } from "../components/gradient";
import { HEAD_INSET } from "../tokens";
import { HEADLINE_FONT } from "../../../themes/solana-v3/theme";
import { PHONE_SIZE, PHONE_TYPE, usePhone } from "../phone";

interface ObjectiveBandProps {
  state: LessonState;
  onRead: () => void;
}

/**
 * The step in view and the controls that act on it, shared by the band and,
 * on a phone, by the bar at the foot of the code.
 */
const useLessonControls = (state: LessonState, onRead: () => void) => {
  // The rung count lives outside React's data flow (a module-static map
  // on `PgLessonHints`, not `LessonState`), so reading it during render
  // needs this subscription to stay live -- without it, the label below
  // would freeze on whatever a later, unrelated render (driven only by
  // `PgFlow.onDidChange`, i.e. builds) last saw, even as clicks keep
  // climbing the ladder underneath it.
  const [, forceRender] = useState(0);
  useEffect(() => {
    const { dispose } = PgLessonHints.onDidChange(() =>
      forceRender((n) => n + 1)
    );
    return dispose;
  }, []);

  const described = describeStep(state);
  if (!described || !state.path) return null;

  // `described` truthy only narrows `describeStep`'s own return value --
  // it says nothing to TypeScript about this separately computed call,
  // so `step` still needs its own null check before it can be used below.
  const step = currentStep(state.path, state.progress);
  if (!step) return null;

  const rung = PgLessonHints.rung(step.id);
  const isRead = step.verify.kind === "read";
  const canGoBack = canStepBack(state.path, state.progress);
  const canGoForward = canStepForward(state.path, state.progress);

  // Proved steps only: a skip moves the learner on but never fills the line,
  // for the same reason the record keeps skips apart from completions.
  const { steps } = state.path;
  const verified = steps.filter((s) =>
    state.progress.completedStepIds.includes(s.id)
  ).length;

  const askForHelp = () => {
    const prompt = PgLessonHints.nextPrompt(step, state.attempted);
    if (prompt) PgAssistant.requestPrompt(prompt);
  };

  const back = (
    <Nav
      type="button"
      disabled={!canGoBack}
      aria-label="Previous step"
      title={
        canGoBack
          ? "Go back a step. Nothing already proved is undone."
          : "You are on the first step"
      }
      onClick={() => PgLesson.stepBack()}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M9.75 3.5L5.25 8l4.5 4.5" />
      </svg>
    </Nav>
  );
  const forward = (
    <Nav
      type="button"
      disabled={!canGoForward}
      aria-label="Next step"
      title={
        canGoForward
          ? "Return to where you were. Nothing is recorded either way."
          : "This is as far as you have got — build to go on, or skip the step"
      }
      onClick={() => PgLesson.stepForward()}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M6.25 3.5L10.75 8l-4.5 4.5" />
      </svg>
    </Nav>
  );
  const read = step.readPage && (
    <Quiet type="button" onClick={onRead}>
      Read the page
    </Quiet>
  );
  const primary = isRead ? (
    <Primary type="button" onClick={() => PgLesson.continueRead()}>
      Continue
    </Primary>
  ) : (
    <Primary type="button" onClick={askForHelp}>
      {assistantLabel(rung, state.attempted)}
    </Primary>
  );

  return {
    described,
    number: stepNumber(state.path, state.progress),
    count: steps.length,
    proved: verified / steps.length,
    back,
    forward,
    read,
    primary,
  };
};

/**
 * One ask, above the editor, always visible.
 *
 * The whole band is the granularity finding made concrete: a single
 * action per step reads faster than a chapter. It is one slim row — where
 * you are, the ask, and the one thing to press — ruled off from the editor
 * by a hairline rather than boxed. The verification condition is one click
 * (or a hover) away under the check mark, so the learner can always see
 * what they are aiming at without it standing in the row.
 *
 * On a phone the band is folded to that one row: which step of how many, the
 * line of what is proved, and the ask, which opens the whole task and how it
 * is checked under it. What you press lives at the foot of the code instead,
 * under the thumb, in `LessonBar`.
 */
const ObjectiveBand: FC<ObjectiveBandProps> = ({ state, onRead }) => {
  const controls = useLessonControls(state, onRead);
  // Whether the condition is open under the row. It stays as the learner
  // left it from step to step: someone who wants to see what is checked
  // wants to see it every time.
  const [showCheck, setShowCheck] = useState(false);
  const phone = usePhone();
  const [open, setOpen] = useState(false);

  if (!controls) return null;
  const { described, back, forward, read, primary } = controls;
  const meter = (
    <Meter aria-hidden>
      <MeterFill style={{ transform: `scaleX(${controls.proved})` }} />
    </Meter>
  );

  if (phone) {
    return (
      <Wrapper>
        <Fold
          type="button"
          aria-expanded={open}
          aria-controls="flow-lesson-more"
          onClick={() => setOpen((o) => !o)}
        >
          <FoldCount>
            {controls.number}/{controls.count}
            {meter}
          </FoldCount>
          <FoldObjective $open={open}>{described.objective}</FoldObjective>
          <FoldCaret $open={open} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m7 10 5 5 5-5" />
            </svg>
          </FoldCaret>
        </Fold>
        {open && (
          <More id="flow-lesson-more">
            <MoreCheck>{described.verifiedBy}</MoreCheck>
          </More>
        )}
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Row>
        <Main>
          <Count>{described.number}</Count>
          {meter}
          <Objective title={described.objective}>
            {described.objective}
          </Objective>
          <CheckToggle
            type="button"
            aria-expanded={showCheck}
            aria-controls="flow-lesson-check"
            aria-label="How this step is checked"
            title={showCheck ? undefined : described.verifiedBy}
            $on={showCheck}
            onClick={() => setShowCheck((s) => !s)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="6.25" />
              <path d="M5.4 8.2l1.8 1.8 3.4-3.7" />
            </svg>
          </CheckToggle>
        </Main>

        <Actions>
          {back}
          {forward}
          {read}
          {primary}
        </Actions>
      </Row>

      <Condition id="flow-lesson-check" hidden={!showCheck}>
        {described.verifiedBy}
      </Condition>
    </Wrapper>
  );
};

/**
 * On a phone, what the band's step asks you to press, at the foot of the
 * code where the thumb is: back and on at the start, the page and the help
 * at the end. Nothing off a phone, where the band holds them itself.
 */
export const LessonBar: FC<ObjectiveBandProps> = ({ state, onRead }) => {
  const controls = useLessonControls(state, onRead);
  const phone = usePhone();
  if (!phone || !controls) return null;

  return (
    <Bar aria-label="This step">
      {controls.back}
      {controls.forward}
      <BarEnd>
        {controls.read}
        {controls.primary}
      </BarEnd>
    </Bar>
  );
};

export default ObjectiveBand;

/* Ruled off, not boxed: the same hairline the rails above it use, so the band
   reads as one more row of the workspace rather than a card laid over it. */
const Wrapper = styled.div`
  ${({ theme }) => css`
    flex-shrink: 0;
    border-bottom: 1px solid ${theme.colors.default.border};
    ${frosted}
  `}
`;

// Wraps only when it has to, and then the actions drop under the ask as one
// group rather than the row shedding one button at a time
const Row = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  column-gap: 1rem;
  row-gap: 0.25rem;
  min-height: 2.5rem;
  padding: 0.3125rem ${HEAD_INSET};
`;

const Main = styled.div`
  flex: 1 1 18rem;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.625rem;
`;

const Count = styled.span`
  ${({ theme }) => css`
    flex-shrink: 0;
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: ${theme.colors.default.textSecondary};
  `}
`;

/* How many steps are proved, as a slim line in the brand gradient. The track
   is the hairline colour, so an untouched lesson shows a quiet dash. */
const Meter = styled.span`
  ${({ theme }) => css`
    position: relative;
    flex-shrink: 0;
    width: 2.25rem;
    height: 2px;
    border-radius: 1px;
    overflow: hidden;
    background: ${theme.colors.default.border};
  `}
`;

const MeterFill = styled.span`
  position: absolute;
  inset: 0;
  background: ${GRADIENT_FLAT};
  transform-origin: left center;
  transition: transform 400ms cubic-bezier(0.2, 0, 0, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Objective = styled.span`
  ${({ theme }) => css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ${HEADLINE_FONT};
    font-size: 0.875rem;
    font-weight: 500;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const CheckToggle = styled.button<{ $on: boolean }>`
  ${({ theme, $on }) => css`
    flex-shrink: 0;
    width: 1.375rem;
    height: 1.375rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: ${$on
      ? theme.colors.state.success.color
      : theme.colors.default.textSecondary};
    cursor: pointer;

    & > svg {
      width: 0.875rem;
      height: 0.875rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    &:hover {
      color: ${$on
        ? theme.colors.state.success.color
        : theme.colors.default.textPrimary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }
  `}
`;

const Actions = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
`;

// Bare chevrons: they move you between steps rather than acting on one
const Nav = styled.button`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;

    & > svg {
      width: 0.875rem;
      height: 0.875rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;
    }

    &:not(:disabled):hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }
  `}
`;

const Quiet = styled.button`
  ${({ theme }) => css`
    height: 1.625rem;
    margin-left: 0.25rem;
    padding: 0 0.625rem;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font: inherit;
    font-size: 0.8125rem;
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }
  `}
`;

/* The one clear action in the row: the landing's green-into-purple, small */
const Primary = styled.button`
  ${({ theme }) => css`
    ${brandAction(theme.colors.state.hover.bg)}
    height: 1.625rem;
    margin-left: 0.25rem;
    padding: 0 0.75rem;
    border-radius: 999px;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const Condition = styled.p`
  ${({ theme }) => css`
    margin: -0.125rem 0 0;
    padding: 0 ${HEAD_INSET} 0.5rem;
    font-size: 0.75rem;
    line-height: 1.5;
    color: ${theme.colors.default.textSecondary};

    &[hidden] {
      display: none;
    }
  `}
`;

/* ── a phone's band ─────────────────────────────────────────────────────── */

/* The one row, a pane's head in height: pressed, it opens the rest */
const Fold = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: ${PHONE_SIZE.head};
    padding: 0 0.75rem 0 1.25rem;
    border: none;
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:active {
      background: ${theme.colors.state.hover.bg};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;

/* Which step of how many, over the line of what is proved */
const FoldCount = styled.span`
  ${({ theme }) => css`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    ${PHONE_TYPE.label}
    font-variant-numeric: tabular-nums;
    color: ${theme.colors.default.textSecondary};

    & > ${Meter} {
      width: 1.75rem;
    }
  `}
`;

/* One line while folded; the whole task once open */
const FoldObjective = styled.span<{ $open: boolean }>`
  ${({ $open }) => css`
    flex: 1;
    min-width: 0;
    padding: ${$open ? "0.75rem 0" : "0"};
    ${PHONE_TYPE.control}
    ${!$open &&
    css`
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `}
  `}
`;

const FoldCaret = styled.span<{ $open: boolean }>`
  ${({ theme, $open }) => css`
    flex-shrink: 0;
    display: flex;
    width: 20px;
    height: 20px;
    color: ${theme.colors.default.textSecondary};
    transform: rotate(${$open ? 180 : 0}deg);
    transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);

    & > svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.6;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const More = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 0.5rem 0.625rem 1.25rem;
`;

const MoreCheck = styled.p`
  ${({ theme }) => css`
    margin: 0;
    padding-right: 0.75rem;
    ${PHONE_TYPE.secondary}
    color: ${theme.colors.default.textSecondary};
  `}
`;

/* The foot of the code on a phone: every page's bar height, the thumb's */
const Bar = styled.div`
  ${({ theme }) => css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-height: calc(${PHONE_SIZE.bar} + env(safe-area-inset-bottom, 0px));
    padding: 0 0.5rem env(safe-area-inset-bottom, 0px) 0.375rem;
    border-top: 1px solid ${theme.colors.default.border};
    ${frosted}

    & > ${Nav} {
      width: ${PHONE_SIZE.target};
      height: ${PHONE_SIZE.target};

      & > svg {
        width: 20px;
        height: 20px;
      }
    }
  `}
`;

const BarEnd = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;

  & > ${Quiet}, & > ${Primary} {
    height: ${PHONE_SIZE.target};
    margin-left: 0;
    padding: 0 1rem;
    ${PHONE_TYPE.control}
  }

  & > ${Primary} {
    padding: 0 1.25rem;
  }
`;
