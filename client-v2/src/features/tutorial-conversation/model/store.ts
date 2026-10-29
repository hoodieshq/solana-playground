import { slugOf } from "@/entities/tutorial";
import type { TutorialDefinition } from "@/entities/tutorial";
import { createLogger } from "@/shared/lib/logger";

import { insertBlock, typedKey, withOwnText } from "./landing";
import { failedResult, passingJudge } from "./ports";
import type { Judge, Runner, Workspace } from "./ports";
import { freshProgress, parseProgress } from "./progress";
import type {
  ConversationProgress,
  PassedVia,
  RunResult,
  SkipVia,
} from "./progress";
import { INITIAL_ENGINE_STATE, reduce, stepOfBeat } from "./reducer";
import type { Action, Effect, EngineContext, EngineState } from "./reducer";
import { tutorialTelemetry } from "./telemetry";
import { view } from "./view";
import type { ConversationView } from "./view";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgTutorial, storageDataPath } from "../../../utils/tutorial/tutorial";
import type { Disposable } from "../../../utils/types";
import { PgView } from "../../../utils/view";

const log = createLogger("tutorial-conversation:store");

/** The store's state: a context while the open workspace is a conversation tutorial */
export interface ConversationState {
  /** Null whenever the open workspace is not a tutorial with a definition */
  context: EngineContext | null;
  engine: EngineState;
  /**
   * Set when the load could not tell a clean first visit (no saved file) from
   * a read that failed or a file holding something this engine never wrote.
   * The store refuses to write while this is set: overwriting a real save with
   * a fresh one would be worse than keeping this session in memory.
   */
  loadFailed: boolean;
  /** When the save was loaded: turns from before it render whole */
  loadedAt: number;
}

export const INITIAL_CONVERSATION_STATE: ConversationState = {
  context: null,
  engine: INITIAL_ENGINE_STATE,
  loadFailed: false,
  loadedAt: 0,
};

/** The key under which the engine saves, beside the old lesson's `lesson` */
export const STORAGE_KEY = "conversation";

/**
 * The sentinel `getStorage` returns for a missing or unreadable file, by
 * identity. `storageDefault` is fresh per call: the storage's `setItem`
 * writes into the default it was handed, so a shared container would leak
 * one tutorial's save into the next.
 */
const EMPTY_SAVE = Object.freeze({});
const storageDefault = (): { [STORAGE_KEY]: unknown } => ({
  [STORAGE_KEY]: EMPTY_SAVE,
});

export interface ConversationPorts {
  workspace: Workspace;
  /** Required: a missing runner would fail every act, and a failed build
   * reads as the step's planned failure */
  runner: Runner;
  judge?: Judge;
}

/**
 * The conversation tutorial the learner is in, if any.
 *
 * One entry point: the cards and the composer call the methods below, each
 * of which is one reducer action. The reducer's effects are drained here,
 * through the ports `init` was given, and every change is written through
 * to `PgTutorial.getStorage` under `conversation`, in the tutorial's own
 * workspace, which project sync carries.
 */
export class PgConversation {
  static get state(): ConversationState {
    return PgConversation._state;
  }

  /** The feed's turns and the live card at `now`, memoized per state and time */
  static view(now = Date.now()): ConversationView | null {
    const s = PgConversation._state;
    if (!s.context) return null;
    if (PgConversation._viewOf !== s || PgConversation._viewAt !== now) {
      PgConversation._view = view(s.context.definition, s.engine, {
        now,
        loadedAt: s.loadedAt,
      });
      PgConversation._viewOf = s;
      PgConversation._viewAt = now;
    }
    return PgConversation._view;
  }

  static onDidChange(cb: (s: ConversationState) => void): Disposable {
    PgConversation._listeners.add(cb);
    cb(PgConversation._state);
    return { dispose: () => PgConversation._listeners.delete(cb) };
  }

  /** "Type it myself", or "I'll fix it myself": where the caret should go */
  static onDidRequestFocus(
    cb: (focus: { file: string; line: number | "landing" }) => void
  ): Disposable {
    PgConversation._focusListeners.add(cb);
    return { dispose: () => PgConversation._focusListeners.delete(cb) };
  }

  /** An unplanned failure to explain through the live assistant */
  static onDidRequestExplain(
    cb: (request: { beatId: string; result: RunResult }) => void
  ): Disposable {
    PgConversation._explainListeners.add(cb);
    return { dispose: () => PgConversation._explainListeners.delete(cb) };
  }

  static start() {
    PgConversation._dispatch({ type: "start", at: Date.now() });
  }

  static pick(beatId: string, option: number) {
    PgConversation._dispatch({ type: "pick", beatId, option, at: Date.now() });
  }

  static hint(beatId: string) {
    PgConversation._dispatch({ type: "hint", beatId, at: Date.now() });
  }

  static skip(beatId: string, via: SkipVia = "button") {
    PgConversation._dispatch({ type: "skip", beatId, via, at: Date.now() });
  }

  static typeIt(beatId: string) {
    PgConversation._dispatch({ type: "typeIt", beatId, at: Date.now() });
  }

  /** The learner changed a file; `content` is the whole file now */
  static edit(file: string, content: string) {
    PgConversation._dispatch({ type: "edit", file, content, at: Date.now() });
  }

  /** An act card pressed, or its composer word */
  static act(beatId: string, args?: Record<string, string>) {
    PgConversation._dispatch({ type: "act", beatId, args, at: Date.now() });
  }

  /** A step's goal met outside the feed: the Call panel or a client run */
  static passed(via: Exclude<PassedVia, "chat">, result: RunResult) {
    PgConversation._dispatch({ type: "passed", via, result, at: Date.now() });
  }

  static explain(beatId: string) {
    PgConversation._dispatch({ type: "explain", beatId, at: Date.now() });
  }

  static fixMyself(beatId: string) {
    PgConversation._dispatch({ type: "fixMyself", beatId, at: Date.now() });
  }

  static next() {
    PgConversation._dispatch({ type: "next", at: Date.now() });
  }

  /** Back to the intro. The frame confirms first; the assistant's thread stays */
  static startOver() {
    PgConversation._dispatch({ type: "startOver", at: Date.now() });
  }

  /**
   * Subscribe to the explorer and load the open workspace's save. Call once
   * from the frame, with the ports the acts run through.
   */
  static init(ports: ConversationPorts): Disposable {
    PgConversation._ports = {
      workspace: ports.workspace,
      runner: ports.runner,
      judge: ports.judge ?? passingJudge,
    };
    // Once a session: `init` is called once from the frame
    PgConversation._toldSaveFailed = false;
    PgConversation._toldLoadFailed = false;

    const subs: Disposable[] = [
      PgExplorer.onDidSwitchWorkspace(() => {
        void PgConversation._load();
      }),
    ];
    void PgConversation._load();
    return {
      dispose: () => {
        subs.forEach((s) => s.dispose());
        PgConversation._clearTimer();
      },
    };
  }

  private static async _load() {
    const name = PgExplorer.currentWorkspaceName;
    const definition = name ? PgConversation._definitionOf(name) : null;
    if (!name || !definition) {
      PgConversation._set(INITIAL_CONVERSATION_STATE);
      return;
    }
    const ports = PgConversation._ports;
    const context: EngineContext = {
      definition,
      slug: slugOf(definition.name),
      judge: ports?.judge ?? passingJudge,
    };

    let progress: ConversationProgress = freshProgress();
    let loadFailed = false;
    try {
      const storage = PgTutorial.getStorage(storageDefault());
      const hasFile = await PgExplorer.fs.exists(storageDataPath());
      const loaded: unknown = await storage.getItem(STORAGE_KEY);
      // `getItem` swallows every read or parse error and returns the same
      // default a first visit produces. The file's existence tells them apart.
      if (hasFile && loaded === EMPTY_SAVE) {
        loadFailed = true;
      } else if (loaded == null || loaded === EMPTY_SAVE) {
        progress = freshProgress();
      } else {
        const parsed = parseProgress(loaded);
        if (!parsed) {
          // The file holds something this engine never wrote. Refusing to
          // write is cheaper than being wrong about it.
          loadFailed = true;
        } else if (!PgConversation._knows(definition, parsed)) {
          // A step or beat the definition no longer has: the engine could
          // act on nothing, so the save reads as unreadable
          loadFailed = true;
        } else {
          progress = parsed;
        }
      }
    } catch (e) {
      log.error(e, { report: true });
      loadFailed = true;
    }
    if (loadFailed) {
      log.error(`Could not read the saved progress of ${name}`, {
        report: true,
      });
    }

    // The workspace may have moved on while the read was in flight
    if (PgExplorer.currentWorkspaceName !== name) return;
    PgConversation._set({
      context,
      engine: { progress, stage: null },
      loadFailed,
      loadedAt: Date.now(),
    });
    if (loadFailed) void PgConversation._tellLoadFailed();
  }

  /** Whether every step and beat the save names is in the definition */
  private static _knows(
    definition: TutorialDefinition,
    progress: ConversationProgress
  ): boolean {
    const steps = new Set(definition.steps.map((s) => s.id));
    const beats = new Set(
      definition.steps.flatMap((s) =>
        s.beats.concat(s.onFail ?? []).map((b) => b.id)
      )
    );
    const cursorStep =
      progress.cursor.kind === "step" ? [progress.cursor.stepId] : [];
    const orphan = [
      ...cursorStep.filter((id) => !steps.has(id)),
      ...Object.keys(progress.beats).filter((id) => !beats.has(id)),
      ...Object.keys(progress.runs).filter((id) => !beats.has(id)),
      ...Object.keys(progress.times).filter((id) => !steps.has(id)),
      ...progress.passed.filter((id) => !steps.has(id)),
    ];
    if (orphan.length === 0) return true;
    log.error(
      `The saved progress of ${
        definition.name
      } names ids the definition does not have: ${orphan.join(", ")}`,
      { report: true }
    );
    return false;
  }

  /** The learner hears once that this session is not being saved */
  private static async _tellLoadFailed() {
    if (PgConversation._toldLoadFailed) return;
    PgConversation._toldLoadFailed = true;
    try {
      const { default: LoadFailedToast } = await import(
        "../ui/LoadFailedToast"
      );
      PgView.setToast(LoadFailedToast, {
        options: { name: "tutorial-load-failed" },
      });
    } catch (e) {
      log.error(e, { report: true });
    }
  }

  private static _definitionOf(name: string): TutorialDefinition | null {
    return PgTutorial.all.find((t) => t.name === name)?.definition ?? null;
  }

  private static _dispatch(action: Action) {
    const s = PgConversation._state;
    if (!s.context) return;
    const { state: engine, effects } = reduce(s.context, s.engine, action);
    if (engine === s.engine && effects.length === 0) return;

    if (engine !== s.engine) {
      // Start over is the one write allowed over a save that could not be
      // read: it is the learner's "discard it", and the only way out
      const loadFailed = action.type === "startOver" ? false : s.loadFailed;
      if (s.loadFailed && !loadFailed) {
        log.info(
          `Start over replaces the unreadable saved progress of ${s.context.definition.name}`
        );
      }
      PgConversation._set({ ...s, engine, loadFailed });
      // Only the save is written, never a stage change: the file is synced,
      // and an identical rewrite reads as a change on the other device
      if (engine.progress !== s.engine.progress) {
        // The tutorial's name is captured now: by the time the write lands,
        // a workspace switch could have moved the state on
        const name = s.context.definition.name;
        void PgConversation._persist(name, engine.progress, loadFailed);
      }
    }
    void PgConversation._drain(s.context, effects);
  }

  private static _set(next: ConversationState) {
    PgConversation._state = next;
    PgConversation._schedule();
    for (const cb of PgConversation._listeners) cb(next);
  }

  /** The next moment the feed changes on its own: a turn arriving, or the finish */
  private static _schedule() {
    PgConversation._clearTimer();
    const v = PgConversation.view();
    if (!v) return;
    const now = Date.now();
    if (v.finishAt !== null) {
      const at = v.finishAt;
      PgConversation._timer = setTimeout(
        () =>
          PgConversation._dispatch({
            type: "finish",
            at: Math.max(at, Date.now()),
          }),
        Math.max(0, at - now)
      );
      return;
    }
    if (v.nextAt !== null) {
      PgConversation._timer = setTimeout(
        () => PgConversation._set(PgConversation._state),
        Math.max(0, v.nextAt - now)
      );
    }
  }

  private static _clearTimer() {
    if (PgConversation._timer !== null) clearTimeout(PgConversation._timer);
    PgConversation._timer = null;
  }

  private static async _drain(context: EngineContext, effects: Effect[]) {
    const ports = PgConversation._ports;
    if (!ports) return;
    const name = context.definition.name;
    /** A write or a run landing after a switch must not touch the new workspace */
    const stillOpen = () => PgExplorer.currentWorkspaceName === name;

    for (const effect of effects) {
      switch (effect.kind) {
        case "event":
          tutorialTelemetry.track(effect.name, effect.params);
          break;
        case "focus":
          for (const cb of PgConversation._focusListeners) {
            cb({ file: effect.file, line: effect.line });
          }
          break;
        case "explain":
          for (const cb of PgConversation._explainListeners) {
            cb({ beatId: effect.beatId, result: effect.result });
          }
          break;
        case "restore": {
          // Whole files, in order; a failure leaves the rest to the learner
          for (const [path, content] of Object.entries(effect.files)) {
            try {
              if (!stillOpen()) break;
              await ports.workspace.write(path, content, name);
            } catch (e) {
              log.error(e, { report: true });
            }
          }
          break;
        }
        case "create": {
          try {
            if (!stillOpen()) break;
            const exists =
              (await ports.workspace.read(effect.path, name)) !== null;
            if (!stillOpen()) break;
            if (!exists) await ports.workspace.write(effect.path, "", name);
            if (!stillOpen()) break;
            PgConversation._dispatch({
              type: "written",
              beatId: effect.beatId,
              wrote: { file: effect.path, lines: [], created: true },
              at: effect.at,
            });
          } catch (e) {
            log.error(e, { report: true });
            PgConversation._writeFailed(effect.beatId, name);
          }
          break;
        }
        case "write": {
          try {
            if (!stillOpen()) break;
            const step = stepOfBeat(context.definition, effect.beatId);
            const before =
              (await ports.workspace.read(effect.file, name)) ?? "";
            if (!stillOpen()) break;
            // A key line the learner typed is replaced by the block around it,
            // keeping their own `msg!` words
            let base = before;
            let block = effect.block;
            const at = effect.key ? typedKey(before, effect.key) : null;
            if (at !== null) {
              const rows = before.split("\n");
              block = withOwnText(block, rows[at - 1]);
              rows.splice(at - 1, 1);
              base = rows.join("\n");
            }
            const placed = insertBlock(
              base,
              block,
              step?.target[effect.file],
              step?.start[effect.file] ?? ""
            );
            await ports.workspace.write(effect.file, placed.code, name);
            if (!stillOpen()) break;
            PgConversation._dispatch({
              type: "written",
              beatId: effect.beatId,
              wrote: { file: effect.file, lines: placed.lines },
              at: effect.at,
            });
          } catch (e) {
            // The question stays resolved and the block is not in the file:
            // the card says so (`writeFailed`) and the learner types it
            log.error(e, { report: true });
            PgConversation._writeFailed(effect.beatId, name);
          }
          break;
        }
        case "run": {
          let result: RunResult;
          try {
            result = await ports.runner.run(effect.act, effect.input, (stage) =>
              PgConversation._dispatch({
                type: "stage",
                beatId: effect.beatId,
                startedAt: effect.startedAt,
                label: stage.label,
                index: stage.index,
                count: stage.count,
                at: Date.now(),
              })
            );
          } catch (e) {
            log.error(e, { report: true });
            result = failedResult(
              effect.act,
              e instanceof Error ? e.message : String(e)
            );
          }
          if (!stillOpen()) {
            // The result is lost with the switch: a landed deploy reads as
            // interrupted and may be run again, so the team hears of it
            log.warn(
              `A ${effect.act} result for ${name} arrived after the workspace moved on (ok: ${result.ok})`,
              { report: result.ok && effect.act !== "build" }
            );
            break;
          }
          PgConversation._dispatch({
            type: "ended",
            beatId: effect.beatId,
            startedAt: effect.startedAt,
            result,
            at: Date.now(),
          });
          break;
        }
      }
    }
  }

  /** A write that did not land, told to the card unless the workspace moved */
  private static _writeFailed(beatId: string, name: string) {
    if (PgExplorer.currentWorkspaceName !== name) return;
    PgConversation._dispatch({ type: "writeFailed", beatId, at: Date.now() });
  }

  /**
   * @param name the tutorial this write belongs to, captured when queued
   * @param progress the save to write, captured the same way
   * @param loadFailed whether the load could not read the file; if so the
   * write is skipped rather than risk replacing a real save
   */
  private static async _persist(
    name: string,
    progress: ConversationProgress,
    loadFailed: boolean
  ) {
    if (loadFailed) return;
    if (PgExplorer.currentWorkspaceName !== name) return;
    try {
      const storage = PgTutorial.getStorage(storageDefault());
      await storage.setItem(STORAGE_KEY, progress);
    } catch (e) {
      // The in-memory save is still right for this session; a reload loses
      // its tail. Reported every time, told to the learner once.
      log.error(e, { report: true });
      if (!PgConversation._toldSaveFailed) {
        PgConversation._toldSaveFailed = true;
        try {
          const { default: SaveFailedToast } = await import(
            "../ui/SaveFailedToast"
          );
          PgView.setToast(SaveFailedToast, {
            options: { name: "tutorial-save-failed" },
          });
        } catch (toastError) {
          log.error(toastError, { report: true });
        }
      }
    }
  }

  private static _toldSaveFailed = false;
  private static _toldLoadFailed = false;
  private static _state: ConversationState = INITIAL_CONVERSATION_STATE;
  private static _ports: Required<ConversationPorts> | null = null;
  private static _timer: ReturnType<typeof setTimeout> | null = null;
  private static _view: ConversationView | null = null;
  private static _viewOf: ConversationState | null = null;
  private static _viewAt = 0;
  private static readonly _listeners = new Set<
    (s: ConversationState) => void
  >();
  private static readonly _focusListeners = new Set<
    (focus: { file: string; line: number | "landing" }) => void
  >();
  private static readonly _explainListeners = new Set<
    (request: { beatId: string; result: RunResult }) => void
  >();
}
