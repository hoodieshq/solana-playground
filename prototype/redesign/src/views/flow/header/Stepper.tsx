import type { FC } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import { gradientStroke } from "../components/gradient";

import { STAGES } from "../state/stage";
import type { FlowState, Stage, StageStatus } from "../state/stage";

const LABEL: Record<Stage, string> = {
  write: "Write",
  build: "Build",
  deploy: "Deploy",
  interact: "Interact",
};

/**
 * Writing has no completion signal of its own, so it is inferred: reaching a
 * build is what puts it behind you. Going back to the Write tab to look at
 * your code does not un-write it — deriving `done` from the selected tab alone
 * unchecked it every time the learner glanced at their own source.
 */
export const statusOf = (state: FlowState, stage: Stage): StageStatus => {
  if (stage === "write") {
    if (state.buildStartedAt !== null) return "done";
    return state.stage === "write" ? "active" : "done";
  }
  return state[stage];
};

interface StepperProps {
  state: FlowState;
  onSelect: (stage: Stage) => void;
  /**
   * The stage the current lesson step is aiming at, marked with a brand dot.
   * `null` outside a lesson. Nothing else about the stepper changes:
   * the loop stays a loop, and this only says where the lesson is
   * pointing.
   */
  target?: Stage | null;
  /** Labels collapse to their initials. Decided by the rail, not the window. */
  compact?: boolean;
}

/** The selected tab's box, in the track's own frame */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const sameBox = (a: Box | null, b: Box) =>
  !!a && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/** How far the thumb sits inside the tab it marks */
const INSET = 2;

/**
 * The write -> build -> deploy -> interact loop, as one segmented control: a
 * quiet track holding the four stages, and a single thumb that slides to the
 * one on screen. It switches the view, so it is drawn as a switch — the four
 * separate pills it replaces read as four unrelated buttons.
 *
 * Status rides on small marks beside the labels, never on the thumb: a green
 * check once a stage is done, a red dot on a failed build, a pulsing dot
 * while one runs. The lesson's target gets a brand dot after its label. Each
 * is a different shape as well as a different colour, so the loop still
 * reads without colour vision.
 */
const Stepper: FC<StepperProps> = ({ state, onSelect, target, compact }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Box | null>(null);

  // Measured rather than assumed: Flow's rail decides how wide the segments
  // are and how far apart, and the thumb follows whatever it decides. Layout
  // effect, so the first paint already has the thumb in place instead of
  // sliding in from the corner.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const tab = track.querySelector<HTMLElement>(
        `#flow-stage-tab-${state.stage}`
      );
      if (!tab) return;
      const next = {
        x: tab.offsetLeft,
        y: tab.offsetTop,
        w: tab.offsetWidth,
        h: tab.offsetHeight,
      };
      setThumb((prev) => (sameBox(prev, next) ? prev : next));
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    track
      .querySelectorAll('[role="tab"]')
      .forEach((tab) => observer.observe(tab));
    return () => observer.disconnect();
  }, [state.stage]);

  return (
    <Track ref={trackRef} role="tablist" aria-label="Development loop">
      {/* A div, not a span: Flow's rail hides the track's direct spans (they
          were the old connectors). Out of flow, so the rail's flex rules for
          the segments do nothing to it. */}
      {thumb && (
        <Thumb
          aria-hidden
          style={{
            transform: `translate(${thumb.x + INSET}px, ${thumb.y + INSET}px)`,
            width: Math.max(0, thumb.w - 2 * INSET),
            height: Math.max(0, thumb.h - 2 * INSET),
          }}
        />
      )}
      {STAGES.map((stage) => {
        const status = statusOf(state, stage);
        const selected = state.stage === stage;
        const suffix =
          stage === "build" && status === "failed"
            ? ` ${state.buildErrorCount} error${
                state.buildErrorCount === 1 ? "" : "s"
              }`
            : "";
        return (
          <Segment key={stage}>
            <Tab
              id={`flow-stage-tab-${stage}`}
              role="tab"
              aria-selected={selected}
              aria-controls={`flow-stage-panel-${stage}`}
              aria-label={`${LABEL[stage]}: ${status}${suffix}${
                stage === target ? ", current lesson target" : ""
              }`}
              $selected={selected}
              onClick={() => onSelect(stage)}
            >
              <Mark status={status} />
              <Full $compact={compact}>{LABEL[stage]}</Full>
              <Initial $compact={compact}>{LABEL[stage][0]}</Initial>
              {suffix && <ErrorSuffix>{suffix}</ErrorSuffix>}
              {stage === target && <TargetDot aria-hidden />}
            </Tab>
          </Segment>
        );
      })}
    </Track>
  );
};

export default Stepper;

/* One quiet track, fully rounded, a step up from the rail it sits in. Flow's
   rail stretches it across the workspace and gives the segments equal
   shares, so the row still reads as the loop from end to end. */
const Track = styled.div`
  ${({ theme }) => css`
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.125rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 999px;
    background: ${theme.colors.default.bgSecondary};
  `}
`;

/* The one raised thing in the track: a lighter surface with the brand
   gradient as its stroke, like every other current thing in the product.
   Placed by transform from the measured tab, so moving it is a slide. */
const Thumb = styled.div`
  ${({ theme }) => css`
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
    border-radius: 999px;
    ${gradientStroke(theme.colors.state.hover.bg)}
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    pointer-events: none;
    transition: transform 220ms cubic-bezier(0.2, 0, 0, 1),
      width 220ms cubic-bezier(0.2, 0, 0, 1);

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const Segment = styled.div`
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
`;

const Tab = styled.button<{ $selected: boolean }>`
  ${({ theme, $selected }) => css`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    min-width: 0;
    height: 1.625rem;
    padding: 0 0.75rem;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: ${$selected
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font: inherit;
    font-family: ${theme.font.other.family};
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: color 140ms ease;

    /* Hover only brightens: the thumb is the one thing that means "here" */
    &:hover {
      color: ${theme.colors.default.textPrimary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

/**
 * The stage's status, before its label: a check once done, a dot while it is
 * failing or running, nothing while it is still ahead of you.
 */
const Mark: FC<{ status: StageStatus }> = ({ status }) => {
  if (status === "done") {
    return (
      <Check viewBox="0 0 12 12" width="12" height="12" aria-hidden>
        <path
          d="M2.6 6.3l2.2 2.2 4.6-4.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Check>
    );
  }
  if (status === "failed" || status === "running") {
    return <StatusDot $status={status} aria-hidden />;
  }
  return null;
};

const Check = styled.svg`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.state.success.color};
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.8); }
`;

const StatusDot = styled.span<{ $status: "failed" | "running" }>`
  ${({ theme, $status }) => css`
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${$status === "failed"
      ? theme.colors.state.error.color
      : theme.colors.default.primary};

    ${$status === "running" &&
    css`
      animation: ${pulse} 1.2s ease-in-out infinite;

      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `}
  `}
`;

/* Where the lesson points, after the label so it never reads as status */
const TargetDot = styled.span`
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.default.primary};
`;

/**
 * Below `STEPPER_COMPACT_AT` the four labels collapse to their initials, which
 * is what stops the status chips overlapping the stepper on a narrow window.
 * The full name stays in each button's `aria-label` either way, so nothing is
 * lost to a screen reader.
 *
 * This used to be a viewport media query at 80rem, from when the stepper was
 * crammed into the window's top bar and competed there with a project name and
 * the account chips. It now has a rail of its own across the workspace, so the
 * window's width says nothing useful about how much room these four have — at
 * 1279px wide they were abbreviating to single letters inside 147px each. The
 * rail measures itself and says.
 */
const Full = styled.span<{ $compact?: boolean }>`
  ${({ $compact }) => $compact && "display: none;"}
`;

const Initial = styled.span<{ $compact?: boolean }>`
  display: ${({ $compact }) => ($compact ? "inline" : "none")};
`;

const ErrorSuffix = styled.span`
  color: ${({ theme }) => theme.colors.state.error.color};
`;
