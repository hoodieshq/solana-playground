import { useEffect, useRef, useState } from "react";
import type { FC } from "react";

import {
  Stepper as DsStepper,
  StepperItem,
  StepperList,
} from "@/shared/ui/stepper";
import type { StepperStatus } from "@/shared/ui/stepper";

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
 * left Write showing as not done every time the learner glanced at their
 * own source.
 *
 * A build restored from the workspace's own record counts too: it happened,
 * even though `buildStartedAt` names a run this page never watched.
 */
export const statusOf = (state: FlowState, stage: Stage): StageStatus => {
  if (stage === "write") {
    if (state.buildStartedAt !== null || state.build !== "upcoming") {
      return "done";
    }
    return state.stage === "write" ? "active" : "done";
  }
  return state[stage];
};

interface StepperProps {
  state: FlowState;
  onSelect: (stage: Stage) => void;
  /** The stage the current lesson step is aiming at; `null` outside a lesson. */
  target?: Stage | null;
}

/** `upcoming` and `active` both mean "nothing to report": the thumb marks the current stage */
const DS_STATUS: Record<StageStatus, StepperStatus> = {
  upcoming: "idle",
  active: "idle",
  done: "done",
  running: "running",
  failed: "failed",
};

/**
 * The width the four full labels need, in px. When the stage bar gives the
 * stepper less than this, the labels fold to their initials; the full name
 * stays in each tab's `aria-label`.
 *
 * Measured in Chromium at 1280 and 1440 px windows: the list with no stage
 * marked is 293.3 px wide, and each check or dot beside a label adds about
 * 18 px, so a list with all four stages marked needs about 366 px. The
 * constant covers that widest case so a stage finishing never pushes the
 * list past its bar; it is a measurement, not derived, so re-measure when the
 * labels, padding or font size change.
 */
export const STEPPER_FULL_WIDTH_PX = 368;

/**
 * The write -> build -> deploy -> interact loop, drawn with the design
 * system's stepper. Each stage's status is carried by glyph shape as well as
 * color, so the sequence reads correctly without color vision.
 */
const Stepper: FC<StepperProps> = ({ state, onSelect, target }) => {
  // The root fills the stage bar, so what it measures is the room the bar
  // gives, not the list's own width. Folding the labels shrinks the list but
  // not the root, so the fold cannot flip itself back. Until the first
  // measurement the labels show in full; the observer's first callback runs
  // before paint.
  const ref = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setRoom(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const compact = room !== null && room < STEPPER_FULL_WIDTH_PX;
  return (
    <DsStepper
      ref={ref}
      className="w-full min-w-0 items-center"
      value={state.stage}
      onValueChange={(v) => onSelect(v as Stage)}
    >
      <StepperList compact={compact}>
        {STAGES.map((stage) => {
          const status = statusOf(state, stage);
          return (
            <StepperItem
              key={stage}
              value={stage}
              status={DS_STATUS[status]}
              errors={stage === "build" ? state.buildErrorCount : undefined}
              target={stage === target}
              id={`flow-stage-tab-${stage}`}
              aria-controls={`flow-stage-panel-${stage}`}
              aria-label={`${LABEL[stage]}: ${status}${
                // Spoken here as well as drawn: a pre-compiler failure has no
                // count, so saying "0 errors" would mislead.
                stage === "build" &&
                status === "failed" &&
                state.buildErrorCount > 0
                  ? `, ${state.buildErrorCount} error${
                      state.buildErrorCount === 1 ? "" : "s"
                    }`
                  : ""
              }${stage === target ? ", current lesson target" : ""}`}
            >
              {LABEL[stage]}
            </StepperItem>
          );
        })}
      </StepperList>
    </DsStepper>
  );
};

export default Stepper;
