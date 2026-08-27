import type { Idl } from "@coral-xyz/anchor";

import { PgLessonHints } from "./hints";
import { advance, continueRead, currentStep, EMPTY_PROGRESS } from "./progress";
import type { LessonProgress } from "./progress";
import { getLessonPath } from "./registry";
import type { LessonPath } from "./types";
import { PgFlow } from "../state/stage";
import type { FlowState } from "../state/stage";
import { PgExplorer, PgProgramInfo, PgTutorial } from "../../../utils";
import type { Disposable } from "../../../utils";

export interface LessonState {
  /** `null` whenever the active workspace is not a lesson with a path */
  path: LessonPath | null;
  progress: LessonProgress;
  /**
   * Whether the learner has run a build since the current step became
   * current. Gates the hint ladder above rung one -- an unaided first
   * attempt is the one intervention with RCT evidence behind it.
   */
  attempted: boolean;
  /**
   * `flow.buildStartedAt` at the moment the current step began. An
   * attempt is any build started after this. Derived rather than
   * event-driven because `PgExplorer` has no file-write event, and a
   * build is the truer signal anyway: editing without building is not
   * an attempt at a build-verified step.
   */
  attemptBaseline: number | null;
}

export const INITIAL_LESSON_STATE: LessonState = {
  path: null,
  progress: EMPTY_PROGRESS,
  attempted: false,
  attemptBaseline: null,
};

export type LessonEvent =
  | { type: "load"; path: LessonPath | null; progress?: LessonProgress }
  | { type: "evaluate"; flow: FlowState; idl: Idl | null }
  | { type: "continue-read" };

/** Pure reducer, so the ratchet's rules are testable without a browser. */
export const reduceLesson = (
  state: LessonState,
  ev: LessonEvent
): LessonState => {
  switch (ev.type) {
    case "load":
      return ev.path
        ? {
            path: ev.path,
            progress: ev.progress ?? EMPTY_PROGRESS,
            attempted: false,
            attemptBaseline: null,
          }
        : INITIAL_LESSON_STATE;

    case "evaluate": {
      if (!state.path) return state;

      const progress = advance(state.path, state.progress, ev.flow, ev.idl);
      const stepChanged = progress !== state.progress;

      // A new step starts with no attempt behind it, so the ladder caps
      // at rung one again and the baseline moves to now.
      if (stepChanged) {
        return {
          ...state,
          progress,
          attempted: false,
          attemptBaseline: ev.flow.buildStartedAt,
        };
      }

      const attempted =
        ev.flow.buildStartedAt !== null &&
        ev.flow.buildStartedAt !== state.attemptBaseline;
      if (attempted === state.attempted) return state;
      return { ...state, attempted };
    }

    case "continue-read": {
      if (!state.path) return state;
      const progress = continueRead(state.path, state.progress);
      if (progress === state.progress) return state;
      return { ...state, progress, attempted: false, attemptBaseline: null };
    }
  }
};

const STORAGE_DEFAULT: { lesson: LessonProgress } = {
  lesson: EMPTY_PROGRESS,
};

/**
 * The lesson the learner is in, if any.
 *
 * Progress is written through to `PgTutorial.getStorage`, whose file
 * lives at `.workspace/tutorial-storage.json` inside the lesson's own
 * workspace -- so it is scoped to the lesson and survives everything the
 * dev loop does. Reads and writes are async (IndexedDB under
 * `PgExplorer.fs`), so the store renders from memory and writes behind.
 */
export class PgLesson {
  static get state(): LessonState {
    return PgLesson._state;
  }

  static onDidChange(cb: (s: LessonState) => void): Disposable {
    PgLesson._listeners.add(cb);
    cb(PgLesson._state);
    return { dispose: () => PgLesson._listeners.delete(cb) };
  }

  /** The manual advance, offered only for a `read` step. */
  static continueRead() {
    PgLesson._dispatch({ type: "continue-read" });
  }

  /** Subscribe to client events. Call once from the Flow layout. */
  static init(): Disposable {
    const load = async () => {
      PgLessonHints.reset();
      const path = getLessonPath(PgExplorer.currentWorkspaceName);
      if (!path) {
        PgLesson._dispatch({ type: "load", path: null });
        return;
      }

      let progress = EMPTY_PROGRESS;
      try {
        const storage = PgTutorial.getStorage(STORAGE_DEFAULT);
        progress = (await storage.getItem("lesson")) ?? EMPTY_PROGRESS;
      } catch {
        // A first visit has no file yet, and a read failure costs one
        // lesson's history rather than the session. Start clean.
      }
      PgLesson._dispatch({ type: "load", path, progress });
    };

    const subs: Disposable[] = [
      PgExplorer.onDidSwitchWorkspace(load),
      PgFlow.onDidChange((flow) =>
        PgLesson._dispatch({
          type: "evaluate",
          flow,
          idl: PgProgramInfo.idl ?? null,
        })
      ),
    ];

    load();
    return { dispose: () => subs.forEach((s) => s.dispose()) };
  }

  private static _dispatch(ev: LessonEvent) {
    const before = PgLesson._stepId(PgLesson._state);
    const next = reduceLesson(PgLesson._state, ev);
    if (next === PgLesson._state) return;

    PgLesson._state = next;

    // A fresh step gets a fresh ladder.
    if (PgLesson._stepId(next) !== before) PgLessonHints.reset();
    if (ev.type !== "load") void PgLesson._persist();
    for (const cb of PgLesson._listeners) cb(next);
  }

  /** @returns the current step's id, or `null` outside a lesson */
  private static _stepId(state: LessonState) {
    if (!state.path) return null;
    return currentStep(state.path, state.progress)?.id ?? null;
  }

  private static async _persist() {
    if (!PgLesson._state.path) return;
    try {
      const storage = PgTutorial.getStorage(STORAGE_DEFAULT);
      await storage.setItem("lesson", PgLesson._state.progress);
    } catch {
      // The in-memory ratchet is still correct for this session; a
      // reload loses one step. An error toast mid-lesson costs more.
    }
  }

  private static _state: LessonState = INITIAL_LESSON_STATE;
  private static readonly _listeners = new Set<(s: LessonState) => void>();
}
