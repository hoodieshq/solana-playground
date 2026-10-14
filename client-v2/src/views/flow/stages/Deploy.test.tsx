// The Deploy stage's brand button: a deploy that fails is reported.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider, type DefaultTheme } from "styled-components";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  report: vi.fn(),
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
  PgTheme: {},
}));
vi.mock("../../../hooks", () => ({
  useBlockExplorer: () => ({}),
  useProgramInfo: () => ({ onChain: null, pk: null }),
  useRenderOnChange: (event: string) =>
    event === "deployState" ? "ready" : undefined,
}));
vi.mock("../state/stage", () => ({
  PgFlow: { state: { build: "done" }, onDidChange: mocks.noop },
}));
vi.mock("../state/deploy-history", () => ({
  PgDeployHistory: { list: () => [], onDidChange: mocks.noop },
}));
vi.mock("./IdlActions", () => ({ default: () => null }));
vi.mock("../../../components/Link", () => ({ default: () => null }));
vi.mock("@/shared/lib/report-button-failure", () => ({
  reportButtonFailure: mocks.report,
}));

import Deploy from "./Deploy";

/** A theme that answers every key; the styles do not matter here */
const anyTheme: DefaultTheme = new Proxy(
  {},
  {
    get: (_, key) =>
      key === Symbol.toPrimitive || key === "toString"
        ? () => "inherit"
        : anyTheme,
  }
) as unknown as DefaultTheme;

afterEach(() => vi.clearAllMocks());

describe("Deploy stage", () => {
  it("reports a deploy that fails", async () => {
    const failure = new Error("insufficient balance");
    mocks.execute.mockRejectedValue(failure);
    render(
      <ThemeProvider theme={anyTheme}>
        <Deploy />
      </ThemeProvider>
    );

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Deploy to devnet" }))
    );

    expect(mocks.report).toHaveBeenCalledWith(failure);
  });
});
