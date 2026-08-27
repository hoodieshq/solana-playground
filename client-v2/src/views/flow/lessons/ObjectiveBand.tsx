import { useEffect, useState } from "react";
import type { FC } from "react";
import styled, { css } from "styled-components";

import { assistantLabel, describeStep } from "./band-copy";
import { PgLessonHints } from "./hints";
import { canStepBack, currentStep } from "./progress";
import { PgLesson } from "./store";
import type { LessonState } from "./store";
import { PgAssistant } from "../../sidebar/assistant/store";

interface ObjectiveBandProps {
  state: LessonState;
  onRead: () => void;
}

/**
 * One ask, above the editor, always visible.
 *
 * The whole band is the granularity finding made concrete: a single
 * action per step reads faster than a chapter, and the verification
 * condition sits under it in plain words so the learner knows what they
 * are aiming at.
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

  const askForHelp = () => {
    const prompt = PgLessonHints.nextPrompt(step, state.attempted);
    if (prompt) PgAssistant.requestPrompt(prompt);
  };

  return (
    <Wrapper>
      <Back
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
        &#8592;
      </Back>
      <Text>
        <Eyebrow>{described.number}</Eyebrow>
        <Objective>{described.objective}</Objective>
        <VerifiedBy>{described.verifiedBy}</VerifiedBy>
      </Text>
      {step.readPage && (
        <Secondary type="button" onClick={onRead}>
          Read the page
        </Secondary>
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
    </Wrapper>
  );
};

export default ObjectiveBand;

const Wrapper = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin: 0.5rem;
    padding: 0.75rem 0.875rem;
    border: 1px solid ${theme.colors.default.primary};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
  `}
`;

// Leads the band rather than joining the actions on the right: it moves you
// between steps, it does not act on this one
const Back = styled.button`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 9999px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font: inherit;
    cursor: pointer;

    &:disabled {
      opacity: 0.35;
      cursor: default;
    }

    &:not(:disabled):hover {
      border-color: ${theme.colors.default.primary};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }
  `}
`;

const Text = styled.div`
  flex: 1;
  min-width: 14rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const Eyebrow = styled.span`
  ${({ theme }) => css`
    font-size: ${theme.font.other.size.small};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Objective = styled.span`
  color: ${({ theme }) => theme.colors.default.textPrimary};
  font-weight: 600;
`;

const VerifiedBy = styled.span`
  ${({ theme }) => css`
    font-size: ${theme.font.other.size.small};
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Secondary = styled.button`
  ${({ theme }) => css`
    padding: 0.375rem 0.75rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 9999px;
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    cursor: pointer;

    &:hover {
      border-color: ${theme.colors.default.primary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }
  `}
`;

const Primary = styled(Secondary)`
  ${({ theme }) => css`
    border-color: transparent;
    background: ${theme.colors.default.primary};
    color: ${theme.colors.default.textPrimary};
  `}
`;
