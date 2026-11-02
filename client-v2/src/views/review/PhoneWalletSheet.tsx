import { useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Droplet,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  ScanQrCode,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/shared/ui/input-group";
import { StatusDot } from "@/shared/ui/status-dot";
import { Tag } from "@/shared/ui/tag";

export interface PhoneWalletTx {
  signature: string;
  /** "2m ago" */
  ago: string;
  failed?: boolean;
}

export interface PhoneWalletAccount {
  name: string;
  address: string;
}

type View = "main" | "send" | "accounts";
type Menu = "closed" | "actions" | "remove";

export interface PhoneWalletSheetProps {
  accounts: PhoneWalletAccount[];
  cluster: string;
  balance: number;
  txs: PhoneWalletTx[];
  /** Where the board opens the drawing */
  view?: View;
  menu?: Menu;
}

/** A plain transfer's fee on Solana: one signature at 5000 lamports */
const SEND_FEE_SOL = 0.000005;

const short = (text: string) => `${text.slice(0, 4)}…${text.slice(-4)}`;

const HEAD_GLOW =
  "radial-gradient(140% 90% at 0% 0%, color-mix(in oklab, var(--primary) 15%, transparent), transparent 75%)";

/** A full-width row of a list or a sheet group: 52px, icon first, for a thumb */
const Row = ({
  icon,
  children,
  trailing,
  destructive,
  onClick,
}: {
  icon?: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
  destructive?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-[var(--phone-row)] w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 text-left text-control [&_svg]:size-4 ${
      destructive
        ? "text-error"
        : "text-foreground [&_svg]:text-muted-foreground"
    }`}
  >
    {icon}
    <span className="min-w-0 flex-1 truncate">{children}</span>
    {trailing}
  </button>
);

/** The handle every sheet carries, with room under it */
const Handle = () => (
  <div
    className="mx-auto mt-2 mb-2 h-1 w-9 shrink-0 rounded-full bg-muted-foreground/30"
    aria-hidden="true"
  />
);

/**
 * DES-193: the wallet on a phone, as a bottom Sheet titled "Wallet" (sync
 * 4.11) in place of the 320px draggable window. A drawing for the review
 * board, in a phone frame; in the app the body goes into `SheetContent
 * side="bottom"`.
 *
 * Reworked after a Mobbin pass (Phantom, Coinbase Wallet, Revolut, Venmo,
 * Apple Maps) and a mobile UX and UI review. The main view keeps what a
 * thumb needs: the account, the balance, Fund and Copy address, a row into
 * Send, the last transactions. Every step keeps one height (70%, the medium
 * detent), so moving between them never jumps the sheet. Send is its own
 * step with the button pinned, so the keyboard never covers it. ⋯ opens an actions sheet; Remove asks
 * first. Rows stay signature and time: the signature list carries no amount
 * or direction, and fetching each transaction on devnet costs ten calls.
 */
const PhoneWalletSheet = ({
  accounts,
  cluster,
  balance,
  txs,
  view: initialView = "main",
  menu: initialMenu = "closed",
}: PhoneWalletSheetProps) => {
  const [view, setView] = useState<View>(initialView);
  const [menu, setMenu] = useState<Menu>(initialMenu);
  const [current, setCurrent] = useState(0);
  const [copied, setCopied] = useState(false);
  const account = accounts[current];
  const closeMenu = () => setMenu("closed");
  const copy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="relative mx-auto h-[780px] w-[390px] max-w-full overflow-hidden rounded-[2.5rem] border border-border bg-surface-base text-sm">
      {/* The page behind, dimmed by the Sheet's overlay */}
      <div
        className="absolute inset-0 bg-[var(--backdrop)]"
        aria-hidden="true"
      />

      {/* Everything that floats or pins on a phone keeps clear of the
          screen's edges: 24px or the safe area at the bottom, 12px aside for
          a floating card, and the toast below the camera cut-out */}
      {copied && (
        <div
          role="status"
          className="absolute inset-x-0 top-14 z-20 mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-popover px-3 py-2 text-control shadow-lg"
        >
          <Check className="size-4 text-success" aria-hidden="true" />
          Address copied
        </div>
      )}

      <section
        role="dialog"
        aria-labelledby="phone-wallet-title"
        className="absolute inset-x-0 bottom-0 flex h-[70%] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-popover text-popover-foreground"
      >
        {view === "main" && (
          <>
            <div
              className="flex flex-col px-4 pb-2"
              style={{ background: HEAD_GLOW }}
            >
              <Handle />
              <div className="flex items-center gap-1">
                <h2
                  id="phone-wallet-title"
                  className="m-0 flex-1 text-title font-headline"
                >
                  Wallet
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label="Wallet actions"
                  aria-haspopup="dialog"
                  onClick={() => setMenu("actions")}
                >
                  <MoreHorizontal />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mr-2 size-11"
                  aria-label="Close"
                >
                  <X />
                </Button>
              </div>

              <button
                type="button"
                onClick={() => setView("accounts")}
                className="mt-2 flex h-11 w-full cursor-pointer items-center gap-2 rounded-lg border-0 bg-surface-raised px-3 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-control text-foreground">
                  {account.name}{" "}
                  <span className="font-mono text-caption text-muted-foreground">
                    {short(account.address)}
                  </span>
                </span>
                <Tag>{cluster}</Tag>
                <ChevronDown
                  className="size-4 text-subtle"
                  aria-hidden="true"
                />
              </button>

              <p className="m-0 mt-5 text-display font-headline tabular-nums">
                {balance} SOL
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button className="h-11">Fund</Button>
                <Button variant="outline" className="h-11" onClick={copy}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Copied" : "Copy address"}
                </Button>
              </div>
            </div>

            <div className="flex min-h-0 flex-col overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="mx-4 mt-3 overflow-hidden rounded-xl bg-surface-raised">
                <Row
                  trailing={<ChevronRight className="text-subtle" />}
                  onClick={() => setView("send")}
                >
                  Send SOL
                </Row>
              </div>

              <div className="mt-5 flex items-center justify-between px-4">
                <h3 className="m-0 text-caption text-subtle">Transactions</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mr-[15px] size-11"
                  aria-label="Refresh transactions"
                >
                  {/* 14px and centred 7px in from the edge, so it lines up
                      with the rows' Explorer icons */}
                  <RefreshCw className="size-3.5" />
                </Button>
              </div>

              {txs.length === 0 ? (
                <Empty className="px-4 py-6">
                  <EmptyHeader>
                    <EmptyTitle>No transactions yet</EmptyTitle>
                    <EmptyDescription>
                      Fund this wallet to deploy and test your program.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ul className="m-0 flex list-none flex-col divide-y divide-border px-4 py-0">
                  {txs.map((tx) => (
                    <li key={tx.signature}>
                      <a
                        href="https://explorer.solana.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${tx.signature} on Explorer`}
                        className="flex h-[var(--phone-row)] items-center gap-3 text-foreground no-underline"
                      >
                        {tx.failed && <StatusDot variant="error" size="lg" />}
                        <span className="flex-1 font-mono text-caption">
                          {short(tx.signature)}
                        </span>
                        {tx.failed && (
                          <span className="text-caption text-error">
                            Failed
                          </span>
                        )}
                        <span className="text-caption text-subtle tabular-nums">
                          {tx.ago}
                        </span>
                        <ExternalLink
                          className="size-3.5 text-subtle"
                          aria-hidden="true"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {view === "send" && (
          <>
            <Handle />
            <div className="flex items-center gap-1 px-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Back to the wallet"
                onClick={() => setView("main")}
              >
                <ArrowLeft />
              </Button>
              <h2
                id="phone-wallet-title"
                className="m-0 flex-1 text-title font-headline"
              >
                Send SOL
              </h2>
              <Tag className="mr-2">{cluster}</Tag>
            </div>
            <div className="flex flex-1 flex-col gap-4 px-4 pt-3">
              <p className="m-0 text-caption text-subtle">
                From {account.name}
              </p>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="phone-send-to"
                  className="text-control font-act"
                >
                  To
                </label>
                {/* Scan for an address another phone shows as a QR; the
                    keyboard's own paste covers a copied one */}
                <InputGroup className="h-11">
                  <InputGroupInput
                    id="phone-send-to"
                    placeholder="Recipient address"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-sm"
                      className="text-muted-foreground"
                      aria-label="Scan a QR code"
                    >
                      <ScanQrCode className="size-[18px]!" />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>
              {/* As in the funding dialog: what's available beside the label,
                  the fee under the field, so Max reads as one less the other */}
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <label
                    htmlFor="phone-send-amount"
                    className="text-control font-act"
                  >
                    Amount
                  </label>
                  <span className="text-caption text-subtle tabular-nums">
                    {balance} SOL available
                  </span>
                </div>
                <InputGroup className="h-11">
                  <InputGroupInput
                    id="phone-send-amount"
                    inputMode="decimal"
                    placeholder="0"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText className="text-subtle">SOL</InputGroupText>
                    <InputGroupButton size="xs" className="text-primary">
                      Max
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <p className="m-0 text-caption text-subtle">
                  Fee: {SEND_FEE_SOL} SOL
                </p>
              </div>
            </div>
            {/* Pinned to the bottom, so it rides above the keyboard */}
            <div className="border-t border-border p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <Button className="h-11 w-full" disabled>
                Send
              </Button>
            </div>
          </>
        )}

        {view === "accounts" && (
          <>
            <Handle />
            <div className="flex items-center gap-1 px-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Back to the wallet"
                onClick={() => setView("main")}
              >
                <ArrowLeft />
              </Button>
              <h2
                id="phone-wallet-title"
                className="m-0 flex-1 text-title font-headline"
              >
                Accounts
              </h2>
            </div>
            <div className="mx-4 mt-3 flex flex-col divide-y divide-border overflow-hidden rounded-xl bg-surface-raised">
              {accounts.map((acc, i) => (
                <Row
                  key={acc.address}
                  trailing={
                    i === current ? (
                      <Check
                        className="text-foreground!"
                        aria-label="Current"
                      />
                    ) : undefined
                  }
                  onClick={() => {
                    setCurrent(i);
                    setView("main");
                  }}
                >
                  {acc.name}{" "}
                  <span className="font-mono text-caption text-muted-foreground">
                    {short(acc.address)}
                  </span>
                </Row>
              ))}
            </div>
            <div className="mx-4 mt-3 flex flex-col divide-y divide-border overflow-hidden rounded-xl bg-surface-raised">
              <Row icon={<Plus />} onClick={() => setView("main")}>
                Add wallet
              </Row>
              <Row icon={<Download />} onClick={() => setView("main")}>
                Import
              </Row>
            </div>
          </>
        )}
      </section>

      {/* ⋯ on a phone: an actions sheet over the wallet. Remove asks first. */}
      {menu !== "closed" && (
        <>
          <div
            className="absolute inset-0 z-10 bg-[var(--backdrop)]"
            aria-hidden="true"
            onClick={closeMenu}
          />
          <div
            role="dialog"
            aria-label={
              menu === "remove" ? `Remove ${account.name}?` : "Wallet actions"
            }
            /* Clear of the screen's curve and above the home indicator:
               12px aside, 24px below (in the app, the safe area plus 8px) */
            className="absolute inset-x-3 bottom-6 z-10 flex flex-col gap-2"
          >
            {menu === "actions" ? (
              <>
                <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[20px] bg-surface-raised">
                  <Row icon={<Droplet />} onClick={closeMenu}>
                    Airdrop
                  </Row>
                  <Row icon={<Pencil />} onClick={closeMenu}>
                    Rename
                  </Row>
                  <Row icon={<Upload />} onClick={closeMenu}>
                    Export keypair
                  </Row>
                </div>
                <div className="overflow-hidden rounded-[20px] bg-surface-raised">
                  <Row
                    icon={<Trash2 />}
                    destructive
                    onClick={() => setMenu("remove")}
                  >
                    Remove {account.name}
                  </Row>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3 rounded-[20px] bg-surface-raised p-4">
                <div className="flex flex-col gap-1">
                  <p className="m-0 text-title font-headline">
                    Remove {account.name}?
                  </p>
                  <p className="m-0 text-caption text-muted-foreground">
                    Its keypair is deleted from this browser. Export it first if
                    you'll need it again.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  /* Button clips its fill inside a clear 1px border; with no
                     border of its own this one read narrower than the outline */
                  className="h-11 bg-clip-border"
                  onClick={closeMenu}
                >
                  Remove
                </Button>
                <Button variant="outline" className="h-11" onClick={closeMenu}>
                  Export keypair
                </Button>
              </div>
            )}
            <button
              type="button"
              onClick={closeMenu}
              className="h-[var(--phone-row)] w-full cursor-pointer rounded-[20px] border-0 bg-surface-raised text-control font-act text-foreground"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PhoneWalletSheet;
