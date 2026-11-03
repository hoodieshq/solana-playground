import { PgCommand, PgConnection, PgWallet, PgWeb3 } from "@/utils";
import { missingPackageOf } from "@/utils/js-runtime";
import type { RunResult } from "@/utils/js-runtime";
import { createLogger } from "@/shared/lib/logger";

import { PgDocsLink } from "./opened";
import { docsLinkTelemetry } from "./telemetry";
import type { RunOutcome, RunSource, WalletOrigin } from "./telemetry";

const log = createLogger("docs-link:run");

/** A state the run can be in once it is not asking for SOL */
type SettledState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; ms: number }
  | { kind: "failed"; message: string }
  | { kind: "missing-package"; pkg: string };

/** What the stage row's Run and its callout show */
export type RunState =
  | SettledState
  | {
      kind: "funding";
      address: string;
      balance: number;
      needed: number;
      /** What Not now goes back to */
      previous: SettledState;
    };

type Listener = (state: RunState) => void;

let state: RunState = { kind: "idle" };
/** The run in progress: when it started and whose project it ran */
let current: { startedAt: number; source: RunSource } | null = null;
/** Run was pressed and is still setting the wallet up or reading its SOL */
let starting = false;
let listening = false;
const listeners = new Set<Listener>();

const set = (next: RunState) => {
  state = next;
  listeners.forEach((listener) => listener(next));
};

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * How a finished `run` reads, from what the command handed back: a
 * `RunResult`, or the error it threw before any script ran.
 */
const settle = (
  result: { ok: RunResult | undefined } | { err: unknown },
  ms: number
): SettledState => {
  if ("err" in result) {
    const message = messageOf(result.err);
    const pkg = missingPackageOf(message);
    return pkg ? { kind: "missing-package", pkg } : { kind: "failed", message };
  }
  if (result.ok && !result.ok.ok) {
    return { kind: "failed", message: result.ok.error };
  }
  return { kind: "done", ms };
};

const outcomeOf: Record<SettledState["kind"], RunOutcome | null> = {
  idle: null,
  running: null,
  done: "done",
  failed: "failed",
  "missing-package": "missing-package",
};

/**
 * Follow the `run` command's own events, so a `run` typed in the terminal
 * shows on the stage row like one from its button. Started on first use, not
 * at import: `PgCommand` reads the command list, which is filled at startup.
 */
const listen = () => {
  if (listening) return;

  PgCommand.run.onDidStart(() => {
    current = {
      startedAt: Date.now(),
      source: PgDocsLink.opened ? "link" : "project",
    };
    docsLinkTelemetry.track("docs_link_run_started", {
      source: current.source,
    });
    set({ kind: "running" });
  });
  PgCommand.run.onDidFinish((result) => {
    const run = current ?? { startedAt: Date.now(), source: "project" };
    current = null;
    const ms = Date.now() - run.startedAt;
    const next = settle(result, ms);
    const outcome = outcomeOf[next.kind];
    if (outcome) {
      docsLinkTelemetry.track("docs_link_run_finished", {
        source: run.source,
        outcome,
        seconds: Math.floor(ms / 1000),
      });
    }
    set(next);
  });

  // A new link, or a project opened any other way, starts from a clean
  // callout; a run still going keeps its state until it ends
  PgDocsLink.onDidChange(() => {
    if (state.kind !== "running") set({ kind: "idle" });
  });

  listening = true;
};

/** The wallet's balance now, read from the chain rather than the cached one */
const balanceOf = async (address: PgWeb3.PublicKey) =>
  PgWeb3.lamportsToSol(await PgConnection.current.getBalance(address));

/**
 * The SOL check a docs link asks for: the funding card when the wallet holds
 * less than the link's `sol`, else nothing.
 *
 * @param wallet `new` when Run had to set the wallet up first
 * @returns whether the run may start
 */
const funded = async (wallet: WalletOrigin) => {
  const needed = PgDocsLink.opened?.sol;
  if (!needed) return true;

  const address = PgWallet.current?.publicKey;
  // `start` sets the wallet up first, so this is a wallet that vanished
  if (!address) throw new Error("No wallet to run the script with.");
  const balance = await balanceOf(address);
  if (balance >= needed) return true;

  docsLinkTelemetry.track("docs_link_run_funding_shown", { wallet });
  set({
    kind: "funding",
    address: address.toBase58(),
    balance,
    needed,
    previous: state.kind === "funding" ? state.previous : state,
  });
  return false;
};

/**
 * Run the scripts. A rejection the command threw before it started never
 * reaches `onDidFinish` (another run in progress, say), so it is shown here.
 */
const runScripts = async () => {
  try {
    await PgCommand.run.execute();
  } catch (error) {
    if (state.kind === "running") return;
    log.warn("run refused before it started", { context: { error } });
    set({ kind: "failed", message: messageOf(error) });
  }
};

/** The stage row's Run, its funding card's buttons and its state */
export const PgClientRun = {
  get state() {
    return state;
  },

  /**
   * @param listener called with the current state, then on every change
   * @returns a disposable that removes the listener
   */
  onDidChange(listener: Listener) {
    listen();
    listeners.add(listener);
    listener(state);
    return { dispose: () => void listeners.delete(listener) };
  },

  /** Set the wallet up if needed, check its SOL, then `run` */
  async start() {
    listen();
    // One run at a time, counting the wallet setup and balance read before it
    if (state.kind === "running" || starting) return;
    starting = true;
    try {
      let wallet: WalletOrigin = "existing";
      if (PgWallet.state === "setup") {
        wallet = "new";
        await PgCommand.connect.execute();
        // The user closed the setup: nothing to run with, and they know why
        if (!PgWallet.current) return;
      }
      if (!(await funded(wallet))) return;
    } finally {
      starting = false;
    }
    await runScripts();
  },

  /** The funding card's Check again */
  async checkAgain() {
    if (starting) return;
    starting = true;
    let enough: boolean;
    try {
      enough = await funded("existing");
    } finally {
      starting = false;
    }
    if (enough) await runScripts();
  },

  /** The funding card's Not now */
  dismissFunding() {
    if (state.kind === "funding") set(state.previous);
  },
};
