import type { Idl } from "@coral-xyz/anchor";

import { isSatisfied } from "./verify";
import type { LessonPath, LessonStep } from "./types";
import type { FlowState } from "../state/stage";

/** Persisted per lesson, inside that lesson's own workspace */
export interface LessonProgress {
  /** Ids of finished steps. Entries are never removed. */
  completedStepIds: string[];
  /** `null` once every step is finished */
  currentStepId: string | null;
}

export const EMPTY_PROGRESS: LessonProgress = {
  completedStepIds: [],
  currentStepId: null,
};

const firstUnfinished = (path: LessonPath, completed: string[]) =>
  path.steps.find((s) => !completed.includes(s.id)) ?? null;

/**
 * @returns the step the learner is on, or `null` when the path is done
 */
export const currentStep = (
  path: LessonPath,
  progress: LessonProgress
): LessonStep | null => firstUnfinished(path, progress.completedStepIds);

/**
 * @returns a 1-based step number, or one past the end when finished, so
 * the UI can render "4 of 4" and "done" from the same value
 */
export const stepNumber = (path: LessonPath, progress: LessonProgress) => {
  const step = currentStep(path, progress);
  if (!step) return path.steps.length + 1;
  return path.steps.indexOf(step) + 1;
};

/**
 * Move the ratchet forward as far as the toolchain allows.
 *
 * Monotonic by construction: this only ever appends to
 * `completedStepIds`, so a later failing build moves the stepper and
 * never the lesson. Several steps can complete in one pass -- a learner
 * who builds and deploys before reading anything should not have to
 * re-trigger each one.
 *
 * @returns the same object when nothing changed, so React can bail out
 */
export const advance = (
  path: LessonPath,
  progress: LessonProgress,
  flow: FlowState,
  idl: Idl | null
): LessonProgress => {
  const completed = [...progress.completedStepIds];

  for (;;) {
    const step = firstUnfinished(path, completed);
    if (!step) break;
    if (!isSatisfied(step.verify, flow, idl)) break;
    completed.push(step.id);
  }

  if (completed.length === progress.completedStepIds.length) return progress;

  return {
    completedStepIds: completed,
    currentStepId: firstUnfinished(path, completed)?.id ?? null,
  };
};

/**
 * The manual advance, offered only for a `read` step. Every other kind
 * has no way past it: a click that skipped a verified step would give
 * back exactly what this design exists to take away.
 */
export const continueRead = (
  path: LessonPath,
  progress: LessonProgress
): LessonProgress => {
  const step = currentStep(path, progress);
  if (!step || step.verify.kind !== "read") return progress;

  const completed = [...progress.completedStepIds, step.id];
  return {
    completedStepIds: completed,
    currentStepId: firstUnfinished(path, completed)?.id ?? null,
  };
};
