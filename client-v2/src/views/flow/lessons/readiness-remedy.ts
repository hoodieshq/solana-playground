import type { Blocker } from "./readiness";
import { DEFAULT_ENDPOINT } from "../../../constants";
import { PgSession } from "../../../features/auth";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { PgCommand, PgSettings } from "../../../utils";

/**
 * The one action that clears a blocker.
 *
 * Each is the same thing the account menu or the stage button already
 * does, so the explainer never has a path of its own to drift on. Kept
 * out of the band so it can be tested without a rendered tree -- this
 * is the layer where a wrong endpoint or a swallowed rejection hides.
 *
 * @returns what to run when the learner clicks the blocker's remedy
 */
export const remedy = (b: Blocker): (() => void) => {
  switch (b.kind) {
    case "needs-build":
    case "needs-rebuild":
      return () => {
        PgCommand.build.execute().catch(reportButtonFailure("build"));
      };

    case "needs-wallet":
      return () => {
        PgCommand.connect
          .execute()
          .catch(reportButtonFailure("connect a wallet"));
      };

    case "needs-cluster":
      // `DEFAULT_ENDPOINT`, not `Endpoint.DEVNET`: a deployment that
      // configures a platform devnet should not have its learners
      // bounced onto the rate-limited public RPC mid-lesson
      return () => {
        PgSettings.connection.endpoint = DEFAULT_ENDPOINT;
      };

    case "needs-sol":
      // `signIn` rejects on a blocked popup, which would otherwise leave the
      // click doing nothing visible at all
      return b.signedIn
        ? () => {
            PgCommand.airdrop.execute().catch(reportButtonFailure("airdrop"));
          }
        : () => {
            PgSession.signIn().catch(reportButtonFailure("sign in"));
          };
  }
};
