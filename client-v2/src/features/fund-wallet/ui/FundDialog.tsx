import { useEffect, useRef, useState } from "react";

import { useRenderOnChange } from "@/hooks";
import { createLogger } from "@/shared/lib/logger";
import { PgConnection, PgView, PgWallet, PgWeb3 } from "@/utils";
import type { StandardWallet } from "@/utils/wallet/types";
import {
  classify,
  DEFAULT_AMOUNT,
  parseAmount,
  receiverOf,
} from "../model/fund";
import type { FailureReason } from "../model/fund";
import { fundTelemetry } from "../model/telemetry";
import type { FundCluster } from "../model/telemetry";
import { sendFunds } from "../model/transfer";
import BaseFundDialog from "./BaseFundDialog";
import type { FundFailure, FundPayer } from "./BaseFundDialog";

const log = createLogger("fund-wallet:dialog");

export interface FundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The receiver `deploy` pays from, read from `PgWallet` */
const currentReceiver = () => {
  const current = PgWallet.current;
  const first = PgWallet.accounts[0];
  return receiverOf({
    current: current && {
      isPg: current.isPg,
      name: current.name,
      address: current.publicKey.toBase58(),
    },
    firstAccount: first
      ? {
          name: first.name,
          address: PgWallet.create(first).publicKey.toBase58(),
        }
      : null,
  });
};

/**
 * The wallet the user picked in this dialog, once connected. Never one picked
 * for them: an extension that is the current wallet is offered like the rest,
 * so the user can pay from another one beside it
 */
const pickedWallet = (wallets: StandardWallet[], name: string | null) =>
  wallets.find((w) => w.connected && w.name === name) ?? null;

const failureOf = (
  stage: "connect" | "send",
  reason: FailureReason,
  error: unknown
): FundFailure => {
  const detail = error instanceof Error ? error.message : String(error);
  if (stage === "connect") {
    return reason === "rejected"
      ? { kind: "connect-declined" }
      : { kind: "connect-failed", detail };
  }
  return reason === "rejected"
    ? { kind: "send-declined" }
    : { kind: "send-failed", detail };
};

const sentToast = (sol: number, receiver: string) =>
  PgView.setToast(() => <span>{`Sent ${sol} SOL to ${receiver}.`}</span>, {
    options: { name: "fund-sent" },
  });

/**
 * The Fund dialog, connected: wallets from `PgWallet.standardWallets` (found
 * through ConnectorKit by `entities/external-wallet`), the payer connected
 * through its own `connect()` so `PgWallet.state` never changes, and the
 * transfer through `PgTx` on the Playground's cluster.
 */
const FundDialog = ({ open, onOpenChange }: FundDialogProps) => {
  useRenderOnChange(PgWallet.onDidChangeStandardWallets);
  useRenderOnChange(PgWallet.onDidChangeCurrent);
  const [payerName, setPayerName] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [failure, setFailure] = useState<FundFailure | null>(null);
  // A send can settle after the dialog closed; nothing is shown then
  const openRef = useRef(open);
  openRef.current = open;

  const wallets = PgWallet.standardWallets;
  const payer = pickedWallet(wallets, payerName);
  const receiver = currentReceiver();

  useEffect(() => {
    if (!open) return;
    fundTelemetry.track("fund_dialog_opened", { from: "account-menu" });
    setFailure(null);
    setAmount(DEFAULT_AMOUNT);
    setPayerName(null);
  }, [open]);

  // The payer's balance, read when it changes and after each failure
  const payerAddress = payer?.publicKey?.toBase58() ?? null;
  useEffect(() => {
    setBalance(null);
    if (!open || !payerAddress) return;
    let current = true;
    PgConnection.current
      .getBalance(new PgWeb3.PublicKey(payerAddress))
      .then((lamports) => {
        if (current) setBalance(PgWeb3.lamportsToSol(lamports));
      })
      .catch((error: unknown) => {
        log.error(error, { context: { step: "payer balance" } });
      });
    return () => {
      current = false;
    };
  }, [open, payerAddress, failure]);

  if (!receiver) return null;

  const connect = async (name: string) => {
    const wallet = wallets.find((w) => w.name === name);
    if (!wallet) return;
    setFailure(null);
    try {
      await wallet.connect();
    } catch (error: unknown) {
      const reason = classify(error);
      fundTelemetry.track("fund_failed", { stage: "connect", reason });
      if (reason === "rejected")
        log.info("connection declined", { context: { name } });
      else
        log.error(error, { report: true, context: { step: "connect", name } });
      setFailure(failureOf("connect", reason, error));
      return;
    }
    fundTelemetry.track("fund_wallet_connected", { wallet: name });
    setPayerName(name);
  };

  const send = async () => {
    const parsed = parseAmount(amount);
    if (!payer?.connected || !parsed.ok) return;
    setFailure(null);
    try {
      await sendFunds({
        payer: payer as StandardWallet<true>,
        to: receiver.address,
        lamports: parsed.lamports,
      });
    } catch (error: unknown) {
      const reason = classify(error);
      fundTelemetry.track("fund_failed", { stage: "send", reason });
      if (reason === "rejected") log.info("transfer declined");
      else log.error(error, { report: true, context: { step: "send" } });
      if (openRef.current) setFailure(failureOf("send", reason, error));
      return;
    }
    // A confirmed transfer went through a cluster the connection named
    const cluster: FundCluster | null | undefined = PgConnection.cluster;
    if (cluster) fundTelemetry.track("fund_sent", { cluster });
    sentToast(parsed.sol, receiver.name);
    onOpenChange(false);
  };

  const payerView: FundPayer | null = payer?.publicKey
    ? { name: payer.name, address: payer.publicKey.toBase58(), balance }
    : null;

  return (
    <BaseFundDialog
      open={open}
      onOpenChange={onOpenChange}
      receiver={receiver}
      wallets={wallets.map((w) => ({ name: w.name, icon: w.icon }))}
      payer={payerView}
      amount={amount}
      onAmountChange={setAmount}
      onConnect={connect}
      onSend={send}
      failure={failure}
    />
  );
};

export default FundDialog;
