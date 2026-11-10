import { PgWallet } from "@/utils";

import { receiverOf } from "./fund";
import { hasFundDialogHost, openFundDialog } from "./open";
import type { FundFrom } from "./telemetry";

/** The receiver `deploy` pays from, read from `PgWallet` */
export const currentReceiver = () => {
  const current = PgWallet.current;
  const first = PgWallet.accounts[0];
  return receiverOf({
    // Only a Playground wallet can receive; an extension's key is absent while
    // it disconnects, before `PgWallet` hands back to the Playground wallet
    current: current?.isPg
      ? {
          isPg: true,
          name: current.name,
          address: current.publicKey.toBase58(),
        }
      : undefined,
    firstAccount: first
      ? {
          name: first.name,
          address: PgWallet.create(first).publicKey.toBase58(),
        }
      : undefined,
  });
};

/**
 * What a short-wallet entry's "Send from your wallet" does for the wallet at
 * `address`: open the Fund dialog, or `undefined` when the dialog would fund
 * another wallet (an extension is current, or another account pays) or no
 * dialog is mounted. The entry draws its button only for a function.
 */
export const fundFor =
  (from: FundFrom) =>
  (address: string): (() => void) | undefined =>
    hasFundDialogHost() && currentReceiver()?.address === address
      ? () => openFundDialog(from)
      : undefined;
