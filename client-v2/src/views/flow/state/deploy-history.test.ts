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
    pk: { toBase58: jest.fn(() => "testProgramId") },
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
