import { createLogger, toError } from "@/shared/lib/logger";
import { rateLimitOf } from "@/shared/lib/rpc-rate-limit";

import {
  PgCommon,
  PgConnection,
  PgPlaynet,
  PgTx,
  PgWallet,
  PgWeb3,
  WalletOption,
} from "../../utils";

const log = createLogger("commands:deploy");

// The write rates are guesses for an RPC whose `sendTransaction` limit the env does not set (`PgConnection.getSendTxPerSecond`)

/** Buffer writes per second across all workers when a load starts */
const START_WRITES_PER_SECOND = 4;

/** The rate a run of rate limits halves it down to */
const MIN_WRITES_PER_SECOND = 1;

/** The rate a run of landed writes raises it up to, when the env sets no send cap for the cluster */
const MAX_WRITES_PER_SECOND = 20;

/** Writes per second added after {@link WRITES_PER_STEP} landed writes in a row */
const WRITES_PER_SECOND_STEP = 1;

const WRITES_PER_STEP = 10;

/** Workers enough to reach {@link MAX_WRITES_PER_SECOND} at a few hundred ms per send */
const LOAD_CONCURRENCY = 4;

/** A worker's first pause after a failed write that is not a parsed 429; each failure in a row doubles it */
const FAILED_WRITE_BACKOFF_MS = 500;

const MAX_FAILED_WRITE_BACKOFF_MS = 8000;

/**
 * A pace shared by all workers, starting at `startPerSecond`: `turnIn` is the ms a caller waits so turns come
 * `1000 / rate` ms apart; a rate limit halves the rate, and {@link WRITES_PER_STEP} landed writes in a row raise it
 * up to `maxPerSecond`.
 */
const paceFor = (maxPerSecond: number) => (startPerSecond: number) => {
  let perSecond = startPerSecond;
  let landedInRow = 0;
  let next = 0;
  return {
    turnIn: () => {
      const now = Date.now();
      const at = Math.max(now, next);
      next = at + 1000 / perSecond;
      return at - now;
    },
    recordWrite: () => {
      landedInRow++;
      if (landedInRow < WRITES_PER_STEP) return;
      landedInRow = 0;
      // A start above the ceiling is kept, not lowered by a landed write
      if (perSecond >= maxPerSecond) return;
      perSecond = Math.min(perSecond + WRITES_PER_SECOND_STEP, maxPerSecond);
    },
    recordFailure: () => {
      landedInRow = 0;
    },
    recordRateLimit: () => {
      landedInRow = 0;
      perSecond = Math.max(
        perSecond / 2,
        Math.min(perSecond, MIN_WRITES_PER_SECOND)
      );
    },
  };
};

/** A connection to the same RPC on which web3.js does not retry a 429 itself, so the pace sees the first one */
const withoutRetryOnRateLimit = (connection: PgWeb3.Connection) =>
  // Playnet answers in the page and never rate-limits; its connection is overridden, so it is kept
  PgPlaynet.isUrlPlaynet(connection.rpcEndpoint)
    ? connection
    : PgConnection.create({
        endpoint: connection.rpcEndpoint,
        commitment: connection.commitment,
        disableRetryOnRateLimit: true,
      });

/** Sleeps `ms`, ending early and quietly once `abortController` aborts, as a stopped load returns */
const pauseWith =
  (abortController: AbortController | undefined) => (ms: number) =>
    PgCommon.sleep(ms, abortController).catch((e: unknown) => {
      if (!abortController?.signal.aborted) throw e;
    });

/** The pause after `previous` ms, for one more failed write in a row */
const nextBackoff = (previous: number) =>
  Math.min(
    previous ? previous * 2 : FAILED_WRITE_BACKOFF_MS,
    MAX_FAILED_WRITE_BACKOFF_MS
  );

/** Rounds in a row in which no missing chunk lands before `loadBuffer` gives up, so a refusing RPC cannot hang a deploy */
const MAX_STALLED_ROUNDS = 5;

// TODO: Make use of the `X-Ratelimit-Method-Remaining` response header. The
// default devnet RPC returns 150 for `X-Ratelimit-Method-Limit` but allows 40
// requests; `...Method-Remaining` at 110 (150 - 40) means the next request to
// that method is rate-limited.

/** Wrapper around `BpfLoaderUpgradeableProgram` for easier interactions */
export class BpfLoaderUpgradeable {
  /** Create and initialize a buffer account. */
  static async createBuffer(
    buffer: PgWeb3.Signer,
    lamports: number,
    programLen: number,
    opts?: WalletOption
  ) {
    const { wallet } = this._getOptions(opts);

    const ixs = [
      PgWeb3.SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: buffer.publicKey,
        lamports,
        space:
          PgWeb3.BpfLoaderUpgradeableProgram.getBufferAccountSize(programLen),
        programId: PgWeb3.BpfLoaderUpgradeableProgram.programId,
      }),
      PgWeb3.BpfLoaderUpgradeableProgram.initializeBuffer({
        bufferPk: buffer.publicKey,
        authorityPk: wallet.publicKey,
      }),
    ];

    return await PgTx.send(ixs, { keypairSigners: [buffer], wallet });
  }

  /** Update the buffer authority. */
  static async setBufferAuthority(
    bufferPk: PgWeb3.PublicKey,
    newAuthorityPk: PgWeb3.PublicKey,
    opts?: WalletOption
  ) {
    const { wallet } = this._getOptions(opts);

    const ix = PgWeb3.BpfLoaderUpgradeableProgram.setBufferAuthority({
      bufferPk,
      authorityPk: wallet.publicKey,
      newAuthorityPk,
    });

    return await PgTx.send(ix, { wallet });
  }

  /** Load programData to the initialized buffer account. */
  static async loadBuffer(
    bufferPk: PgWeb3.PublicKey,
    bytes: Uint8Array,
    opts?: {
      loadConcurrency?: number;
      /** The starting rate, at most the cluster's send cap, which rate limits and landed writes then move */
      writesPerSecond?: number;
      abortController?: AbortController;
      onWrite?: (current: number, total: number) => void;
      onMissing?: (missingCount: number) => void;
      /** `reason` names the provider and its message, as in `Helius: Too many requests` */
      onRateLimit?: (retryAfter: number, reason: string) => void;
    } & WalletOption
  ) {
    const programBytes = Buffer.from(bytes);
    const { wallet } = this._getOptions(opts);
    const { loadConcurrency, writesPerSecond } = PgCommon.setDefault(opts, {
      loadConcurrency: LOAD_CONCURRENCY,
      writesPerSecond: START_WRITES_PER_SECOND,
    });
    const connection = PgConnection.current;
    const sendCap = PgConnection.getSendTxPerSecond(connection);
    // A capped plan never starts above its limit
    const pace = sendCap
      ? paceFor(sendCap)(Math.min(writesPerSecond, sendCap))
      : paceFor(MAX_WRITES_PER_SECOND)(writesPerSecond);
    const pause = pauseWith(opts?.abortController);
    const writeConnection = withoutRetryOnRateLimit(connection);
    const bufferConnection = PgConnection.getReadBufferConnection(connection);

    // Maximal chunk of the data per tx
    const WRITE_CHUNK_SIZE =
      PgWeb3.PACKET_DATA_SIZE - // Maximum transaction size
      220 - //                     Data with 1 signature
      44 - //                      `setComputeUnitPrice` instruction size
      40; //                       `setComputeUnitLimit` instruction size

    // Simulate to get the compute unit consumption of a write transaction and
    // reuse it for all writes since they all consume the same amount of CU
    const { unitsConsumed: computeUnitLimit } = await PgTx.simulate(
      PgWeb3.BpfLoaderUpgradeableProgram.write({
        offset: 0,
        bytes: programBytes.slice(0, WRITE_CHUNK_SIZE),
        bufferPk,
        authorityPk: wallet.publicKey,
      }),
      { computeUnitLimit: PgWeb3.MAX_COMPUTE_UNIT_LIMIT, wallet }
    );

    let lastRateLimitReason: string | undefined;
    // Counted, not logged per write: a refusing RPC refuses many writes in a row
    let refusedCount = 0;
    let firstRefusal: Error | undefined;
    const loadBuffer = async (missingIndices: number[]) => {
      if (missingIndices.length < indices.length) {
        opts?.onMissing?.(missingIndices.length);
      }

      let i = 0;
      let successCount = 0;
      let lastTxHash: string | undefined;
      let rateLimitReason: string | undefined;
      await Promise.all(
        new Array(loadConcurrency).fill(null).map(async () => {
          let backoff = 0;
          while (1) {
            if (opts?.abortController?.signal.aborted) return;
            if (rateLimitReason) break;

            const offset = missingIndices[i] * WRITE_CHUNK_SIZE;
            i++;
            const endOffset = offset + WRITE_CHUNK_SIZE;
            const slice = programBytes.slice(offset, endOffset);
            if (slice.length === 0) break;

            const ix = PgWeb3.BpfLoaderUpgradeableProgram.write({
              offset,
              bytes: slice,
              bufferPk,
              authorityPk: wallet.publicKey,
            });

            await pause(pace.turnIn());
            if (opts?.abortController?.signal.aborted) return;

            try {
              lastTxHash = await PgTx.send(ix, {
                wallet,
                computeUnitLimit,
                connection: writeConnection,
              });
              backoff = 0;
              pace.recordWrite();
              successCount++;
              const total = indices.length;
              const current = total - missingIndices.length + successCount;
              opts?.onWrite?.(current, total);
            } catch (e: unknown) {
              refusedCount++;
              firstRefusal ??= toError(e);
              if (rateLimitReason) break;

              const rateLimit = rateLimitOf(e);
              if (rateLimit) {
                pace.recordRateLimit();
                rateLimitReason = `${rateLimit.provider}: ${rateLimit.reason}`;
                lastRateLimitReason = rateLimitReason;
                break;
              }

              // The browser hides a 429 without CORS headers behind a fetch `TypeError`, so slow down as for one
              if (e instanceof TypeError) pace.recordRateLimit();
              else pace.recordFailure();
              // The chunk is written again in the next round; the pause keeps
              // a failing RPC from being sent to at once
              backoff = nextBackoff(backoff);
              await pause(backoff);
            }
          }
        })
      );
      if (opts?.abortController?.signal.aborted) return;

      if (rateLimitReason) {
        // TODO: Make use of the `Retry-After` response header
        const retryAfter = 10; // this is what `Retry-After` returns currently
        opts?.onRateLimit?.(retryAfter, rateLimitReason);
        await PgCommon.sleep(retryAfter * 1000, opts?.abortController);
        if (opts?.abortController?.signal.aborted) return;
      }

      // Wait for the last transaction to confirm
      if (lastTxHash) {
        try {
          await PgTx.confirm(lastTxHash);
        } catch {
          const confirmations = connection.commitment === "finalized" ? 32 : 1;
          await PgCommon.sleep(confirmations * PgWeb3.DEFAULT_MS_PER_SLOT);
        }
      }
    };

    const txCount = Math.ceil(programBytes.length / WRITE_CHUNK_SIZE);
    const indices = new Array(txCount).fill(null).map((_, i) => i);

    const loadUntilWritten = async () => {
      // Retry until all bytes are written, or until rounds stop landing chunks
      let previousMissingCount = Number.POSITIVE_INFINITY;
      let stalledRounds = 0;
      while (1) {
        if (opts?.abortController?.signal.aborted) return;

        // Even though we only get to this function after buffer account creation
        // gets confirmed, the RPC can still return `null` here if it's behind.
        // Read through the read-buffer RPC: the platform RPC does not return fresh buffers
        const bufferAccount = await PgCommon.tryUntilSuccess(async () => {
          const acc = await bufferConnection.getAccountInfo(bufferPk);
          if (!acc) throw new Error();
          return acc;
        }, 1000);

        const onChainProgramBytes = bufferAccount.data.slice(
          PgWeb3.BpfLoaderUpgradeableProgram.BUFFER_METADATA_SIZE,
          PgWeb3.BpfLoaderUpgradeableProgram.BUFFER_METADATA_SIZE +
            programBytes.length
        );
        if (onChainProgramBytes.equals(programBytes)) break;

        const missingIndices = indices.filter((i) => {
          const start = i * WRITE_CHUNK_SIZE;
          const end = start + WRITE_CHUNK_SIZE;
          const actualSlice = programBytes.slice(start, end);
          const onChainSlice = onChainProgramBytes.slice(start, end);
          return !actualSlice.equals(onChainSlice);
        });

        stalledRounds =
          missingIndices.length < previousMissingCount ? 0 : stalledRounds + 1;
        previousMissingCount = missingIndices.length;
        if (stalledRounds >= MAX_STALLED_ROUNDS) {
          if (opts?.abortController?.signal.aborted) return;
          throw new Error(
            `The RPC kept refusing buffer writes: no chunk landed in ${MAX_STALLED_ROUNDS} rounds in a row${
              lastRateLimitReason
                ? ` (last rate limit: ${lastRateLimitReason})`
                : ""
            }`
          );
        }
        await loadBuffer(missingIndices);
      }
    };

    try {
      await loadUntilWritten();
    } finally {
      if (firstRefusal) {
        log.debug(
          `Buffer writes: ${refusedCount} refused, each sent again until the load ended; the first: ${firstRefusal.message}`
        );
      }
    }
  }

  /** Close the buffer account and withdraw funds. */
  static async closeBuffer(bufferPk: PgWeb3.PublicKey, opts?: WalletOption) {
    const { wallet } = this._getOptions(opts);

    const ix = PgWeb3.BpfLoaderUpgradeableProgram.close({
      closePk: bufferPk,
      recipientPk: wallet.publicKey,
      authorityPk: wallet.publicKey,
    });

    return await PgTx.send(ix, { wallet });
  }

  /** Create a program account from initialized buffer. */
  static async deployProgram(
    program: PgWeb3.Signer,
    bufferPk: PgWeb3.PublicKey,
    maxDataLen: number,
    opts?: WalletOption
  ) {
    const { wallet } = this._getOptions(opts);

    const ixs = [
      PgWeb3.SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: program.publicKey,
        lamports: await PgConnection.current.getMinimumBalanceForRentExemption(
          PgWeb3.BpfLoaderUpgradeableProgram.PROGRAM_ACCOUNT_SIZE
        ),
        space: PgWeb3.BpfLoaderUpgradeableProgram.PROGRAM_ACCOUNT_SIZE,
        programId: PgWeb3.BpfLoaderUpgradeableProgram.programId,
      }),
      PgWeb3.BpfLoaderUpgradeableProgram.deployWithMaxProgramLen({
        programPk: program.publicKey,
        bufferPk,
        upgradeAuthorityPk: wallet.publicKey,
        payerPk: wallet.publicKey,
        maxDataLen,
      }),
    ];

    return await PgTx.send(ixs, { wallet, keypairSigners: [program] });
  }

  /** Extend the program data account. */
  static async extendProgram(
    programPk: PgWeb3.PublicKey,
    additionalBytes: number,
    opts?: WalletOption
  ) {
    const { wallet } = this._getOptions(opts);

    const ix = PgWeb3.BpfLoaderUpgradeableProgram.extendProgram({
      programPk,
      additionalBytes,
      payerPk: wallet.publicKey,
    });

    return await PgTx.send(ix, { wallet });
  }

  /** Upgrade a program. */
  static async upgradeProgram(
    programPk: PgWeb3.PublicKey,
    bufferPk: PgWeb3.PublicKey,
    opts?: WalletOption
  ) {
    const { wallet } = this._getOptions(opts);

    const ix = PgWeb3.BpfLoaderUpgradeableProgram.upgrade({
      programPk,
      bufferPk,
      authorityPk: wallet.publicKey,
      spillPk: wallet.publicKey,
    });

    return await PgTx.send(ix, { wallet });
  }

  /** Get the wallet option. */
  private static _getOptions(opts?: WalletOption) {
    const wallet = opts?.wallet ?? PgWallet.current;
    if (!wallet) throw new Error("Wallet is not connected");
    return { wallet };
  }
}
