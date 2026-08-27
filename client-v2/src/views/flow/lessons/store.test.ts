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

// Mirrors the real Hello Anchor path's shape: a `read` step immediately
// followed by a build-verified step, the only sequence `continue-read`
// can transition into a build-gated step from.
const READ_THEN_BUILD_PATH: LessonPath = {
  tutorial: "Hello Anchor",
  steps: [
    {
      id: "intro",
      objective: "Read the overview",
      verifiedBy: "you have read it",
      verify: { kind: "read" },
      target: "write",
      hints,
    },
    {
      id: "build-it",
      objective: "Define hello",
      verifiedBy: "the interface shows hello",
      verify: { kind: "idl", instruction: "hello" },
      target: "build",
      hints,
    },
  ],
};

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

  it("carries the live build baseline through continue-read", () => {
    // The learner already built once earlier in the session
    // (`buildStartedAt: 1000`), then lands on a `read` step and clicks
    // "Continue reading" into the build-verified step that follows.
    const onReadStep = {
      ...loaded,
      path: READ_THEN_BUILD_PATH,
      progress: { completedStepIds: [], currentStepId: "intro" },
    };
    const afterContinue = reduceLesson(onReadStep, {
      type: "continue-read",
      buildStartedAt: 1000,
    });

    // No new build has happened -- the very next `evaluate` sees the
    // same `buildStartedAt` the flow already had.
    const next = reduceLesson(afterContinue, {
      type: "evaluate",
      flow: { ...INITIAL_FLOW_STATE, buildStartedAt: 1000 },
      idl: null,
    });
    expect(next.attempted).toBe(false);
  });

  it("moves past a skipped step without marking it completed", () => {
    const next = reduceLesson(loaded, {
      type: "skip-step",
      buildStartedAt: 1000,
    });

    expect(next.progress.completedStepIds).toEqual([]);
    expect(next.progress.skippedStepIds).toEqual(["one"]);
    expect(next.attempted).toBe(false);
    expect(next.attemptBaseline).toBe(1000);
  });

  it("resets everything when the workspace stops being a lesson", () => {
    const dirty = {
      path: PATH,
      progress: { completedStepIds: ["one"], currentStepId: "two" },
      attempted: true,
      attemptBaseline: 1000,
      loadFailed: false,
    };
    const next = reduceLesson(dirty, { type: "load", path: null });
    expect(next).toEqual(INITIAL_LESSON_STATE);
  });

  it("carries a failed load's flag into state", () => {
    const next = reduceLesson(INITIAL_LESSON_STATE, {
      type: "load",
      path: PATH,
      loadFailed: true,
    });
    expect(next.loadFailed).toBe(true);
  });

  it("defaults a load's flag to false when it is not given", () => {
    const next = reduceLesson(INITIAL_LESSON_STATE, {
      type: "load",
      path: PATH,
    });
    expect(next.loadFailed).toBe(false);
  });
});
