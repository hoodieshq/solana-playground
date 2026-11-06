// A file of its own: `src/commands/` is a runtime module the UI move rule
// never touches, so its tests stay out of the modules (AGENTS.md)
import { beforeEach, describe, expect, it, vi } from "vitest";

import { initLogger, memoryProvider, resetLogger } from "@/shared/lib/logger";

import { isStopped } from "../../utils/stopped";
import { PgDeployRun } from "./run";

/** What each test sets: the run's stop, the wallet's balance, the terminal */
const env = vi.hoisted(() => ({
  controller: new AbortController(),
  balance: 0,
  /** The buffer account's balance, read when a stop could not close it */
  bufferBalance: (async () => 0) as () => Promise<number>,
  /** The user has switched network since the deploy began */
  switchedNetwork: false,
  waitForInput: (async () => true) as (msg: string) => Promise<unknown>,
  executeFromStr: (async () => undefined) as (cmd: string) => Promise<unknown>,
  /** What `PgConnection.getReadBufferConnection` answers; the selected connection when unset */
  readBuffer: undefined as
    | { rpcEndpoint: string; getBalance: () => Promise<number> }
    | undefined,
}));
const airdrop = vi.hoisted(() => vi.fn());
const send = vi.hoisted(() => vi.fn(async () => "sig"));
const loadBuffer = vi.hoisted(() => vi.fn());
const closeBuffer = vi.hoisted(() => vi.fn(async () => "sig"));

vi.mock("../../utils", () => ({
  PgCommand: { airdrop: { execute: airdrop }, build: { execute: vi.fn() } },
  PgCommon: {
    formatSeconds: String,
    makePlural: String,
    sleep: vi.fn(),
    timeout: <R>(promisable: Promise<R>) => promisable,
  },
  PgConnection: {
    get current() {
      // A connection stays on the network it was taken for: on another one
      // the buffer does not exist, and its balance reads 0
      const switched = env.switchedNetwork;
      return {
        // The buffer's key is the only one with `toBase58` (`Keypair.generate`)
        getBalance: async (key: { toBase58?: unknown }) => {
          if (!key?.toBase58) return env.balance;
          return switched ? 0 : env.bufferBalance();
        },
        getMinimumBalanceForRentExemption: async () => 2_000_000_000,
        getAccountInfo: async () => null,
      };
    },
    getAirdropAmount: () => 5,
    getReadBufferConnection: <T>(connection: T) => env.readBuffer ?? connection,
  },
  PgGlobal: {
    deployState: "ready",
    update: vi.fn(),
    onDidChangeDeployState: () => ({ dispose: vi.fn() }),
  },
  PgProgramInfo: {
    importedProgram: { bytes: new Uint8Array(10) },
    onChain: { deployed: false },
    pk: {},
  },
  PgServer: { deploy: vi.fn() },
  PgTerminal: {
    bold: String,
    error: String,
    info: String,
    success: String,
    println: vi.fn(),
    get: async () => ({
      println: vi.fn(),
      waitForInput: (msg: string) => env.waitForInput(msg),
      executeFromStr: (cmd: string) => env.executeFromStr(cmd),
    }),
  },
  PgTx: { send, confirm: async () => ({}) },
  PgView: { setMainSecondaryProgress: vi.fn() },
  PgWallet: {
    current: { isPg: true, publicKey: {} },
    accounts: [],
    create: vi.fn(),
  },
  PgWeb3: {
    BpfLoaderUpgradeableProgram: { getBufferAccountSize: () => 10 },
    lamportsToSol: (lamports: number) => lamports / 1e9,
    solToLamports: (sol: number) => sol * 1e9,
    Keypair: {
      generate: () => ({ publicKey: { toBase58: () => "Buf1111" } }),
    },
  },
}));

vi.mock("../checks", () => ({ checkWallet: vi.fn() }));
vi.mock("../create", () => ({ createCmd: <T>(cmd: T) => cmd }));
vi.mock("./bpf-loader-upgradeable", () => ({
  BpfLoaderUpgradeable: {
    createBuffer: send,
    extendProgram: send,
    loadBuffer,
    closeBuffer,
  },
}));

/** Run the deploy command's handler and return what it ended with */
const runDeploy = async () => {
  const { deploy } = await import("./deploy");
  return (
    deploy as unknown as {
      handle: (input: {
        signal: AbortSignal;
        lockStop: () => void;
      }) => Promise<unknown>;
    }
  )
    .handle({ signal: env.controller.signal, lockStop: vi.fn() })
    .catch((e: unknown) => e);
};

describe("commands/deploy", () => {
  beforeEach(() => {
    env.controller = new AbortController();
    env.balance = 0;
    env.bufferBalance = async () => 0;
    env.switchedNetwork = false;
    env.waitForInput = async () => true;
    env.executeFromStr = async () => undefined;
    env.readBuffer = undefined;
    airdrop.mockClear();
    send.mockClear();
    loadBuffer.mockReset();
    closeBuffer.mockReset();
    closeBuffer.mockImplementation(async () => "sig");
  });

  it("asks for nothing more once stopped during the airdrop question", async () => {
    // The person presses Stop while the question waits, then answers yes
    env.waitForInput = async () => {
      env.controller.abort();
      return true;
    };

    const failure = await runDeploy();

    expect(isStopped(failure)).toBe(true);
    expect(airdrop).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("answers the airdrop question no when stopped, without waiting for the person", async () => {
    let answer: (value: boolean) => void = () => undefined;
    env.waitForInput = () =>
      new Promise((res) => {
        answer = res;
        env.controller.abort();
      });
    const executed: string[] = [];
    env.executeFromStr = async (cmd) => {
      executed.push(cmd);
      answer(cmd === "yes");
    };

    const failure = await runDeploy();

    expect(executed).toEqual(["no"]);
    expect(isStopped(failure)).toBe(true);
    expect(airdrop).not.toHaveBeenCalled();
  });

  it("closes the buffer when the load fails after a stop", async () => {
    env.balance = 10_000_000_000;
    loadBuffer.mockImplementation(async () => {
      env.controller.abort();
      throw new Error("the segment was aborted");
    });

    const failure = await runDeploy();

    expect(isStopped(failure)).toBe(true);
    expect(closeBuffer).toHaveBeenCalledTimes(1);
    expect((failure as Error).message).toContain("buffer account was closed");
  });

  it("closes the buffer on a yes when the load fails without a stop, then fails with the load's error", async () => {
    env.balance = 10_000_000_000;
    loadBuffer.mockImplementation(async () => {
      throw new Error("The RPC kept refusing buffer writes");
    });

    const failure = await runDeploy();

    expect(closeBuffer).toHaveBeenCalledTimes(1);
    expect((failure as Error).message).toBe(
      "The RPC kept refusing buffer writes"
    );
  });

  /** A load that fails without a stop */
  const failTheLoad = () => {
    env.balance = 10_000_000_000;
    loadBuffer.mockImplementation(async () => {
      throw new Error("The RPC kept refusing buffer writes");
    });
  };

  it("closes the buffer without asking when the Deploy stage's load fails", async () => {
    failTheLoad();
    const asked = vi.fn(async () => true);
    env.waitForInput = asked;

    const failure = await PgDeployRun.runWith({
      confirmStaleBuild: async () => true,
      airdrop: true,
    })(runDeploy);

    expect(asked).not.toHaveBeenCalled();
    expect(closeBuffer).toHaveBeenCalledTimes(1);
    expect((failure as Error).message).toBe(
      "The RPC kept refusing buffer writes"
    );
  });

  it("names the buffer and the close command, and reports, when the Deploy stage's close fails", async () => {
    failTheLoad();
    closeBuffer.mockImplementation(async () => {
      throw new Error("blockhash not found");
    });
    env.readBuffer = {
      rpcEndpoint: "https://read.test",
      getBalance: async () => 0,
    };
    const logged = memoryProvider();
    initLogger({ providers: [logged] });

    try {
      const failure = await PgDeployRun.runWith({
        confirmStaleBuild: async () => true,
        airdrop: true,
      })(runDeploy);

      expect((failure as Error).message).toBe(
        "The RPC kept refusing buffer writes Its buffer Buf1111 could not be " +
          "closed. Run `solana program close --buffers -u 'https://read.test'` " +
          "to reclaim its SOL."
      );
      expect(
        logged.entries.some(
          (entry) => entry.report && entry.context?.buffer === "Buf1111"
        )
      ).toBe(true);
    } finally {
      resetLogger();
    }
  });

  it("prints the buffer and the close command when the reclaim a person asked for fails", async () => {
    failTheLoad();
    closeBuffer.mockImplementation(async () => {
      throw new Error("blockhash not found");
    });
    const { PgTerminal } = await import("../../utils");

    const failure = await runDeploy();

    expect((failure as Error).message).toBe(
      "The RPC kept refusing buffer writes"
    );
    expect(PgTerminal.println).toHaveBeenCalledWith(
      "Its buffer Buf1111 could not be closed. Run " +
        "`solana program close --buffers` to reclaim its SOL."
    );
  });

  it("answers the reclaim question no when stopped, without waiting for the person", async () => {
    failTheLoad();
    let answer: (value: boolean) => void = () => undefined;
    env.waitForInput = (msg) =>
      new Promise((res) => {
        if (!msg.includes("reclaim SOL")) return res(true);
        answer = res;
        env.controller.abort();
      });
    const executed: string[] = [];
    env.executeFromStr = async (cmd) => {
      executed.push(cmd);
      answer(cmd === "yes");
    };

    await runDeploy();

    expect(executed).toEqual(["no"]);
    expect(closeBuffer).not.toHaveBeenCalled();
  });

  it("reads a kept buffer's balance through the read-buffer RPC", async () => {
    stopKeepingTheBuffer();
    // The selected connection reads the fresh buffer as empty, as the platform RPC does
    env.bufferBalance = async () => 0;
    env.readBuffer = {
      rpcEndpoint: "https://read.test",
      getBalance: async () => 1_421_676_960,
    };

    const failure = await runDeploy();

    expect((failure as Error).message).toContain(
      "Its buffer Buf1111 still holds 1.42 SOL. Run " +
        "`solana program close --buffers -u 'https://read.test'`"
    );
  });

  /** A stop whose buffer close fails every retry, so the buffer is kept */
  const stopKeepingTheBuffer = () => {
    env.balance = 10_000_000_000;
    loadBuffer.mockImplementation(async () => {
      env.controller.abort();
      throw new Error("the segment was aborted");
    });
    closeBuffer.mockImplementation(async () => {
      throw new Error("blockhash not found");
    });
  };

  it("names the SOL a buffer it could not close still holds", async () => {
    stopKeepingTheBuffer();
    env.bufferBalance = async () => 1_421_676_960;

    const failure = await runDeploy();

    expect(isStopped(failure)).toBe(true);
    expect((failure as Error).message).toContain(
      "Its buffer Buf1111 still holds 1.42 SOL."
    );
  });

  it("reads a kept buffer on the deploy's network, not one chosen since", async () => {
    stopKeepingTheBuffer();
    env.bufferBalance = async () => 1_421_676_960;
    closeBuffer.mockImplementation(async () => {
      env.switchedNetwork = true;
      throw new Error("blockhash not found");
    });

    const failure = await runDeploy();

    expect((failure as Error).message).toContain(
      "Its buffer Buf1111 still holds 1.42 SOL."
    );
  });

  it('keeps "its SOL" when the kept buffer\'s balance cannot be read', async () => {
    stopKeepingTheBuffer();
    env.bufferBalance = async () => {
      throw new Error("429 Too Many Requests");
    };

    const failure = await runDeploy();

    expect(isStopped(failure)).toBe(true);
    expect((failure as Error).message).toContain(
      "Its buffer Buf1111 still holds its SOL."
    );
  });

  it("calls a buffer that reads empty closed: the close landed unconfirmed", async () => {
    stopKeepingTheBuffer();
    // A missing account's balance is 0; a live buffer is rent-exempt
    env.bufferBalance = async () => 0;

    const failure = await runDeploy();

    expect(isStopped(failure)).toBe(true);
    expect((failure as Error).message).toContain("buffer account was closed");
  });
});
