import { useState } from "react";
import type { ReactNode } from "react";

import { BaseFundDialog } from "@/features/fund-wallet";
import type { BaseFundDialogProps } from "@/features/fund-wallet";
import { Button } from "@/shared/ui/button";
import { TooltipProvider } from "@/shared/ui/tooltip";
import BaseDeploy from "../flow/stages/BaseDeploy";
import type { BaseDeployProps } from "../flow/stages/BaseDeploy";
import BaseInstructionList from "../flow/stages/BaseInstructionList";
import InteractBody from "../flow/stages/InteractBody";
import type { Idl } from "../../utils/program-interaction";
import type { CallOutcome } from "../flow/stages/call-outcome";
import { BACKPACK_ICON, PHANTOM_ICON } from "./wallet-logos";
import PhoneWalletSheet from "./PhoneWalletSheet";
import type { PhoneWalletSheetProps } from "./PhoneWalletSheet";

/** A counter program's IDL, Anchor 0.29 shape, as an example */
const SAMPLE_IDL = {
  version: "0.1.0",
  name: "counter",
  instructions: [
    {
      name: "initialize",
      accounts: [
        { name: "counter", isMut: true, isSigner: true },
        { name: "user", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "increment",
      accounts: [
        { name: "counter", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
    {
      name: "setName",
      accounts: [
        { name: "counter", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
      ],
      args: [{ name: "name", type: "string" }],
    },
  ],
} as unknown as Idl;

/**
 * A design review board for DES-195 and DES-193: every state of the Deploy
 * stage's failed-build question, the phone Interact list and the funding
 * dialog, drawn from their Base components with example data. Opened with
 * `?review=deploy-wallet`; nothing here touches a wallet or a network.
 */

const PROGRAM = "9hJqVkT3wXo7mZpR2bNcY4sUeQ1aLdG8fHtKzWxCvB";
const PG_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const PHANTOM = "4fQaUo1NcBz2pJm8W6tXsR9yHkVqE3LdG5aYcZbT7xKX";
const SIG =
  "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";

const WALLETS = [
  { name: "Phantom", icon: PHANTOM_ICON },
  { name: "Backpack", icon: BACKPACK_ICON },
];

const noop = () => undefined;
const wait = () => new Promise<void>(() => undefined);
const minutesAgo = (m: number) => Date.now() - m * 60_000;

const deployBase: BaseDeployProps = {
  cluster: "devnet",
  built: true,
  deploy: "idle",
  programId: PROGRAM,
  details: { upgradable: true, authority: PG_WALLET, programSize: 183_712 },
  history: [],
  payer: { address: PG_WALLET, balance: 4.82, playground: true },
  run: { step: null, percent: 0, funds: false, upgrade: false },
  funding: null,
  backup: false,
  staleBuild: false,
  lastGoodBuildAt: null,
  addressUrl: () => "https://explorer.solana.com",
  txUrl: () => "https://explorer.solana.com",
  onDeploy: noop,
  onSignIn: noop,
  onSaveKeypair: noop,
  onDismissBackup: noop,
  onStaleBuildAnswer: noop,
  onStaleBuildShowError: noop,
  onInteract: noop,
  idlUpload: <Button variant="ghost">Upload IDL</Button>,
  onOpenCliGuide: noop,
};

const deployed = [
  {
    id: "1",
    workspace: "hello-anchor",
    cluster: "devnet",
    programId: PROGRAM,
    signature: SIG,
    at: minutesAgo(40),
    cost: 1_302_000_000,
  },
];

/** The failed build's first error, as the Build stage parsed it */
const FAILURE = {
  file: "programs/counter/src/lib.rs",
  line: 14,
  message: "cannot find type `Initialize` in this scope",
};

const CALLED: CallOutcome = {
  instruction: "increment",
  ok: true,
  signature: SIG,
  logs: [
    "Program 9hJqVkT3wXo7mZpR2bNcY4sUeQ1aLdG8fHtKzWxCvB invoke [1]",
    "Program log: Instruction: Increment",
    "Program log: Counter is now 3",
    "Program 9hJqVkT3wXo7mZpR2bNcY4sUeQ1aLdG8fHtKzWxCvB consumed 3204 of 200000 compute units",
    "Program 9hJqVkT3wXo7mZpR2bNcY4sUeQ1aLdG8fHtKzWxCvB success",
  ],
  failingLine: null,
};

const FAILED: CallOutcome = {
  instruction: "increment",
  ok: false,
  signature: SIG,
  logs: [
    "Program 9hJqVkT3wXo7mZpR2bNcY4sUeQ1aLdG8fHtKzWxCvB invoke [1]",
    "Program log: Instruction: Increment",
    "Program log: AnchorError caused by account: authority. Error Code: ConstraintHasOne. Error Number: 2001. Error Message: A has one constraint was violated.",
    "Program 9hJqVkT3wXo7mZpR2bNcY4sUeQ1aLdG8fHtKzWxCvB failed: custom program error: 0x7d1",
  ],
  failingLine:
    "Program log: AnchorError caused by account: authority. Error Code: ConstraintHasOne. Error Number: 2001. Error Message: A has one constraint was violated.",
};

// The frame stands in for the phone's screen; on a desk the form's own card
// is the only frame, as in the stage
const interactPage = (result: CallOutcome | null) => (
  <div className="max-w-[42rem] max-md:rounded-xl max-md:border max-md:border-border">
    <InteractBody
      idl={SAMPLE_IDL}
      programId={PROGRAM}
      cluster="devnet"
      initialPage="increment"
      initialResult={result && { outcome: result, at: minutesAgo(0.2) }}
    />
  </div>
);

const fundBase: BaseFundDialogProps = {
  open: true,
  onOpenChange: noop,
  receiver: { name: "Wallet 1", address: PG_WALLET },
  wallets: WALLETS,
  payer: { name: "Phantom", address: PHANTOM, balance: 3 },
  cluster: "devnet",
  amount: "1",
  onAmountChange: noop,
  onConnect: wait,
  onSend: wait,
  failure: null,
  txUrl: () => "https://explorer.solana.com",
};

interface Shot {
  id: string;
  group: string;
  title: string;
  /** What the reviewer is looking at, and what changed against the build */
  note: string;
  render: () => ReactNode;
}

const stage = (p: Partial<BaseDeployProps>) => (
  <div className="min-h-[640px] flex-1 overflow-hidden rounded-xl border border-border bg-surface-base max-md:h-[calc(100dvh-10rem)] max-md:min-h-0 max-md:flex-none">
    <BaseDeploy {...deployBase} {...p} />
  </div>
);

const fund = (p: Partial<BaseFundDialogProps>) => (
  <BaseFundDialog {...fundBase} {...p} />
);

const wallet = (p: Partial<PhoneWalletSheetProps>) => (
  <PhoneWalletSheet
    accounts={[
      { name: "Wallet 1", address: PG_WALLET },
      { name: "Wallet 2", address: PHANTOM },
    ]}
    cluster="devnet"
    balance={2.5}
    txs={[
      { signature: SIG, ago: "2m ago" },
      { signature: "3kPq" + SIG.slice(4), ago: "1h ago", failed: true },
      { signature: "8xHd" + SIG.slice(4), ago: "Yesterday" },
    ]}
    {...p}
  />
);

const SHOTS: Shot[] = [
  {
    id: "deploy-question",
    group: "DES-195 · Deploy",
    title: "Last build failed: the question",
    note: "Pressed Deploy after a failed build, before the first deploy: the question is the whole stage. A neutral tile holds the amber triangle, a grey chip names the build that would go out. Only the two buttons sit in the foot (pinned on a phone, Show the error at the bottom where the Deploy pill was). Focus goes to the title, Esc cancels. No Cancel button: Show the error is the way out (departs from Spec 03, for Grisha).",
    render: () =>
      stage({
        deploy: "running",
        staleBuild: true,
        lastGoodBuildAt: minutesAgo(12),
      }),
  },
  {
    id: "deploy-question-error",
    group: "DES-195 · Deploy",
    title: "Last build failed, with the error line",
    note: "Same question when the failed build's first error is known: one mono line with where it failed, from the Build stage's parsed diagnostic. Wired in the app.",
    render: () =>
      stage({
        deploy: "running",
        staleBuild: true,
        lastGoodBuildAt: minutesAgo(12),
        staleBuildFailure: FAILURE,
      }),
  },
  {
    id: "deploy-question-redeploy",
    group: "DES-195 · Deploy",
    title: "Last build failed, after a deploy",
    note: "With a deploy on record the question leads the stage, above the result and the history, with a thin amber edge: the title, the reason in caption grey, the buttons inside on a desk, one note on what the older build lacks. It scrolls into view when it opens. On a phone only the buttons go to the pinned foot, so nothing is drawn over the result card. The good build (12 min ago) is newer than the deploy (40 min ago).",
    render: () =>
      stage({
        deploy: "running",
        staleBuild: true,
        lastGoodBuildAt: minutesAgo(12),
        staleBuildFailure: FAILURE,
        history: deployed,
      }),
  },
  {
    id: "deploy-question-deployed",
    group: "DES-195 · Deploy",
    title: "Last build failed, good build already deployed",
    note: "Edge case: the last good build is the one on chain, so deploying it would change nothing. Only Show the error, and a line that says so. Needs the build id on DeployRecord (dev ticket); prop goodBuildDeployed.",
    render: () =>
      stage({
        deploy: "running",
        staleBuild: true,
        lastGoodBuildAt: minutesAgo(95),
        staleBuildFailure: FAILURE,
        goodBuildDeployed: true,
        history: deployed,
      }),
  },
  {
    id: "deploy-question-no-time",
    group: "DES-195 · Deploy",
    title: "Last build failed, time unknown",
    note: 'After a reload the page doesn\'t know when the good build was made: the chip is left out (never "Unknown") and the button reads Deploy last good build. This is what the app shows until lastGoodBuildAt is stored (dev ticket 2).',
    render: () =>
      stage({
        deploy: "running",
        staleBuild: true,
        lastGoodBuildAt: null,
        staleBuildFailure: FAILURE,
      }),
  },
  {
    id: "deploy-ready",
    group: "DES-195 · Deploy",
    title: "Before: ready to deploy",
    note: "For comparison with the question. The network is said once, on the button; one line of description; program id and who pays as a small table, labels in grey, the key in code; Upload IDL and Deploy with the CLI small and quiet under the one call to action.",
    render: () => stage({}),
  },
  {
    id: "interact-list",
    group: "DES-195 · Interact on a phone",
    title: "Instructions list",
    note: "Phone only. A summary over the list once anything was called; each row leads with a status icon (check, cross, hollow circle) and its second line starts with the status word and time. Rows are named by the instruction and described by that line for screen readers.",
    render: () => (
      <div className="max-w-[390px]">
        <BaseInstructionList
          instructions={[
            { name: "initialize", args: 0, accounts: 3 },
            { name: "increment", args: 1, accounts: 2 },
            { name: "set_name", args: 1, accounts: 2 },
            { name: "close", args: 0, accounts: 3 },
          ]}
          history={[
            {
              id: "a",
              programId: PROGRAM,
              cluster: "devnet",
              instruction: "increment",
              ok: false,
              signature: SIG,
              failingLine: null,
              at: minutesAgo(2),
            },
            {
              id: "b",
              programId: PROGRAM,
              cluster: "devnet",
              instruction: "initialize",
              ok: true,
              signature: SIG,
              failingLine: null,
              at: minutesAgo(5),
            },
          ]}
          onOpen={noop}
        />
      </div>
    ),
  },
  {
    id: "interact-page",
    group: "DES-195 · Interact on a phone",
    title: "Instructions, live form",
    note: "At phone width the increment page is open: back arrow (browser and Android back too), Reset in the ⋯ menu, Arguments then Accounts, the type inside the field, Signs and Writable in neutral, Paste inside an empty account field, a program the form fills by itself read only. The foot holds only Call, off with its reason. On a desk: see Interact on a desk.",
    render: () => interactPage(null),
  },
  {
    id: "interact-page-called",
    group: "DES-195 · Interact on a phone",
    title: "Instruction page, called",
    note: "The result lands on the same page right above Call and is scrolled to: Called increment and the time, then on one axis under the title the program's line, the signature shortened in the middle with copy and Explorer on one row, logs folded. The form stays one scroll up for another call.",
    render: () => interactPage(CALLED),
  },
  {
    id: "interact-page-failed",
    group: "DES-195 · Interact on a phone",
    title: "Instruction page, call failed",
    note: "Call to increment failed, with the program's error line under the title. Same place, same anatomy.",
    render: () => interactPage(FAILED),
  },
  {
    id: "interact-live",
    group: "DES-195 · Interact on a desk",
    title: "Instructions, live form",
    note: "The picked chip is a neutral fill, no ring. One card: Arguments and Accounts as small labels, Fill sample values on the first. The field label is the name; the type sits inside the field; Signs and Writable in neutral; Paste (and My wallet for the signer) inside an empty account field, only clear and copy once filled; systemProgram and other constants read only with their name. Call is primary, with its reason beside it while off; Reset is quiet at the end of the row.",
    render: () => interactPage(null),
  },
  {
    id: "interact-live-called",
    group: "DES-195 · Interact on a desk",
    title: "Instructions, called",
    note: "The result closes the form card, under Call, with the phone's anatomy: Called increment and the time, then on one axis the program's line, Signature with copy and Explorer on one row, logs folded. No dot, no plate. The form stays above for another call.",
    render: () => interactPage(CALLED),
  },
  {
    id: "interact-live-failed",
    group: "DES-195 · Interact on a desk",
    title: "Instructions, call failed",
    note: "Call to increment failed, at the foot of the form card, with the program's error line under the title.",
    render: () => interactPage(FAILED),
  },
  {
    id: "fund-pick",
    group: "DES-193 · Fund from a wallet",
    title: "Pick a wallet",
    note: "To, the network and the wallets to send from. The network is a tag on the To row, yellow on mainnet. Each wallet is a row with a chevron.",
    render: () => fund({ payer: null }),
  },
  {
    id: "fund-no-wallet",
    group: "DES-193 · Fund from a wallet",
    title: "No wallet installed",
    note: "Desktop: Spec 12's line. At phone width it says wallet apps don't connect on a phone here (new copy, for review).",
    render: () => fund({ payer: null, wallets: [] }),
  },
  {
    id: "fund-ready",
    group: "DES-193 · Fund from a wallet",
    title: "Ready to send",
    note: "To and From read as one slip. The balance and Max sit on the amount's label row (Binance, Base); Max fills the balance less the 0.001 SOL fee. The button repeats the amount.",
    render: () => fund({}),
  },
  {
    id: "fund-loading",
    group: "DES-193 · Fund from a wallet",
    title: "Balance loading",
    note: "The label row says it's checking, with a spinner, where the balance and Max will appear. The fee line stays, so nothing jumps. Send waits.",
    render: () =>
      fund({
        payer: { name: "Phantom", address: PHANTOM, balance: "loading" },
      }),
  },
  {
    id: "fund-above",
    group: "DES-193 · Fund from a wallet",
    title: "Above the balance",
    note: "The button says Not enough SOL, and one red line says how much can go. Color is never the only sign.",
    render: () => fund({ amount: "5" }),
  },
  {
    id: "fund-approving",
    group: "DES-193 · Fund from a wallet",
    title: "Waiting for approval",
    note: 'The wait lives in the button: spinner and "Approve in Phantom…" (Uniswap). One muted line beside it, read out to screen readers.',
    render: () => fund({ sending: true }),
  },
  {
    id: "fund-declined",
    group: "DES-193 · Fund from a wallet",
    title: "Declined",
    note: "Neutral, not red: the person said no. The amount stays and Send reads Try again.",
    render: () =>
      fund({ failure: { kind: "send-declined", wallet: "Phantom" } }),
  },
  {
    id: "fund-failed",
    group: "DES-193 · Fund from a wallet",
    title: "Could not send",
    note: "The title names the amount (Revolut). The raw error folds behind Show details, which turns into Hide details with its chevron.",
    render: () =>
      fund({
        failure: {
          kind: "send-failed",
          detail: "Transaction simulation failed: Blockhash not found",
        },
      }),
  },
  {
    id: "fund-unconfirmed",
    group: "DES-193 · Fund from a wallet",
    title: "Sent, not confirmed yet",
    note: 'Two lines: the title, then "Before you send again, check it in Explorer", ending on the link to the transfer. Send stays off so nothing goes twice.',
    render: () =>
      fund({ failure: { kind: "send-unconfirmed", signature: SIG } }),
  },
  {
    id: "fund-sent",
    group: "DES-193 · Fund from a wallet",
    title: "Sent and confirmed",
    note: "The result stays in the dialog: the slip, a green callout with the amount and where it went, ending on the Explorer link, and one Done. The wrapper still closes and toasts until dev switches it to this.",
    render: () => fund({ sent: { sol: 1, signature: SIG } }),
  },
  {
    id: "fund-mainnet",
    group: "DES-193 · Fund from a wallet",
    title: "Mainnet",
    note: "The network tag turns yellow; the warning is two lines, right above the buttons. Never turns Send off.",
    render: () => fund({ cluster: "mainnet-beta" }),
  },
  {
    id: "wallet-sheet",
    group: "DES-193 · Wallet on a phone",
    title: "Wallet sheet",
    note: "Below 768px the wallet is a bottom Sheet titled Wallet (sync 4.11). The head under the glow (15% primary): account picker with the network, the balance left-aligned with it, Fund and Copy address (tap it: Copied, and a toast). Below: one row into Send, then the last transactions; only a failed one gets a dot and Failed in red. Rows stay signature and time: the list has no amount without ten more calls.",
    render: () => wallet({}),
  },
  {
    id: "wallet-sheet-send",
    group: "DES-193 · Wallet on a phone",
    title: "Send step",
    note: "Send is its own step at the same height as the wallet, so the sheet never jumps, not a form in the middle of the sheet: there the keyboard covered the button. Back arrow, the network, what's available, address, amount with Max, Send pinned at the bottom so it rides above the keyboard.",
    render: () => wallet({ view: "send" }),
  },
  {
    id: "wallet-sheet-accounts",
    group: "DES-193 · Wallet on a phone",
    title: "Accounts",
    note: "The picker opens the accounts with a check on the current one (Venmo, Reddit). Add wallet and Import live at the end of this list, not in the menu.",
    render: () => wallet({ view: "accounts" }),
  },
  {
    id: "wallet-sheet-menu",
    group: "DES-193 · Wallet on a phone",
    title: "⋯ menu",
    note: "An actions sheet from the bottom, not the desk's dropdown: Airdrop (stays here, per the ticket), Rename, Export keypair; Remove apart in red; Cancel last.",
    render: () => wallet({ menu: "actions" }),
  },
  {
    id: "wallet-sheet-remove",
    group: "DES-193 · Wallet on a phone",
    title: "Remove, asked first",
    note: "Remove takes a second step with what it costs and a way out: Export keypair.",
    render: () => wallet({ menu: "remove" }),
  },
  {
    id: "wallet-sheet-empty",
    group: "DES-193 · Wallet on a phone",
    title: "No transactions",
    note: '"No transactions yet" with the next step in words, pointing at Fund in the head (not Airdrop, which the ticket keeps in the menu); no second Fund button. Replaces the build\'s "No transaction found."',
    render: () => wallet({ balance: 0, txs: [] }),
  },
];

const readState = () => {
  const id = new URLSearchParams(window.location.search).get("state");
  return SHOTS.find((s) => s.id === id) ?? SHOTS[0];
};

const DeployWalletReview = () => {
  const [shot, setShot] = useState<Shot>(readState);
  const pick = (next: Shot) => {
    const url = new URL(window.location.href);
    url.searchParams.set("state", next.id);
    window.history.replaceState(null, "", url);
    setShot(next);
  };
  const groups = [...new Set(SHOTS.map((s) => s.group))];
  // The board stays above a dialog so states can be switched, but the phone
  // instruction page is a full screen page and must cover it
  const above = /^interact-(page|live)/.test(shot.id)
    ? "max-md:z-auto"
    : "max-md:z-[60]";

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh bg-surface-base text-foreground max-md:flex-col md:h-dvh md:overflow-hidden">
        <nav
          aria-label="States"
          className="pointer-events-auto relative z-[60] flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-surface-base p-5 max-md:hidden"
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm font-act">Deploy and wallet</span>
            <span className="text-xs text-muted-foreground">
              DES-195, DES-193 · design review · example data
            </span>
          </div>
          {groups.map((g) => (
            <div key={g} className="flex flex-col gap-1">
              <span className="text-xs text-subtle">{g}</span>
              {SHOTS.filter((s) => s.group === g).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(s)}
                  aria-current={s.id === shot.id || undefined}
                  className="cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-surface-hover hover:text-foreground aria-[current]:bg-surface-hover aria-[current]:text-foreground"
                >
                  {s.title}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div
          className={`pointer-events-auto relative border-b border-border bg-surface-base p-4 md:hidden ${above}`}
        >
          <select
            aria-label="State"
            value={shot.id}
            onChange={(e) =>
              pick(SHOTS.find((s) => s.id === e.target.value) ?? SHOTS[0])
            }
            className="h-11 w-full rounded-lg border border-border bg-surface-panel px-3 text-sm text-foreground"
          >
            {SHOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.group}: {s.title}
              </option>
            ))}
          </select>
        </div>
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-6 max-md:p-4 md:h-dvh">
          <div
            className={`relative flex max-w-[42rem] flex-col gap-1 md:z-[60] ${above}`}
          >
            <span className="text-xs text-subtle">{shot.group}</span>
            <h1 className="m-0 text-lg font-act">{shot.title}</h1>
            <p className="m-0 text-sm text-muted-foreground max-md:hidden">
              {shot.note}
            </p>
          </div>
          <div key={shot.id} className="flex min-h-0 flex-1 flex-col">
            {shot.render()}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default DeployWalletReview;
