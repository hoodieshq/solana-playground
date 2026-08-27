jest.mock("../../../utils", () => ({
  PgExplorer: {
    currentWorkspaceName: null,
    onDidSwitchWorkspace: jest.fn(() => ({ dispose: jest.fn() })),
  },
  PgProgramInfo: { idl: null },
  PgTutorial: { getStorage: jest.fn() },
}));

import { INITIAL_LESSON_STATE, reduceLesson } from "./store";
import { INITIAL_FLOW_STATE } from "../state/stage";
import type { LessonPath } from "./types";
import type { Idl } from "@coral-xyz/anchor";

const hints: [string, string, string] = ["a", "b", "c"];

const PATH: LessonPath = {
  tutorial: "Hello Anchor",
  steps: [
    {
      id: "one",
      objective: "Define hello",
      verifiedBy: "the interface shows hello",
      verify: { kind: "idl", instruction: "hello" },
      target: "build",
      hints,
    },
    {
      id: "two",
      objective: "Deploy it",
      verifiedBy: "it is on devnet",
      verify: { kind: "deployed" },
      target: "deploy",
      hints,
    },
  ],
};

const IDL = {
  version: "0.1.0",
  name: "hello_anchor",
  instructions: [{ name: "hello", accounts: [], args: [] }],
} as Idl;

describe("reduceLesson", () => {
  const loaded = { ...INITIAL_LESSON_STATE, path: PATH };

  it("does nothing without a path", () => {
    const next = reduceLesson(INITIAL_LESSON_STATE, {
      type: "evaluate",
      flow: { ...INITIAL_FLOW_STATE, build: "done" },
      idl: IDL,
    });
    expect(next).toBe(INITIAL_LESSON_STATE);
  });

  it("advances the ratchet on evaluate", () => {
    const next = reduceLesson(loaded, {
      type: "evaluate",
      flow: { ...INITIAL_FLOW_STATE, build: "done" },
      idl: IDL,
    });
    expect(next.progress.completedStepIds).toEqual(["one"]);
  });

  it("counts a build started since the step began as an attempt", () => {
    const next = reduceLesson(loaded, {
      type: "evaluate",
      flow: { ...INITIAL_FLOW_STATE, buildStartedAt: 1000 },
      idl: null,
    });
    expect(next.attempted).toBe(true);
  });

  it("does not count a build that predates the step", () => {
    const started = { ...loaded, attemptBaseline: 1000 };
    const next = reduceLesson(started, {
      type: "evaluate",
      flow: { ...INITIAL_FLOW_STATE, buildStartedAt: 1000 },
      idl: null,
    });
    expect(next.attempted).toBe(false);
  });

  it("clears the attempt when the step advances", () => {
    const attempted = { ...loaded, attempted: true, attemptBaseline: null };
    const next = reduceLesson(attempted, {
      type: "evaluate",
      flow: { ...INITIAL_FLOW_STATE, build: "done", buildStartedAt: 1000 },
      idl: IDL,
    });
    expect(next.progress.completedStepIds).toEqual(["one"]);
    expect(next.attempted).toBe(false);
    expect(next.attemptBaseline).toBe(1000);
  });

  it("resets everything when the workspace stops being a lesson", () => {
    const dirty = {
      path: PATH,
      progress: { completedStepIds: ["one"], currentStepId: "two" },
      attempted: true,
      attemptBaseline: 1000,
    };
    const next = reduceLesson(dirty, { type: "load", path: null });
    expect(next).toEqual(INITIAL_LESSON_STATE);
  });
});
