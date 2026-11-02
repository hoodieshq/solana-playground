import type { Goal } from "@/entities/tutorial";
import { createLogger } from "@/shared/lib/logger";
import { sameIdlName } from "@/shared/lib/idl-name";

import type { Judge } from "./ports";
import type { Called, RunResult } from "./progress";

const log = createLogger("tutorial-conversation:goals");

/**
 * Whether a run's result passes a step's goal: the real check, so no step
 * passes on the learner's word. The same goal is passed by an act card, a
 * client run and a Call panel call, since all three end in a `RunResult`.
 *
 * - `build`: a build (or the build of a build-and-deploy) that succeeded and
 *   whose IDL holds every instruction the goal names.
 * - `deploy`: a deploy that landed.
 * - `call`: a confirmed call of the goal's instruction carrying every
 *   argument the goal requires, each with a non-blank value, whose picked
 *   log line matches the goal's pattern. Arguments are read from what the
 *   deployed program decoded, which is what keeps a call before the upgrade
 *   from passing step 4: its log `Hello, World!` matches `Hello, .+!` too.
 */
export const judgeGoal: Judge = (goal, result) => {
  if (!result.ok) return false;
  switch (goal.kind) {
    case "build":
      return (
        (result.act === "build" || result.act === "buildDeploy") &&
        (goal.instructions ?? []).every((name) =>
          result.instructions.some((held) => sameIdlName(held, name))
        )
      );
    case "deploy":
      return result.act === "deploy" || result.act === "buildDeploy";
    case "call":
      return (
        (result.act === "run" || result.act === "call") &&
        // A result saved before `called` existed has none, and passes nothing
        (result.called ?? []).some((c) => callMeets(goal, c)) &&
        (goal.log === undefined || logMatches(goal.log, result.line))
      );
  }
};

type CallGoal = Extract<Goal, { kind: "call" }>;

/** The call names the goal's instruction and carries each required argument, non-blank */
const callMeets = (goal: CallGoal, called: Called): boolean =>
  sameIdlName(called.instruction, goal.instruction) &&
  (goal.args ?? []).every((arg) =>
    Object.entries(called.args).some(
      ([name, value]) => sameIdlName(name, arg) && value.trim() !== ""
    )
  );

/** Unanchored, as the definition's check reads a pattern */
const logMatches = (pattern: string, line: string | null): boolean => {
  if (line === null) return false;
  try {
    return new RegExp(pattern).test(line);
  } catch (e) {
    // `tutorial:check` rejects such a pattern, so one here is a definition
    // that skipped the check: the step cannot pass, and the team must hear
    log.error(e, { report: true, context: { pattern } });
    return false;
  }
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  // Hello Anchor's four goals, as its `tutorial.json` writes them
  const BUILD_HELLO: Goal = { kind: "build", instructions: ["hello"] };
  const DEPLOY: Goal = { kind: "deploy" };
  const CALL_HELLO: Goal = {
    kind: "call",
    instruction: "hello",
    log: "Hello, World!",
  };
  const GREET_BY_NAME: Goal = {
    kind: "call",
    instruction: "hello",
    args: ["name"],
    log: "Hello, .+!",
  };

  const built = (instructions: string[]): RunResult => ({
    act: "build",
    ok: true,
    seconds: 1,
    instructions,
  });
  const deployed = (act: "deploy" | "buildDeploy"): RunResult => ({
    act,
    ok: true,
    seconds: 3,
    programId: "Prog111",
    signature: "sig",
    upgraded: act === "buildDeploy",
    lamports: 1_500_000,
    instructions: ["hello"],
  });
  const ran = (
    act: "run" | "call",
    called: Called[],
    line: string | null
  ): RunResult => ({
    act,
    ok: true,
    seconds: 1,
    signatures: ["sig"],
    line,
    called,
  });
  const hello = (args: Record<string, string>): Called => ({
    instruction: "hello",
    args,
  });

  describe("features/tutorial-conversation/model/goals", () => {
    describe("build", () => {
      it("passes a build whose IDL holds the goal's instructions", () => {
        expect(judgeGoal(BUILD_HELLO, built(["hello"]))).toBe(true);
        expect(judgeGoal({ kind: "build" }, built([]))).toBe(true);
      });

      it("passes the build of a build-and-deploy", () => {
        expect(judgeGoal(BUILD_HELLO, deployed("buildDeploy"))).toBe(true);
      });

      it("fails a build missing an instruction, a failed build and another act", () => {
        expect(judgeGoal(BUILD_HELLO, built([]))).toBe(false);
        expect(
          judgeGoal(BUILD_HELLO, {
            act: "build",
            ok: false,
            seconds: 1,
            error: null,
            log: "error[E0412]",
          })
        ).toBe(false);
        expect(judgeGoal(BUILD_HELLO, deployed("deploy"))).toBe(false);
        expect(
          judgeGoal(BUILD_HELLO, ran("call", [hello({})], "Hello, World!"))
        ).toBe(false);
      });

      it("matches an instruction across the IDL's camelCase", () => {
        expect(
          judgeGoal(
            { kind: "build", instructions: ["greet_by_name"] },
            built(["greetByName"])
          )
        ).toBe(true);
      });
    });

    describe("deploy", () => {
      it("passes a deploy or a build-and-deploy that landed", () => {
        expect(judgeGoal(DEPLOY, deployed("deploy"))).toBe(true);
        expect(judgeGoal(DEPLOY, deployed("buildDeploy"))).toBe(true);
      });

      it("fails a deploy that did not land, and a build", () => {
        expect(
          judgeGoal(DEPLOY, {
            act: "deploy",
            ok: false,
            seconds: 1,
            reason: "no_funds",
            message: "Not enough devnet SOL",
          })
        ).toBe(false);
        expect(judgeGoal(DEPLOY, built(["hello"]))).toBe(false);
      });
    });

    describe("call", () => {
      it("passes step 3 from a client run, a call act and the Call panel alike", () => {
        const line = "Program log: Hello, World!";
        expect(judgeGoal(CALL_HELLO, ran("run", [hello({})], line))).toBe(
          true
        );
        expect(judgeGoal(CALL_HELLO, ran("call", [hello({})], line))).toBe(
          true
        );
      });

      it("fails a call with no log line, another instruction, or a failed transaction", () => {
        expect(judgeGoal(CALL_HELLO, ran("run", [hello({})], null))).toBe(
          false
        );
        expect(
          judgeGoal(
            CALL_HELLO,
            ran(
              "run",
              [{ instruction: "initialize", args: {} }],
              "Program log: Hello, World!"
            )
          )
        ).toBe(false);
        expect(
          judgeGoal(CALL_HELLO, {
            act: "run",
            ok: false,
            seconds: 1,
            message: "Transaction failed",
            log: "",
          })
        ).toBe(false);
        expect(judgeGoal(CALL_HELLO, deployed("deploy"))).toBe(false);
      });

      it("a call before the upgrade does not pass the argument goal", () => {
        // The deployed `hello` takes no `name` yet, so none is decoded, while
        // its log still matches step 4's pattern
        expect(
          judgeGoal(
            GREET_BY_NAME,
            ran("call", [hello({})], "Program log: Hello, World!")
          )
        ).toBe(false);
      });

      it("passes step 4 once the upgraded program takes a non-blank name", () => {
        expect(
          judgeGoal(
            GREET_BY_NAME,
            ran("call", [hello({ name: "Alex" })], "Program log: Hello, Alex!")
          )
        ).toBe(true);
        expect(
          judgeGoal(
            GREET_BY_NAME,
            ran("call", [hello({ name: "  " })], "Program log: Hello,   !")
          )
        ).toBe(false);
      });

      it("finds the goal's call among several, and matches names across camelCase", () => {
        expect(
          judgeGoal(
            { kind: "call", instruction: "greet_by_name", args: ["user_name"] },
            ran(
              "run",
              [
                { instruction: "initialize", args: {} },
                { instruction: "greetByName", args: { userName: "Alex" } },
              ],
              null
            )
          )
        ).toBe(true);
      });

      it("fails, without throwing, a result saved before `called` existed", () => {
        const old = {
          act: "call",
          ok: true,
          seconds: 1,
          signatures: ["sig"],
          line: "Program log: Hello, World!",
        } as unknown as RunResult;
        expect(judgeGoal(CALL_HELLO, old)).toBe(false);
      });

      it("fails, without throwing, a pattern that is not a regular expression", () => {
        expect(
          judgeGoal(
            { kind: "call", instruction: "hello", log: "(" },
            ran("call", [hello({})], "(")
          )
        ).toBe(false);
      });
    });
  });
}
