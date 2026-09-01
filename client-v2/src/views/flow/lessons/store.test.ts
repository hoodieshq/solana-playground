jest.mock("../../../utils", () => ({
  PgExplorer: {
    currentWorkspaceName: null,
    onDidSwitchWorkspace: jest.fn(() => ({ dispose: jest.fn() })),
  },
  PgProgramInfo: { idl: null },
  PgTutorial: { getStorage: jest.fn() },
}));

import { INITIAL_LESSON_STATE, reduceLesson } from "./store";
import type { LessonState } from "./store";
import { attempted, cursorStep, foldRecord, rung } from "./ledger";
import { INITIAL_FLOW_STATE } from "../state/stage";
import type { FlowState } from "../state/stage";
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
      hints,
    },
    {
      id: "two",
      objective: "Deploy it",
      verifiedBy: "it is on devnet",
      verify: { kind: "deployed" },
      hints,
    },
    {
      id: "three",
      objective: "Read the wrap-up",
      verifiedBy: "you have marked this page as read",
      verify: { kind: "read", at: "interact" },
      hints,
    },
  ],
};

const IDL = {
  version: "0.1.0",
  name: "hello_anchor",
  instructions: [{ name: "hello", accounts: [], args: [] }],
} as Idl;

const flow = (over: Partial<FlowState>): FlowState => ({
  ...INITIAL_FLOW_STATE,
  ...over,
});

const load = (state = INITIAL_LESSON_STATE): LessonState =>
  reduceLesson(state, { type: "load", path: PATH, at: 1 });

const evaluate = (state: LessonState, over: Partial<FlowState>, idl = IDL) =>
  reduceLesson(state, { type: "evaluate", flow: flow(over), idl, at: 2 });

const view = (state: LessonState) => foldRecord(PATH, state.record);

describe("reduceLesson", () => {
  it("does nothing without a path", () => {
    const next = reduceLesson(INITIAL_LESSON_STATE, {
      type: "evaluate",
      flow: flow({ build: "done" }),
      idl: IDL,
      at: 2,
    });
    expect(next).toBe(INITIAL_LESSON_STATE);
  });

  it("records an enter on load", () => {
    const state = load();
    expect(state.record.events.map((e) => e.type)).toEqual(["enter"]);
  });

  it("resets when the workspace stops being a lesson", () => {
    const next = reduceLesson(load(), { type: "load", path: null, at: 1 });
    expect(next).toEqual(INITIAL_LESSON_STATE);
  });

  it("proves a step through evaluate and moves the cursor", () => {
    const state = evaluate(load(), { build: "done" });
    const v = view(state);
    expect(v.marks.get("one")).toBe("proved");
    expect(v.cursor).toBe(1);
    const graded = state.record.events.find((e) => e.type === "graded");
    expect(graded?.actor).toBe("toolchain");
  });

  it("appends one attempt per started build, not one per notification", () => {
    let state = evaluate(load(), { buildStartedAt: 1000 });
    state = evaluate(state, { buildStartedAt: 1000 });
    expect(
      state.record.events.filter((e) => e.type === "attempt")
    ).toHaveLength(1);
    state = evaluate(state, { buildStartedAt: 2000 });
    expect(
      state.record.events.filter((e) => e.type === "attempt")
    ).toHaveLength(2);
  });

  it("returns the same object when nothing changed", () => {
    const state = load();
    expect(evaluate(state, {})).toBe(state);
  });

  it("D-a: a deploy landing does not move a reviewing cursor", () => {
    let state = evaluate(load(), { build: "done" });
    state = reduceLesson(state, { type: "move", to: "one", at: 3 });
    expect(view(state).cursor).toBe(0);

    state = evaluate(state, { build: "done", deploy: "done" });
    const v = view(state);
    expect(v.cursor).toBe(0);
    expect(v.marks.get("two")).toBe("proved");
  });

  it("attests the frontier read step and never marks it proved", () => {
    let state = evaluate(load(), { build: "done", deploy: "done" });
    expect(view(state).cursor).toBe(2);

    state = reduceLesson(state, { type: "attest", at: 4 });
    const v = view(state);
    expect(v.marks.get("three")).toBe("attested");
    expect(v.cursor).toBe("end");
  });

  it("refuses attest on a machine-graded step", () => {
    const state = load();
    expect(reduceLesson(state, { type: "attest", at: 4 })).toBe(state);
  });

  it("passes the frontier step and records it as passed", () => {
    const state = reduceLesson(load(), { type: "pass", at: 4 });
    const v = view(state);
    expect(v.marks.get("one")).toBe("passed");
    expect(v.cursor).toBe(1);
  });

  it("refuses pass anywhere but the frontier", () => {
    let state = evaluate(load(), { build: "done" });
    state = reduceLesson(state, { type: "move", to: "one", at: 3 });
    expect(reduceLesson(state, { type: "pass", at: 4 })).toBe(state);
  });

  it("refuses an illegal move", () => {
    const state = load();
    expect(reduceLesson(state, { type: "move", to: "three", at: 3 })).toBe(
      state
    );
  });

  it("caps the hint ladder at rung one until an attempt exists", () => {
    let state = load();
    state = reduceLesson(state, { type: "hint", at: 5 });
    expect(rung(view(state), "one")).toBe(1);

    const again = reduceLesson(state, { type: "hint", at: 6 });
    expect(again).toBe(state);
  });

  it("releases the cap once an attempt exists, up to the last rung", () => {
    let state = reduceLesson(load(), { type: "hint", at: 5 });
    state = evaluate(state, { buildStartedAt: 1000 });
    expect(attempted(PATH, view(state), "one")).toBe(true);

    state = reduceLesson(state, { type: "hint", at: 6 });
    state = reduceLesson(state, { type: "hint", at: 7 });
    expect(rung(view(state), "one")).toBe(3);
    expect(reduceLesson(state, { type: "hint", at: 8 })).toBe(state);
  });

  it("keeps spent rungs across a reload, in the record itself", () => {
    let state = reduceLesson(load(), { type: "hint", at: 5 });
    const reloaded = reduceLesson(INITIAL_LESSON_STATE, {
      type: "load",
      path: PATH,
      record: state.record,
      at: 9,
    });
    expect(rung(view(reloaded), "one")).toBe(1);
  });

  it("restores the reviewed position on reload through enter", () => {
    let state = evaluate(load(), { build: "done" });
    state = reduceLesson(state, { type: "move", to: "one", at: 3 });

    const reloaded = reduceLesson(INITIAL_LESSON_STATE, {
      type: "load",
      path: PATH,
      record: state.record,
      at: 9,
    });
    expect(view(reloaded).cursor).toBe(0);
    expect(cursorStep(PATH, view(reloaded))?.id).toBe("one");
  });

  it("carries a failed load's flag through later actions", () => {
    let state = reduceLesson(INITIAL_LESSON_STATE, {
      type: "load",
      path: PATH,
      loadFailed: true,
      at: 1,
    });
    expect(state.loadFailed).toBe(true);
    state = evaluate(state, { buildStartedAt: 1000 });
    expect(state.loadFailed).toBe(true);
  });

  it("defaults a load's flag to false when it is not given", () => {
    expect(load().loadFailed).toBe(false);
  });
});
