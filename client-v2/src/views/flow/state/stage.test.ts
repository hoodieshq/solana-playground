jest.mock("../../sidebar/assistant/bridge/build-output");
jest.mock("../../../utils", () => ({
  PgCommand: {
    build: { onDidStart: jest.fn() },
    deploy: { onDidStart: jest.fn(), onDidFinish: jest.fn() },
  },
  PgExplorer: {
    onDidSwitchWorkspace: jest.fn(),
  },
}));

import { INITIAL_FLOW_STATE, PgFlow } from "./stage";

describe("PgFlow.reduce", () => {
  it("starts on write with everything upcoming", () => {
    expect(INITIAL_FLOW_STATE).toEqual({
      stage: "write",
      build: "upcoming",
      deploy: "upcoming",
      interact: "upcoming",
      buildErrorCount: 0,
      buildMs: null,
    });
  });

  it("build-start marks build running and routes to build", () => {
    const s = PgFlow.reduce(INITIAL_FLOW_STATE, { type: "build-start" });
    expect(s.build).toBe("running");
    expect(s.stage).toBe("build");
  });

  it("failed build is failed with a count; deploy stays upcoming", () => {
    const s = PgFlow.reduce(INITIAL_FLOW_STATE, {
      type: "build-finish",
      failed: true,
      errorCount: 2,
      ms: 2900,
    });
    expect(s.build).toBe("failed");
    expect(s.buildErrorCount).toBe(2);
    expect(s.buildMs).toBe(2900);
    expect(s.deploy).toBe("upcoming");
  });

  it("successful build is done and routes back to write", () => {
    const s = PgFlow.reduce(INITIAL_FLOW_STATE, {
      type: "build-finish",
      failed: false,
      errorCount: 0,
      ms: 3100,
    });
    expect(s.build).toBe("done");
    expect(s.stage).toBe("write");
  });

  it("deploy-finish ok marks deploy done and interact active", () => {
    const built = PgFlow.reduce(INITIAL_FLOW_STATE, {
      type: "build-finish",
      failed: false,
      errorCount: 0,
      ms: 1,
    });
    const s = PgFlow.reduce(built, { type: "deploy-finish", ok: true });
    expect(s.deploy).toBe("done");
    expect(s.interact).toBe("active");
    expect(s.stage).toBe("deploy");
  });

  it("set-stage only changes the route", () => {
    const s = PgFlow.reduce(INITIAL_FLOW_STATE, {
      type: "set-stage",
      stage: "interact",
    });
    expect(s.stage).toBe("interact");
    expect(s.build).toBe("upcoming");
  });

  it("workspace-change resets to the initial state", () => {
    const built = PgFlow.reduce(INITIAL_FLOW_STATE, { type: "build-start" });
    expect(PgFlow.reduce(built, { type: "workspace-change" })).toEqual(
      INITIAL_FLOW_STATE
    );
  });
});
