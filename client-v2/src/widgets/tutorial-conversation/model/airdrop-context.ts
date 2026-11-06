/* eslint-disable unicorn/no-null -- tutorial flow v2 predates this rule; cleanup tracked from SF#94 */
import type { Turn } from "@/features/tutorial-conversation";
import { shortAddress } from "@/shared/lib/short-address";

/** The live airdrop card's line when the browser has no wallet yet */
export const NEW_WALLET = "A new Playground wallet, made in this browser";

/** The wallet as the airdrop card reads it; `balance` in SOL, null until read */
export interface AirdropWallet {
  address: string;
  balance: number | null;
}

/**
 * The live airdrop card's context line, from the wallet (HOO-2677):
 * "{short address} · {balance} SOL", or `NEW_WALLET` when the browser holds
 * no wallet, which the press makes. Null while the balance is not read yet,
 * or while a wallet the browser holds is not the current one: the
 * definition's own context stands in.
 */
export const airdropContextOf = (
  wallet: AirdropWallet | null,
  hasAccounts: boolean
): string | null => {
  if (!wallet) return hasAccounts ? null : NEW_WALLET;
  if (wallet.balance === null) return null;
  return `${shortAddress(wallet.address)} · ${+wallet.balance.toFixed(2)} SOL`;
};

/**
 * The turn as the feed draws it: a live airdrop card with the wallet's line.
 * Its Try again card keeps its own line ("Asks the faucet again"), and every
 * other turn is returned as it is.
 */
export const withAirdropContext = (turn: Turn, line: string | null): Turn => {
  if (
    line === null ||
    turn.kind !== "act" ||
    turn.act.act !== "airdrop" ||
    turn.state !== "live" ||
    turn.id !== turn.beatId
  ) {
    return turn;
  }
  return { ...turn, act: { ...turn.act, context: line } };
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const ADDRESS = "7Hq5mZ3vN2pQ8rT4wY6xL1cB9dF0gJ5kS3aV7eU2Xk2P";

  /** Hello Anchor's live airdrop card, with its id and state as given */
  const card = (id: string, state: "live" | "done"): Turn => ({
    id,
    kind: "act",
    step: "deploy",
    at: 1,
    whole: true,
    beatId: "s2.airdrop",
    act: {
      kind: "act",
      id: "s2.airdrop",
      act: "airdrop",
      title: "Get devnet SOL",
      context: "From the devnet faucet · free test SOL",
      button: "Request airdrop",
    },
    state,
    presses: [],
    note: null,
    stage: null,
    took: null,
  });

  describe("widgets/tutorial-conversation/model/airdrop-context", () => {
    it("reads the wallet's short address and balance", () => {
      expect(airdropContextOf({ address: ADDRESS, balance: 3.2 }, true)).toBe(
        "7Hq5…Xk2P · 3.2 SOL"
      );
      expect(airdropContextOf({ address: ADDRESS, balance: 0 }, true)).toBe(
        "7Hq5…Xk2P · 0 SOL"
      );
    });

    it("names the wallet the press will make when the browser has none", () => {
      expect(airdropContextOf(null, false)).toBe(NEW_WALLET);
    });

    it("leaves the definition's line while the balance or the wallet is unknown", () => {
      expect(airdropContextOf({ address: ADDRESS, balance: null }, true)).toBe(
        null
      );
      expect(airdropContextOf(null, true)).toBeNull();
    });

    it("puts the line on the live airdrop card only", () => {
      const line = "7Hq5…Xk2P · 3.2 SOL";
      expect(
        withAirdropContext(card("s2.airdrop", "live"), line)
      ).toMatchObject({ act: { context: line } });
      const done = card("s2.airdrop", "done");
      expect(withAirdropContext(done, line)).toBe(done);
      const retry = card("s2.airdrop:retry", "live");
      expect(withAirdropContext(retry, line)).toBe(retry);
      const unknown = card("s2.airdrop", "live");
      expect(withAirdropContext(unknown, null)).toBe(unknown);
    });
  });
}
