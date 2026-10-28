import { markFailureShown } from "@/shared/lib/report-button-failure";
import { PgFlow } from "../state/stage";

/**
 * The catch of a Build or Deploy stage's own run. When the run left its stage
 * failed, the stage says so in place (Build's failed surface, Deploy's
 * Callout), so the failure is marked shown and the button's
 * `reportButtonFailure` only logs it: Spec 08's "one cause shows one
 * message". A run that failed before it settled the stage (a pre-check, a
 * command that could not start here) left nothing on screen, so its toast
 * stays. Either way the failure is rethrown for the button to log.
 *
 * @param stage the stage whose run this is
 * @returns the handler for the run's rejection
 */
export const toldByStage =
  (stage: "build" | "deploy") =>
  (error: unknown): never => {
    if (PgFlow.state[stage] === "failed") markFailureShown(error);
    throw error;
  };
