import type { FC } from "react";
import styled, { css } from "styled-components";

import { STAGES } from "../state/stage";
import type { FlowState, Stage, StageStatus } from "../state/stage";

const LABEL: Record<Stage, string> = {
  write: "Write",
  build: "Build",
  deploy: "Deploy",
  interact: "Interact",
};

const statusOf = (state: FlowState, stage: Stage): StageStatus => {
  if (stage === "write") return state.stage === "write" ? "active" : "done";
  return state[stage];
};

interface StepperProps {
  state: FlowState;
  onSelect: (stage: Stage) => void;
}

/**
 * The write -> build -> deploy -> interact loop, rendered as a horizontal
 * stepper. Each stage's status is carried by dot shape and an inline glyph
 * as well as color, so the sequence reads correctly without color vision.
 */
const Stepper: FC<StepperProps> = ({ state, onSelect }) => (
  <Wrapper role="tablist" aria-label="Development loop">
    {STAGES.map((stage, i) => {
      const status = statusOf(state, stage);
      const selected = state.stage === stage;
      const suffix =
        stage === "build" && status === "failed"
          ? ` - ${state.buildErrorCount} error${
              state.buildErrorCount === 1 ? "" : "s"
            }`
          : "";
      return (
        <Item key={stage}>
          {i > 0 && (
            <Connector $done={statusOf(state, STAGES[i - 1]) === "done"} />
          )}
          <StageButton
            role="tab"
            aria-selected={selected}
            aria-label={`${LABEL[stage]}: ${status}${suffix}`}
            $status={status}
            $selected={selected}
            onClick={() => onSelect(stage)}
          >
            <Dot $status={status} aria-hidden />
            <Label $status={status}>
              {LABEL[stage]}
              {suffix}
            </Label>
          </StageButton>
        </Item>
      );
    })}
  </Wrapper>
);

export default Stepper;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
`;

const Connector = styled.span<{ $done: boolean }>`
  ${({ theme, $done }) => css`
    width: 1.5rem;
    height: 1px;
    margin: 0 0.25rem;
    background: ${$done
      ? theme.colors.state.success.color
      : theme.colors.default.border};
  `}
`;

/** Icon glyphs so each `StageStatus` reads by shape, not only by color. */
const glyphOf = (status: StageStatus) => {
  switch (status) {
    case "done":
      // Filled circle, checkmark cut out of the fill.
      return (
        <>
          <circle cx="7" cy="7" r="6" className="fill" />
          <path
            d="M4.2 7.3l1.9 1.9 3.7-4"
            className="mark"
            fill="none"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case "failed":
      // Filled circle, cross cut out of the fill.
      return (
        <>
          <circle cx="7" cy="7" r="6" className="fill" />
          <path
            d="M4.6 4.6l4.8 4.8M9.4 4.6l-4.8 4.8"
            className="mark"
            fill="none"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      );
    case "active":
    case "running":
      // Outlined ring with a small solid core -- "in progress" target shape.
      return (
        <>
          <circle
            cx="7"
            cy="7"
            r="5.25"
            className="ring"
            fill="none"
            strokeWidth="1.5"
          />
          <circle cx="7" cy="7" r="2.1" className="core" />
        </>
      );
    default:
      // Upcoming: hollow outline only, no fill and no glyph.
      return (
        <circle
          cx="7"
          cy="7"
          r="5.25"
          className="ring"
          fill="none"
          strokeWidth="1.5"
        />
      );
  }
};

const Dot: FC<{ $status: StageStatus; "aria-hidden"?: boolean }> = ({
  $status,
  ...rest
}) => (
  <DotSvg
    $status={$status}
    viewBox="0 0 14 14"
    width="14"
    height="14"
    {...rest}
  >
    {glyphOf($status)}
  </DotSvg>
);

const DotSvg = styled.svg<{ $status: StageStatus }>`
  ${({ theme, $status }) => css`
    flex-shrink: 0;

    .fill {
      fill: ${$status === "done"
        ? theme.colors.state.success.color
        : theme.colors.state.error.color};
    }
    .mark {
      /* Tracks whatever the button's actual background currently is
         (transparent-over-bar, hover or selected) -- see \`--dot-bg\`
         on \`StageButton\`. */
      stroke: var(--dot-bg, ${theme.colors.default.bgPrimary});
    }
    .ring {
      stroke: ${$status === "active" || $status === "running"
        ? theme.colors.default.primary
        : theme.colors.default.border};
    }
    .core {
      fill: ${theme.colors.default.primary};
    }

    ${$status === "running" &&
    css`
      .ring {
        transform-origin: center;
        animation: stepper-pulse 1.2s ease-in-out infinite;
      }
      @keyframes stepper-pulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.45;
          transform: scale(1.15);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .ring {
          animation: none;
        }
      }
    `}
  `}
`;

const Label = styled.span<{ $status: StageStatus }>`
  ${({ $status }) =>
    $status === "failed" &&
    css`
      font-weight: 600;
    `}
`;

const StageButton = styled.button<{
  $status: StageStatus;
  $selected: boolean;
}>`
  ${({ theme, $status, $selected }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    border: 1px solid transparent;
    border-radius: ${theme.default.borderRadius};
    background: ${$selected ? theme.colors.default.bgSecondary : "transparent"};
    /* The dot's checkmark/cross glyph is a cutout stroked in this color so
       it reads as a hole in the filled circle -- it has to track whatever
       is actually behind it, which changes with $selected and :hover. */
    --dot-bg: ${$selected
      ? theme.colors.default.bgSecondary
      : theme.colors.default.bgPrimary};
    color: ${$status === "upcoming"
      ? theme.colors.default.textSecondary
      : theme.colors.default.textPrimary};
    font: inherit;
    font-family: ${theme.font.other.family};
    font-size: ${theme.font.other.size.small};
    cursor: pointer;
    transition: background 140ms ease, border-color 140ms ease;

    ${$status === "failed" &&
    css`
      border-color: ${theme.colors.state.error.color};
    `}

    &:hover {
      background: ${theme.colors.default.bgSecondary};
      --dot-bg: ${theme.colors.default.bgSecondary};
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
