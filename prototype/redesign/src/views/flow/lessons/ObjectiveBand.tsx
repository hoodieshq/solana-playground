import { useEffect, useState } from "react";
import type { FC } from "react";
import styled, { css } from "styled-components";

import { assistantLabel, describeStep } from "./band-copy";
import { PgLessonHints } from "./hints";
import { canStepBack, canStepForward, currentStep } from "./progress";
import { PgLesson } from "./store";
import type { LessonState } from "./store";
import { PgAssistant } from "../../sidebar/assistant/store";
import { GRADIENT_FLAT } from "../components/gradient";
import { BRAND, HEAD_INSET } from "../tokens";
import { HEADLINE_FONT } from "../../../themes/solana-v3/theme";

interface ObjectiveBandProps {
  state: LessonState;
  onRead: () => void;
}

/**
 * One ask, above the editor, always visible.
 *
 * The whole band is the granularity finding made concrete: a single
 * action per step reads faster than a chapter. It is one slim row — where
 * you are, the ask, and the one thing to press — ruled off from the editor
 * by a hairline rather than boxed. The verification condition is one click
 * (or a hover) away under the check mark, so the learner can always see
 * what they are aiming at without it standing in the row.
 */
const ObjectiveBand: FC<ObjectiveBandProps> = ({ state, onRead }) => {
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

  // Whether the condition is open under the row. It stays as the learner
  // left it from step to step: someone who wants to see what is checked
  // wants to see it every time.
  const [showCheck, setShowCheck] = useState(false);

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

  return (
    <Wrapper>
      <Row>
        <Main>
          <Count>{described.number}</Count>
          <Meter aria-hidden>
            <MeterFill
              style={{ transform: `scaleX(${verified / steps.length})` }}
            />
          </Meter>
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
          {step.readPage && (
            <Quiet type="button" onClick={onRead}>
              Read the page
            </Quiet>
          )}
          {isRead ? (
            <Primary type="button" onClick={() => PgLesson.continueRead()}>
              Continue
            </Primary>
          ) : (
            <Primary type="button" onClick={askForHelp}>
              {assistantLabel(rung, state.attempted)}
            </Primary>
          )}
        </Actions>
      </Row>

      <Condition id="flow-lesson-check" hidden={!showCheck}>
        {described.verifiedBy}
      </Condition>
    </Wrapper>
  );
};

export default ObjectiveBand;

/* Ruled off, not boxed: the same hairline the rails above it use, so the band
   reads as one more row of the workspace rather than a card laid over it. */
const Wrapper = styled.div`
  ${({ theme }) => css`
    flex-shrink: 0;
    border-bottom: 1px solid ${theme.colors.default.border};
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
    height: 1.625rem;
    margin-left: 0.25rem;
    padding: 0 0.75rem;
    border: none;
    border-radius: 999px;
    background: ${BRAND.fill};
    color: #ffffff;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: filter 140ms ease;

    &:hover {
      filter: brightness(1.08);
    }
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
