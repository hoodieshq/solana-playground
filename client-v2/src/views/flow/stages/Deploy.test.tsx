// The Deploy stage's brand button: a deploy that fails is reported, and a
// deploy under way cannot be started again.
import {
  act,
  fireEvent,
  render as rtlRender,
  screen,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  report: vi.fn(),
  deployState: "ready",
  history: [] as unknown[],
  update: vi.fn(),
  noop: () => ({ dispose: () => undefined }),
  wallet: {
    current: null as null | {
      isPg: boolean;
      publicKey: { toBase58: () => string };
    },
    accounts: [] as unknown[],
    currentIndex: -1,
    add: vi.fn(),
    switch: vi.fn(),
    export: vi.fn(),
  },
  signIn: vi.fn(),
}));

const WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const pgWallet = () => ({ isPg: true, publicKey: { toBase58: () => WALLET } });

// The real barrels pull in the whole playground; the stage reads only these
vi.mock("../../../utils", () => ({
  PgCommand: { deploy: { execute: mocks.execute } },
  PgConnection: { cluster: "devnet", onDidChangeCluster: "cluster" },
  PgExplorer: {
    currentWorkspaceName: "counter",
    onDidSwitchWorkspace: mocks.noop,
  },
  PgGlobal: { onDidChangeDeployState: "deployState" },
  PgProgramInfo: { update: mocks.update },
  PgWallet: mocks.wallet,
}));
vi.mock("@/features/auth", () => ({
  PgSession: { signIn: mocks.signIn },
  isSignInFailure: () => false,
}));
vi.mock("../../../hooks", () => ({
  useBlockExplorer: () => ({
    getAddressUrl: (id: string) => `https://explorer.test/address/${id}`,
    getTxUrl: (sig: string) => `https://explorer.test/tx/${sig}`,
  }),
  useProgramInfo: () => ({ onChain: null, pk: null }),
  useWallet: () => mocks.wallet.current,
  useBalance: () => 4.2,
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
  PgDeployHistory: { list: () => mocks.history, onDidChange: mocks.noop },
}));
vi.mock("./IdlActions", () => ({ default: () => null }));
vi.mock("@/shared/lib/report-button-failure", () => ({
  reportButtonFailure: (action: string) =>
    action === "deploy" ? mocks.report : vi.fn(),
}));

import { TooltipProvider } from "@/shared/ui/tooltip";
import {
  DeployCancelledError,
  DeployFundingError,
  PgDeployRun,
} from "../../../commands/deploy/run";
import Deploy from "./Deploy";

/** The app gives every screen a tooltip provider; the copy button needs one */
const render = (ui: ReactElement) =>
  rtlRender(<TooltipProvider>{ui}</TooltipProvider>);

let sent: ReturnType<typeof memoryProvider>;
beforeEach(() => {
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
  localStorage.clear();
});
afterEach(() => {
  mocks.deployState = "ready";
  mocks.history = [];
  mocks.wallet.current = null;
  mocks.wallet.accounts = [];
  resetTelemetry();
  vi.clearAllMocks();
});

/** Every event the stage sent, by name */
const events = () => sent.events.map((e) => e.name);

const pressDeploy = async () =>
  act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Deploy to devnet" }))
  );

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

  /** The stage remounts on every switch; nothing fires to fill it again */
  it("shows a deployment made before the stage opened", () => {
    mocks.history = [
      {
        id: "a",
        workspace: "counter",
        cluster: "devnet",
        programId: "Prog111",
        signature: null,
        at: 1,
      },
    ];
    render(<Deploy />);

    expect(
      screen.getByRole("status", { name: "Deploy result" }).textContent
    ).toContain("Deployed to devnet");
    expect(
      screen.getByRole("button", { name: "Redeploy to devnet" })
    ).toBeTruthy();
  });

  /** Interact may have pointed the project at an imported id */
  it("redeploys the project's own key", async () => {
    mocks.execute.mockResolvedValue(undefined);
    render(<Deploy />);

    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Deploy to devnet" }))
    );

    expect(mocks.update).toHaveBeenCalledWith({ customPk: null });
    expect(mocks.execute).toHaveBeenCalled();
  });

  it("creates the Playground wallet it pays from, without a dialog", async () => {
    mocks.execute.mockResolvedValue(undefined);
    render(<Deploy />);

    await pressDeploy();

    expect(mocks.wallet.add).toHaveBeenCalledOnce();
    expect(mocks.wallet.switch).not.toHaveBeenCalled();
  });

  it("asks about a failed build in the panel and stops on Cancel", async () => {
    mocks.wallet.current = pgWallet();
    let answer: Promise<boolean> | undefined;
    mocks.execute.mockImplementation(async () => {
      answer = PgDeployRun.answers!.confirmStaleBuild();
      if (!(await answer)) throw new DeployCancelledError();
    });
    render(<Deploy />);

    await pressDeploy();
    expect(
      screen.getByRole("dialog", { name: "Your last build failed" })
    ).toBeTruthy();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    );

    await expect(answer).resolves.toBe(false);
    expect(mocks.report).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the funding card and its event when the airdrop is refused", async () => {
    mocks.wallet.current = pgWallet();
    mocks.execute.mockRejectedValue(
      new DeployFundingError({
        reason: "airdrop_failed",
        balance: 0,
        needed: 1_000_000_000,
        address: WALLET,
        cause: "429",
      })
    );
    render(<Deploy />);

    await pressDeploy();

    expect(screen.getByRole("alert", { name: "Not enough SOL" })).toBeTruthy();
    expect(mocks.report).not.toHaveBeenCalled();
    expect(events()).toEqual([
      "deploy_started",
      "deploy_sol_needed_shown",
      "deploy_failed",
    ]);
  });

  it("offers the keypair backup once per wallet after a deploy", async () => {
    mocks.wallet.current = pgWallet();
    mocks.execute.mockResolvedValue({
      signature: "sig",
      cost: 1,
      upgraded: false,
    });
    mocks.history = [
      {
        id: "a",
        workspace: "counter",
        cluster: "devnet",
        programId: "Prog111",
        signature: "sig",
        at: 1,
      },
    ];
    render(<Deploy />);

    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Redeploy to devnet" })
      )
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Not now" }))
    );

    expect(screen.queryByLabelText("Keypair backup")).toBeNull();
    expect(events()).toEqual([
      "deploy_started",
      "deploy_succeeded",
      "deploy_backup_shown",
      "deploy_backup_dismissed",
    ]);

    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Redeploy to devnet" })
      )
    );
    expect(screen.queryByLabelText("Keypair backup")).toBeNull();
  });
});
