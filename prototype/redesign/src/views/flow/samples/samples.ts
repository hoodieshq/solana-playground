import type { TupleFiles } from "../../../utils/explorer/types";

/** A sample project: a small, complete Anchor program, a client and tests */
export interface Sample {
  /** Workspace name, as the Projects list shows it */
  name: string;
  /** What it demonstrates, in a line */
  description: string;
  /** Its files. Loaded on demand, the way a framework's default files are */
  getFiles: () => Promise<TupleFiles>;
}

const files = () => import("./files");

/** In the order they are added, which is the order the Projects list shows */
export const SAMPLES: readonly Sample[] = [
  {
    name: "Counter",
    description:
      "A counter per wallet, kept at a PDA: initialize it, then increment it.",
    getFiles: () => files().then((f) => f.counter),
  },
  {
    name: "Token Faucet",
    description:
      "Mints a capped amount of an SPL token to whoever asks, via anchor_spl.",
    getFiles: () => files().then((f) => f.tokenFaucet),
  },
  {
    name: "Voting",
    description:
      "Polls with one vote per wallet, enforced by a PDA vote receipt.",
    getFiles: () => files().then((f) => f.voting),
  },
  {
    name: "Tip Jar",
    description:
      "SOL tips go into a creator's PDA jar, and only the creator can withdraw.",
    getFiles: () => files().then((f) => f.tipJar),
  },
];
