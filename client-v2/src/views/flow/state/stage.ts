import {
  PgBuildOutput,
  stripKnownNoise,
} from "../../sidebar/assistant/bridge/build-output";
import { PgCommand, PgExplorer, PgGlobal } from "../../../utils";
import type { Disposable } from "../../../utils";

export type Stage = "write" | "build" | "deploy" | "interact";
export type StageStatus = "upcoming" | "active" | "done" | "failed" | "running";

export interface FlowState {
  stage: Stage;
  build: StageStatus;
  deploy: StageStatus;
  interact: StageStatus;
  buildErrorCount: number;
  buildMs: number | null;
  /** When the current/last build run started, or `null` before the first
   * run. Lets a stage tell a stale `PgBuildOutput` apart from the one that
   * belongs to this run. */
  buildStartedAt: number | null;
}

export type FlowEvent =
  | { type: "build-start"; at: number }
  | { type: "build-finish"; failed: boolean; errorCount: number; ms: number }
  | { type: "deploy-start" }
  | { type: "deploy-finish"; ok: boolean }
  | { type: "set-stage"; stage: Stage }
  | { type: "workspace-change" };

export const INITIAL_FLOW_STATE: FlowState = {
  stage: "write",
  build: "upcoming",
  deploy: "upcoming",
  interact: "upcoming",
  buildErrorCount: 0,
  buildMs: null,
  buildStartedAt: null,
};

export const STAGES: readonly Stage[] = [
  "write",
  "build",
  "deploy",
  "interact",
];

const ERROR_HEADER = /^error(?:\[E\d+\])?: (.+)$/;
// rustc's own summary lines are not a diagnostic of their own - matches
// `parseBuildReport`'s `SUMMARY` in `stages/build-report.ts` so the header
// count and the Build surface's count always agree.
const SUMMARY = /^(could not compile|aborting due to)/;

/** Count real diagnostics, the way `parseBuildReport` does */
export const countErrors = (stderr: string) =>
  stripKnownNoise(stderr)
    .split("\n")
    .filter((l) => {
      const head = l.match(ERROR_HEADER);
      return !!head && !SUMMARY.test(head[1]);
    }).length;

/**
 * The dev loop as state. Pure reducer plus a tiny store; `init` wires the
 * reducer to the events the client already emits.
 */
export class PgFlow {
  static get state(): FlowState {
    return PgFlow._state;
  }

  static setStage(stage: Stage) {
    PgFlow._dispatch({ type: "set-stage", stage });
  }

  static onDidChange(cb: (s: FlowState) => void): Disposable {
    PgFlow._listeners.add(cb);
    cb(PgFlow._state);
    return { dispose: () => PgFlow._listeners.delete(cb) };
  }

  static reduce(state: FlowState, ev: FlowEvent): FlowState {
    switch (ev.type) {
      case "build-start":
        return {
          ...state,
          stage: "build",
          build: "running",
          buildStartedAt: ev.at,
        };
      case "build-finish":
        return ev.failed
          ? {
              ...state,
              stage: "build",
              build: "failed",
              buildErrorCount: ev.errorCount,
              buildMs: ev.ms,
            }
          : {
              ...state,
              stage: "write",
              build: "done",
              deploy: state.deploy === "upcoming" ? "active" : state.deploy,
              buildErrorCount: 0,
              buildMs: ev.ms,
            };
      case "deploy-start":
        return { ...state, stage: "deploy", deploy: "running" };
      case "deploy-finish":
        return ev.ok
          ? { ...state, stage: "deploy", deploy: "done", interact: "active" }
          : { ...state, stage: "deploy", deploy: "failed" };
      case "set-stage":
        return { ...state, stage: ev.stage };
      case "workspace-change":
        return INITIAL_FLOW_STATE;
    }
  }

  /** Subscribe to client events. Call once from the Flow layout. */
  static init(): Disposable {
    let startedAt = 0;
    const subs: Disposable[] = [
      PgCommand.build.onDidStart(() => {
        startedAt = Date.now();
        PgFlow._dispatch({ type: "build-start", at: startedAt });
      }),
      PgBuildOutput.onDidChange((out) => {
        if (!out) return;
        PgFlow._dispatch({
          type: "build-finish",
          failed: out.failed,
          errorCount: out.failed ? Math.max(1, countErrors(out.stderr)) : 0,
          ms: startedAt === 0 ? 0 : out.at - startedAt,
        });
      }),
      // `PgBuildOutput` only fills in once `buildProgram()` resolves, so a
      // build that never reaches the compiler (e.g. the build server is
      // unreachable) leaves the stepper on "running" forever. Treat a
      // failed `build` command as a failed build unless the real output for
      // *this* run already arrived and handled it.
      PgCommand.build.onDidFinish((result) => {
        if (!("err" in result)) return;
        const out = PgBuildOutput.latest;
        if (out && out.at >= startedAt) return;
        PgFlow._dispatch({
          type: "build-finish",
          failed: true,
          errorCount: 0,
          ms: startedAt === 0 ? 0 : Date.now() - startedAt,
        });
      }),
      PgCommand.deploy.onDidStart(() =>
        PgFlow._dispatch({ type: "deploy-start" })
      ),
      PgCommand.deploy.onDidFinish((result) => {
        // A second click while a deploy is already running pauses it
        // (`PgGlobal.deployState` becomes "paused") or resumes it (becomes
        // "loading") and returns immediately with `ok: undefined` -- not a
        // real completion. The deploy command always resets the state to
        // "ready" before a genuine finish, success or failure, so that is
        // the only value that means the deploy actually ended.
        if (PgGlobal.deployState !== "ready") return;
        PgFlow._dispatch({
          type: "deploy-finish",
          ok: !("err" in result),
        });
      }),
      PgExplorer.onDidSwitchWorkspace(() =>
        PgFlow._dispatch({ type: "workspace-change" })
      ),
    ];
    return { dispose: () => subs.forEach((s) => s.dispose()) };
  }

  private static _dispatch(ev: FlowEvent) {
    PgFlow._state = PgFlow.reduce(PgFlow._state, ev);
    for (const cb of PgFlow._listeners) cb(PgFlow._state);
  }

  private static _state: FlowState = INITIAL_FLOW_STATE;
  private static readonly _listeners = new Set<(s: FlowState) => void>();
}
