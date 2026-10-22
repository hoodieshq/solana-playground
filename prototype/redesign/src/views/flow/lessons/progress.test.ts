jest.mock("../../../utils", () => ({}));

import {
  advance,
  continueRead,
  currentStep,
  EMPTY_PROGRESS,
  canStepBack,
  canStepForward,
  skipStep,
  stepBack,
  stepForward,
  stepNumber,
} from "./progress";
import type { LessonProgress } from "./progress";
import { INITIAL_FLOW_STATE } from "../state/stage";
import type { FlowState } from "../state/stage";
import type { LessonPath } from "./types";
import type { Idl } from "@coral-xyz/anchor";

const flow = (over: Partial<FlowState>): FlowState => ({
  ...INITIAL_FLOW_STATE,
  ...over,
});

const hints: [string, string, string] = ["a", "b", "c"];

const PATH: LessonPath = {
  tutorial: "Hello Anchor",
  steps: [
    {
      id: "write",
      objective: "Define hello",
      verifiedBy: "the interface shows hello",
      verify: { kind: "idl", instruction: "hello" },
      target: "build",
      hints,
    },
    {
      id: "deploy",
      objective: "Deploy it",
      verifiedBy: "it is on devnet",
      verify: { kind: "deployed" },
      target: "deploy",
      hints,
    },
    {
      id: "client",
      objective: "Call it from the client",
      verifiedBy: "you have read the page",
      verify: { kind: "read" },
      target: "interact",
      hints,
    },
  ],
};

const IDL = {
  version: "0.1.0",
  name: "hello_anchor",
  instructions: [{ name: "hello", accounts: [], args: [] }],
} as Idl;

describe("currentStep and stepNumber", () => {
  it("start at the first step", () => {
    expect(currentStep(PATH, EMPTY_PROGRESS)?.id).toBe("write");
    expect(stepNumber(PATH, EMPTY_PROGRESS)).toBe(1);
  });

  it("skip past everything completed", () => {
    const p: LessonProgress = {
      completedStepIds: ["write"],
      currentStepId: "deploy",
    };
    expect(currentStep(PATH, p)?.id).toBe("deploy");
    expect(stepNumber(PATH, p)).toBe(2);
  });

  it("report no current step once the path is finished", () => {
    const p: LessonProgress = {
      completedStepIds: ["write", "deploy", "client"],
      currentStepId: null,
    };
    expect(currentStep(PATH, p)).toBeNull();
    expect(stepNumber(PATH, p)).toBe(4);
  });
});

describe("advance", () => {
  it("does nothing while the condition is unmet", () => {
    const next = advance(PATH, EMPTY_PROGRESS, flow({}), null);
    expect(next).toEqual(EMPTY_PROGRESS);
  });

  it("completes the current step when its condition is met", () => {
    const next = advance(PATH, EMPTY_PROGRESS, flow({ build: "done" }), IDL);
    expect(next.completedStepIds).toEqual(["write"]);
    expect(next.currentStepId).toBe("deploy");
  });

  it("completes several steps in one pass when both are satisfied", () => {
    const next = advance(
      PATH,
      EMPTY_PROGRESS,
      flow({ build: "done", deploy: "done" }),
      IDL
    );
    expect(next.completedStepIds).toEqual(["write", "deploy"]);
    expect(next.currentStepId).toBe("client");
  });

  it("stops at a read step, which nothing free can satisfy", () => {
    const next = advance(
      PATH,
      EMPTY_PROGRESS,
      flow({ build: "done", deploy: "done" }),
      IDL
    );
    expect(next.completedStepIds).not.toContain("client");
  });

  it("never un-completes a step when a later build fails", () => {
    const done = advance(PATH, EMPTY_PROGRESS, flow({ build: "done" }), IDL);
    const after = advance(PATH, done, flow({ build: "failed" }), null);
    expect(after.completedStepIds).toEqual(["write"]);
    expect(after.currentStepId).toBe("deploy");
  });

  it("returns the same object when nothing changed, so renders are cheap", () => {
    const done = advance(PATH, EMPTY_PROGRESS, flow({ build: "done" }), IDL);
    expect(advance(PATH, done, flow({ build: "done" }), IDL)).toBe(done);
  });
});

describe("skipStep", () => {
  it("moves to the next step without claiming the skipped one was verified", () => {
    const next = skipStep(PATH, EMPTY_PROGRESS);
    expect(next.completedStepIds).toEqual([]);
    expect(next.skippedStepIds).toEqual(["write"]);
    expect(next.currentStepId).toBe("deploy");
    expect(currentStep(PATH, next)?.id).toBe("deploy");
  });

  it("counts a skipped step as behind the learner for numbering", () => {
    expect(stepNumber(PATH, skipStep(PATH, EMPTY_PROGRESS))).toBe(2);
  });

  it("does nothing once the path is behind the learner", () => {
    const done: LessonProgress = {
      completedStepIds: ["write", "deploy", "client"],
      currentStepId: null,
    };
    expect(skipStep(PATH, done)).toBe(done);
  });

  it("promotes a skipped step to completed once the toolchain proves it", () => {
    const skipped = skipStep(PATH, EMPTY_PROGRESS);
    const next = advance(PATH, skipped, flow({ build: "done" }), IDL);

    expect(next.completedStepIds).toContain("write");
    expect(next.skippedStepIds).toEqual([]);
  });

  it("leaves a skipped step skipped while its condition stays unmet", () => {
    const skipped = skipStep(PATH, EMPTY_PROGRESS);
    const next = advance(PATH, skipped, flow({ build: "failed" }), null);

    expect(next.completedStepIds).not.toContain("write");
    expect(next.skippedStepIds).toEqual(["write"]);
  });

  it("does not re-offer a skipped step as current after a later advance", () => {
    const skipped = skipStep(PATH, EMPTY_PROGRESS);
    const next = advance(PATH, skipped, flow({ deploy: "done" }), null);

    expect(currentStep(PATH, next)?.id).toBe("client");
  });
});

describe("stepBack", () => {
  it("returns to the step behind without rewriting the record", () => {
    const skipped = skipStep(PATH, EMPTY_PROGRESS);
    expect(currentStep(PATH, skipped)?.id).toBe("deploy");

    const back = stepBack(PATH, skipped);
    expect(currentStep(PATH, back)?.id).toBe("write");
    // Navigation only: a click cannot un-skip a step. Building it is what
    // repairs the mark, via `advance`'s `proven` pass.
    expect(back.skippedStepIds).toEqual(["write"]);
  });

  it("lets a build repair the skip mark on the step returned to", () => {
    const back = stepBack(PATH, skipStep(PATH, EMPTY_PROGRESS));
    const built = advance(PATH, back, flow({ build: "done" }), IDL);

    expect(built.completedStepIds).toContain("write");
    expect(built.skippedStepIds).toEqual([]);
  });

  it("goes back to any depth, one step at a time", () => {
    let p = skipStep(PATH, EMPTY_PROGRESS);
    p = skipStep(PATH, p);
    expect(currentStep(PATH, p)?.id).toBe("client");

    p = stepBack(PATH, p);
    expect(currentStep(PATH, p)?.id).toBe("deploy");
    p = stepBack(PATH, p);
    expect(currentStep(PATH, p)?.id).toBe("write");
  });

  it("reaches a verified step without un-verifying it", () => {
    const done = advance(PATH, EMPTY_PROGRESS, flow({ build: "done" }), IDL);
    expect(currentStep(PATH, done)?.id).toBe("deploy");

    const back = stepBack(PATH, done);
    expect(currentStep(PATH, back)?.id).toBe("write");
    expect(back.completedStepIds).toEqual(["write"]);
  });

  it("stops at the first step", () => {
    expect(stepBack(PATH, EMPTY_PROGRESS)).toBe(EMPTY_PROGRESS);
    expect(canStepBack(PATH, EMPTY_PROGRESS)).toBe(false);
  });

  it("lands on the last step when the path is finished", () => {
    const done: LessonProgress = {
      completedStepIds: ["write", "deploy", "client"],
      currentStepId: null,
    };
    expect(currentStep(PATH, stepBack(PATH, done))?.id).toBe("client");
  });

  it("does not re-skip a verified step when stepping forward off it", () => {
    const done = advance(PATH, EMPTY_PROGRESS, flow({ build: "done" }), IDL);
    const back = stepBack(PATH, done);
    const forward = skipStep(PATH, back);

    expect(forward.skippedStepIds).toEqual([]);
    expect(currentStep(PATH, forward)?.id).toBe("deploy");
  });

  it("leaves the learner where they are when a build lands elsewhere", () => {
    const skipped = skipStep(PATH, EMPTY_PROGRESS);
    const back = stepBack(PATH, skipped);
    // They are on "write"; a deploy completing must not yank them forward
    const next = advance(PATH, back, flow({ deploy: "done" }), null);

    expect(currentStep(PATH, next)?.id).toBe("write");
    // The deploy still earns its credit -- it is the review that must not move
    // them, not the toolchain that must stop grading
    expect(next.completedStepIds).toEqual(["deploy"]);
  });
});

describe("stepForward", () => {
  it("returns to where the learner was after reviewing a verified step", () => {
    const done = advance(PATH, EMPTY_PROGRESS, flow({ build: "done" }), IDL);
    const back = stepBack(PATH, done);
    expect(currentStep(PATH, back)?.id).toBe("write");

    const forward = stepForward(PATH, back);
    expect(currentStep(PATH, forward)?.id).toBe("deploy");
    // Review costs nothing: the record is exactly what it was
    expect(forward.completedStepIds).toEqual(done.completedStepIds);
    expect(forward.skippedStepIds ?? []).toEqual(done.skippedStepIds ?? []);
  });

  it("returns to where the learner was after reviewing a skipped step", () => {
    const skipped = skipStep(PATH, EMPTY_PROGRESS);
    const back = stepBack(PATH, skipped);

    const forward = stepForward(PATH, back);
    expect(currentStep(PATH, forward)?.id).toBe("deploy");
    expect(forward.skippedStepIds).toEqual(["write"]);
  });

  it("refuses to cross the frontier, so it cannot stand in for a skip", () => {
    expect(stepForward(PATH, EMPTY_PROGRESS)).toBe(EMPTY_PROGRESS);
    expect(canStepForward(PATH, EMPTY_PROGRESS)).toBe(false);
  });

  it("walks forward to any depth, one step at a time", () => {
    let p = skipStep(PATH, EMPTY_PROGRESS);
    p = skipStep(PATH, p);
    expect(currentStep(PATH, p)?.id).toBe("client");

    p = stepBack(PATH, stepBack(PATH, p));
    expect(currentStep(PATH, p)?.id).toBe("write");

    p = stepForward(PATH, p);
    expect(currentStep(PATH, p)?.id).toBe("deploy");
    p = stepForward(PATH, p);
    expect(currentStep(PATH, p)?.id).toBe("client");
    expect(canStepForward(PATH, p)).toBe(false);
  });

  it("lands past the end when every step is behind the learner", () => {
    const done: LessonProgress = {
      completedStepIds: ["write", "deploy", "client"],
      currentStepId: "client",
    };
    const forward = stepForward(PATH, done);

    expect(forward.currentStepId).toBeNull();
    expect(currentStep(PATH, forward)).toBeNull();
  });

  it("has nothing to do once the path is finished", () => {
    const done: LessonProgress = {
      completedStepIds: ["write", "deploy", "client"],
      currentStepId: null,
    };
    expect(stepForward(PATH, done)).toBe(done);
    expect(canStepForward(PATH, done)).toBe(false);
  });
});

describe("continueRead", () => {
  it("advances past a read step", () => {
    const p: LessonProgress = {
      completedStepIds: ["write", "deploy"],
      currentStepId: "client",
    };
    const next = continueRead(PATH, p);
    expect(next.completedStepIds).toContain("client");
    expect(next.currentStepId).toBeNull();
  });

  it("refuses to advance a step that is not a read step", () => {
    const next = continueRead(PATH, EMPTY_PROGRESS);
    expect(next).toEqual(EMPTY_PROGRESS);
  });
});
