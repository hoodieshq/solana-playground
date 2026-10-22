import { PgLesson } from "./store";
import { PgDeployHistory } from "../state/deploy-history";
import { PgFlow } from "../state/stage";
import { realBridge } from "../../sidebar/assistant/bridge/playground-bridge";
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
}

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
    return PgKora._deploy();
  }

  private static async _deploy() {
    if (PgFlow.state.deploy === "running") return;
    PgFlow.recordDeploy("start");
    PgKora._start();
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
    PgFlow.recordDeploy("done");
  }

  /**
   * Run `client/client.ts` the way `run` would, if it calls `hello`.
   *
   * @returns the transaction, or `null` when there was nothing to run
   */
  static async runClient(): Promise<KoraTx | null> {
    const client = realBridge.readFile("client/client.ts") ?? "";
    PgKora._start();
    if (!/\.hello\(\s*\)/.test(client)) {
      await print(
        "$ run client/client.ts",
        PgTerminal.warning(
          "client/client.ts doesn't call hello yet. Write the call, or ask the assistant to."
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
    return PgKora._call(null);
  }

  /** Call `hello` with a name, as Interact's form would */
  static async callHello(name: string): Promise<KoraTx> {
    PgKora._start();
    await print(
      PgTerminal.info(DEMO),
      `$ pg.program.methods.hello(${JSON.stringify(name)}).rpc()`
    );
    await pause(800);
    return PgKora._call(name);
  }

  /** A deploy or a call starting, which the terminal opens for */
  static onDidStart(cb: () => void): Disposable {
    PgKora._starts.add(cb);
    return { dispose: () => PgKora._starts.delete(cb) };
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
    const tx: KoraTx = { signature: sig, said, name, at: Date.now() };
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

  private static _start() {
    for (const cb of PgKora._starts) cb();
  }

  private static readonly _listeners = new Set<() => void>();
  private static readonly _starts = new Set<() => void>();
}
