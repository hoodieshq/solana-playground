jest.mock("../../../utils", () => ({
  PgCommand: {
    deploy: {
      onDidFinish: jest.fn(() => ({ dispose: jest.fn() })),
    },
  },
  PgConnection: {
    cluster: "devnet",
  },
  PgExplorer: {
    currentWorkspaceName: "test-workspace",
  },
  PgProgramInfo: {
    getPkStr: jest.fn(() => "testProgramId"),
  },
}));

import { PgDeployHistory } from "./deploy-history";

describe("PgDeployHistory", () => {
  beforeEach(() => localStorage.clear());

  it("is empty for an unknown workspace", () => {
    expect(PgDeployHistory.list("none")).toEqual([]);
    expect(PgDeployHistory.latest("none")).toBeNull();
  });

  it("adds records newest-first and persists them", () => {
    PgDeployHistory.add({
      workspace: "w",
      cluster: "devnet",
      programId: "A",
      signature: "s1",
    });
    PgDeployHistory.add({
      workspace: "w",
      cluster: "devnet",
      programId: "B",
      signature: null,
    });
    const list = PgDeployHistory.list("w");
    expect(list.map((r) => r.programId)).toEqual(["B", "A"]);
    expect(PgDeployHistory.latest("w")?.programId).toBe("B");
    expect(
      JSON.parse(localStorage.getItem("flow.deploys") ?? "[]")
    ).toHaveLength(2);
  });

  it("notifies listeners on add", () => {
    const cb = jest.fn();
    PgDeployHistory.onDidChange(cb);
    PgDeployHistory.add({
      workspace: "w",
      cluster: "devnet",
      programId: "A",
      signature: null,
    });
    expect(cb).toHaveBeenCalledTimes(2); // once immediately, once on add
  });
});

describe("PgDeployHistory.init wiring", () => {
  beforeEach(() => localStorage.clear());

  it("records deploys from onDidFinish callback", () => {
    const {
      PgCommand,
      PgConnection,
      PgExplorer,
      PgProgramInfo,
    } = require("../../../utils");
    let deployCallback: ((result: unknown) => void) | undefined;

    // Set up mocks
    const deployFinishMock = PgCommand.deploy.onDidFinish as jest.Mock;
    const deployFinishReturn = { dispose: jest.fn() };
    deployFinishMock.mockImplementation((cb) => {
      deployCallback = cb;
      return deployFinishReturn;
    });

    PgConnection.cluster = "devnet";
    PgExplorer.currentWorkspaceName = "w";
    PgProgramInfo.getPkStr.mockReturnValue("Prog111");

    // Initialize and verify callback was captured
    const sub = PgDeployHistory.init();
    expect(deployCallback).toBeDefined();

    // Test error case: should not record
    deployCallback!({ err: new Error("deploy failed") });
    expect(PgDeployHistory.list("w")).toHaveLength(0);

    // Test success case: should record with null signature
    deployCallback!({ ok: undefined });
    const list = PgDeployHistory.list("w");
    expect(list).toHaveLength(1);
    expect(list[0].programId).toBe("Prog111");
    expect(list[0].cluster).toBe("devnet");
    expect(list[0].signature).toBeNull();

    // Clean up
    sub.dispose();
  });
});
