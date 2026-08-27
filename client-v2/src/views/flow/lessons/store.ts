import type { Idl } from "@coral-xyz/anchor";

import { PgLessonHints } from "./hints";
import {
  advance,
  continueRead,
  currentStep,
  EMPTY_PROGRESS,
  skipStep,
} from "./progress";
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
  /**
   * Set when the most recent load could not tell a clean first visit
   * (no saved file yet, `progress` is genuinely empty) apart from a
   * read that failed silently (a file exists but came back unreadable,
   * so `progress` is empty even though a real record might not be).
   * `_persist` refuses to write while this is set, so the cost of an
   * unreadable file is a skipped write, not the real record getting
   * overwritten with a shorter one.
   */
  loadFailed: boolean;
}

export const INITIAL_LESSON_STATE: LessonState = {
  path: null,
  progress: EMPTY_PROGRESS,
  attempted: false,
  attemptBaseline: null,
  loadFailed: false,
};

export type LessonEvent =
  | {
      type: "load";
      path: LessonPath | null;
      progress?: LessonProgress;
      loadFailed?: boolean;
    }
  | { type: "evaluate"; flow: FlowState; idl: Idl | null }
  | { type: "continue-read"; buildStartedAt: number | null }
  | { type: "skip-step"; buildStartedAt: number | null };

/** Pure reducer, so the ratchet's rules are testable without a browser. */
export const reduceLesson = (
  state: LessonState,
  ev: LessonEvent
): LessonState => {
  switch (ev.type) {
    case "load":
      // `attemptBaseline: null` is safe here for a reason this branch
      // does not enforce itself: entering a lesson is a workspace
      // change, and `PgFlow` reduces `workspace-change` to
      // `INITIAL_FLOW_STATE`, so `buildStartedAt` is already `null` by
      // the time the next `evaluate` runs.
      return ev.path
        ? {
            path: ev.path,
            progress: ev.progress ?? EMPTY_PROGRESS,
            attempted: false,
            attemptBaseline: null,
            loadFailed: ev.loadFailed ?? false,
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
      return {
        ...state,
        progress,
        attempted: false,
        attemptBaseline: ev.buildStartedAt,
      };
    }

    case "skip-step": {
      if (!state.path) return state;
      const progress = skipStep(state.path, state.progress);
      if (progress === state.progress) return state;
      return {
        ...state,
        progress,
        attempted: false,
        attemptBaseline: ev.buildStartedAt,
      };
    }
  }
};

const STORAGE_DEFAULT: { lesson: LessonProgress } = {
  lesson: EMPTY_PROGRESS,
};

/**
 * Mirrors the private path inside `PgTutorial.getStorage`. Duplicated
 * rather than exported so this file only reads `utils`, never edits it;
 * `PgExplorer.fs.exists` is what tells a missing file apart from a file
 * that exists but failed to parse, which `getStorage` itself cannot.
 */
const STORAGE_PATH = ".workspace/tutorial-storage.json";

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
    PgLesson._dispatch({
      type: "continue-read",
      buildStartedAt: PgFlow.state.buildStartedAt,
    });
  }

  /** Move past the current step unproven — see `skipStep`. */
  static skipStep() {
    PgLesson._dispatch({
      type: "skip-step",
      buildStartedAt: PgFlow.state.buildStartedAt,
    });
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
      let loadFailed = false;
      try {
        const storage = PgTutorial.getStorage(STORAGE_DEFAULT);
        const hasFile = await PgExplorer.fs.exists(STORAGE_PATH);
        const loaded = await storage.getItem("lesson");
        // `getItem` cannot actually throw -- `readToJSONOrDefault`
        // swallows every read or parse error and returns the same
        // empty default a genuine first visit would also produce.
        // Checking the file's existence separately is what tells the
        // two apart: a missing file is a clean first visit, safe to
        // persist over; an existing file that still came back as the
        // default means the read failed silently, and that must not be
        // persisted over.
        if (hasFile && loaded === EMPTY_PROGRESS) {
          loadFailed = true;
        } else {
          progress = loaded ?? EMPTY_PROGRESS;
        }
      } catch {
        // An unexpected error somewhere in the check above leaves us
        // unable to tell a first visit from a failed read either, so
        // treat it the same cautious way.
        loadFailed = true;
      }
      PgLesson._dispatch({ type: "load", path, progress, loadFailed });
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

    // The lesson's own name is captured now, at the moment the write is
    // queued, rather than read back out of `PgLesson._state` inside
    // `_persist` once its await settles -- by then a workspace switch
    // could have already moved `_state` on, and `_persist` would be
    // guarding against the wrong name.
    if (ev.type !== "load" && next.path) {
      void PgLesson._persist(
        next.path.tutorial,
        next.progress,
        next.loadFailed
      );
    }
    for (const cb of PgLesson._listeners) cb(next);
  }

  /** @returns the current step's id, or `null` outside a lesson */
  private static _stepId(state: LessonState) {
    if (!state.path) return null;
    return currentStep(state.path, state.progress)?.id ?? null;
  }

  /**
   * @param tutorial the lesson this write belongs to, captured when the
   * write was queued
   * @param progress the progress to write, captured the same way
   * @param loadFailed whether the load that produced `progress` could
   * not tell a real empty record apart from a failed read -- if so, the
   * write is skipped rather than risk shortening the real record
   */
  private static async _persist(
    tutorial: string,
    progress: LessonProgress,
    loadFailed: boolean
  ) {
    if (loadFailed) return;
    // The workspace may have moved on while this write was queued --
    // see the comment at the call site. Writing progress into whatever
    // workspace happens to be current when the write finally lands
    // would be worse than skipping it.
    if (PgExplorer.currentWorkspaceName !== tutorial) return;

    try {
      const storage = PgTutorial.getStorage(STORAGE_DEFAULT);
      await storage.setItem("lesson", progress);
    } catch {
      // The in-memory ratchet is still correct for this session; a
      // reload loses one step. An error toast mid-lesson costs more.
    }
  }

  private static _state: LessonState = INITIAL_LESSON_STATE;
  private static readonly _listeners = new Set<(s: LessonState) => void>();
}
