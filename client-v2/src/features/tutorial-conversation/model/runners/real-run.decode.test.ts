// @vitest-environment node
import type { Idl } from "@coral-xyz/anchor";
import { BorshInstructionCoder } from "@coral-xyz/anchor";
import * as web3 from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A run that landed, decoded by the IDL the step holds: the real port and
// `runOrCall`, with devnet and the editor's runner stubbed out. The utils
// barrel needs build-time globals the unit runner does not define
const chain = vi.hoisted(() => ({
  programId: "",
  wallet: "",
  encoded: "",
  storedIdl: undefined as unknown,
}));

vi.mock("../../../../utils", async () => {
  const real = await import("@solana/web3.js");
  return {
    PgCommand: { run: { execute: vi.fn() } },
    PgConnection: {
      cluster: "devnet",
      current: {
        rpcEndpoint: "https://api.devnet.solana.com",
        getTransaction: vi.fn(async () => ({
          meta: {
            logMessages: ["Program log: Hello, World!"],
            err: null,
            computeUnitsConsumed: 1000,
            fee: 5000,
          },
          transaction: {
            message: {
              getAccountKeys: () => ({
                get: () => new real.PublicKey(chain.wallet),
              }),
            },
          },
        })),
        getAccountInfo: vi.fn(async () => null),
      },
    },
    PgExplorer: { currentWorkspaceName: undefined },
    PgProgramInfo: {
      callableIdl: () => chain.storedIdl,
      get pk() {
        return new real.PublicKey(chain.programId);
      },
      update: vi.fn(),
    },
    PgTerminal: { println: vi.fn() },
    PgTx: { confirm: vi.fn() },
    PgWallet: {
      get current() {
        return { publicKey: new real.PublicKey(chain.wallet) };
      },
    },
    PgWeb3: real,
  };
});
// A run sends through client.ts, never the Call panel's interaction
vi.mock("../../../../utils/program-interaction/instruction", () => ({
  createGeneratableInstruction: vi.fn(),
}));
// What client.ts sent: one transaction, landed
vi.mock("./capture", async (importOriginal) => ({
  isRetriedSend: (await importOriginal<typeof import("./capture")>())
    .isRetriedSend,
  captureSends: async () => ({
    error: undefined,
    captured: [{ kind: "sent", signature: "sig", encoded: chain.encoded }],
  }),
}));

import type { Goal } from "@/entities/tutorial";

import { whyRefused } from "../view";
import type { FundingChain } from "./fund";
import { realRunPort } from "./real-run";
import { MISMATCH, runOrCall } from "./run-call";

const programId = web3.Keypair.generate().publicKey;
const wallet = web3.Keypair.generate().publicKey;

// The program as deployed: Hello Anchor's `hello` instruction
const DEPLOYED: Idl = {
  address: programId.toBase58(),
  metadata: { name: "hello_anchor", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    {
      name: "hello",
      discriminator: [149, 118, 59, 220, 196, 127, 161, 179],
      accounts: [],
      args: [],
    },
  ],
};
// An IDL from before the program gained `hello`
const STALE: Idl = {
  address: programId.toBase58(),
  metadata: { name: "hello_anchor", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    {
      name: "initialize",
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237],
      accounts: [],
      args: [],
    },
  ],
};
// What an Anchor 1.1.2 build leaves stored
const EMPTY: Idl = {
  address: programId.toBase58(),
  metadata: { name: "hello_anchor", version: "0.1.0", spec: "0.1.0" },
  instructions: [],
};

const CALL_HELLO: Goal = {
  kind: "call",
  instruction: "hello",
  log: "Hello, World!",
};

const helloTx = (): string => {
  const data = new BorshInstructionCoder(DEPLOYED).encode("hello", {});
  const message = new web3.TransactionMessage({
    payerKey: wallet,
    recentBlockhash: web3.Keypair.generate().publicKey.toBase58(),
    instructions: [
      new web3.TransactionInstruction({
        programId,
        keys: [],
        data: Buffer.from(Uint8Array.from(data)),
      }),
    ],
  }).compileToV0Message();
  return Buffer.from(
    new web3.VersionedTransaction(message).serialize()
  ).toString("base64");
};

const funding = { balance: async () => 1e12 } as unknown as FundingChain;

const runWith = (idl: Idl | undefined) =>
  runOrCall(
    realRunPort(funding, 1),
    "run",
    { beatId: "s3.run", idl, log: "Hello, World!" },
    () => undefined
  );

describe("realRunPort's decode of a landed run", () => {
  beforeEach(() => {
    chain.programId = programId.toBase58();
    chain.wallet = wallet.toBase58();
    chain.encoded = helloTx();
    chain.storedIdl = undefined;
  });

  it("counts a landed call its IDL decodes", async () => {
    const result = await runWith(DEPLOYED);
    expect(result).toMatchObject({
      ok: true,
      called: [{ instruction: "hello" }],
    });
    expect(result).not.toHaveProperty("undecoded");
  });

  it("asks for a rebuild when the IDL is older than the program", async () => {
    const result = await runWith(STALE);
    expect(result).toMatchObject({ ok: true, called: [], undecoded: true });
    expect(whyRefused(CALL_HELLO, result)).toBe(MISMATCH);
  });

  it("asks for a rebuild when the IDL has no instructions", async () => {
    const result = await runWith(EMPTY);
    expect(result).toMatchObject({ ok: true, called: [], undecoded: true });
    expect(whyRefused(CALL_HELLO, result)).toBe(MISMATCH);
  });

  it("asks for a rebuild when there is no IDL at all", async () => {
    const result = await runWith(undefined);
    expect(result).toMatchObject({ ok: true, called: [], undecoded: true });
    expect(whyRefused(CALL_HELLO, result)).toBe(MISMATCH);
  });
});
