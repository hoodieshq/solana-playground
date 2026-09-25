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
 * Drawn as a timeline: one mark per step and a hairline between them that
 * turns green along the stretch the toolchain has proved, dashed where the
 * learner skipped. The current step is the purple mark and the brighter
 * title — no box around it.
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
      {path.steps.map((step, i) => {
        const done = progress.completedStepIds.includes(step.id);
        const skipped = !!progress.skippedStepIds?.includes(step.id);
        const isCurrent = step.id === active?.id;
        const status: Status = done
          ? "done"
          : skipped
          ? "skipped"
          : isCurrent
          ? "current"
          : "locked";

        return (
          <Row
            key={step.id}
            $status={status}
            aria-current={isCurrent ? "step" : undefined}
          >
            <Rail $status={status} $last={i === path.steps.length - 1}>
              <Mark status={status} />
            </Rail>
            <Text>
              <Objective $status={status}>{step.objective}</Objective>
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

/** The mark's box: one line of the title, so the mark sits on its first line */
const LINE = 20;
/** The mark itself */
const MARK = 12;
/** Vertical padding on each row */
const PAD = 6;
/** Air between a mark and the connector either side of it */
const AIR = 3;

const Mark: FC<{ status: Status }> = ({ status }) => {
  switch (status) {
    case "done":
      return (
        <DoneMark viewBox="0 0 12 12" aria-hidden>
          <path d="M2.6 6.3l2.2 2.2 4.6-4.9" />
        </DoneMark>
      );
    case "skipped":
      return (
        <SkipMark viewBox="0 0 12 12" aria-hidden>
          <path d="M2.5 6h7M6.75 3.25L9.5 6 6.75 8.75" />
        </SkipMark>
      );
    case "current":
      return <CurrentMark aria-hidden />;
    case "locked":
      return <LockedMark aria-hidden />;
  }
};

const List = styled.ol`
  flex: 1;
  overflow-y: auto;
  margin: 0;
  padding: 0.5rem;
  list-style: none;
  display: flex;
  flex-direction: column;
`;

const Row = styled.li<{ $status: Status }>`
  ${({ $status }) => css`
    display: grid;
    grid-template-columns: 1rem minmax(0, 1fr);
    column-gap: 0.625rem;
    padding: ${PAD}px 0.5rem;
    opacity: ${rowOpacity($status)};
  `}
`;

// A skipped row reads as passed-over, never as finished
const rowOpacity = (status: Status) =>
  status === "locked" ? 0.5 : status === "skipped" ? 0.7 : 1;

/* The mark's column, and the hairline down to the next mark: green once this
   step is proved, dashed if it was skipped, the plain rule otherwise. */
const Rail = styled.span<{ $status: Status; $last: boolean }>`
  ${({ theme, $status, $last }) => css`
    position: relative;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: ${(LINE - MARK) / 2}px;

    ${!$last &&
    css`
      &::after {
        content: "";
        position: absolute;
        left: 50%;
        top: ${(LINE + MARK) / 2 + AIR}px;
        bottom: -${2 * PAD + (LINE - MARK) / 2 - AIR}px;
        width: 1px;
        transform: translateX(-50%);
        background: ${$status === "done"
          ? theme.colors.state.success.color
          : $status === "skipped"
          ? `repeating-linear-gradient(to bottom, ${theme.colors.default.border} 0 3px, transparent 3px 6px)`
          : theme.colors.default.border};
      }
    `}
  `}
`;

const markSvg = css`
  flex-shrink: 0;
  width: ${MARK}px;
  height: ${MARK}px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

const DoneMark = styled.svg`
  ${markSvg}
  color: ${({ theme }) => theme.colors.state.success.color};
`;

const SkipMark = styled.svg`
  ${markSvg}
  color: ${({ theme }) => theme.colors.default.textSecondary};
`;

/* Solana's purple, with a quiet ring so "you are here" holds its own at 8px */
const CurrentMark = styled.span`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    margin-top: 2px;
    border-radius: 50%;
    background: ${theme.colors.default.primary};
    box-shadow: 0 0 0 3px ${theme.colors.default.primary + "40"};
  `}
`;

const LockedMark = styled.span`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    margin-top: 2px;
    border-radius: 50%;
    border: 1px solid ${theme.colors.default.textSecondary};
  `}
`;

const Text = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
`;

const Objective = styled.span<{ $status: Status }>`
  ${({ theme, $status }) => css`
    font-size: 0.8125rem;
    line-height: ${LINE}px;
    font-weight: ${$status === "current" ? 500 : 400};
    color: ${$status === "current" || $status === "done"
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
  `}
`;

const Meta = styled.span`
  ${({ theme }) => css`
    font-size: 0.75rem;
    line-height: 1rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;
