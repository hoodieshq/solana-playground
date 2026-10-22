import type { Stage } from "../state/stage";

/**
 * What proves a step is finished. Every variant is answered from state
 * the client already holds -- no network call, no hand-written checker.
 * See the spec's "the grader" section.
 */
export type VerifyCondition =
  /** The last build succeeded */
  | { kind: "build-passes" }
  /** The program reached devnet */
  | { kind: "deployed" }
  /**
   * The IDL an Anchor build regenerates carries this shape. A real
   * artifact of the learner's own code, and free to check.
   */
  | { kind: "idl"; instruction: string; arg?: string; account?: string }
  /** Nothing free proves this one; the learner continues by hand */
  | { kind: "read" };

/** The three rungs of the hint ladder, coarse to specific */
export type Hints = [question: string, locate: string, propose: string];

export interface LessonStep {
  /** Stable across edits: it is the progress storage key */
  id: string;
  /** The single ask, one action */
  objective: string;
  /** What proves it, in the learner's own words */
  verifiedBy: string;
  /** The machine-checkable form of `verifiedBy` */
  verify: VerifyCondition;
  /** Which stage the stepper rings while this step is current */
  target: Stage;
  /**
   * Full prose for the reader overlay. A loader rather than a path
   * because a custom tutorial's pages are `require`d at build time from
   * `src/tutorials/<name>/pages/`, while a Markdown tutorial's are
   * fetched at runtime from `public/tutorials/<name>/pages/`.
   */
  readPage?: () => string | Promise<string>;
  /** Sent to the assistant, one per rung */
  hints: Hints;
}

export interface LessonPath {
  /** Must be a name in `TUTORIALS` */
  tutorial: string;
  steps: LessonStep[];
}
