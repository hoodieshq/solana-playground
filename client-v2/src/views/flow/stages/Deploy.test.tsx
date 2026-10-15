// The Deploy stage's brand button: a deploy that fails is reported, and a
// deploy under way cannot be started again.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  report: vi.fn(),
  deployState: "ready",
  noop: () => ({ dispose: () => undefined }),
}));

// The real barrels pull in the whole playground; the stage reads only these
vi.mock("../../../utils", () => ({
  PgCommand: { deploy: { execute: mocks.execute } },
  PgConnection: { cluster: "devnet", onDidChangeCluster: "cluster" },
  PgExplorer: {
    currentWorkspaceName: "counter",
    onDidSwitchWorkspace: mocks.noop,
  },
  PgGlobal: { onDidChangeDeployState: "deployState" },
  PgProgramInfo: { update: vi.fn() },
}));
vi.mock("../../../hooks", () => ({
  useBlockExplorer: () => ({}),
  useProgramInfo: () => ({ onChain: null, pk: null }),
  useRenderOnChange: (event: string) =>
    event === "deployState" ? mocks.deployState : undefined,
}));
vi.mock("../state/stage", () => ({
  PgFlow: {
    state: { build: "done", deploy: "active" },
    onDidChange: mocks.noop,
  },
}));
vi.mock("../state/deploy-history", () => ({
  PgDeployHistory: { list: () => [], onDidChange: mocks.noop },
}));
vi.mock("./IdlActions", () => ({ default: () => null }));
vi.mock("@/shared/lib/report-button-failure", () => ({
  reportButtonFailure: mocks.report,
}));

import Deploy from "./Deploy";

afterEach(() => {
  mocks.deployState = "ready";
  vi.clearAllMocks();
});

describe("Deploy stage", () => {
  it("reports a deploy that fails", async () => {
    const failure = new Error("insufficient balance");
    mocks.execute.mockRejectedValue(failure);
    render(<Deploy />);

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Deploy to devnet" }))
    );

    expect(mocks.report).toHaveBeenCalledWith(failure);
  });

  it("holds the button while a deploy is under way", () => {
    mocks.deployState = "loading";
    render(<Deploy />);

    const button = screen.getByRole("button", { name: "Deploying..." });
    expect(button).toHaveProperty("disabled", true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(button);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
