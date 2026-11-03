import { PgCommand, PgConnection, PgWallet, PgWeb3 } from "@/utils";
import { missingPackageOf } from "@/utils/js-runtime";
import type { RunResult } from "@/utils/js-runtime";
import { createLogger } from "@/shared/lib/logger";

import { PgDocsLink } from "./opened";
import { docsLinkTelemetry } from "./telemetry";
import type { RunOutcome, RunSource } from "./telemetry";

const log = createLogger("docs-link:run");

/** What the stage row's Run and its callout show */
export type RunState =
  | { kind: "idle" }
  | { kind: "funding"; address: string; balance: number; needed: number }
  | { kind: "running" }
  | { kind: "done"; ms: number }
  | { kind: "failed"; message: string }
  | { kind: "missing-package"; pkg: string };

type Listener = (state: RunState) => void;

let state: RunState = { kind: "idle" };
/** What Not now goes back to from the funding card */
let beforeFunding: RunState = state;
let startedAt = 0;
const listeners = new Set<Listener>();

const set = (next: RunState) => {
  state = next;
  listeners.forEach((listener) => listener(next));
};

const sourceOf = (): RunSource => (PgDocsLink.opened ? "link" : "project");

/** How a finished `run` reads, from what the command handed back */
const settle = (
  result: { ok: RunResult | undefined } | { err: Error }
): RunState => {
  if ("err" in result && result.err) {
    const message = result.err.message;
    const pkg = missingPackageOf(message);
    return pkg ? { kind: "missing-package", pkg } : { kind: "failed", message };
  }
  const run = "ok" in result ? result.ok : undefined;
  if (run && !run.ok) return { kind: "failed", message: run.error };
  return { kind: "done", ms: Date.now() - startedAt };
};

const outcomeOf: Record<RunState["kind"], RunOutcome | null> = {
  idle: null,
  funding: null,
  running: null,
  done: "done",
  failed: "failed",
  "missing-package": "missing-package",
};

let listening = false;

/**
 * Follow the `run` command's own events, so a `run` typed in the terminal
 * shows on the stage row like one from its button. Started on first use, not
 * at import: `PgCommand` reads the command list, which is filled at startup.
 */
const listen = () => {
  if (listening) return;
  listening = true;

  PgCommand.run.onDidStart(() => {
    startedAt = Date.now();
    docsLinkTelemetry.track("docs_link_run_started", { source: sourceOf() });
    set({ kind: "running" });
  });
  PgCommand.run.onDidFinish((result) => {
    const next = settle(result);
    const outcome = outcomeOf[next.kind];
    if (outcome) {
      docsLinkTelemetry.track("docs_link_run_finished", {
        source: sourceOf(),
        outcome,
        seconds: Math.floor((Date.now() - startedAt) / 1000),
      });
    }
    set(next);
  });

  // A new link, or a project opened any other way, starts from a clean
  // callout
  PgDocsLink.onDidChange(() => set({ kind: "idle" }));
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
const funded = async (wallet: "new" | "existing") => {
  const needed = PgDocsLink.opened?.sol;
  if (!needed) return true;

  const address = PgWallet.current?.publicKey;
  if (!address) return false;
  const balance = await balanceOf(address);
  if (balance >= needed) return true;

  if (state.kind !== "funding") beforeFunding = state;
  docsLinkTelemetry.track("docs_link_run_funding_shown", { wallet });
  set({
    kind: "funding",
    address: address.toBase58(),
    balance,
    needed,
  });
  return false;
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
    if (state.kind === "running") return;
    let wallet: "new" | "existing" = "existing";
    if (PgWallet.state === "setup") {
      wallet = "new";
      await PgCommand.connect.execute();
      // The user closed the setup: nothing to run with
      if (!PgWallet.current) return;
    }
    if (!(await funded(wallet))) return;

    // The command prints its own failures in the terminal; the callout
    // reads them through `onDidFinish`
    await PgCommand.run
      .execute()
      .catch((error: unknown) =>
        log.warn("run ended with an error", { context: { error } })
      );
  },

  /** The funding card's Check again */
  async checkAgain() {
    if (await funded("existing")) await PgClientRun.start();
  },

  /** The funding card's Not now */
  dismissFunding() {
    if (state.kind === "funding") set(beforeFunding);
  },
};
