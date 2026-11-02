import { useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  Info,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import { useIsMobile } from "@/shared/lib/hooks/use-mobile";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { AsyncButton } from "@/shared/ui/async-button";
import { Button } from "@/shared/ui/button";
import { Callout, CalloutDescription, CalloutTitle } from "@/shared/ui/callout";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/shared/ui/input-group";
import { Spinner } from "@/shared/ui/spinner";
import { Tag } from "@/shared/ui/tag";
import {
  canSend,
  FEE_RESERVE_SOL,
  formatSol,
  LAMPORTS_PER_SOL,
  parseAmount,
} from "../model/fund";
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
  /** In SOL, or where reading it stands */
  balance: number | "loading" | "unavailable";
}

/** What went wrong last, shown above the footer until the next attempt */
export type FundFailure =
  | { kind: "connect-declined"; wallet: string }
  | { kind: "connect-failed"; detail: string }
  | { kind: "send-declined"; wallet: string }
  | { kind: "send-failed"; detail: string }
  /** Sent, possibly landed: sending again could pay twice, so Send stays off */
  | { kind: "send-unconfirmed"; signature: string };

export interface BaseFundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiver: Receiver;
  /** Every detected wallet; empty when none is installed */
  wallets: FundWalletOption[];
  /**
   * `null` until the user connects a wallet in this dialog; a wallet connected
   * earlier is listed again and must be picked
   */
  payer: FundPayer | null;
  /** The Playground's cluster, named in the head; `null` while unknown */
  cluster: string | null;
  amount: string;
  onAmountChange: (amount: string) => void;
  /** Connects the named wallet; the dialog's button waits on it */
  onConnect: (name: string) => Promise<void>;
  /** Sends the amount; the dialog waits on it and asks for the approval meanwhile */
  onSend: () => Promise<void>;
  failure: FundFailure | null;
  /** An Explorer link for a signature on `cluster`; `null` leaves the link out */
  txUrl?: (signature: string) => string | null;
  /** Shows the send waiting on the wallet; the dialog tracks its own sends without it */
  sending?: boolean;
  /**
   * The confirmed transfer, which replaces the form with the result and Done.
   * Left out, the wrapper closes the dialog on success and toasts instead.
   */
  sent?: { sol: number; signature: string } | null;
}

const shortAddress = (address: string) =>
  `${address.slice(0, 4)}…${address.slice(-4)}`;

/** "devnet", "mainnet" for mainnet-beta, "the Playground's network" while unknown */
const networkLabel = (cluster: string | null) => {
  if (!cluster) return "the Playground's network";
  return cluster === "mainnet-beta" ? "mainnet" : cluster;
};

/** What Max fills in: the balance less the fee reserve, in lamports, never below 0 */
const maxLamports = (balance: number) =>
  Math.max(0, Math.round((balance - FEE_RESERVE_SOL) * LAMPORTS_PER_SOL));

/** Lamports as the amount field's text, without the unit */
const amountText = (lamports: number) =>
  (lamports / LAMPORTS_PER_SOL).toFixed(9).replace(/\.?0+$/, "");

/**
 * The line under the amount field: the fee it keeps, or a problem.
 * `aboveBalance` turns the send button into "Not enough SOL".
 */
const amountNote = (
  amount: string,
  payer: FundPayer
): { ok: boolean; error: boolean; aboveBalance: boolean; text: string } => {
  if (payer.balance === "unavailable") {
    return {
      ok: false,
      error: true,
      aboveBalance: false,
      text: `Couldn't read ${payer.name}'s balance. Close and open this again to retry.`,
    };
  }
  const balance = payer.balance === "loading" ? null : payer.balance;
  const check = canSend(amount, balance);
  const fee = `Fee: ${FEE_RESERVE_SOL} SOL`;
  if (check.ok)
    return { ok: true, error: false, aboveBalance: false, text: fee };
  const above =
    balance === null
      ? ""
      : `${payer.name} has ${formatSol(
          balance
        )}. You can send up to ${formatSol(
          maxLamports(balance) / LAMPORTS_PER_SOL
        )}.`;
  const notes: Record<Exclude<SendCheck, { ok: true }>["problem"], string> = {
    "not-a-number": "Enter an amount above 0.",
    "not-positive": "Enter an amount above 0.",
    "too-precise": "Use at most 9 decimals.",
    /* The label row shows the wait; the fee line stays put */
    checking: fee,
    "above-balance": above,
  };
  return {
    ok: false,
    error: check.problem !== "checking",
    aboveBalance: check.problem === "above-balance",
    text: notes[check.problem],
  };
};

/** "1 SOL" for a valid amount, else "the SOL" */
const amountLabel = (amount: string) => {
  const parsed = parseAmount(amount);
  return parsed.ok ? formatSol(parsed.sol) : "the SOL";
};

const sendLabel = (amount: string) => {
  const parsed = parseAmount(amount);
  return parsed.ok ? `Send ${formatSol(parsed.sol)}` : "Send SOL";
};

/** "Not enough SOL" above the balance, "Try again" after a failed send, else "Send 1 SOL" */
const sendButtonLabel = (
  amount: string,
  failure: FundFailure | null,
  aboveBalance: boolean
) => {
  if (aboveBalance) return "Not enough SOL";
  if (failure?.kind === "send-declined" || failure?.kind === "send-failed")
    return "Try again";
  return sendLabel(amount);
};

/** A labelled row of the transfer: To, From */
const Party = ({
  label,
  name,
  address,
  icon,
  trailing,
}: {
  label: string;
  name: string;
  address: string;
  /** The wallet's logo, 20px, so the names of both rows line up */
  icon: ReactNode;
  trailing?: ReactNode;
}) => (
  <div className="flex min-w-0 items-center gap-3 px-3 py-2.5">
    <span className="w-10 shrink-0 text-caption text-subtle">{label}</span>
    {icon}
    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
      {name}{" "}
      <span className="font-mono text-xs text-muted-foreground">
        {shortAddress(address)}
      </span>
    </span>
    {trailing}
  </div>
);

/**
 * A line that ends on the link to the transfer in Explorer, so the action
 * is the last thing read; without a link, the signature itself
 */
const ExplorerLine = ({
  lead,
  signature,
  txUrl,
  cluster,
}: {
  lead: string;
  signature: string;
  txUrl?: (signature: string) => string | null;
  cluster: string | null;
}) => {
  const href = txUrl?.(signature) ?? null;
  if (!href)
    return (
      <>
        {lead} Explorer:{" "}
        <code className="font-mono break-all">{signature}</code>
      </>
    );
  return (
    <>
      {lead}{" "}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${signature} on Explorer (${networkLabel(cluster)})`}
        className="inline-flex items-center gap-0.5"
      >
        Explorer
        <ExternalLink className="size-3" aria-hidden="true" />
      </a>
    </>
  );
};

/** The raw error, folded away until asked for; the toggle says which way it goes */
const ErrorDetails = ({ detail }: { detail: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="link"
          className="h-auto gap-1 p-0 text-[length:inherit] font-normal text-muted-foreground hover:text-foreground hover:no-underline"
        >
          {open ? "Hide details" : "Show details"}
          <ChevronDown
            className="size-3.5 transition-transform motion-reduce:transition-none data-[open=true]:rotate-180"
            data-open={open}
            aria-hidden="true"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-1.5 max-h-32 overflow-auto rounded-md bg-surface-well p-2 font-mono text-xs whitespace-pre-wrap break-words">
          {detail}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
};

/** What happened to the last attempt, in Spec 12's words */
const Status = ({
  failure,
  txUrl,
  cluster,
  amount,
}: {
  failure: FundFailure;
  txUrl?: (signature: string) => string | null;
  cluster: string | null;
  amount: string;
}) => {
  switch (failure.kind) {
    case "connect-declined":
    case "send-declined":
      return (
        /* Spec 12's shared wallet copy, split so the "no" leads */
        <Callout role="status">
          <Info />
          <CalloutTitle>You declined in {failure.wallet}.</CalloutTitle>
          <CalloutDescription>Nothing was sent.</CalloutDescription>
        </Callout>
      );
    case "connect-failed":
    case "send-failed":
      return (
        <Callout variant="error" role="alert">
          <CircleAlert />
          <CalloutTitle>
            {failure.kind === "connect-failed"
              ? "Couldn't connect the wallet"
              : `Couldn't send ${amountLabel(amount)}`}
          </CalloutTitle>
          <CalloutDescription>
            <ErrorDetails detail={failure.detail} />
          </CalloutDescription>
        </Callout>
      );
    case "send-unconfirmed":
      return (
        <Callout variant="warning" role="alert">
          <TriangleAlert />
          <CalloutTitle>Sent, not confirmed yet</CalloutTitle>
          <CalloutDescription>
            <ExplorerLine
              lead="Before you send again, check it in"
              signature={failure.signature}
              txUrl={txUrl}
              cluster={cluster}
            />
          </CalloutDescription>
        </Callout>
      );
  }
};

/**
 * Moves SOL from the user's own wallet into the Playground account that
 * deploys (Spec 12, "Fund from a wallet"). It reads as a transfer slip: To,
 * the network, From, then the amount with the balance and Max on its label
 * row, then one status at a time in Spec 12's words. The wait for the
 * wallet's approval lives in the send button, with one line beside it that
 * a screen reader hears. On a phone, where wallet extensions don't run, it
 * says so instead of listing none.
 */
const BaseFundDialog = ({
  open,
  onOpenChange,
  receiver,
  wallets,
  payer,
  cluster,
  amount,
  onAmountChange,
  onConnect,
  onSend,
  failure,
  txUrl,
  sending,
  sent,
}: BaseFundDialogProps) => {
  const isMobile = useIsMobile();
  const [waiting, setWaiting] = useState(false);
  const approving = (sending ?? waiting) && payer !== null;
  const note = payer ? amountNote(amount, payer) : null;
  const max =
    typeof payer?.balance === "number" ? maxLamports(payer.balance) : 0;
  const unconfirmed = failure?.kind === "send-unconfirmed";
  const network = networkLabel(cluster);

  const send = async () => {
    setWaiting(true);
    try {
      await onSend();
    } finally {
      setWaiting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fund your Playground wallet</DialogTitle>
          <DialogDescription>
            Send SOL from your own wallet to the one Playground deploys from.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface-base">
          <Party
            label="To"
            name={receiver.name}
            address={receiver.address}
            icon={
              <span className="-mr-1 flex size-5 shrink-0 items-center justify-center rounded-sm bg-surface-raised text-muted-foreground">
                <Wallet className="size-3" aria-hidden="true" />
              </span>
            }
            trailing={
              <Tag variant={cluster === "mainnet-beta" ? "warning" : "neutral"}>
                {network}
              </Tag>
            }
          />
          {payer && (
            <Party
              label="From"
              name={payer.name}
              address={payer.address}
              icon={
                <img
                  src={
                    wallets.find((wallet) => wallet.name === payer.name)?.icon
                  }
                  alt=""
                  className="-mr-1 size-5 shrink-0 rounded-sm"
                />
              }
            />
          )}
        </div>

        {wallets.length === 0 && (
          <Callout>
            <Wallet />
            <CalloutTitle>
              {isMobile
                ? "Wallet apps don't connect on a phone here."
                : "No wallet extension found in this browser."}
            </CalloutTitle>
            <CalloutDescription>
              {isMobile
                ? "Open Playground on a computer with Phantom, Backpack or Solflare to send from it."
                : "Install Phantom, Backpack or Solflare, then reload."}
            </CalloutDescription>
          </Callout>
        )}

        {wallets.length > 0 && !payer && (
          <div className="flex flex-col gap-2">
            <span className="text-caption text-subtle">Send from</span>
            {wallets.map((wallet) => (
              <AsyncButton
                key={wallet.name}
                variant="outline"
                className="h-12 justify-start gap-3"
                loadingText={`Waiting for ${wallet.name}…`}
                onClick={() => onConnect(wallet.name)}
                onError={reportButtonFailure(`connect ${wallet.name}`)}
              >
                <img src={wallet.icon} alt="" className="size-7 rounded-md" />
                Connect {wallet.name}
                <ChevronRight className="ml-auto size-4 text-subtle" />
              </AsyncButton>
            ))}
          </div>
        )}

        {sent && (
          <Callout variant="success" role="status">
            <CircleCheck />
            <CalloutTitle>
              {formatSol(sent.sol)} sent to {receiver.name}
            </CalloutTitle>
            <CalloutDescription>
              <ExplorerLine
                lead="Confirmed. See it in"
                signature={sent.signature}
                txUrl={txUrl}
                cluster={cluster}
              />
            </CalloutDescription>
          </Callout>
        )}

        {payer && note && !sent && (
          <Field data-invalid={note.error || undefined}>
            <div className="flex items-baseline justify-between gap-3">
              <FieldLabel htmlFor={AMOUNT_ID}>Amount</FieldLabel>
              {payer.balance === "loading" && (
                <span className="flex items-center gap-1.5 text-caption text-subtle">
                  <Spinner className="size-3" aria-hidden="true" />
                  Checking the balance…
                </span>
              )}
              {typeof payer.balance === "number" && (
                <span className="flex items-baseline gap-2 text-caption text-subtle tabular-nums">
                  {formatSol(payer.balance)} available
                  {max > 0 && (
                    <Button
                      variant="link"
                      className="h-auto p-0 text-caption"
                      disabled={approving}
                      aria-label={`Use max, ${formatSol(
                        max / LAMPORTS_PER_SOL
                      )}`}
                      onClick={() => onAmountChange(amountText(max))}
                    >
                      Max
                    </Button>
                  )}
                </span>
              )}
            </div>
            <InputGroup>
              {/* Max comes first in the DOM; the dialog still opens on the amount */}
              <InputGroupInput
                id={AMOUNT_ID}
                autoFocus
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                disabled={approving}
                aria-invalid={note.error || undefined}
                onChange={(event) => onAmountChange(event.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>SOL</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            {note.text &&
              !approving &&
              (note.error ? (
                <FieldError>{note.text}</FieldError>
              ) : (
                <FieldDescription>{note.text}</FieldDescription>
              ))}
            {/* Stays mounted, so the reader hears the line when it fills; it
                takes the fee line's place while the wallet asks */}
            <FieldDescription role="status" className="empty:sr-only">
              {approving &&
                `Nothing is sent until you approve it in ${payer.name}.`}
            </FieldDescription>
          </Field>
        )}

        {payer && cluster === "mainnet-beta" && !sent && (
          <Callout variant="warning">
            <TriangleAlert />
            <CalloutTitle>Mainnet uses real SOL</CalloutTitle>
            <CalloutDescription>
              The Playground wallet's key lives in this browser. Send only what
              a deploy needs.
            </CalloutDescription>
          </Callout>
        )}

        {failure && !approving && !sent && (
          <Status
            failure={failure}
            txUrl={txUrl}
            cluster={cluster}
            amount={amount}
          />
        )}

        <DialogFooter>
          {sent ? (
            <DialogClose asChild>
              <Button>Done</Button>
            </DialogClose>
          ) : (
            <DialogClose asChild>
              <Button variant="outline">
                {wallets.length === 0 ? "Close" : "Cancel"}
              </Button>
            </DialogClose>
          )}
          {payer && !sent && (
            <AsyncButton
              disabled={!note?.ok || unconfirmed}
              loading={approving}
              /* Waiting on the wallet is progress, not a refusal: full strength */
              className={approving ? "disabled:opacity-100" : undefined}
              loadingText={`Approve in ${payer.name}…`}
              onClick={send}
              onError={reportButtonFailure("send the SOL")}
            >
              {sendButtonLabel(amount, failure, note?.aboveBalance ?? false)}
            </AsyncButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BaseFundDialog;
