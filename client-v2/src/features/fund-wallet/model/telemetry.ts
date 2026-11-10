import { createTracker } from "@/shared/lib/telemetry";

import type { FailureReason } from "./fund";

/** The Playground's cluster, as `PgConnection.cluster` names it */
export type FundCluster =
  | "mainnet-beta"
  | "devnet"
  | "testnet"
  | "localnet"
  | "playnet";

type FundEvents = {
  /** The Fund dialog opened; `via` is the control that opened it. */
  fund_dialog_opened: { via: "account-menu" };
  /**
   * A wallet connected inside the dialog to pay; `wallet` is its Wallet
   * Standard name (Phantom, Solflare), never an address.
   */
  fund_wallet_connected: { wallet: string };
  /** A transfer to the Playground wallet was confirmed on `cluster`. */
  fund_sent: { cluster: FundCluster };
  /**
   * Connecting the paying wallet or sending failed; `reason` is `rejected`
   * when the user said no in the wallet. No amount or address is sent.
   */
  fund_failed: { stage: "connect" | "send"; reason: FailureReason };
};

/**
 * Free text, opted in: no type lists the values, so the owner decides
 * whether to keep it (HOO-2752)
 */
type FundFreeText = {
  wallet: "a Wallet Standard name, which any installed wallet sets for itself";
};

export const fundTelemetry = createTracker<FundEvents, FundFreeText>();
