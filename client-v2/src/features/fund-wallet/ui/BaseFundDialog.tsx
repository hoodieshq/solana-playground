import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { AsyncButton } from "@/shared/ui/async-button";
import { Button } from "@/shared/ui/button";
import { Callout, CalloutDescription, CalloutTitle } from "@/shared/ui/callout";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { canSend, parseAmount } from "../model/fund";
import type { Receiver, SendCheck } from "../model/fund";

/** The amount field's id, which the spec and the tests find it by */
export const AMOUNT_ID = "fund-amount";

/** A wallet the dialog can connect to pay */
export interface FundWalletOption {
  name: string;
  /** Data URI */
  icon: string;
}

/** The connected wallet that pays */
export interface FundPayer {
  name: string;
  /** Base58 */
  address: string;
  /** In SOL; `null` while it loads */
  balance: number | null;
}

/** What went wrong last, shown above the footer until the next attempt */
export type FundFailure =
  | { kind: "connect-declined" }
  | { kind: "connect-failed"; detail: string }
  | { kind: "send-declined" }
  | { kind: "send-failed"; detail: string };

export interface BaseFundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiver: Receiver;
  /** Every detected wallet; empty when none is installed */
  wallets: FundWalletOption[];
  /** `null` until a wallet is connected here, or one already was */
  payer: FundPayer | null;
  amount: string;
  onAmountChange: (amount: string) => void;
  /** Connects the named wallet; the dialog's button waits on it */
  onConnect: (name: string) => Promise<void>;
  /** Sends the amount; the dialog's button waits on it */
  onSend: () => Promise<void>;
  failure: FundFailure | null;
}

export const shortAddress = (address: string) =>
  `${address.slice(0, 4)}…${address.slice(-4)}`;

const formatSol = (sol: number) => `${Number(sol.toFixed(9))} SOL`;

/** The line under the amount field: a problem, or what will be sent */
const amountNote = (
  check: SendCheck,
  payer: FundPayer
): { error: boolean; text: string } => {
  if (check.ok) {
    return {
      error: false,
      text: `From ${payer.name}, on the Playground's cluster.`,
    };
  }
  const notes: Record<Exclude<SendCheck, { ok: true }>["problem"], string> = {
    "not-a-number": "Enter an amount above 0.",
    "not-positive": "Enter an amount above 0.",
    "too-precise": "Use at most 9 decimals.",
    checking: "Checking the balance…",
    "above-balance": `${payer.name} holds ${formatSol(payer.balance ?? 0)}.`,
  };
  return { error: check.problem !== "checking", text: notes[check.problem] };
};

const failureText = (failure: FundFailure) => {
  switch (failure.kind) {
    case "connect-declined":
      return {
        title: "The connection was declined in the wallet.",
        detail: null,
      };
    case "connect-failed":
      return { title: "Couldn't connect the wallet.", detail: failure.detail };
    case "send-declined":
      return {
        title: "The transfer was declined in the wallet.",
        detail: null,
      };
    case "send-failed":
      return { title: "Couldn't send the SOL.", detail: failure.detail };
  }
};

const sendLabel = (amount: string) => {
  const parsed = parseAmount(amount);
  return parsed.ok ? `Send ${formatSol(parsed.sol)}` : "Send SOL";
};

/**
 * Moves SOL from the user's own wallet into the Playground account that
 * deploys. Built from design-system parts: no design for funding exists yet
 * (asked of Design alignment, 2026-10-27), so where it opens from is the
 * widget's choice and can move without touching this.
 */
const BaseFundDialog = ({
  open,
  onOpenChange,
  receiver,
  wallets,
  payer,
  amount,
  onAmountChange,
  onConnect,
  onSend,
  failure,
}: BaseFundDialogProps) => {
  const check = payer ? canSend(amount, payer.balance) : null;
  const note = payer && check ? amountNote(check, payer) : null;
  const shown = failure ? failureText(failure) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fund the Playground wallet</DialogTitle>
          <DialogDescription>
            Sends SOL from your wallet to <strong>{receiver.name}</strong>{" "}
            <span className="font-mono">{shortAddress(receiver.address)}</span>,
            the account that deploys.
          </DialogDescription>
        </DialogHeader>

        {wallets.length === 0 && (
          <div>
            <p className="font-medium">No wallet found</p>
            <p className="text-muted-foreground text-sm">
              Install a Solana wallet such as Phantom, then open this again.
            </p>
          </div>
        )}

        {wallets.length > 0 && !payer && (
          <div className="flex flex-col gap-2">
            {wallets.map((wallet) => (
              <AsyncButton
                key={wallet.name}
                variant="outline"
                className="justify-start"
                onClick={() => onConnect(wallet.name)}
                onError={reportButtonFailure(`connect ${wallet.name}`)}
              >
                <img src={wallet.icon} alt="" className="size-4" />
                Connect {wallet.name}
              </AsyncButton>
            ))}
          </div>
        )}

        {payer && note && (
          <>
            <p className="text-sm">
              From <strong>{payer.name}</strong>{" "}
              <span className="font-mono">{shortAddress(payer.address)}</span>
              {" · "}
              {payer.balance === null ? "…" : formatSol(payer.balance)}
            </p>
            <Field data-invalid={note.error || undefined}>
              <FieldLabel htmlFor={AMOUNT_ID}>Amount (SOL)</FieldLabel>
              <Input
                id={AMOUNT_ID}
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                aria-invalid={note.error || undefined}
                onChange={(event) => onAmountChange(event.target.value)}
              />
              {note.error ? (
                <FieldError>{note.text}</FieldError>
              ) : (
                <FieldDescription>{note.text}</FieldDescription>
              )}
            </Field>
          </>
        )}

        {shown && (
          <Callout variant="error">
            <CalloutTitle>{shown.title}</CalloutTitle>
            {shown.detail && (
              <CalloutDescription>{shown.detail}</CalloutDescription>
            )}
          </Callout>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {payer && (
            <AsyncButton
              disabled={!check?.ok}
              onClick={onSend}
              onError={reportButtonFailure("send the SOL")}
            >
              {sendLabel(amount)}
            </AsyncButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BaseFundDialog;
