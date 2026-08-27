import type { Idl } from "@coral-xyz/anchor";

import type { VerifyCondition } from "./types";
import type { FlowState } from "../state/stage";

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

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
