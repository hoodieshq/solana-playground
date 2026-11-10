// The connected wallet chip: "Send from your wallet" opens the one Fund dialog,
// and any refused airdrop opens the web faucet's steps
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AirdropRefusedError } from "@/commands/airdrop/report";
import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";

import { TooltipProvider } from "@/shared/ui/tooltip";

const ADDRESS = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

vi.mock("@/hooks", () => ({
  useBalance: () => 0,
  useRenderOnChange: () => undefined,
  useWallet: () => undefined,
}));
const airdrop = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/components/Wallet/hooks", () => ({
  useAirdrop: () => ({ airdrop, faucet: "available" }),
}));
vi.mock("@/utils", () => ({
  PgWallet: { current: { publicKey: { toBase58: () => ADDRESS } } },
  PgConnection: {
    cluster: "devnet",
    onDidChangeCluster: () => ({ dispose: () => undefined }),
    getAirdropAmount: () => 5,
  },
}));

import { onDidRequestFundDialog } from "../model/open";
import WalletChip from "./WalletChip";

let stop: (() => void) | undefined;
let sent: ReturnType<typeof memoryProvider>;
beforeEach(() => {
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
});
afterEach(() => {
  stop?.();
  stop = undefined;
  resetTelemetry();
  airdrop.mockReset();
});

const renderChip = (isSignInFailure: (e: unknown) => boolean = () => false) =>
  render(
    <TooltipProvider>
      <WalletChip signedOut={false} isSignInFailure={isSignInFailure} />
    </TooltipProvider>
  );

/** Opens the popover and asks the faucet, letting the refusal settle */
const getSol = async () => {
  fireEvent.click(screen.getByRole("button", { name: /^Wallet 7xKX…gAsU/ }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Get / }));
  });
};

const refusals = () =>
  sent.events
    .filter((event) => event.name === "fund_airdrop_refused")
    .map((event) => event.params);

describe("features/fund-wallet/ui/WalletChip", () => {
  it("opens the one Fund dialog from Send from your wallet", () => {
    const asked: string[] = [];
    stop = onDidRequestFundDialog((from) => asked.push(from));
    render(
      <TooltipProvider>
        <WalletChip signedOut={false} isSignInFailure={() => false} />
      </TooltipProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /^Wallet 7xKX…gAsU/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Send from your wallet" })
    );

    expect(asked).toEqual(["wallet-chip"]);
  });

  it.each([
    [
      "the limit",
      "429 Too Many Requests",
      "The faucet is at its limit",
      "rate-limited",
    ],
    ["anything else", "fetch failed", "The faucet did not send SOL", "failed"],
  ])(
    "spells out the web faucet for a refusal for %s",
    async (_case, message, headline, reason) => {
      airdrop.mockRejectedValueOnce(
        new AirdropRefusedError(new Error(message))
      );
      renderChip();
      await getSol();

      expect(screen.getByText(headline)).toBeTruthy();
      expect(
        screen.getByRole("list", { name: "Get SOL from the web faucet" })
      ).toBeTruthy();
      expect(refusals()).toEqual([{ reason }]);
    }
  );

  it("shows no faucet steps when the sign-in failed before the faucet was asked", async () => {
    const failure = new Error("Sign-in cancelled");
    airdrop.mockRejectedValueOnce(failure);
    renderChip((e) => e === failure);
    await getSol();

    expect(
      screen.queryByRole("list", { name: "Get SOL from the web faucet" })
    ).toBeNull();
  });
});
