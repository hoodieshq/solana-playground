// @vitest-environment node
// A file of its own: `./settings`, `./connection` and `./wallet` need the build's globals, so they are mocked
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PgCommon } from "./common";
import { PgTx } from "./tx";
import { PgWeb3 } from "./web3";

vi.mock("./settings", () => ({
  PgSettings: { connection: { preflightChecks: true, priorityFee: 0 } },
}));
vi.mock("./connection", () => ({ PgConnection: {} }));
vi.mock("./wallet", () => ({ PgWallet: {} }));

const payer = PgWeb3.Keypair.generate();
/** A Playground wallet as `PgTx` uses one: its key and its signer */
const wallet = {
  publicKey: payer.publicKey,
  signTransaction: async (tx: PgWeb3.Transaction) => {
    tx.partialSign(payer);
    return tx;
  },
} as never;

/** A connection whose sends answer `answers` in order, then a signature */
const connectionAnswering = (answers: string[]) => {
  const blockhashes = { fetched: 0 };
  const connection = {
    rpcEndpoint: "https://rpc.test/?api-key=secret",
    getLatestBlockhash: async () => {
      blockhashes.fetched++;
      return { blockhash: PgWeb3.Keypair.generate().publicKey.toBase58() };
    },
    sendRawTransaction: vi.fn(async () => {
      const answer = answers.shift();
      if (answer) throw new Error(answer);
      return "sig";
    }),
  };
  return { connection, blockhashes };
};

const ix = PgWeb3.SystemProgram.transfer({
  fromPubkey: payer.publicKey,
  toPubkey: payer.publicKey,
  lamports: 1,
});

describe("utils/tx", () => {
  beforeEach(() => {
    // The blockhash is cached on the class between tests
    Object.assign(PgTx, { blockhash: undefined });
    // The send event goes to `document`, which the node environment has none of
    vi.spyOn(PgCommon, "createAndDispatchCustomEvent").mockReturnValue(
      undefined as never
    );
  });

  it("sends again with a fresh blockhash after Blockhash not found, and returns the signature", async () => {
    const { connection, blockhashes } = connectionAnswering([
      "Transaction simulation failed: Blockhash not found",
      "This transaction has already been processed",
    ]);

    const signature = await PgTx.send(ix, {
      wallet,
      connection: connection as never,
    });

    expect(signature).toBe("sig");
    expect(connection.sendRawTransaction).toHaveBeenCalledTimes(3);
    expect(blockhashes.fetched).toBe(3);
  });

  it("throws Blockhash not found once three sends with a fresh blockhash answered it too", async () => {
    const { connection } = connectionAnswering(
      new Array(10).fill("Transaction simulation failed: Blockhash not found")
    );

    await expect(
      PgTx.send(ix, { wallet, connection: connection as never })
    ).rejects.toThrow("Blockhash not found");
    expect(connection.sendRawTransaction).toHaveBeenCalledTimes(4);
  });

  it("gives the transaction's own signature once three sends with a fresh blockhash were already processed", async () => {
    const { connection } = connectionAnswering(
      new Array(10).fill("This transaction has already been processed")
    );

    const signature = await PgTx.send(ix, {
      wallet,
      connection: connection as never,
    });

    // The cluster has the transaction: the caller confirms it by this signature
    expect(signature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/);
    expect(connection.sendRawTransaction).toHaveBeenCalledTimes(4);
  });

  it("throws any other refusal at once", async () => {
    const { connection } = connectionAnswering([
      "Transaction simulation failed: Insufficient funds for fee",
    ]);

    await expect(
      PgTx.send(ix, { wallet, connection: connection as never })
    ).rejects.toThrow("Insufficient funds for fee");
    expect(connection.sendRawTransaction).toHaveBeenCalledTimes(1);
  });
});
