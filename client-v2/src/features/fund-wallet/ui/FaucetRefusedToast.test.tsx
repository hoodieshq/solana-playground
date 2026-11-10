// The wallet menu's "faucet is at its limit" toast, and its way to the Fund dialog
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { onDidRequestFundDialog } from "../model/open";
import FaucetRefusedToast from "./FaucetRefusedToast";

const HREF = "https://faucet.solana.com/?walletAddress=Wa11et";

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
});

describe("features/fund-wallet/ui/FaucetRefusedToast", () => {
  it("offers Send from your wallet under the web faucet's link", () => {
    const asked: string[] = [];
    stop = onDidRequestFundDialog((from) => asked.push(from));
    const { container } = render(<FaucetRefusedToast href={HREF} />);

    const labels = Array.from(container.querySelectorAll("a, button")).map(
      (el) => el.textContent
    );
    expect(labels).toEqual(["Open the web faucet", "Send from your wallet"]);
    fireEvent.click(
      screen.getByRole("button", { name: "Send from your wallet" })
    );
    expect(asked).toEqual(["faucet-toast"]);
  });

  it("draws no Send from your wallet when no dialog can open", () => {
    render(<FaucetRefusedToast href={HREF} />);

    expect(
      screen.queryByRole("button", { name: "Send from your wallet" })
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: "Open the web faucet" })
    ).toBeTruthy();
  });
});
