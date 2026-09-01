import { RUNG_COUNT } from "./hints";
import { cursorStep, foldRecord, positionNumber } from "./ledger";
import type { LessonState } from "./store";
import type { LessonMark } from "./events";
import type { VerifyCondition } from "./types";
import { graderClass, verifyingStage } from "./verify";

/**
 * The band's primary action *is* the criterion: one control, labelled
 * by what proves the step. Derived from the condition so the action a
 * step offers cannot drift from what actually grades it.
 */
export const primaryLabel = (c: VerifyCondition): string => {
  switch (graderClass(c)) {
    case "synchronous":
      return verifyingStage(c) === "deploy"
        ? "Deploy to prove this"
        : "Build to prove this";
    // No on-demand condition ships yet; the label exists so adding one
    // later is a data change, not a band change
    case "on-demand":
      return "Check for a transaction";
    case "attestation":
      return "Mark as read";
  }
};

/** What a non-open step's sub-line says. Copy and record must agree:
 * `attested` never reads as verified, `passed` never reads as done. */
const markLine = (mark: LessonMark, verifiedBy: string): string => {
  switch (mark) {
    case "proved":
      return `Proved -- ${verifiedBy}.`;
    case "attested":
      return "You marked this read -- not machine-checked.";
    case "passed":
      return "Skipped -- not verified.";
    case "open":
      return "";
  }
};

/**
 * @returns what the band shows, or `null` when the cursor is past the
 * end -- outside a lesson, or once the path is finished
 */
export const describeStep = (state: LessonState) => {
  if (!state.path) return null;

  const view = foldRecord(state.path, state.record);
  const step = cursorStep(state.path, view);
  if (!step) return null;

  const mark = view.marks.get(step.id) ?? "open";
  const open = mark === "open";

  return {
    number: `Step ${positionNumber(state.path, view)} of ${
      state.path.steps.length
    }`,
    objective: step.objective,
    verifiedBy: open
      ? step.verify.kind === "read"
        ? `Not machine-checked -- continue when ${step.verifiedBy}.`
        : `Verified when ${step.verifiedBy}.`
      : markLine(mark, step.verifiedBy),
    mark,
    /** The primary control exists only here: mark edges live at the
     * frontier and nowhere else */
    offersPrimary: open && view.cursor === view.frontier,
  };
};

/**
 * The assistant action's label.
 *
 * It reads "I'm stuck" rather than "Do it" on purpose: the learner opens
 * the door, which is the unaided first attempt the learning research
 * asks for, bought with one word of copy. The button is never disabled
 * -- a dead control in a demo is worse than a label that explains
 * itself.
 */
export const assistantLabel = (rung: number, attempted: boolean) => {
  if (rung === 0) return "I'm stuck";
  if (rung >= RUNG_COUNT) return "No hints left";
  if (!attempted) return "Try it first";
  return `Another hint (${rung + 1} of ${RUNG_COUNT})`;
};
