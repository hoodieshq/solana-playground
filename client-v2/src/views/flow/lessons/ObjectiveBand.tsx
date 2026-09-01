import type { FC } from "react";
import styled, { css } from "styled-components";

import { assistantLabel, describeStep, primaryLabel } from "./band-copy";
import {
  attempted,
  cursorStep,
  foldRecord,
  nextLegal,
  prevLegal,
  rung,
} from "./ledger";
import { PgLesson } from "./store";
import type { LessonState } from "./store";
import { verifyingStage } from "./verify";
import { PgAssistant } from "../../sidebar/assistant/store";
import { PgCommand } from "../../../utils";

interface ObjectiveBandProps {
  state: LessonState;
  onRead: () => void;
}

/**
 * One ask, above the editor, always visible.
 *
 * The primary action is the criterion: the control is labelled by what
 * proves the step and dispatches the same command the header stepper
 * does. The assistant sits beside it as a secondary -- the unaided
 * first attempt, bought by layout rather than by a disabled button.
 */
const ObjectiveBand: FC<ObjectiveBandProps> = ({ state, onRead }) => {
  const described = describeStep(state);
  if (!described || !state.path) return null;

  const view = foldRecord(state.path, state.record);
  const step = cursorStep(state.path, view);
  if (!step) return null;

  const spent = rung(view, step.id);
  const tried = attempted(state.path, view, step.id);
  const canGoBack = prevLegal(state.path, view) !== null;
  const canGoForward = nextLegal(state.path, view) !== null;

  const askForHelp = () => {
    const prompt = PgLesson.requestHint();
    if (prompt) PgAssistant.requestPrompt(prompt);
  };

  const prove = () => {
    const stage = verifyingStage(step.verify);
    if (stage) PgCommand[stage].execute();
    else PgLesson.attest();
  };

  return (
    <Wrapper>
      <Text>
        <Eyebrow>{described.number}</Eyebrow>
        <Objective>{described.objective}</Objective>
        <VerifiedBy>{described.verifiedBy}</VerifiedBy>
      </Text>
      <Actions>
        <Nav
          type="button"
          disabled={!canGoBack}
          aria-label="Previous step"
          title={
            canGoBack
              ? "Go back a step. Nothing already proved is undone."
              : "There is nothing to go back to"
          }
          onClick={() => PgLesson.moveBack()}
        >
          &#8592;
        </Nav>
        <Nav
          type="button"
          disabled={!canGoForward}
          aria-label="Next step"
          title={
            canGoForward
              ? "Move forward. Nothing is recorded either way."
              : "This is as far as anything proved reaches"
          }
          onClick={() => PgLesson.moveForward()}
        >
          &#8594;
        </Nav>
        {step.readPage && (
          <Secondary type="button" onClick={onRead}>
            Read the page
          </Secondary>
        )}
        <Secondary type="button" onClick={askForHelp}>
          {assistantLabel(spent, tried)}
        </Secondary>
        {described.offersPrimary && (
          <Primary type="button" onClick={prove}>
            {primaryLabel(step.verify)}
          </Primary>
        )}
      </Actions>
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

// One wrapping unit: narrow enough and the whole group drops under the text
// together, rather than the band shedding one button at a time
const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
`;

// Joins the actions on the right so the objective text stays flush left, but
// stays a bare circle: it moves you between steps rather than acting on one
const Nav = styled.button`
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
