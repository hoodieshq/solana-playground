// Importing `INITIAL_LESSON_STATE` as a value pulls in `./store`'s real
// module chain, which reaches `../../../utils` and, through it, generated
// globals (`GLOBAL_SETTINGS`) that exist only once the app has actually
// booted -- see `store.test.ts` and `console/status.test.ts` for the same
// mock, needed for the same reason.
jest.mock("../../../utils", () => ({
  PgExplorer: {
    currentWorkspaceName: null,
    onDidSwitchWorkspace: jest.fn(() => ({ dispose: jest.fn() })),
  },
  PgProgramInfo: { idl: null },
  PgTutorial: { getStorage: jest.fn() },
}));

import { assistantLabel, describeStep } from "./band-copy";
import { INITIAL_LESSON_STATE } from "./store";
import type { LessonPath } from "./types";

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

describe("describeStep", () => {
  it("is null outside a lesson", () => {
    expect(describeStep(INITIAL_LESSON_STATE)).toBeNull();
  });

  it("names the current step and its position", () => {
    const d = describeStep({ ...INITIAL_LESSON_STATE, path: PATH });
    expect(d).toEqual({
      number: "Step 1 of 2",
      objective: "Define hello",
      verifiedBy: "Verified when the interface shows hello.",
    });
  });

  it("is null once the path is finished", () => {
    const d = describeStep({
      path: PATH,
      progress: { completedStepIds: ["one", "two"], currentStepId: null },
      attempted: false,
      attemptBaseline: null,
    });
    expect(d).toBeNull();
  });
});

describe("assistantLabel", () => {
  it("invites the learner to open the door", () => {
    expect(assistantLabel(0, false)).toBe("I'm stuck");
    expect(assistantLabel(0, true)).toBe("I'm stuck");
  });

  it("counts the rungs already spent", () => {
    expect(assistantLabel(1, true)).toBe("Another hint (2 of 3)");
    expect(assistantLabel(2, true)).toBe("Another hint (3 of 3)");
  });

  it("says why it is waiting when the cap is holding", () => {
    expect(assistantLabel(1, false)).toBe("Try it first");
  });

  it("says when the ladder is spent", () => {
    expect(assistantLabel(3, true)).toBe("No hints left");
  });
});
