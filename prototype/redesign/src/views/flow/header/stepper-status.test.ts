jest.mock("../../../utils", () => ({}));

import { statusOf } from "./Stepper";
import { INITIAL_FLOW_STATE } from "../state/stage";
import type { FlowState } from "../state/stage";

const flow = (over: Partial<FlowState>): FlowState => ({
  ...INITIAL_FLOW_STATE,
  ...over,
});

describe("statusOf, for the write stage", () => {
  it("is active on a fresh project while the learner is on it", () => {
    expect(statusOf(flow({ stage: "write" }), "write")).toBe("active");
  });

  it("is done once a build has been attempted, even while selected", () => {
    const state = flow({ stage: "write", buildStartedAt: 1000 });
    expect(statusOf(state, "write")).toBe("done");
  });

  it("stays done across a failed build, so the connector holds", () => {
    const state = flow({
      stage: "write",
      build: "failed",
      buildStartedAt: 1000,
    });
    expect(statusOf(state, "write")).toBe("done");
  });

  it("is done when the learner has moved on without building yet", () => {
    expect(statusOf(flow({ stage: "build" }), "write")).toBe("done");
  });
});

describe("statusOf, for every other stage", () => {
  it("reports the flow's own status rather than the selection", () => {
    const state = flow({ stage: "write", build: "done", deploy: "running" });
    expect(statusOf(state, "build")).toBe("done");
    expect(statusOf(state, "deploy")).toBe("running");
    expect(statusOf(state, "interact")).toBe("upcoming");
  });
});
