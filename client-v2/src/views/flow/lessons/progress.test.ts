jest.mock("../../../utils", () => ({}));

import {
  advance,
  continueRead,
  currentStep,
  EMPTY_PROGRESS,
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
