import type { Idl } from "@coral-xyz/anchor";

import type { VerifyCondition } from "./types";
import type { FlowState, Stage } from "../state/stage";

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * The stage whose action can prove a condition, or `null` when nothing free
 * can. Derived from `verify` rather than carried beside it, so the action a
 * step offers cannot drift from what actually grades it.
 *
 * Narrower than `Stage`: only these two name a runnable command, which is what
 * lets a caller dispatch the result without re-checking it.
 */
export const verifyingStage = (
  c: VerifyCondition
): Extract<Stage, "build" | "deploy"> | null => {
  switch (c.kind) {
    case "build-passes":
    case "idl":
      return "build";
    case "deployed":
      return "deploy";
    // The objective band's `Continue` is the only way past a reading step
    case "read":
      return null;
  }
};

/**
 * Whether a step's condition is met right now.
 *
 * Pure and synchronous on purpose: everything it reads is already in
 * memory, so evaluation costs nothing and can run on every state change.
 *
 * @param c the step's condition
 * @param flow the dev loop's current state
 * @param idl the IDL the last successful Anchor build regenerated
 * @returns whether the step is finished
 */
export const isSatisfied = (
  c: VerifyCondition,
  flow: FlowState,
  idl: Idl | null
): boolean => {
  switch (c.kind) {
    case "build-passes":
      return flow.build === "done";

    case "deployed":
      return flow.deploy === "done";

    case "idl": {
      // `idl` is workspace-persisted and refreshes on a workspace switch
      // through a debounced batch, while `flow` resets immediately on
      // `workspace-change`. Requiring a finished build closes the
      // window where a `PgFlow` event lands before that refresh, which
      // would otherwise grade a freshly entered lesson against the
      // previous project's IDL.
      if (flow.build !== "done") return false;
      if (!idl) return false;

      const ix = idl.instructions.find((i) => sameName(i.name, c.instruction));
      if (!ix) return false;

      if (c.arg && !ix.args.some((a) => sameName(a.name, c.arg!))) {
        return false;
      }

      if (
        c.account &&
        !(idl.accounts ?? []).some((a) => sameName(a.name, c.account!))
      ) {
        return false;
      }

      return true;
    }

    // Nothing free proves a reading step. The objective band gives it a
    // `Continue`; no other kind gets one.
    case "read":
      return false;
  }
};
