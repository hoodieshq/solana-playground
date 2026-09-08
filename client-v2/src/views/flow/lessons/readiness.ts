import type { VerifyCondition } from "./types";
import type { StageStatus } from "../state/stage";

/**
 * Preconditions explain, they do not fail (the ledger spec).
 *
 * What a step's proving action needs before it can succeed, read off
 * state the client already holds. Pure and synchronous like `verify.ts`,
 * so the band can ask on every render. The action itself stays live --
 * a dead control in a demo is worse than a label that explains itself
 * -- and each blocker carries the remedy the band offers beside it.
 */

export type Blocker =
  /** No successful build to deploy */
  | { kind: "needs-build" }
  /** No wallet to sign with */
  | { kind: "needs-wallet" }
  /** The lesson deploys to devnet and the client points elsewhere;
   * `cluster` is the current name, or `null` when it is unknown */
  | { kind: "needs-cluster"; cluster: string | null }
  /**
   * The wallet holds nothing. The devnet airdrop is behind GitHub
   * sign-in (#9), so the remedy is a chain when the learner is signed
   * out -- the explainer has to state all of it or it becomes the next
   * unlabelled click, one level down.
   */
  | { kind: "needs-sol"; signedIn: boolean };

export interface ReadinessEnv {
  build: StageStatus;
  wallet: boolean;
  /** SOL, or `null` while unknown -- never guessed about */
  balance: number | null;
  /** The cluster's name (`devnet`, `localnet`, ...) or `null` */
  cluster: string | null;
  signedIn: boolean;
}

/** The cluster every lesson path deploys to */
export const LESSON_CLUSTER = "devnet";

/**
 * @returns what stands between the learner and the step's proving
 * action, in the order to fix it; empty when nothing does
 */
export const readiness = (c: VerifyCondition, env: ReadinessEnv): Blocker[] => {
  switch (c.kind) {
    // A build is its own feedback: a failed one says why in the console,
    // and a reading has nothing to be ready for
    case "build-passes":
    case "idl":
    case "read":
      return [];

    case "deployed": {
      const blockers: Blocker[] = [];
      if (env.build !== "done") blockers.push({ kind: "needs-build" });
      if (!env.wallet) blockers.push({ kind: "needs-wallet" });
      if (env.cluster !== LESSON_CLUSTER) {
        blockers.push({ kind: "needs-cluster", cluster: env.cluster });
      }
      // Only a wallet known to be empty. A low balance is the deploy
      // command's call: it knows the real cost and already offers the
      // airdrop with that number in hand.
      if (env.wallet && env.balance === 0) {
        blockers.push({ kind: "needs-sol", signedIn: env.signedIn });
      }
      return blockers;
    }
  }
};

export interface ReadinessItem {
  blocker: Blocker;
  text: string;
}

/**
 * The explainer's copy: a lead and one item per blocker, each naming its
 * remedy in the learner's words. `null` when the list is empty, so the
 * band renders nothing rather than an empty lead.
 */
export const readinessLine = (
  blockers: Blocker[]
): { lead: string; items: ReadinessItem[] } | null => {
  if (!blockers.length) return null;
  return {
    lead: "Before you can deploy:",
    items: blockers.map((blocker) => ({ blocker, text: itemText(blocker) })),
  };
};

const itemText = (b: Blocker): string => {
  switch (b.kind) {
    case "needs-build":
      return "build first";
    case "needs-wallet":
      return "connect a wallet";
    case "needs-cluster":
      return b.cluster
        ? `switch from ${b.cluster} to ${LESSON_CLUSTER}`
        : `switch to ${LESSON_CLUSTER}`;
    case "needs-sol":
      return b.signedIn
        ? "airdrop -- the wallet holds no SOL"
        : "sign in, then airdrop -- the wallet holds no SOL";
  }
};
