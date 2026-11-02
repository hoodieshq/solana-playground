import type { Disposable } from "../../../../../../utils";

/**
 * Where the Rust analyzer's start is, for the status indicator. Set only by
 * `initRustAnalyzer`; "taking longer" is the reader's call, from `since`.
 */
export type AnalyzerState =
  /** No Rust file has started it yet */
  | { kind: "idle" }
  /** The worker and the default crates are loading, since `Date.now()` */
  | { kind: "starting"; since: number }
  | { kind: "ready" }
  /** The start threw after the worker came up */
  | { kind: "failed" }
  /** The page is not cross-origin isolated, so it never starts here */
  | { kind: "off" };

type Listener = (state: AnalyzerState) => void;

let current: AnalyzerState = { kind: "idle" };
const listeners = new Set<Listener>();

export const PgAnalyzerStatus = {
  get: (): AnalyzerState => current,

  set(state: AnalyzerState) {
    current = state;
    for (const cb of listeners) cb(state);
  },

  /** Calls `cb` with the state now, then on every change */
  onDidChange(cb: Listener): Disposable {
    listeners.add(cb);
    cb(current);
    return { dispose: () => listeners.delete(cb) };
  },
};

if (import.meta.vitest) {
  const { describe, it, expect, vi, afterEach } = import.meta.vitest;

  describe("components/Editor/Monaco/languages/rust/rust-analyzer/status", () => {
    afterEach(() => PgAnalyzerStatus.set({ kind: "idle" }));

    it("starts idle", () => {
      expect(PgAnalyzerStatus.get()).toEqual({ kind: "idle" });
    });

    it("tells a subscriber the state now, then each change", () => {
      const cb = vi.fn();
      const { dispose } = PgAnalyzerStatus.onDidChange(cb);
      PgAnalyzerStatus.set({ kind: "starting", since: 5 });
      PgAnalyzerStatus.set({ kind: "ready" });
      dispose();
      expect(cb.mock.calls).toEqual([
        [{ kind: "idle" }],
        [{ kind: "starting", since: 5 }],
        [{ kind: "ready" }],
      ]);
    });

    it("stops telling a disposed subscriber", () => {
      const cb = vi.fn();
      PgAnalyzerStatus.onDidChange(cb).dispose();
      PgAnalyzerStatus.set({ kind: "failed" });
      expect(cb).toHaveBeenCalledTimes(1);
      expect(PgAnalyzerStatus.get()).toEqual({ kind: "failed" });
    });
  });
}
