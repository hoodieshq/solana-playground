import { currentStep, stepNumber } from "../../../flow/lessons/progress";
import type { LessonState } from "../../../flow/lessons/store";

/** What the assistant may know about the lesson without asking */
export interface LessonContext {
  name: string;
  /** 1-based */
  stepIndex: number;
  stepCount: number;
  objective: string;
  verifiedBy: string;
  /** Whether the toolchain has already confirmed this step */
  satisfied: boolean;
}

/**
 * @returns the lesson's current step, or `null` outside a lesson
 *
 * A finished path reports its last step as satisfied rather than
 * disappearing, so the assistant can still answer questions about what
 * the learner just did.
 */
export const describeLesson = (state: LessonState): LessonContext | null => {
  if (!state.path) return null;

  const step = currentStep(state.path, state.progress);
  const last = state.path.steps[state.path.steps.length - 1];
  const shown = step ?? last;

  return {
    name: state.path.tutorial,
    stepIndex: step
      ? stepNumber(state.path, state.progress)
      : state.path.steps.length,
    stepCount: state.path.steps.length,
    objective: shown.objective,
    verifiedBy: shown.verifiedBy,
    satisfied: !step,
  };
};
