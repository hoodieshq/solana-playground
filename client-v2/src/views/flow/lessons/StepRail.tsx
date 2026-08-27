import type { FC } from "react";
import styled, { css } from "styled-components";

import { currentStep } from "./progress";
import type { LessonState } from "./store";

interface StepRailProps {
  state: LessonState;
}

/**
 * The lesson's steps, marked with what actually confirmed them.
 *
 * Rows are deliberately not clickable. The ratchet is the navigation: a
 * click that skipped a verified step would hand back exactly what this
 * design exists to take away.
 */
const StepRail: FC<StepRailProps> = ({ state }) => {
  const { path, progress } = state;
  if (!path) return null;

  const active = currentStep(path, progress);

  return (
    <List>
      {path.steps.map((step) => {
        const done = progress.completedStepIds.includes(step.id);
        const skipped = !!progress.skippedStepIds?.includes(step.id);
        const isCurrent = step.id === active?.id;
        const status = done
          ? "done"
          : skipped
          ? "skipped"
          : isCurrent
          ? "current"
          : "locked";

        return (
          <Row key={step.id} $status={status}>
            <Mark $status={status} aria-hidden>
              {done ? (
                <>&#10003;</>
              ) : skipped ? (
                <>&#8594;</>
              ) : isCurrent ? (
                <>&#9679;</>
              ) : (
                <>&#9675;</>
              )}
            </Mark>
            <Text>
              <Objective>{step.objective}</Objective>
              <Meta>
                {done
                  ? step.verifiedBy
                  : skipped
                  ? "skipped — not verified"
                  : isCurrent
                  ? `aiming at ${step.target}`
                  : "locked"}
              </Meta>
            </Text>
          </Row>
        );
      })}
    </List>
  );
};

export default StepRail;

type Status = "done" | "skipped" | "current" | "locked";

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Row = styled.div<{ $status: Status }>`
  ${({ theme, $status }) => css`
    display: grid;
    grid-template-columns: 1rem 1fr;
    gap: 0.5rem;
    align-items: start;
    padding: 0.5rem;
    border: 1px solid
      ${$status === "current" ? theme.colors.default.primary : "transparent"};
    border-radius: ${theme.default.borderRadius};
    background: ${$status === "current"
      ? theme.colors.default.bgSecondary
      : "transparent"};
    opacity: ${rowOpacity($status)};
  `}
`;

const Mark = styled.span<{ $status: Status }>`
  ${({ theme, $status }) => css`
    color: ${$status === "done"
      ? theme.colors.default.secondary
      : $status === "current"
      ? theme.colors.default.primary
      : theme.colors.default.textSecondary};
  `}
`;

// A skipped row reads as passed-over, never as finished
const rowOpacity = (status: Status) =>
  status === "locked" ? 0.5 : status === "skipped" ? 0.7 : 1;

const Text = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const Objective = styled.span`
  color: ${({ theme }) => theme.colors.default.textPrimary};
`;

const Meta = styled.span`
  ${({ theme }) => css`
    font-size: ${theme.font.other.size.small};
    color: ${theme.colors.default.textSecondary};
  `}
`;
