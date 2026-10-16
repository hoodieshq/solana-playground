import { describe, expect, it } from "vitest";

import {
  accountLabel,
  accountLines,
  clusterLabel,
  formatBalance,
  shortAddress,
} from "./account";
import type { AccountView } from "./account";

const UP = { name: "devnet", down: false };
const IDLE = { status: "idle" } as const;

/** Every field named: an explicit copy, not a spread over a base */
const view = (fields: Partial<AccountView>): AccountView => ({
  user: fields.user ?? null,
  signIn: fields.signIn ?? IDLE,
  wallet: fields.wallet ?? null,
  cluster: fields.cluster ?? UP,
  sending: fields.sending ?? false,
});

const TESTER = { name: "Tester", login: "t", image: null };
const NAME_ONLY = { name: "Tester", login: null, image: null };
const WALLET = {
  address: "7Hq5aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaXk2P",
  balance: 2.4,
};

describe("accountLabel", () => {
  it("names the login, then the name, then says signed out", () => {
    expect(accountLabel(view({ user: TESTER }))).toBe("Account: t");
    expect(accountLabel(view({ user: NAME_ONLY }))).toBe("Account: Tester");
    expect(accountLabel(view({}))).toBe("Account, signed out");
  });
});

describe("accountLines", () => {
  it("asks to sign in with nothing under it", () => {
    expect(accountLines(view({}))).toEqual({
      primary: "Sign in",
      secondary: null,
    });
  });

  it("says a sign-in is under way", () => {
    expect(accountLines(view({ signIn: { status: "pending" } }))).toEqual({
      primary: "Sign in",
      secondary: { text: "Signing in...", tone: "muted" },
    });
  });

  it("says a sign-in failed, in the error tone", () => {
    expect(
      accountLines(
        view({ signIn: { status: "failed", message: "Sign-in cancelled." } })
      )
    ).toEqual({
      primary: "Sign in",
      secondary: { text: "Couldn't sign in", tone: "error" },
    });
  });

  it("shows the login and the wallet once signed in", () => {
    expect(accountLines(view({ user: TESTER, wallet: WALLET }))).toEqual({
      primary: "t",
      secondary: { text: "7Hq5…Xk2P · 2.40 SOL", tone: "muted" },
    });
  });

  it("falls back to the name for an account with no login", () => {
    expect(accountLines(view({ user: NAME_ONLY })).primary).toBe("Tester");
  });

  it("shows a wallet while signed out too", () => {
    expect(accountLines(view({ wallet: WALLET })).secondary?.text).toBe(
      "7Hq5…Xk2P · 2.40 SOL"
    );
  });
});

describe("formatBalance", () => {
  it("waits with an ellipsis rather than claiming zero", () => {
    expect(formatBalance(null)).toBe("…");
    expect(formatBalance(0)).toBe("0.00 SOL");
  });
});

describe("shortAddress", () => {
  it("keeps four characters at each end", () => {
    expect(shortAddress(WALLET.address)).toBe("7Hq5…Xk2P");
  });
});

describe("clusterLabel", () => {
  it("says down in words, not by colour alone", () => {
    expect(clusterLabel(UP, "Cluster: ")).toBe("Cluster: devnet");
    expect(
      clusterLabel({ name: "devnet", down: true }, "Change cluster, currently ")
    ).toBe("Change cluster, currently devnet, down");
  });
});
