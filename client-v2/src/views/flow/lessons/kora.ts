import { PgLesson } from "./store";
import { PgDeployHistory } from "../state/deploy-history";
import { PgFlow } from "../state/stage";
import { realBridge } from "../../sidebar/assistant/bridge/playground-bridge";
import { PgBuildOutput } from "../../sidebar/assistant/bridge/build-output";
import {
  PgCommand,
  PgExplorer,
  PgProgramInfo,
  PgTerminal,
} from "../../../utils";
import type { Disposable } from "../../../utils";

/** One call of `hello`, as the tutorial shows it */
export interface KoraTx {
  signature: string;
  /** The line `msg!` wrote, as it came back in the logs */
  said: string;
  /** The name it was called with, for step 4's call */
  name: string | null;
  at: number;
  /* What a receipt shows. Dummy figures in the shape devnet returns them;
     a call kept from before they were recorded has none */
  programId?: string;
  slot?: number;
  computeUnits?: number;
  /** The network fee, which Kora pays */
  feeLamports?: number;
}

/** What a transaction costs on Solana's base fee, paid by Kora here */
export const BASE_FEE_LAMPORTS = 5000;
/** The compute budget a single instruction gets by default */
export const COMPUTE_LIMIT = 200_000;

interface KoraRecord {
  deployedAt: number | null;
  txs: KoraTx[];
}

const KEY = "flow.kora";
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const signature = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(88)),
    (b) => BASE58[b % BASE58.length]
  ).join("");
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lines printed as one block: the terminal prompts after every print */
const print = (...lines: string[]) => PgTerminal.println(lines.join("\n"));

/* One run, one prompt: the terminal holds its prompt while a process runs,
   so a deploy that pauses between its lines still ends with a single `$`.
   Counted, because a call can run a deploy inside itself. */
let depth = 0;
const run = async <T>(
  cb: () => Promise<T>,
  opts?: { quiet?: boolean }
): Promise<T> => {
  if (depth) return cb();
  depth++;
  // The terminal opens first and settles: opening it resizes it, which draws
  // a prompt of its own in the middle of whatever is printing
  if (!opts?.quiet) {
    PgKora.open();
    await pause(250);
  }
  try {
    return await PgTerminal.process(cb);
  } finally {
    depth--;
  }
};

/** Said once per run, so nobody takes the stand's devnet for the real one */
const DEMO =
  "Demo on this stand: Kora isn't live yet, so nothing below reached devnet.";

/**
 * Deploying and calling the tutorial's program through Kora, mocked.
 *
 * The product's direction is a first deploy that needs no wallet and 0 SOL,
 * paid by Kora. Kora isn't live, and the real deploy asks for a wallet, a
 * GitHub sign-in and a faucet, which a static review stand cannot offer. So
 * inside a tutorial the deploy, the client run and the call with a name are
 * played out here: the terminal prints what they would, the deploy lands in
 * the history Deploy shows, and the dev loop moves on as after a real one.
 * The build stays real: rustc and the IDL still decide step 1 and step 4.
 * Outside a tutorial nothing here runs.
 */
export class PgKora {
  /** Whether the open workspace is a tutorial, where the mock stands in */
  static get active() {
    return !!PgLesson.state.path;
  }

  static get record(): KoraRecord {
    const workspace = PgExplorer.currentWorkspaceName;
    try {
      const all = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      return all[workspace ?? ""] ?? { deployedAt: null, txs: [] };
    } catch {
      return { deployedAt: null, txs: [] };
    }
  }

  static get lastTx(): KoraTx | null {
    return PgKora.record.txs[0] ?? null;
  }

  /** Deploy for a tutorial, or the real command anywhere else */
  static deploy() {
    if (!PgKora.active) return PgCommand.deploy.execute();
    return run(() => PgKora._deploy());
  }

  /** Whether the program on devnet is older than the last good build */
  static get behind() {
    const { deployedAt } = PgKora.record;
    const build = PgBuildOutput.latest;
    return (
      deployedAt !== null && !!build && !build.failed && build.at > deployedAt
    );
  }

  private static async _deploy(opts?: { stay?: boolean }) {
    if (PgFlow.state.deploy === "running") return;
    PgFlow.recordDeploy("start", opts);
    const programId = PgProgramInfo.getPkStr() ?? "";
    const upgrade = PgKora.record.deployedAt !== null;
    await print(
      PgTerminal.info(DEMO),
      `${PgTerminal.info(upgrade ? "Upgrading..." : "Deploying...")} ` +
        "through Kora, the rent is paid for you: 0 SOL."
    );
    await pause(1600);
    await print(
      "Writing buffer... 100%",
      `Program Id: ${programId}`,
      PgTerminal.success("Deployment successful.")
    );

    PgKora._save({ ...PgKora.record, deployedAt: Date.now() });
    const workspace = PgExplorer.currentWorkspaceName;
    if (workspace && programId) {
      PgDeployHistory.add({
        workspace,
        cluster: "devnet",
        programId,
        signature: null,
      });
    }
    PgFlow.recordDeploy("done", opts);
  }

  /**
   * Run `client/client.ts` the way `run` would, if it calls `hello`.
   *
   * @returns the transaction, or `null` when there was nothing to run
   */
  static runClient(): Promise<KoraTx | null> {
    return run(() => PgKora._runClient());
  }

  private static async _runClient(): Promise<KoraTx | null> {
    const client = realBridge.readFile("client/client.ts") ?? "";
    // `hello()` on step 3, `hello("…")` once step 4 gave it a name
    const call = client.match(/\.hello\(\s*(?:"((?:[^"\\]|\\.)*)")?\s*\)/);
    if (!call) {
      // A call written in another file, most often a `client.ts` made in
      // `src/` because that folder was selected: say where it has to go
      const elsewhere = realBridge
        .listFiles()
        .find(
          (path) =>
            path !== "client/client.ts" &&
            /\.ts$/.test(path) &&
            /\.hello\(/.test(realBridge.readFile(path) ?? "")
        );
      await print(
        "$ run client/client.ts",
        PgTerminal.warning(
          elsewhere
            ? `The call is in ${elsewhere}, but the client runs client/client.ts. Move it there.`
            : "client/client.ts doesn't call hello yet. Write the call, or ask the assistant to."
        )
      );
      return null;
    }
    if (PgKora.record.deployedAt === null) {
      await print(
        "$ run client/client.ts",
        PgTerminal.warning(
          "Deploy the program first: there is nothing to call."
        )
      );
      return null;
    }
    await print(
      PgTerminal.info(DEMO),
      "$ run client/client.ts",
      "Running client..."
    );
    await pause(800);
    return PgKora._call(call[1] ?? null);
  }

  /**
   * Call `hello` with a name, as Interact's form would.
   *
   * Step 4 changes the program, so the copy on devnet is the old one until
   * it is deployed again. A call made before that upgrades it first, as the
   * learner would have to, instead of answering from code that isn't there.
   *
   * @param quiet leave the terminal shut, for a caller that shows the
   * receipt itself
   */
  static callHello(name: string | null, opts?: { quiet?: boolean }) {
    return run(() => PgKora._callHello(name, opts?.quiet), opts);
  }

  private static async _callHello(
    name: string | null,
    quiet?: boolean
  ): Promise<KoraTx> {
    if (PgKora.behind) await PgKora._deploy({ stay: quiet });
    await print(
      PgTerminal.info(DEMO),
      `$ pg.program.methods.hello(${
        name === null ? "" : JSON.stringify(name)
      }).rpc()`
    );
    await pause(800);
    return PgKora._call(name);
  }

  /** A deploy or a call starting, which the terminal opens for */
  static onDidStart(cb: () => void): Disposable {
    PgKora._starts.add(cb);
    return { dispose: () => PgKora._starts.delete(cb) };
  }

  /**
   * Shut the terminal, for a screen that shows the result itself: the finish
   * holds the receipt, and the terminal would sit over it
   */
  static askRoom() {
    for (const cb of PgKora._room) cb();
  }

  static onDidAskRoom(cb: () => void): Disposable {
    PgKora._room.add(cb);
    return { dispose: () => PgKora._room.delete(cb) };
  }

  static onDidChange(cb: () => void): Disposable {
    PgKora._listeners.add(cb);
    return { dispose: () => PgKora._listeners.delete(cb) };
  }

  private static async _call(name: string | null): Promise<KoraTx> {
    const sig = signature();
    const said = PgKora._said(name);
    await print(
      `Use 'solana confirm -v ${sig}' to see the logs`,
      "Program log: Instruction: Hello",
      `Program log: ${said}`,
      PgTerminal.success("Transaction confirmed.")
    );
    const computeUnits = 1180 + Math.floor(Math.random() * 400);
    const tx: KoraTx = {
      signature: sig,
      said,
      name,
      at: Date.now(),
      programId: PgProgramInfo.getPkStr() ?? undefined,
      slot: 389_000_000 + Math.floor(Math.random() * 900_000),
      computeUnits,
      feeLamports: BASE_FEE_LAMPORTS,
    };
    const record = PgKora.record;
    PgKora._save({ ...record, txs: [tx, ...record.txs].slice(0, 10) });
    return tx;
  }

  /** What `hello`'s `msg!` says, read from lib.rs as the learner wrote it */
  private static _said(name: string | null) {
    const lib = realBridge.readFile("src/lib.rs") ?? "";
    const text =
      lib.match(/msg!\(\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? "Hello, World!";
    if (name === null) return text.includes("{}") ? "Hello, World!" : text;
    return text.replaceAll("{}", () => name);
  }

  private static _save(record: KoraRecord) {
    const workspace = PgExplorer.currentWorkspaceName ?? "";
    try {
      const all = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      all[workspace] = record;
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      // Storage off: the run still shows, it just isn't kept
    }
    for (const cb of PgKora._listeners) cb();
  }

  /** Open the terminal, which a deploy or a call prints to */
  static open() {
    for (const cb of PgKora._starts) cb();
  }

  private static readonly _listeners = new Set<() => void>();
  private static readonly _starts = new Set<() => void>();
  private static readonly _room = new Set<() => void>();
}
