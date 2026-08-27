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
 * The step the learner is on.
 *
 * `currentStepId` is authoritative when it names a real step, because going
 * back has to be able to land on a step that is already behind them --
 * deriving the position from `behind` alone would snap them forward again.
 * It falls back to the first unfinished step, which covers a fresh start and
 * records written before the pointer meant anything.
 *
 * @returns the step, or `null` once the path is done
 */
export const currentStep = (
  path: LessonPath,
  progress: LessonProgress
): LessonStep | null =>
  (progress.currentStepId
    ? path.steps.find((s) => s.id === progress.currentStepId) ?? null
    : null) ?? firstUnfinished(path, behind(progress));

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

  // Only pull the learner forward when the step they were on is what just
  // finished; a build landing while they are back reviewing must not move them
  const wasAt = currentStep(path, progress);
  const stayPut = wasAt && !completed.includes(wasAt.id);

  return {
    completedStepIds: completed,
    skippedStepIds: skipped,
    currentStepId: stayPut
      ? wasAt.id
      : firstUnfinished(path, [...completed, ...skipped])?.id ?? null,
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

  const known = progress.skippedStepIds ?? [];
  // Stepping forward off a step the toolchain already proved is not a skip
  const alreadyBehind =
    progress.completedStepIds.includes(step.id) || known.includes(step.id);

  const skipped = alreadyBehind ? known : [...known, step.id];
  const next = path.steps[path.steps.indexOf(step) + 1] ?? null;

  return {
    completedStepIds: progress.completedStepIds,
    skippedStepIds: skipped,
    currentStepId: next?.id ?? null,
  };
};

/**
 * Move to the previous step, however far back the learner wants to go.
 *
 * Pure navigation: the record is exactly what it was. Marks are left alone in
 * both directions -- a verified step keeps its verification, because looking at
 * it cannot un-run the build that proved it, and a skipped step keeps its skip,
 * because a click cannot un-skip one either. Building it is what repairs the
 * mark, through `advance`'s `proven` pass. Leaving the record untouched is also
 * what keeps `stepForward` free: clearing the mark here would drop the frontier
 * to this step and strand the learner on it.
 */
export const stepBack = (
  path: LessonPath,
  progress: LessonProgress
): LessonProgress => {
  const step = currentStep(path, progress);
  // Past the last step, back lands on it rather than nowhere
  const index = step ? path.steps.indexOf(step) : path.steps.length;
  if (index <= 0) return progress;

  return {
    ...progress,
    currentStepId: path.steps[index - 1].id,
  };
};

/** Whether there is a step behind the one the learner is on */
export const canStepBack = (path: LessonPath, progress: LessonProgress) => {
  const step = currentStep(path, progress);
  return (step ? path.steps.indexOf(step) : path.steps.length) > 0;
};

/**
 * Return forward after looking back, up to the frontier and no further.
 *
 * The other half of `stepBack`: reviewing an earlier step has to be a round
 * trip, or the only way home is `skipStep` and the record gains a skip the
 * learner never took. Moving off a step already behind them changes nothing,
 * since the record already says what happened there -- which is exactly why
 * this stops at the frontier. Crossing it is a claim about unproven work, and
 * that stays `skipStep`'s to make.
 */
export const stepForward = (
  path: LessonPath,
  progress: LessonProgress
): LessonProgress => {
  if (!canStepForward(path, progress)) return progress;

  const step = currentStep(path, progress)!;
  return {
    ...progress,
    currentStepId: path.steps[path.steps.indexOf(step) + 1]?.id ?? null,
  };
};

/** Whether the learner is behind the frontier and can return towards it */
export const canStepForward = (path: LessonPath, progress: LessonProgress) => {
  const step = currentStep(path, progress);
  return !!step && behind(progress).includes(step.id);
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
    currentStepId: path.steps[path.steps.indexOf(step) + 1]?.id ?? null,
  };
};
