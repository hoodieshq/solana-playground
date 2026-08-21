import {
  PgBuildOutput,
  stripKnownNoise,
} from "../../sidebar/assistant/bridge/build-output";
import { PgCommand, PgExplorer } from "../../../utils";
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
}

export type FlowEvent =
  | { type: "build-start" }
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
};

export const STAGES: readonly Stage[] = ["write", "build", "deploy", "interact"];

/** Count `error[...]` and `error:` lines the way the terminal does */
export const countErrors = (stderr: string) =>
  stripKnownNoise(stderr)
    .split("\n")
    .filter((l) => /^error(\[|:)/.test(l)).length;

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
        return { ...state, stage: "build", build: "running" };
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
        PgFlow._dispatch({ type: "build-start" });
      }),
      PgBuildOutput.onDidChange((out) => {
        if (!out) return;
        PgFlow._dispatch({
          type: "build-finish",
          failed: out.failed,
          errorCount: out.failed ? Math.max(1, countErrors(out.stderr)) : 0,
          ms: startedAt ? out.at - startedAt : 0,
        });
      }),
      PgCommand.deploy.onDidStart(() =>
        PgFlow._dispatch({ type: "deploy-start" })
      ),
      PgCommand.deploy.onDidFinish((result) =>
        PgFlow._dispatch({ type: "deploy-finish", ok: result !== undefined })
      ),
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
