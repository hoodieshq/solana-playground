jest.mock("../../sidebar/assistant/bridge/build-output", () => ({
  PgBuildOutput: {
    latest: null,
    onDidChange: jest.fn(() => ({ dispose: jest.fn() })),
  },
  stripKnownNoise: jest.fn((s) => s),
}));
jest.mock("../../../utils", () => ({
  PgCommand: {
    build: {
      onDidStart: jest.fn(() => ({ dispose: jest.fn() })),
      onDidFinish: jest.fn(() => ({ dispose: jest.fn() })),
    },
    deploy: {
      onDidStart: jest.fn(() => ({ dispose: jest.fn() })),
      onDidFinish: jest.fn(() => ({ dispose: jest.fn() })),
    },
  },
  PgExplorer: {
    onDidSwitchWorkspace: jest.fn(() => ({ dispose: jest.fn() })),
  },
  PgGlobal: {
    deployState: "ready",
  },
}));

import { INITIAL_FLOW_STATE, PgFlow, countErrors } from "./stage";

const BUILD_OUTPUT_PATH = "../../sidebar/assistant/bridge/build-output";

describe("PgFlow.reduce", () => {
  it("starts on write with everything upcoming", () => {
    expect(INITIAL_FLOW_STATE).toEqual({
      stage: "write",
      build: "upcoming",
      deploy: "upcoming",
      interact: "upcoming",
      buildErrorCount: 0,
      buildMs: null,
      buildStartedAt: null,
    });
  });

  it("build-start marks build running, routes to build, records `at`", () => {
    const s = PgFlow.reduce(INITIAL_FLOW_STATE, {
      type: "build-start",
      at: 1000,
    });
    expect(s.build).toBe("running");
    expect(s.stage).toBe("build");
    expect(s.buildStartedAt).toBe(1000);
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
    const built = PgFlow.reduce(INITIAL_FLOW_STATE, {
      type: "build-start",
      at: 1000,
    });
    expect(PgFlow.reduce(built, { type: "workspace-change" })).toEqual(
      INITIAL_FLOW_STATE
    );
  });
});

describe("countErrors", () => {
  it("counts real diagnostics, not the summary lines", () => {
    // `resetMocks` (CRA's Jest default) clears the factory's identity
    // implementation before every test, so it has to be restored here.
    const {
      stripKnownNoise,
    } = require("../../sidebar/assistant/bridge/build-output");
    (stripKnownNoise as jest.Mock).mockImplementation((s: string) => s);

    const stderr = `error[E0308]: mismatched types
  --> src/lib.rs:12:18
   |
12 |         let x: u64 = "1";
   |                ---   ^^^ expected \`u64\`, found \`&str\`

error: aborting due to previous error

error: could not compile \`hello\` due to previous error`;
    expect(countErrors(stderr)).toBe(1);
  });
});

describe("PgFlow.init wiring", () => {
  it("deploy-finish detects success and failure via result shape", () => {
    const { PgCommand, PgExplorer, PgGlobal } = require("../../../utils");
    PgGlobal.deployState = "ready";
    let deployCallback: ((result: unknown) => void) | undefined;

    // Store and verify all mocks return disposables
    const buildStartMock = PgCommand.build.onDidStart as jest.Mock;
    const buildStartReturn = { dispose: jest.fn() };
    buildStartMock.mockReturnValueOnce(buildStartReturn);

    const buildFinishMock = PgCommand.build.onDidFinish as jest.Mock;
    const buildFinishReturn = { dispose: jest.fn() };
    buildFinishMock.mockReturnValueOnce(buildFinishReturn);

    const buildOutputMock =
      require("../../sidebar/assistant/bridge/build-output").PgBuildOutput
        .onDidChange as jest.Mock;
    const buildOutputReturn = { dispose: jest.fn() };
    buildOutputMock.mockReturnValueOnce(buildOutputReturn);

    const deployStartMock = PgCommand.deploy.onDidStart as jest.Mock;
    const deployStartReturn = { dispose: jest.fn() };
    deployStartMock.mockReturnValueOnce(deployStartReturn);

    const deployFinishMock = PgCommand.deploy.onDidFinish as jest.Mock;
    const deployFinishReturn = { dispose: jest.fn() };
    deployFinishMock.mockImplementation((cb) => {
      deployCallback = cb;
      return deployFinishReturn;
    });

    const workspaceChangeMock = PgExplorer.onDidSwitchWorkspace as jest.Mock;
    const workspaceChangeReturn = { dispose: jest.fn() };
    workspaceChangeMock.mockReturnValueOnce(workspaceChangeReturn);

    const sub = PgFlow.init();

    // Verify the callback was captured
    expect(deployCallback).toBeDefined();

    // Test error case
    deployCallback!({ err: new Error("deploy failed") });
    expect(PgFlow.state.deploy).toBe("failed");
    expect(PgFlow.state.stage).toBe("deploy");

    // Test success case
    deployCallback!({ ok: "transaction-sig" });
    expect(PgFlow.state.deploy).toBe("done");
    expect(PgFlow.state.interact).toBe("active");
    expect(PgFlow.state.stage).toBe("deploy");

    // Clean up
    sub.dispose();
  });

  it("ignores a deploy-finish caused only by a pause or resume click", () => {
    const { PgCommand, PgExplorer, PgGlobal } = require("../../../utils");
    let deployStartCallback: (() => void) | undefined;
    let deployFinishCallback: ((result: unknown) => void) | undefined;

    (PgCommand.build.onDidStart as jest.Mock).mockReturnValueOnce({
      dispose: jest.fn(),
    });
    (PgCommand.build.onDidFinish as jest.Mock).mockReturnValueOnce({
      dispose: jest.fn(),
    });
    (
      require("../../sidebar/assistant/bridge/build-output").PgBuildOutput
        .onDidChange as jest.Mock
    ).mockReturnValueOnce({ dispose: jest.fn() });
    (PgCommand.deploy.onDidStart as jest.Mock).mockImplementation((cb) => {
      deployStartCallback = cb;
      return { dispose: jest.fn() };
    });
    (PgCommand.deploy.onDidFinish as jest.Mock).mockImplementation((cb) => {
      deployFinishCallback = cb;
      return { dispose: jest.fn() };
    });
    (PgExplorer.onDidSwitchWorkspace as jest.Mock).mockReturnValueOnce({
      dispose: jest.fn(),
    });

    const sub = PgFlow.init();

    deployStartCallback!();
    expect(PgFlow.state.deploy).toBe("running");

    // A second click while loading flips `deployState` to "paused" and
    // resolves with `ok: undefined` -- not a real completion.
    PgGlobal.deployState = "paused";
    deployFinishCallback!({ ok: undefined });
    expect(PgFlow.state.deploy).toBe("running");

    // Clicking again to resume flips it to "loading" and also resolves
    // immediately -- still not a real completion.
    PgGlobal.deployState = "loading";
    deployFinishCallback!({ ok: undefined });
    expect(PgFlow.state.deploy).toBe("running");

    // The deploy command itself always settles back to "ready" before its
    // own real finish event fires, success or failure.
    PgGlobal.deployState = "ready";
    deployFinishCallback!({ ok: "sig" });
    expect(PgFlow.state.deploy).toBe("done");

    sub.dispose();
  });

  it("fails the build when it never reaches the compiler", () => {
    const { PgCommand, PgExplorer, PgGlobal } = require("../../../utils");
    PgGlobal.deployState = "ready";
    const buildOutputModule = require(BUILD_OUTPUT_PATH);
    buildOutputModule.PgBuildOutput.latest = null;

    let buildStartCallback: (() => void) | undefined;
    let buildFinishCallback: ((result: unknown) => void) | undefined;

    (PgCommand.build.onDidStart as jest.Mock).mockImplementation((cb) => {
      buildStartCallback = cb;
      return { dispose: jest.fn() };
    });
    (PgCommand.build.onDidFinish as jest.Mock).mockImplementation((cb) => {
      buildFinishCallback = cb;
      return { dispose: jest.fn() };
    });
    (
      buildOutputModule.PgBuildOutput.onDidChange as jest.Mock
    ).mockReturnValueOnce({ dispose: jest.fn() });
    (PgCommand.deploy.onDidStart as jest.Mock).mockReturnValueOnce({
      dispose: jest.fn(),
    });
    (PgCommand.deploy.onDidFinish as jest.Mock).mockReturnValueOnce({
      dispose: jest.fn(),
    });
    (PgExplorer.onDidSwitchWorkspace as jest.Mock).mockReturnValueOnce({
      dispose: jest.fn(),
    });

    const sub = PgFlow.init();

    buildStartCallback!();
    expect(PgFlow.state.build).toBe("running");

    // The build server was unreachable: the `build` command rejects and
    // `PgBuildOutput` never received a value for this run.
    buildFinishCallback!({ err: new Error("Failed to fetch") });
    expect(PgFlow.state.build).toBe("failed");
    expect(PgFlow.state.buildErrorCount).toBe(0);

    sub.dispose();
  });

  it("ignores build.onDidFinish's err when real output already arrived", () => {
    const { PgCommand, PgExplorer, PgGlobal } = require("../../../utils");
    PgGlobal.deployState = "ready";
    const buildOutputModule = require(BUILD_OUTPUT_PATH);

    let buildStartCallback: (() => void) | undefined;
    let buildFinishCallback: ((result: unknown) => void) | undefined;

    (PgCommand.build.onDidStart as jest.Mock).mockImplementation((cb) => {
      buildStartCallback = cb;
      return { dispose: jest.fn() };
    });
    (PgCommand.build.onDidFinish as jest.Mock).mockImplementation((cb) => {
      buildFinishCallback = cb;
      return { dispose: jest.fn() };
    });
    (
      buildOutputModule.PgBuildOutput.onDidChange as jest.Mock
    ).mockReturnValueOnce({ dispose: jest.fn() });
    (PgCommand.deploy.onDidStart as jest.Mock).mockReturnValueOnce({
      dispose: jest.fn(),
    });
    (PgCommand.deploy.onDidFinish as jest.Mock).mockReturnValueOnce({
      dispose: jest.fn(),
    });
    (PgExplorer.onDidSwitchWorkspace as jest.Mock).mockReturnValueOnce({
      dispose: jest.fn(),
    });

    const sub = PgFlow.init();

    buildStartCallback!();
    // The real build output for this run already arrived and was handled.
    buildOutputModule.PgBuildOutput.latest = {
      stderr: "error: could not compile `hello`",
      failed: true,
      at: Date.now() + 1000,
    };

    buildFinishCallback!({ err: new Error("build command threw") });
    // Still "running" -- the onDidFinish handler declined to dispatch a
    // second, redundant `build-finish` on top of the real one.
    expect(PgFlow.state.build).toBe("running");

    buildOutputModule.PgBuildOutput.latest = null;
    sub.dispose();
  });
});
