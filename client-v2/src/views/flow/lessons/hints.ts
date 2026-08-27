import type { LessonStep } from "./types";
import type { Disposable } from "../../../utils";

/** Question -> locate -> propose */
export const RUNG_COUNT = 3;

/**
 * The hint ladder.
 *
 * Prompt policy is the lever here: the model would otherwise answer
 * immediately, so each rung asks for a different kind of help and the
 * rung is named inside the prompt itself. That makes it the learner's
 * own visible message in the transcript, which is what keeps a ladder
 * nobody counts from quietly becoming an answer machine.
 *
 * Counts live in memory only. A reload starting the learner back at rung
 * one is the safe direction to be wrong in.
 */
export class PgLessonHints {
  /**
   * @param step the step being worked on
   * @param attempted whether the learner has changed the project or run
   * a build since this step became current
   * @returns the prompt to send, or `null` when this step has no rung
   * left to climb -- either the ladder is spent or the first-attempt cap
   * is holding
   */
  static nextPrompt(step: LessonStep, attempted: boolean): string | null {
    const used = PgLessonHints._rungs.get(step.id) ?? 0;
    const ceiling = attempted ? RUNG_COUNT : 1;
    if (used >= ceiling) return null;

    const rung = used + 1;
    PgLessonHints._rungs.set(step.id, rung);
    PgLessonHints._emit();

    return [
      `Hint ${rung} of ${RUNG_COUNT}.`,
      `I am on this lesson step: ${step.objective}`,
      `It is finished when ${step.verifiedBy}.`,
      step.hints[rung - 1],
    ].join("\n");
  }

  /** @returns how many rungs this step has spent */
  static rung(stepId: string) {
    return PgLessonHints._rungs.get(stepId) ?? 0;
  }

  /** Clear every count. Called when the workspace changes. */
  static reset() {
    PgLessonHints._rungs.clear();
    PgLessonHints._emit();
  }

  /**
   * The counts live outside React's data flow (a module-static map, not
   * `LessonState`), so a rung display has to subscribe here to stay
   * live -- reading `rung()` during render without this would freeze on
   * whatever a later, unrelated render last saw.
   *
   * @param cb runs whenever a rung changes, and once immediately on
   * subscribe so a fresh subscriber renders from the current count
   * @returns a disposable to clear the event
   */
  static onDidChange(cb: () => void): Disposable {
    PgLessonHints._listeners.add(cb);
    cb();
    return { dispose: () => PgLessonHints._listeners.delete(cb) };
  }

  private static _emit() {
    for (const cb of PgLessonHints._listeners) cb();
  }

  private static readonly _rungs = new Map<string, number>();
  private static readonly _listeners = new Set<() => void>();
}
