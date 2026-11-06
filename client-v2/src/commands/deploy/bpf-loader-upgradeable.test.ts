// A file of its own: `src/commands/` is a runtime module the UI move rule
// never touches, so its tests stay out of the modules (AGENTS.md)
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initLogger, memoryProvider, resetLogger } from "@/shared/lib/logger";

import { BpfLoaderUpgradeable } from "./bpf-loader-upgradeable";

const METADATA_SIZE = 37;
/** `PACKET_DATA_SIZE` less what `loadBuffer` reserves for the rest of a write */
const CHUNK_SIZE = 1232 - 220 - 44 - 40;

/** The buffer account's data, when each send started, how many to fail and with what */
const chain = vi.hoisted(() => ({
  data: Buffer.alloc(0),
  sentAt: [] as number[],
  failures: 0,
  // What a 429 without CORS headers becomes in the browser
  failWith: (): Error => new TypeError("Failed to fetch"),
  /** Sends that land after each read of the buffer; the rest fail */
  landsPerRead: Number.POSITIVE_INFINITY,
  landsLeft: Number.POSITIVE_INFINITY,
  /** The config of each connection `PgConnection.create` built, and the connection each send went through */
  created: [] as object[],
  sentThrough: [] as unknown[],
  /** Buffer reads through the read-buffer RPC; the selected connection has no `getAccountInfo`, so a read there throws */
  bufferReads: 0,
  /** What `PgConnection.getSendTxPerSecond` returns, as the env would set it */
  sendTxPerSecond: undefined as number | undefined,
  current: { rpcEndpoint: "https://rpc.test", commitment: "confirmed" },
  readBufferRpc: {
    getAccountInfo: async () => {
      chain.bufferReads++;
      chain.landsLeft = chain.landsPerRead;
      return { data: Buffer.from(chain.data) };
    },
  },
}));

vi.mock("../../utils", () => ({
  PgCommon: {
    setDefault: <T extends object>(value: T, defaults: object) =>
      Object.assign({}, defaults, value),
    // Rejects on a stop, as `PgCommon.sleep` does
    sleep: (ms: number, abortController: AbortController | undefined) =>
      new Promise((res, rej) => {
        const id = setTimeout(res, ms);
        abortController?.signal.addEventListener("abort", () => {
          clearTimeout(id);
          rej(new DOMException("Aborted", "AbortError"));
        });
      }),
    tryUntilSuccess: <T>(cb: () => Promise<T>) => cb(),
  },
  PgConnection: {
    current: chain.current,
    create: (config: object) => {
      chain.created.push(config);
      return config;
    },
    getReadBufferConnection: (connection: unknown) =>
      connection === chain.current ? chain.readBufferRpc : connection,
    getSendTxPerSecond: (connection: unknown) =>
      connection === chain.current ? chain.sendTxPerSecond : undefined,
  },
  PgPlaynet: { isUrlPlaynet: () => false },
  PgTx: {
    send: async (
      ix: { offset: number; bytes: Buffer },
      { connection }: { connection?: unknown }
    ) => {
      chain.sentAt.push(Date.now());
      chain.sentThrough.push(connection);
      if (chain.failures-- > 0 || chain.landsLeft-- <= 0) {
        throw chain.failWith();
      }
      ix.bytes.copy(chain.data, 37 + ix.offset);
      return "sig";
    },
    simulate: async () => ({ unitsConsumed: 1 }),
    confirm: async () => ({}),
  },
  PgWallet: { current: { publicKey: {} } },
  PgWeb3: {
    PACKET_DATA_SIZE: 1232,
    MAX_COMPUTE_UNIT_LIMIT: 1_400_000,
    DEFAULT_MS_PER_SLOT: 400,
    BpfLoaderUpgradeableProgram: {
      BUFFER_METADATA_SIZE: 37,
      write: (ix: { offset: number; bytes: Buffer }) => ix,
    },
  },
}));

/** Load a program of `chunks` writes and return when each send started */
const loadWith = async (
  opts: {
    loadConcurrency: number;
    writesPerSecond: number;
    onRateLimit?: (retryAfter: number, reason: string) => void;
  },
  chunks: number
) => {
  const bytes = new Uint8Array(chunks * CHUNK_SIZE).fill(1);
  chain.data = Buffer.alloc(METADATA_SIZE + bytes.length);

  const loading = BpfLoaderUpgradeable.loadBuffer({} as never, bytes, opts);
  await vi.runAllTimersAsync();
  await loading;
  return chain.sentAt;
};

describe("commands/deploy/bpf-loader-upgradeable", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    chain.sentAt = [];
    chain.failures = 0;
    chain.failWith = () => new TypeError("Failed to fetch");
    chain.landsPerRead = Number.POSITIVE_INFINITY;
    chain.created = [];
    chain.sentThrough = [];
    chain.bufferReads = 0;
    chain.sendTxPerSecond = undefined;
  });
  afterEach(() => {
    vi.useRealTimers();
    resetLogger();
  });

  it("sends no more writes in a second than the cap, however many workers run", async () => {
    const sentAt = await loadWith(
      { loadConcurrency: 4, writesPerSecond: 5 },
      12
    );

    expect(sentAt).toHaveLength(12);
    for (let i = 0; i + 5 < sentAt.length; i++) {
      expect(sentAt[i + 5] - sentAt[i]).toBeGreaterThanOrEqual(1000);
    }
  });

  it("pauses longer after each failed send that is not a 429, and no longer once one lands", async () => {
    chain.failures = 2;

    const sentAt = await loadWith(
      { loadConcurrency: 1, writesPerSecond: 1000 },
      4
    );

    const gaps = sentAt.slice(1).map((t, i) => t - sentAt[i]);
    expect(gaps[0]).toBeGreaterThan(1);
    expect(gaps[1]).toBeGreaterThan(gaps[0]);
    expect(gaps[2]).toBeLessThan(gaps[0]);
  });

  it("waits out a Helius -32429 write and passes its reason to onRateLimit", async () => {
    chain.failures = 1;
    chain.failWith = () =>
      Object.assign(new Error("Too many requests"), { code: -32429 });
    const onRateLimit = vi.fn();

    const sentAt = await loadWith(
      { loadConcurrency: 1, writesPerSecond: 1000, onRateLimit },
      2
    );

    expect(onRateLimit).toHaveBeenCalledWith(10, "Helius: Too many requests");
    expect(sentAt[1] - sentAt[0]).toBeGreaterThanOrEqual(10_000);
  });

  const rateLimited = (): Error =>
    Object.assign(new Error("Too many requests"), { code: -32429 });
  const fetchFailed = (): Error => new TypeError("Failed to fetch");

  it.each([
    {
      label: "halves the rate after a rate-limited write",
      failWith: rateLimited,
      writesPerSecond: 8,
      gapAfter: 250,
    },
    {
      label: "keeps the floor after a rate-limited write",
      failWith: rateLimited,
      writesPerSecond: 1,
      gapAfter: 1000,
    },
    {
      label: "halves the rate after a write the browser blocked",
      failWith: fetchFailed,
      writesPerSecond: 8,
      gapAfter: 250,
    },
  ])("$label", async ({ failWith, writesPerSecond, gapAfter }) => {
    chain.failures = 1;
    chain.failWith = failWith;

    const sentAt = await loadWith({ loadConcurrency: 1, writesPerSecond }, 3);

    expect(sentAt[2] - sentAt[1]).toBe(gapAfter);
  });

  it.each([
    { label: "raises the rate", writesPerSecond: 1, gapAfter: 500 },
    { label: "keeps the ceiling", writesPerSecond: 20, gapAfter: 50 },
  ])(
    "$label after ten landed writes in a row",
    async ({ writesPerSecond, gapAfter }) => {
      const sentAt = await loadWith(
        { loadConcurrency: 1, writesPerSecond },
        12
      );

      // The turn of the 11th write was taken at the old rate, so the 12th is the first at the new one
      expect(sentAt[11] - sentAt[10]).toBe(gapAfter);
    }
  );

  it("starts at the cluster's send cap below the start rate and stays there after a run of landed writes", async () => {
    chain.sendTxPerSecond = 2;

    const bytes = new Uint8Array(13 * CHUNK_SIZE).fill(1);
    chain.data = Buffer.alloc(METADATA_SIZE + bytes.length);
    const loading = BpfLoaderUpgradeable.loadBuffer({} as never, bytes, {
      loadConcurrency: 1,
    });
    await vi.runAllTimersAsync();
    await loading;

    const gaps = chain.sentAt.slice(1).map((t, i) => t - chain.sentAt[i]);
    expect(gaps).toEqual(new Array(12).fill(500));
  });

  it("logs refused writes once per load, with the first refusal's message", async () => {
    const logged = memoryProvider();
    initLogger({ providers: [logged] });
    chain.failures = 3;

    await loadWith({ loadConcurrency: 1, writesPerSecond: 1000 }, 2);

    expect(
      logged.entries.map(({ level, message }) => ({ level, message }))
    ).toEqual([
      {
        level: "debug",
        message:
          "Buffer writes: 3 refused, each sent again until the load ended; the first: Failed to fetch",
      },
    ]);
  });

  it("sends writes through the selected RPC without a 429 retry, and reads the buffer through the read-buffer RPC", async () => {
    await loadWith({ loadConcurrency: 1, writesPerSecond: 1000 }, 2);

    expect(chain.created).toEqual([
      {
        endpoint: "https://rpc.test",
        commitment: "confirmed",
        disableRetryOnRateLimit: true,
      },
    ]);
    expect(chain.sentThrough).toEqual([chain.created[0], chain.created[0]]);
    expect(chain.bufferReads).toBeGreaterThan(0);
  });

  it("throws once rounds in a row land no chunk, naming the last rate limit", async () => {
    chain.landsPerRead = 0;
    chain.failWith = () =>
      Object.assign(new Error("Too many requests"), { code: 429 });

    const bytes = new Uint8Array(2 * CHUNK_SIZE).fill(1);
    chain.data = Buffer.alloc(METADATA_SIZE + bytes.length);

    const loading = BpfLoaderUpgradeable.loadBuffer({} as never, bytes, {
      loadConcurrency: 1,
    });
    // Attached before the timers run, so the rejection is never unhandled
    const failure = expect(loading).rejects.toThrow(
      "The RPC kept refusing buffer writes: no chunk landed in 5 rounds in a row (last rate limit: Solana RPC: Too many requests)"
    );
    await vi.runAllTimersAsync();
    await failure;
  });

  it("keeps loading while each round lands a chunk, past the stalled-round cap", async () => {
    chain.landsPerRead = 1;

    const sentAt = await loadWith(
      { loadConcurrency: 1, writesPerSecond: 1000 },
      8
    );

    expect(chain.data.subarray(METADATA_SIZE).every((b) => b === 1)).toBe(true);
    expect(sentAt.length).toBeGreaterThan(8);
  });

  it("returns without a throw when stopped during a pause", async () => {
    chain.failures = Number.POSITIVE_INFINITY;
    const bytes = new Uint8Array(4 * CHUNK_SIZE).fill(1);
    chain.data = Buffer.alloc(METADATA_SIZE + bytes.length);
    const abortController = new AbortController();
    setTimeout(() => abortController.abort(), 100);

    const loading = BpfLoaderUpgradeable.loadBuffer({} as never, bytes, {
      loadConcurrency: 1,
      abortController,
    });
    await vi.runAllTimersAsync();

    await expect(loading).resolves.toBeUndefined();
    expect(chain.sentAt).toHaveLength(1);
  });
});
