import type { SignInState } from "@/features/auth";
import type { ClusterStatus } from "./use-cluster-status";

/** What a user can pick in the account menu (and the row's Cancel), for telemetry */
export type AccountItem =
  | "sign-in"
  | "cancel-sign-in"
  | "github-profile"
  | "sign-out"
  | "settings"
  | "docs"
  | "cluster-down"
  | "connect-wallet"
  | "wallet"
  | "disconnect-wallet";

export interface AccountUser {
  name: string | null;
  login: string | null;
  image: string | null;
}

export interface AccountWallet {
  /** Base58 */
  address: string;
  /** In SOL; `null` until it has loaded */
  balance: number | null;
}

/** Everything the footer, the rail and the menu draw */
export interface AccountView {
  user: AccountUser | null;
  signIn: SignInState;
  wallet: AccountWallet | null;
  cluster: ClusterStatus;
  /** A feedback send is in flight behind a closed form */
  sending: boolean;
}

/** One line under the account's name, and how it reads */
export interface AccountLine {
  text: string;
  tone: "muted" | "error";
}

export const DOCS_URL = "https://solana.com/docs";

export const githubProfileUrl = (login: string) =>
  `https://github.com/${login}`;

export const shortAddress = (address: string) =>
  `${address.slice(0, 4)}…${address.slice(-4)}`;

export const formatBalance = (balance: number | null) =>
  balance === null ? "…" : `${balance.toFixed(2)} SOL`;

const displayName = (user: AccountUser) => user.login ?? user.name ?? "Account";

/** The account controls' name: the visible text alone would not say what they open */
export const accountLabel = ({ user }: AccountView) =>
  user ? `Account: ${displayName(user)}` : "Account, signed out";

/** The account row's name, and the line under it: a sign-in under way or failed wins over the wallet */
export const accountLines = (
  view: AccountView
): { primary: string; secondary: AccountLine | null } => {
  const primary = view.user ? displayName(view.user) : "Sign in";
  if (view.signIn.status === "pending") {
    return { primary, secondary: { text: "Signing in...", tone: "muted" } };
  }
  if (view.signIn.status === "failed") {
    return { primary, secondary: { text: "Couldn't sign in", tone: "error" } };
  }
  if (view.wallet) {
    const { address, balance } = view.wallet;
    return {
      primary,
      secondary: {
        text: `${shortAddress(address)} · ${formatBalance(balance)}`,
        tone: "muted",
      },
    };
  }
  return { primary, secondary: null };
};

/** Named, not only coloured, so a screen reader hears a cluster that is down */
export const clusterLabel = (
  cluster: ClusterStatus,
  prefix: "Cluster: " | "Change cluster, currently "
) => `${prefix}${cluster.name}${cluster.down ? ", down" : ""}`;
