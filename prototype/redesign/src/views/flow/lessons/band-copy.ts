import { currentStep, stepNumber } from "./progress";
import { RUNG_COUNT } from "./hints";
import type { LessonState } from "./store";

/**
 * @returns what the band shows, or `null` when there is no current step
 * -- outside a lesson, or once the path is finished
 */
export const describeStep = (state: LessonState) => {
  if (!state.path) return null;

  const step = currentStep(state.path, state.progress);
  if (!step) return null;

  return {
    number: `Step ${stepNumber(state.path, state.progress)} of ${
      state.path.steps.length
    }`,
    objective: step.objective,
    verifiedBy:
      step.verify.kind === "read"
        ? `Not machine-checked -- continue when ${step.verifiedBy}.`
        : `Verified when ${step.verifiedBy}.`,
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
