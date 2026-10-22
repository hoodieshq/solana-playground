import type { LessonState } from "./store";
import type { Disposable } from "../../../utils";

/** Where a lesson stands, as the gallery shows it without opening it */
export interface LessonSummary {
  /** Per step, in order: whether it is behind the learner */
  passed: boolean[];
  /**
   * Per step, in order: whether it was skipped rather than proved. Kept
   * apart so the gallery never ticks or counts a skip as done. Missing in a
   * summary written before it existed.
   */
  skipped?: boolean[];
  /** The step to do next, or `null` once every one is behind */
  next: string | null;
  finished: boolean;
}

const KEY = "flow.lessons";

/**
 * A copy of each lesson's progress the gallery can read.
 *
 * The record itself lives in the lesson's own workspace
 * (`.workspace/tutorial-storage.json`), which the gallery would have to
 * open, and switch to, to read. So every change the lesson store makes is
 * mirrored here in brief, keyed by the tutorial's name. It is a view, never
 * the source: losing it costs a status line, not progress.
 */
export class PgLessonSummary {
  static read(tutorial: string): LessonSummary | null {
    return PgLessonSummary._all()[tutorial] ?? null;
  }

  static write(state: LessonState) {
    const path = state.path;
    if (!path) return;
    const behind = [
      ...state.progress.completedStepIds,
      ...(state.progress.skippedStepIds ?? []),
    ];
    const passed = path.steps.map((s) => behind.includes(s.id));
    const skipped = path.steps.map(
      (s) =>
        !state.progress.completedStepIds.includes(s.id) &&
        !!state.progress.skippedStepIds?.includes(s.id)
    );
    const next = path.steps.find((s) => !behind.includes(s.id));
    const all = PgLessonSummary._all();
    all[path.tutorial] = {
      passed,
      skipped,
      next: next?.objective ?? null,
      finished: !next,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      // Storage off: the gallery just shows no status
    }
    for (const cb of PgLessonSummary._listeners) cb();
  }

  /** How many steps were proved, skips left out */
  static proved(summary: LessonSummary) {
    return summary.passed.filter((p, i) => p && !summary.skipped?.[i]).length;
  }

  static onDidChange(cb: () => void): Disposable {
    PgLessonSummary._listeners.add(cb);
    return { dispose: () => PgLessonSummary._listeners.delete(cb) };
  }

  private static _all(): Record<string, LessonSummary> {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  private static readonly _listeners = new Set<() => void>();
}
