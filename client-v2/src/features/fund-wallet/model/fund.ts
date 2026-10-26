/** A Playground account that can receive SOL, as the dialog names it */
export interface Receiver {
  name: string;
  /** Base58 */
  address: string;
}

/** What the receiver is chosen from: the current wallet and the first account */
export interface ReceiverSource {
  current: { isPg?: boolean; name: string; address: string } | null;
  firstAccount: Receiver | null;
}

/** Why an amount cannot be sent */
export type AmountProblem = "not-a-number" | "not-positive" | "too-precise";

export type ParsedAmount =
  | { ok: true; sol: number; lamports: number }
  | { ok: false; problem: AmountProblem };

export type SendCheck =
  | { ok: true; lamports: number }
  | { ok: false; problem: AmountProblem | "checking" | "above-balance" };

/** Why connecting or sending failed, for the user and for telemetry */
export type FailureReason = "rejected" | "network" | "unknown";

export const LAMPORTS_PER_SOL = 1_000_000_000;

/** What the paying wallet keeps for the transfer's fee */
export const FEE_RESERVE_SOL = 0.001;

/** The amount the dialog starts at, in SOL */
export const DEFAULT_AMOUNT = "1";

/**
 * The account `deploy` pays from: the current wallet when it is a Playground
 * account, else the first account (`processDeploy` in `commands/deploy`)
 */
export const receiverOf = ({
  current,
  firstAccount,
}: ReceiverSource): Receiver | null => {
  if (current?.isPg) return { name: current.name, address: current.address };
  return firstAccount;
};

/** Digits, an optional point and up to any decimals; no sign, comma or exponent */
const DECIMAL = /^(\d+)(?:\.(\d+))?$/;

/** SOL in, lamports out, counted on the digits so `0.1` is not `0.1000000000000000055` */
export const parseAmount = (text: string): ParsedAmount => {
  const match = DECIMAL.exec(text.trim());
  if (!match) return { ok: false, problem: "not-a-number" };
  const [, whole, fraction = ""] = match;
  if (fraction.length > 9) return { ok: false, problem: "too-precise" };
  const lamports =
    Number(whole) * LAMPORTS_PER_SOL + Number(fraction.padEnd(9, "0"));
  if (lamports === 0) return { ok: false, problem: "not-positive" };
  return { ok: true, sol: lamports / LAMPORTS_PER_SOL, lamports };
};

/**
 * Whether `text` can go from a wallet holding `balance` SOL (`null` while it
 * loads), keeping `FEE_RESERVE_SOL` for the fee
 */
export const canSend = (text: string, balance: number | null): SendCheck => {
  const amount = parseAmount(text);
  if (!amount.ok) return amount;
  if (balance === null) return { ok: false, problem: "checking" };
  const spendable = Math.round((balance - FEE_RESERVE_SOL) * LAMPORTS_PER_SOL);
  if (amount.lamports > spendable)
    return { ok: false, problem: "above-balance" };
  return { ok: true, lamports: amount.lamports };
};

/** How wallets word a user's "no": Phantom, Solflare, Backpack, WalletConnect */
const REJECTION = /reject|denied|declin|cancel/i;

/** EIP-1193's "user rejected", which several Solana wallets reuse */
const USER_REJECTED_CODE = 4001;

const NETWORK = /failed to (fetch|send)|network|timed? ?out|blockhash/i;

export const classify = (error: unknown): FailureReason => {
  if (!(error instanceof Error)) return "unknown";
  const code = (error as { code?: unknown }).code;
  if (code === USER_REJECTED_CODE || REJECTION.test(error.message)) {
    return "rejected";
  }
  if (error.name === "SendTransactionError" || NETWORK.test(error.message)) {
    return "network";
  }
  return "unknown";
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("features/fund-wallet/model/fund", () => {
    const WALLET_1 = { name: "Wallet 1", address: "AAAA1111" };
    const WALLET_2 = { isPg: true, name: "Wallet 2", address: "BBBB2222" };
    const PHANTOM = { isPg: false, name: "Phantom", address: "CCCC3333" };

    it("receiverOf picks the current Playground wallet", () => {
      expect(receiverOf({ current: WALLET_2, firstAccount: WALLET_1 })).toEqual(
        { name: "Wallet 2", address: "BBBB2222" }
      );
    });

    it("receiverOf picks the first account when an extension is current", () => {
      expect(receiverOf({ current: PHANTOM, firstAccount: WALLET_1 })).toEqual(
        WALLET_1
      );
    });

    it("receiverOf picks the first account when nothing is current", () => {
      expect(receiverOf({ current: null, firstAccount: WALLET_1 })).toEqual(
        WALLET_1
      );
    });

    it("receiverOf is null before the Playground wallet is set up", () => {
      expect(receiverOf({ current: null, firstAccount: null })).toBeNull();
    });

    it.each([
      ["1", 1, 1_000_000_000],
      ["0.5", 0.5, 500_000_000],
      [" 2 ", 2, 2_000_000_000],
      ["0.000000001", 0.000000001, 1],
    ])("parseAmount accepts %j", (text, sol, lamports) => {
      expect(parseAmount(text)).toEqual({ ok: true, sol, lamports });
    });

    it.each([
      ["abc", "not-a-number"],
      ["", "not-a-number"],
      ["0,5", "not-a-number"],
      ["1e3", "not-a-number"],
      ["0", "not-positive"],
      ["-1", "not-a-number"],
      ["0.0000000001", "too-precise"],
    ])("parseAmount rejects %j as %s", (text, problem) => {
      expect(parseAmount(text)).toEqual({ ok: false, problem });
    });

    it("canSend is checking while the balance is unknown", () => {
      expect(canSend("1", null)).toEqual({ ok: false, problem: "checking" });
    });

    it("canSend keeps 0.001 SOL of the balance for fees", () => {
      expect(canSend("0.999", 1)).toEqual({ ok: true, lamports: 999_000_000 });
      expect(canSend("0.9991", 1)).toEqual({
        ok: false,
        problem: "above-balance",
      });
    });

    it("canSend reports the amount's own problem first", () => {
      expect(canSend("abc", null)).toEqual({
        ok: false,
        problem: "not-a-number",
      });
    });

    it.each([
      ["User rejected the request.", "rejected"],
      ["Transaction cancelled", "rejected"],
      ["Approval Denied", "rejected"],
      ["The user declined", "rejected"],
    ])("classify reads %j as a rejection", (message, reason) => {
      expect(classify(new Error(message))).toBe(reason);
    });

    it("classify reads a 4001 code as a rejection", () => {
      expect(classify(Object.assign(new Error("x"), { code: 4001 }))).toBe(
        "rejected"
      );
    });

    it("classify reads a send or fetch failure as network", () => {
      const send = Object.assign(new Error("failed to send transaction"), {
        name: "SendTransactionError",
      });
      expect(classify(send)).toBe("network");
      expect(classify(new TypeError("Failed to fetch"))).toBe("network");
    });

    it("classify reads anything else as unknown", () => {
      expect(classify(new Error("boom"))).toBe("unknown");
      expect(classify("not an error")).toBe("unknown");
    });
  });
}
