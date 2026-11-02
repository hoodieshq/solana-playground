import type { TerminalReason } from "./telemetry";

/** A run's verdict, the one the terminal bar last has to speak for */
export type LastRun =
  | { kind: "build"; ok: true; instructions: string[] }
  | { kind: "build"; ok: false; line: number | null }
  | { kind: "deploy"; ok: boolean };

export interface TerminalFacts {
  /** What runs now, if anything */
  running: "build" | "deploy" | null;
  /** The newest finished run, or null before anything ran */
  last: LastRun | null;
  /**
   * The file edited since the last good deploy (its base name), or null:
   * the deploy no longer speaks for the code
   */
  changed: string | null;
}

/** The bar's dot: the design system's `StatusDot` variants it uses */
export type TerminalTone = "idle" | "running" | "success" | "warning" | "error";

export interface TerminalStatus {
  text: string;
  tone: TerminalTone;
}

/** The drawer's line before anything ran */
export const NOTHING_RUN = "Nothing run yet. Builds, deploys and calls print here.";

/** "IDL: 1 instruction · hello", the way a good build names what it made */
const idlLine = (instructions: string[]) => {
  const count = `${instructions.length} instruction${
    instructions.length === 1 ? "" : "s"
  }`;
  return [`IDL: ${count}`, ...instructions].join(" · ");
};

const lastText = (last: LastRun): TerminalStatus => {
  if (last.kind === "deploy") {
    return last.ok
      ? { text: "Deployed", tone: "success" }
      : { text: "Deploy failed", tone: "error" };
  }
  if (!last.ok) {
    return {
      text:
        last.line === null ? "Build failed" : `Build failed · line ${last.line}`,
      tone: "error",
    };
  }
  return {
    text: `Build successful · ${idlLine(last.instructions)}`,
    tone: "success",
  };
};

/**
 * The terminal bar's one line: a run in flight, then a file edited past the
 * last good deploy (amber: the deploy no longer speaks for the code), then
 * the newest run's verdict, then "Ready".
 */
export const terminalStatus = ({
  running,
  last,
  changed,
}: TerminalFacts): TerminalStatus => {
  if (running === "build") return { text: "Building", tone: "running" };
  if (running === "deploy") return { text: "Deploying", tone: "running" };
  if (changed !== null && last?.kind === "deploy" && last.ok) {
    return {
      text: `${changed} changed since the last deploy`,
      tone: "warning",
    };
  }
  if (last === null) return { text: "Ready", tone: "idle" };
  return lastText(last);
};

/** The two stage statuses the auto-open reads (`PgFlow`'s `StageStatus`) */
export interface RunStates {
  build: string;
  deploy: string;
}

/**
 * Why the drawer opens by itself on this change, or null: a build that ran
 * and failed, or the tutorial's first deploy to land. Every other run leaves
 * the drawer as the learner left it. `deployedBefore` is true once any
 * deploy of this tutorial has been seen done, a restored one included.
 */
export const autoOpenReason = (
  prev: RunStates,
  next: RunStates,
  deployedBefore: boolean
): TerminalReason | null => {
  if (prev.build === "running" && next.build === "failed") {
    return "build_failed";
  }
  if (prev.deploy === "running" && next.deploy === "done" && !deployedBefore) {
    return "first_deploy";
  }
  return null;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("widgets/tutorial-workspace/model/terminal", () => {
    const facts = (
      last: LastRun | null,
      running: TerminalFacts["running"] = null,
      changed: string | null = null
    ): TerminalFacts => ({ running, last, changed });

    it("reads Ready before anything ran", () => {
      expect(terminalStatus(facts(null))).toEqual({
        text: "Ready",
        tone: "idle",
      });
    });

    it("says what runs while it runs", () => {
      expect(terminalStatus(facts(null, "build")).text).toBe("Building");
      expect(
        terminalStatus(facts({ kind: "deploy", ok: true }, "deploy")).text
      ).toBe("Deploying");
    });

    it("names the IDL a good build made", () => {
      expect(
        terminalStatus(facts({ kind: "build", ok: true, instructions: ["hello"] }))
      ).toEqual({
        text: "Build successful · IDL: 1 instruction · hello",
        tone: "success",
      });
      expect(
        terminalStatus(
          facts({ kind: "build", ok: true, instructions: ["a", "b"] })
        ).text
      ).toBe("Build successful · IDL: 2 instructions · a · b");
    });

    it("points a failed build at its line when it has one", () => {
      expect(
        terminalStatus(facts({ kind: "build", ok: false, line: 12 }))
      ).toEqual({ text: "Build failed · line 12", tone: "error" });
      expect(
        terminalStatus(facts({ kind: "build", ok: false, line: null })).text
      ).toBe("Build failed");
    });

    it("reads amber once a file changed past a good deploy", () => {
      expect(
        terminalStatus(facts({ kind: "deploy", ok: true }, null, "lib.rs"))
      ).toEqual({ text: "lib.rs changed since the last deploy", tone: "warning" });
      // A failed deploy never spoke for the code
      expect(
        terminalStatus(facts({ kind: "deploy", ok: false }, null, "lib.rs"))
          .text
      ).toBe("Deploy failed");
    });

    it("opens on a failed build and on the first deploy only", () => {
      const at = (build: string, deploy: string) => ({ build, deploy });
      expect(
        autoOpenReason(at("running", "upcoming"), at("failed", "upcoming"), false)
      ).toBe("build_failed");
      expect(
        autoOpenReason(at("running", "upcoming"), at("done", "active"), false)
      ).toBeNull();
      expect(
        autoOpenReason(at("done", "running"), at("done", "done"), false)
      ).toBe("first_deploy");
      expect(
        autoOpenReason(at("done", "running"), at("done", "done"), true)
      ).toBeNull();
      // A restore that reads a deploy back is not a deploy landing
      expect(
        autoOpenReason(at("done", "upcoming"), at("done", "done"), false)
      ).toBeNull();
    });
  });
}
