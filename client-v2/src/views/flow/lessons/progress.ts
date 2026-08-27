import type { Idl } from "@coral-xyz/anchor";

import { isSatisfied } from "./verify";
import type { LessonPath, LessonStep } from "./types";
import type { FlowState } from "../state/stage";

/** Persisted per lesson, inside that lesson's own workspace */
export interface LessonProgress {
  /** Ids the toolchain proved. Entries are never removed. */
  completedStepIds: string[];
  /**
   * Ids the learner moved past without proof.
   *
   * Kept apart from `completedStepIds` so the record never claims a step
   * was verified when it was not -- a skip is a fact about the learner,
   * not about their code. Optional because records written before skips
   * existed load without it.
   */
  skippedStepIds?: string[];
  /** `null` once every step is behind the learner */
  currentStepId: string | null;
}

export const EMPTY_PROGRESS: LessonProgress = {
  completedStepIds: [],
  currentStepId: null,
};

/** Verified or skipped — either way the learner is past it */
const behind = (progress: LessonProgress) => [
  ...progress.completedStepIds,
  ...(progress.skippedStepIds ?? []),
];

const firstUnfinished = (path: LessonPath, done: string[]) =>
  path.steps.find((s) => !done.includes(s.id)) ?? null;

/**
 * @returns the step the learner is on, or `null` when the path is done
 */
export const currentStep = (
  path: LessonPath,
  progress: LessonProgress
): LessonStep | null => firstUnfinished(path, behind(progress));

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
  const wasSkipped = progress.skippedStepIds ?? [];

  // A skipped step the toolchain later proves becomes a real completion, so
  // catching up on the build the learner skipped past repairs the record
  const proven = wasSkipped.filter((id) => {
    const step = path.steps.find((s) => s.id === id);
    return step && isSatisfied(step.verify, flow, idl);
  });
  completed.push(...proven);
  const skipped = wasSkipped.filter((id) => !proven.includes(id));

  for (;;) {
    const step = firstUnfinished(path, [...completed, ...skipped]);
    if (!step) break;
    if (!isSatisfied(step.verify, flow, idl)) break;
    completed.push(step.id);
  }

  if (completed.length === progress.completedStepIds.length) return progress;

  return {
    completedStepIds: completed,
    skippedStepIds: skipped,
    currentStepId:
      firstUnfinished(path, [...completed, ...skipped])?.id ?? null,
  };
};

/**
 * Move past the current step without proof.
 *
 * The escape valve for a learner who judges the work done, or whose code is
 * right and whose grader is not. Recorded as a skip rather than a completion:
 * a click cannot make the toolchain have checked something.
 */
export const skipStep = (
  path: LessonPath,
  progress: LessonProgress
): LessonProgress => {
  const step = currentStep(path, progress);
  if (!step) return progress;

  const skipped = [...(progress.skippedStepIds ?? []), step.id];
  return {
    completedStepIds: progress.completedStepIds,
    skippedStepIds: skipped,
    currentStepId:
      firstUnfinished(path, [...progress.completedStepIds, ...skipped])?.id ??
      null,
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
  const skipped = progress.skippedStepIds ?? [];
  return {
    completedStepIds: completed,
    skippedStepIds: skipped,
    currentStepId:
      firstUnfinished(path, [...completed, ...skipped])?.id ?? null,
  };
};
