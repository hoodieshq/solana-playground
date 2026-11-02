import { useState, useSyncExternalStore } from "react";

import { isSignInFailure, PgSession } from "@/features/auth";
import { createLogger } from "@/shared/lib/logger";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { navTelemetry } from "../model/telemetry";
import BaseHandoff, { HANDOFF_TITLE } from "./BaseHandoff";

const log = createLogger("app-nav:handoff");

const subscribe = (onChange: () => void) =>
  PgSession.onDidChange(onChange).dispose;

/** The login signed in now, re-read when the session moves */
const useLogin = () =>
  useSyncExternalStore(subscribe, () => PgSession.get()?.login ?? null);

const useSigningIn = () =>
  useSyncExternalStore(
    subscribe,
    () => PgSession.signInState().status === "pending"
  );

/**
 * This page's address: the app's origin and the current path. A project has
 * no address of its own; signed in, the account's project list opens it on
 * the computer, and a tutorial's path opens that tutorial
 */
const linkHere = () => `${window.location.origin}${window.location.pathname}`;

/** A share sheet the user closed rejects too, and is not a failure */
const isCancelledShare = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const reportCopy = reportButtonFailure("copy the link");
const reportShare = reportButtonFailure("share the link");

/** `BaseHandoff` with the session, the clipboard and the share sheet */
const Handoff = () => {
  const [open, setOpen] = useState(false);
  const login = useLogin();
  const signingIn = useSigningIn();
  // Read on opening, not on every render: the sheet shows the page it was opened on
  const [link, setLink] = useState(linkHere);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setLink(linkHere());
      navTelemetry.track("nav_handoff_opened", { signedIn: login !== null });
    }
    setOpen(next);
  };

  const onCopy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("No clipboard in this browser");
      await navigator.clipboard.writeText(link);
    } catch (error) {
      reportCopy(error);
      return false;
    }
    navTelemetry.track("nav_handoff_link_copied", {});
    return true;
  };

  const onShare = async () => {
    try {
      await navigator.share({ title: HANDOFF_TITLE, url: link });
    } catch (error) {
      if (isCancelledShare(error)) return;
      reportShare(error);
      return;
    }
    navTelemetry.track("nav_handoff_link_shared", {});
  };

  const onSignIn = () => {
    PgSession.signIn().catch((error: unknown) => {
      // A known failure (the popup closed, GitHub refused) is in
      // `PgSession.signInState`, which the account row shows, and `auth`
      // telemetry has its reason; the button here is offered again
      if (isSignInFailure(error)) {
        log.info("sign-in failed", { context: { error: String(error) } });
        return;
      }
      log.error(error, { report: true, context: { from: "handoff" } });
    });
  };

  return (
    <BaseHandoff
      open={open}
      onOpenChange={onOpenChange}
      link={link}
      login={login}
      signingIn={signingIn}
      onSignIn={onSignIn}
      canShare={typeof navigator.share === "function"}
      onCopy={onCopy}
      onShare={onShare}
    />
  );
};

export default Handoff;
