/**
 * One transaction a run handed to the chain: the signature the RPC
 * answered, or the refusal it threw (the preflight's simulation failed, or
 * the send itself did), with the wire transaction either way so its
 * instructions can be decoded.
 */
export type Captured =
  | { kind: "sent"; signature: string; encoded: string }
  | { kind: "refused"; encoded: string; message: string; log: string[] };

/** What the hook wraps: web3.js's `Connection.prototype` */
export interface Sender {
  sendEncodedTransaction(encoded: string, options?: unknown): Promise<string>;
}

/** The RPC's reason and the simulation's log, from web3.js's `SendTransactionError` */
const refusalOf = (e: unknown) => {
  const err = e as { transactionMessage?: unknown; transactionLogs?: unknown };
  const message =
    typeof err?.transactionMessage === "string"
      ? err.transactionMessage
      : e instanceof Error
      ? e.message
      : String(e);
  const log = Array.isArray(err?.transactionLogs)
    ? err.transactionLogs.filter((l): l is string => typeof l === "string")
    : [];
  return { message, log };
};

/**
 * Runs `fn` with every transaction sent through `target` (the Connection
 * prototype, so a client's own `new Connection` is seen too) recorded in
 * order, and puts the send back when `fn` settles, thrown or not. Every send
 * goes through `sendEncodedTransaction`: `sendTransaction` and
 * `sendRawTransaction` call it. The send itself is untouched: its answer and
 * its throw reach the caller as before.
 */
export const captureSends = async <T>(
  target: Sender,
  fn: () => Promise<T>
): Promise<{ value: T | undefined; error: unknown; captured: Captured[] }> => {
  const captured: Captured[] = [];
  const own = Object.prototype.hasOwnProperty.call(
    target,
    "sendEncodedTransaction"
  );
  const original = target.sendEncodedTransaction;
  target.sendEncodedTransaction = async function (
    this: Sender,
    encoded: string,
    options?: unknown
  ) {
    try {
      const signature = await original.call(this, encoded, options);
      captured.push({ kind: "sent", signature, encoded });
      return signature;
    } catch (e) {
      captured.push({ kind: "refused", encoded, ...refusalOf(e) });
      throw e;
    }
  };
  try {
    return { value: await fn(), error: undefined, captured };
  } catch (error) {
    return { value: undefined, error, captured };
  } finally {
    if (own) target.sendEncodedTransaction = original;
    else delete (target as Partial<Sender>).sendEncodedTransaction;
  }
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("features/tutorial-conversation/model/runners/capture", () => {
    /** A prototype whose send answers `sig:<tx>`, or throws for "bad" */
    class FakeConnection {
      async sendEncodedTransaction(encoded: string): Promise<string> {
        if (encoded === "bad") {
          throw Object.assign(new Error("Simulation failed."), {
            transactionMessage: "custom program error: 0x1770",
            transactionLogs: ["Program log: no"],
          });
        }
        return `sig:${encoded}`;
      }
    }

    it("records each send in order, and the caller still gets its signature", async () => {
      const conn = new FakeConnection();
      const { value, captured } = await captureSends(
        FakeConnection.prototype,
        async () => [
          await conn.sendEncodedTransaction("a"),
          await conn.sendEncodedTransaction("b"),
        ]
      );
      expect(value).toEqual(["sig:a", "sig:b"]);
      expect(captured).toEqual([
        { kind: "sent", signature: "sig:a", encoded: "a" },
        { kind: "sent", signature: "sig:b", encoded: "b" },
      ]);
    });

    it("records a refused send with its reason and log, and lets the throw through", async () => {
      const conn = new FakeConnection();
      const { error, captured } = await captureSends(
        FakeConnection.prototype,
        () => conn.sendEncodedTransaction("bad")
      );
      expect(error).toBeInstanceOf(Error);
      expect(captured).toEqual([
        {
          kind: "refused",
          encoded: "bad",
          message: "custom program error: 0x1770",
          log: ["Program log: no"],
        },
      ]);
    });

    it("puts the send back after the run, so a later send is not recorded", async () => {
      const before = FakeConnection.prototype.sendEncodedTransaction;
      const { captured } = await captureSends(
        FakeConnection.prototype,
        async () => {
          throw new Error("the script broke");
        }
      );
      expect(FakeConnection.prototype.sendEncodedTransaction).toBe(before);
      await new FakeConnection().sendEncodedTransaction("later");
      expect(captured).toEqual([]);
    });

    it("restores an instance's own send without leaving the wrapper behind", async () => {
      const conn = new FakeConnection();
      await captureSends(conn, async () => conn.sendEncodedTransaction("x"));
      expect(
        Object.prototype.hasOwnProperty.call(conn, "sendEncodedTransaction")
      ).toBe(false);
    });
  });
}
