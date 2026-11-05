import { createHash } from "node:crypto";
import type { Page, Route, WebSocketRoute } from "@playwright/test";
import {
  PublicKey,
  SystemProgram,
  VersionedTransaction,
} from "@solana/web3.js";

/**
 * A devnet for the tutorial specs, answered in the test: the JSON-RPC calls
 * the tutorial's deploy, run and call acts make, and the websocket their
 * confirmations wait on. It keeps accounts, applies what a sent transaction
 * does to them (system transfers into new accounts, the upgradeable loader's
 * buffer, deploy, upgrade and extend, an Anchor call) and writes each call's
 * program log, so the app's own code runs end to end with no network.
 *
 * Nothing is verified: signatures are taken as sent, and a transaction to a
 * program the fake does not know lands with no effect.
 */

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Base58, as Solana writes keys and signatures */
const bs58 = {
  encode: (bytes: Uint8Array): string => {
    let n = BigInt(`0x${Buffer.from(bytes).toString("hex") || "0"}`);
    let out = "";
    while (n > 0n) {
      out = ALPHABET[Number(n % 58n)] + out;
      n /= 58n;
    }
    for (const byte of bytes) {
      if (byte !== 0) break;
      out = `1${out}`;
    }
    return out;
  },
};

const RPC = "https://api.devnet.solana.com";
const WS = "wss://api.devnet.solana.com";
const LOADER = "BPFLoaderUpgradeab1e11111111111111111111111";
const SYSTEM = SystemProgram.programId.toBase58();
const LAMPORTS_PER_SOL = 1_000_000_000;
const FEE = 5000;
/** Bytes ahead of a buffer's program bytes: tag, Some, authority */
const BUFFER_HEADER = 37;
/** Bytes ahead of program data's bytes: tag, slot, Some, authority */
const PROGRAM_DATA_HEADER = 45;

interface Account {
  lamports: number;
  owner: string;
  data: Buffer;
  executable: boolean;
}

/** One compiled instruction, its keys resolved, landing at slot `s` */
interface Instruction {
  program: string;
  keys: string[];
  data: Buffer;
  s: number;
}

interface Landed {
  slot: number;
  blockTime: number;
  fee: number;
  logs: string[];
  accountKeys: string[];
  header: {
    numRequiredSignatures: number;
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
  };
  instructions: { programIdIndex: number; accounts: number[]; data: string }[];
  recentBlockhash: string;
  preBalances: number[];
  postBalances: number[];
}

/** Anchor's instruction discriminator: the first 8 bytes of sha256 */
const discriminator = (name: string) =>
  createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);

/** Rent the way the runtime charges it: two years of 3480 lamports a byte-year */
const rentFor = (bytes: number) => (bytes + 128) * 6960;

export interface FakeDevnet {
  /** Whether `requestAirdrop` pays ("ok") or answers the faucet's limit */
  faucet: "ok" | "refuse";
  /** Every JSON-RPC method the app called, in order */
  readonly calls: string[];
  /** The wallet's balance in SOL, or 0 for an account the fake never saw */
  balance(address: string): number;
  /** The programs the fake holds, by program id */
  programs(): string[];
}

/**
 * Routes devnet's JSON-RPC and websocket on `page` to a fresh fake chain.
 */
export const fakeDevnet = async (page: Page): Promise<FakeDevnet> => {
  const accounts = new Map<string, Account>();
  const landed = new Map<string, Landed>();
  /** Signatures by the address they touched, newest last */
  const touched = new Map<string, { signature: string; slot: number }[]>();
  const calls: string[] = [];
  const started = Date.now();
  // A slot every 400 ms, as on the cluster: the app reads a slot that does
  // not move as a stalled cluster, and web3 waits for a blockhash to change
  const slot = () => 1000 + Math.floor((Date.now() - started) / 400);
  const blockhash = (s: number) =>
    bs58.encode(createHash("sha256").update(`blockhash:${s}`).digest());
  const blockTime = () => Math.floor(Date.now() / 1000);

  const fake: FakeDevnet = {
    faucet: "ok",
    calls,
    balance: (address) =>
      (accounts.get(address)?.lamports ?? 0) / LAMPORTS_PER_SOL,
    programs: () =>
      Array.from(accounts.entries())
        .filter(([, a]) => a.owner === LOADER && a.executable)
        .map(([key]) => key),
  };

  const account = (key: string): Account => {
    let found = accounts.get(key);
    if (!found) {
      found = {
        lamports: 0,
        owner: SYSTEM,
        data: Buffer.alloc(0),
        executable: false,
      };
      accounts.set(key, found);
    }
    return found;
  };

  /** Lists the transaction `at` under `key`, for `getSignaturesForAddress` */
  const touch = (key: string, at: { signature: string; slot: number }) => {
    const list = touched.get(key) ?? [];
    if (!list.some((t) => t.signature === at.signature)) list.push(at);
    touched.set(key, list);
  };

  /**
   * One instruction's effect at slot `s`, with its account keys resolved;
   * returns the program log lines it writes
   */
  const apply = ({ program, keys, data, s }: Instruction): string[] => {
    if (program === SYSTEM) {
      const tag = data.readUInt32LE(0);
      if (tag === 0) {
        // createAccount: lamports, space, owner
        const lamports = Number(data.readBigUInt64LE(4));
        const space = Number(data.readBigUInt64LE(12));
        const owner = new PublicKey(data.subarray(20, 52)).toBase58();
        account(keys[0]).lamports -= lamports;
        accounts.set(keys[1], {
          lamports,
          owner,
          data: Buffer.alloc(space),
          executable: false,
        });
      } else if (tag === 2) {
        const lamports = Number(data.readBigUInt64LE(4));
        account(keys[0]).lamports -= lamports;
        account(keys[1]).lamports += lamports;
      }
      return [];
    }
    if (program === LOADER) return applyLoader({ program, keys, data, s });
    if (program.startsWith("ComputeBudget")) return [];
    // An Anchor program: its log, framed as the runtime frames it
    if (!discriminator("hello").equals(data.subarray(0, 8))) return [];
    return [
      `Program ${program} invoke [1]`,
      `Program log: Instruction: Hello`,
      `Program log: ${helloLog(data.subarray(8))}`,
      `Program ${program} consumed 1000 of 200000 compute units`,
      `Program ${program} success`,
    ];
  };

  const applyLoader = ({ keys, data, s }: Instruction): string[] => {
    const tag = data.readUInt32LE(0);
    switch (tag) {
      case 0: {
        // InitializeBuffer: [buffer, authority]
        const buffer = account(keys[0]);
        buffer.data.writeUInt32LE(1, 0);
        buffer.data[4] = 1;
        new PublicKey(keys[1]).toBuffer().copy(buffer.data, 5);
        break;
      }
      case 1: {
        // Write: offset, then bincode bytes (u64 length first)
        const offset = data.readUInt32LE(4);
        const length = Number(data.readBigUInt64LE(8));
        data
          .subarray(16, 16 + length)
          .copy(account(keys[0]).data, BUFFER_HEADER + offset);
        break;
      }
      case 2: {
        // DeployWithMaxDataLen: [payer, programData, program, buffer, ...,
        // authority]
        const maxDataLen = Number(data.readBigUInt64LE(4));
        const [, programDataKey, programKey, bufferKey] = keys;
        const authority = keys[7];
        const buffer = account(bufferKey);
        const bytes = buffer.data.subarray(BUFFER_HEADER);
        const programData = Buffer.alloc(PROGRAM_DATA_HEADER + maxDataLen);
        writeProgramDataHeader(programData, { slot: s, authority });
        bytes.copy(programData, PROGRAM_DATA_HEADER);
        accounts.set(programDataKey, {
          lamports: buffer.lamports,
          owner: LOADER,
          data: programData,
          executable: false,
        });
        const programAccount = account(programKey);
        programAccount.data = Buffer.alloc(36);
        programAccount.data.writeUInt32LE(2, 0);
        new PublicKey(programDataKey).toBuffer().copy(programAccount.data, 4);
        programAccount.executable = true;
        programAccount.owner = LOADER;
        accounts.delete(bufferKey);
        break;
      }
      case 3: {
        // Upgrade: [programData, program, buffer, spill, rent, clock,
        // authority]
        const [programDataKey, , bufferKey, spillKey] = keys;
        const authority = keys[6];
        const buffer = account(bufferKey);
        const programData = account(programDataKey);
        const fresh = Buffer.alloc(programData.data.length);
        writeProgramDataHeader(fresh, { slot: s, authority });
        buffer.data.subarray(BUFFER_HEADER).copy(fresh, PROGRAM_DATA_HEADER);
        programData.data = fresh;
        account(spillKey).lamports += buffer.lamports;
        accounts.delete(bufferKey);
        break;
      }
      case 6: {
        // ExtendProgram: [programData, program, system, payer]
        const additional = data.readUInt32LE(4);
        const programData = account(keys[0]);
        programData.data = Buffer.concat([
          programData.data,
          Buffer.alloc(additional),
        ]);
        break;
      }
      default:
        break;
    }
    return [];
  };

  const send = (wire: string): string => {
    const tx = VersionedTransaction.deserialize(Buffer.from(wire, "base64"));
    const signature = bs58.encode(tx.signatures[0]);
    if (landed.has(signature)) return signature;
    const message = tx.message;
    const keys = message.staticAccountKeys.map((k) => k.toBase58());
    const s = slot();
    const pre = keys.map((k) => accounts.get(k)?.lamports ?? 0);
    const fee = FEE * message.header.numRequiredSignatures;
    account(keys[0]).lamports -= fee;
    const logs: string[] = [];
    for (const ix of message.compiledInstructions) {
      const program = keys[ix.programIdIndex];
      const written = apply({
        program,
        keys: ix.accountKeyIndexes.map((i) => keys[i]),
        data: Buffer.from(ix.data),
        s,
      });
      logs.push(...written);
    }
    landed.set(signature, {
      slot: s,
      blockTime: blockTime(),
      fee,
      logs,
      accountKeys: keys,
      header: message.header,
      instructions: message.compiledInstructions.map((ix) => ({
        programIdIndex: ix.programIdIndex,
        accounts: ix.accountKeyIndexes,
        data: bs58.encode(ix.data),
      })),
      recentBlockhash: message.recentBlockhash,
      preBalances: pre,
      postBalances: keys.map((k) => accounts.get(k)?.lamports ?? 0),
    });
    for (const key of keys) touch(key, { signature, slot: s });
    return signature;
  };

  const encoded = (a: Account | undefined) =>
    a
      ? {
          data: [a.data.toString("base64"), "base64"],
          executable: a.executable,
          lamports: a.lamports,
          owner: a.owner,
          rentEpoch: 0,
          space: a.data.length,
        }
      : // eslint-disable-next-line unicorn/no-null -- JSON-RPC's "no account"
        null;

  const context = () => ({ slot: slot() });

  const answer = (
    method: string,
    params: unknown[]
  ): { result: unknown } | { error: { code: number; message: string } } => {
    switch (method) {
      case "getSlot":
      case "getBlockHeight":
        return { result: slot() };
      case "getBlockTime":
        return { result: blockTime() };
      case "getLatestBlockhash": {
        const s = slot();
        return {
          result: {
            context: { slot: s },
            value: { blockhash: blockhash(s), lastValidBlockHeight: s + 150 },
          },
        };
      }
      case "getBalance":
        return {
          result: {
            context: context(),
            value: accounts.get(params[0] as string)?.lamports ?? 0,
          },
        };
      case "getAccountInfo":
        return {
          result: {
            context: context(),
            value: encoded(accounts.get(params[0] as string)),
          },
        };
      case "getMultipleAccounts":
        return {
          result: {
            context: context(),
            value: (params[0] as string[]).map((k) => encoded(accounts.get(k))),
          },
        };
      case "getMinimumBalanceForRentExemption":
        return { result: rentFor(params[0] as number) };
      case "getRecentPrioritizationFees":
        return { result: [{ slot: slot(), prioritizationFee: 0 }] };
      case "getFeeForMessage":
        return { result: { context: context(), value: FEE } };
      case "simulateTransaction":
        return {
          result: {
            context: context(),
            // eslint-disable-next-line unicorn/no-null -- the simulation passed
            value: { err: null, logs: [], unitsConsumed: 1000, accounts: null },
          },
        };
      case "requestAirdrop": {
        if (fake.faucet === "refuse") {
          return {
            error: {
              code: -32603,
              message:
                "Internal error: airdrop request limit reached for today",
            },
          };
        }
        const [to, lamports] = params as [string, number];
        account(to).lamports += lamports;
        const signature = bs58.encode(
          createHash("sha512").update(`airdrop:${to}:${Date.now()}`).digest()
        );
        const s = slot();
        landed.set(signature, {
          slot: s,
          blockTime: blockTime(),
          fee: 0,
          logs: [],
          accountKeys: [to],
          header: {
            numRequiredSignatures: 0,
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0,
          },
          instructions: [],
          recentBlockhash: blockhash(s),
          preBalances: [],
          postBalances: [],
        });
        return { result: signature };
      }
      case "sendTransaction":
        return { result: send(params[0] as string) };
      case "getSignatureStatuses":
        return {
          result: {
            context: context(),
            value: (params[0] as string[]).map((sig) => {
              const tx = landed.get(sig);
              return tx
                ? {
                    slot: tx.slot,
                    // eslint-disable-next-line unicorn/no-null -- finalized
                    confirmations: null,
                    // eslint-disable-next-line unicorn/no-null -- it landed
                    err: null,
                    confirmationStatus: "finalized",
                  }
                : // eslint-disable-next-line unicorn/no-null -- not seen
                  null;
            }),
          },
        };
      case "getSignaturesForAddress":
        return {
          result: (touched.get(params[0] as string) ?? [])
            .slice()
            .reverse()
            .map((t) => ({
              signature: t.signature,
              slot: t.slot,
              // eslint-disable-next-line unicorn/no-null -- it landed
              err: null,
              // eslint-disable-next-line unicorn/no-null -- no memo
              memo: null,
              blockTime: landed.get(t.signature)?.blockTime ?? blockTime(),
              confirmationStatus: "finalized",
            })),
        };
      case "getTransaction": {
        const tx = landed.get(params[0] as string);
        if (!tx) {
          // eslint-disable-next-line unicorn/no-null -- not seen
          return { result: null };
        }
        return {
          result: {
            slot: tx.slot,
            blockTime: tx.blockTime,
            version: "legacy",
            meta: {
              // eslint-disable-next-line unicorn/no-null -- it landed
              err: null,
              fee: tx.fee,
              preBalances: tx.preBalances,
              postBalances: tx.postBalances,
              innerInstructions: [],
              logMessages: tx.logs,
              preTokenBalances: [],
              postTokenBalances: [],
              loadedAddresses: { writable: [], readonly: [] },
              computeUnitsConsumed: 1000,
            },
            transaction: {
              signatures: [params[0]],
              message: {
                accountKeys: tx.accountKeys,
                header: tx.header,
                instructions: tx.instructions,
                recentBlockhash: tx.recentBlockhash,
              },
            },
          },
        };
      }
      case "getVersion":
        return { result: { "solana-core": "2.1.0", "feature-set": 1 } };
      case "getGenesisHash":
        return { result: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG" };
      case "getHealth":
        return { result: "ok" };
      case "getEpochInfo": {
        const s = slot();
        return {
          result: {
            absoluteSlot: s,
            blockHeight: s,
            epoch: 1,
            slotIndex: s,
            slotsInEpoch: 432000,
            transactionCount: 0,
          },
        };
      }
      default:
        // eslint-disable-next-line unicorn/no-null -- a call the tutorial does not need
        return { result: null };
    }
  };

  await page.route(`${RPC}/**`, async (route: Route) => {
    const body = route.request().postDataJSON() as
      | { id: unknown; method: string; params?: unknown[] }
      | { id: unknown; method: string; params?: unknown[] }[]
      | null;
    if (!body) return route.fulfill({ status: 405, body: "" });
    const one = (b: { id: unknown; method: string; params?: unknown[] }) => {
      calls.push(b.method);
      const a = answer(b.method, b.params ?? []);
      return "error" in a
        ? { jsonrpc: "2.0", id: b.id, error: a.error }
        : { jsonrpc: "2.0", id: b.id, result: a.result };
    };
    const reply = Array.isArray(body) ? body.map(one) : one(body);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(reply),
    });
  });

  await page.routeWebSocket(`${WS}/**`, (ws: WebSocketRoute) => {
    let next = 1;
    ws.onMessage((raw) => {
      const message = JSON.parse(String(raw)) as {
        id?: number;
        method?: string;
        params?: unknown[];
      };
      if (message.id === undefined || !message.method) return;
      if (message.method.endsWith("Unsubscribe")) {
        ws.send(
          JSON.stringify({ jsonrpc: "2.0", result: true, id: message.id })
        );
        return;
      }
      const subscription = next++;
      ws.send(
        JSON.stringify({ jsonrpc: "2.0", result: subscription, id: message.id })
      );
      if (message.method === "signatureSubscribe") {
        const signature = (message.params ?? [])[0] as string;
        const tx = landed.get(signature);
        if (!tx) return;
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "signatureNotification",
            params: {
              subscription,
              // eslint-disable-next-line unicorn/no-null -- it landed
              result: { context: { slot: tx.slot }, value: { err: null } },
            },
          })
        );
      }
    });
  });

  return fake;
};

/** The program-data header: tag 3, the slot, Some(authority) */
const writeProgramDataHeader = (
  data: Buffer,
  { slot, authority }: { slot: number; authority: string }
) => {
  data.writeUInt32LE(3, 0);
  data.writeBigUInt64LE(BigInt(slot), 4);
  data[12] = 1;
  new PublicKey(authority).toBuffer().copy(data, 13);
};

/**
 * What Hello Anchor's `hello` logs: "Hello, World!" with no argument, and
 * "Hello, <name>!" once step 4 gives it a borsh string
 */
const helloLog = (args: Buffer): string => {
  if (args.length < 4) return "Hello, World!";
  const length = args.readUInt32LE(0);
  return `Hello, ${args.subarray(4, 4 + length).toString("utf8")}!`;
};
