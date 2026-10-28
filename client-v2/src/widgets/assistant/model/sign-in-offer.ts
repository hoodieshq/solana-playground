import { useEffect, useState } from "react";

import { createLogger } from "@/shared/lib/logger";
import { isSignInFailure, PgSession } from "../../../features/auth";
import { PgSyncClient } from "../../../features/persistence";
import { assistantTelemetry } from "./telemetry";

const log = createLogger("assistant:sign-in-offer");

/** What the thread's sign-in line needs, or `null` when it is not shown */
export interface SignInOffer {
  /** A sign-in is under way, from here or anywhere else */
  pending: boolean;
  onSignIn: () => void;
}

/**
 * Spec 08's AI-11: a signed-out thread with something in it ends in an offer
 * to sign in and keep it on other devices.
 *
 * Only where the deployment syncs: without a database, signing in keeps
 * nothing anywhere, and the line would say it does. The session is waited on
 * first so a cookie still being restored on load does not flash the line at
 * someone who is signed in.
 */
export const useSignInOffer = (hasItems: boolean): SignInOffer | null => {
  const [signedOut, setSignedOut] = useState(false);
  const [pending, setPending] = useState(false);
  const [syncs, setSyncs] = useState(false);

  useEffect(() => {
    let live = true;
    const read = () => {
      setSignedOut(!PgSession.get());
      setPending(PgSession.signInState().status === "pending");
    };
    // `afterRead`, never `whenRead`: the panel can mount before the session
    // effect, and a read started here would hide the account's sign-in from it
    void PgSession.afterRead().then(() => {
      if (live) read();
    });
    // `available` never rejects: a probe that fails answers `false`
    void PgSyncClient.available().then((answer) => {
      if (live) setSyncs(answer);
    });
    const sub = PgSession.onDidChange(read);
    return () => {
      live = false;
      sub.dispose();
    };
  }, []);

  if (!signedOut || !syncs || !hasItems) return null;
  return { pending, onSignIn: signIn };
};

const signIn = () => {
  assistantTelemetry.track("assistant_sign_in_offered_clicked", {});
  // From the assistant, so the account's newest project does not open over the
  // one this conversation is about
  PgSession.signIn({ from: "assistant" }).catch((error: unknown) => {
    // `PgSession.signInState` holds every failure and the account row shows
    // it; `auth` telemetry has its reason
    if (isSignInFailure(error)) {
      log.info("sign-in from the thread failed", {
        context: { error: String(error) },
      });
      return;
    }
    log.error(error, { report: true, context: { from: "thread" } });
  });
};
