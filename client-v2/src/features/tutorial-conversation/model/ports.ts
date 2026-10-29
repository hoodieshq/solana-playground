import type { RunResult } from "./progress";
import type { Act, Goal } from "@/entities/tutorial";

/**
 * The engine's three doors to the world. The reducer never touches them: it
 * queues effects, and `PgConversation` drains the queue through these. The
 * in-memory ones below let the whole engine run in a unit test.
 */

/** The tutorial workspace's files, by path relative to the workspace */
export interface Workspace {
  /** @returns the file's content, or null when there is no such file */
  read(path: string): Promise<string | null>;
  /** Writes the whole file, creating it when needed */
  write(path: string, content: string): Promise<void>;
}

export interface RunInput {
  /** The act beat's id, so a result can be matched to its run */
  beatId: string;
  /** A call act's instruction and the argument values the learner gave */
  call?: { instruction: string; args: Record<string, string> };
}

/**
 * Runs one act and reports its stages as they start ("Building",
 * "Writing buffer", ...). The result is a fact, never a throw: a run that
 * could not happen is `ok: false` with its reason. The run tickets provide
 * the real one.
 */
export interface Runner {
  run(
    act: Act,
    input: RunInput,
    onStage: (stage: string) => void
  ): Promise<RunResult>;
}

/** Whether a run's result passes a step's goal (task 3.2 supplies the real checks) */
export type Judge = (goal: Goal, result: RunResult) => boolean;

/** An in-memory workspace, for tests. `files` is live: read it after a write */
export const memoryWorkspace = (
  initial: Record<string, string> = {}
): Workspace & { files: Record<string, string> } => {
  const files = { ...initial };
  return {
    files,
    read: async (path) => (path in files ? files[path] : null),
    write: async (path, content) => {
      files[path] = content;
    },
  };
};

/**
 * A runner that answers from a script, for tests: each run takes the next
 * entry, reporting its stages first. A run past the script's end rejects, so
 * a test that runs more than it planned fails loudly.
 */
export const stubRunner = (
  script: { stages?: string[]; result: RunResult }[]
): Runner & { runs: { act: Act; input: RunInput }[] } => {
  const queue = [...script];
  const runs: { act: Act; input: RunInput }[] = [];
  return {
    runs,
    run: async (act, input, onStage) => {
      runs.push({ act, input });
      const next = queue.shift();
      if (!next) throw new Error(`stubRunner: no result scripted for ${act}`);
      for (const stage of next.stages ?? []) onStage(stage);
      return next.result;
    },
  };
};

/** Any run that ends well passes its goal, until 3.2's checks replace it */
export const passingJudge: Judge = (_goal, result) => result.ok;

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("features/tutorial-conversation/model/ports", () => {
    it("memoryWorkspace reads what was written and null otherwise", async () => {
      const ws = memoryWorkspace({ "src/lib.rs": "" });
      expect(await ws.read("src/lib.rs")).toBe("");
      expect(await ws.read("client/client.ts")).toBeNull();
      await ws.write("client/client.ts", "// hi");
      expect(ws.files["client/client.ts"]).toBe("// hi");
    });

    it("stubRunner reports the stages, answers in order and refuses past the script", async () => {
      const ok: RunResult = {
        act: "build",
        ok: true,
        seconds: 1,
        instructions: [],
      };
      const runner = stubRunner([{ stages: ["Building"], result: ok }]);
      const stages: string[] = [];
      await expect(
        runner.run("build", { beatId: "s1.build" }, (s) => stages.push(s))
      ).resolves.toBe(ok);
      expect(stages).toEqual(["Building"]);
      expect(runner.runs).toEqual([
        { act: "build", input: { beatId: "s1.build" } },
      ]);
      await expect(
        runner.run("build", { beatId: "f1.build" }, () => {})
      ).rejects.toThrow("no result scripted");
    });

    it("passingJudge passes on ok alone", () => {
      const goal: Goal = { kind: "build" };
      expect(
        passingJudge(goal, {
          act: "build",
          ok: true,
          seconds: 1,
          instructions: [],
        })
      ).toBe(true);
      expect(
        passingJudge(goal, {
          act: "build",
          ok: false,
          seconds: 1,
          error: null,
          log: "",
        })
      ).toBe(false);
    });
  });
}
