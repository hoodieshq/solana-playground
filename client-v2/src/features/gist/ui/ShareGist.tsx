import { useEffect, useRef, useState } from "react";

import { GIST_SCOPE } from "../config.mjs";
import { exportProject } from "../model/export";
import type { ExportResult } from "../model/export";
import { gistTelemetry } from "../model/telemetry";
import BaseShareGist from "./BaseShareGist";
import type { ShareStep } from "./BaseShareGist";

export interface ShareGistProps {
  /** The project's name */
  name: string;
  /** The project's files, keyed by path relative to its root */
  readFiles: () => Promise<Record<string, string>>;
  /** Whether someone is signed in now */
  isSignedIn: () => boolean;
  /**
   * Sign in with GitHub, asking for `scopes` on top of sign-in's own. Passed
   * in because this feature may not import `auth`. Rejects when the user
   * cancels or the sign-in fails, with a message fit to show.
   */
  signIn: (options?: { scopes?: string[] }) => Promise<void>;
}

const messageOf = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Sign-in failed.";

/**
 * The share dialog's body, connected: signs in when it must, asks for gist
 * access when the token lacks it, and counts how each share ends.
 */
const ShareGist = ({ name, readFiles, isSignedIn, signIn }: ShareGistProps) => {
  const [state, setState] = useState<ShareStep>(() =>
    isSignedIn() ? { step: "ready" } : { step: "sign-in" }
  );
  // A dialog closed mid-share must not be set state on
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );
  const show = (next: ShareStep) => {
    if (mounted.current) setState(next);
  };

  /** One export; `afterGrant` says the user has just allowed gists */
  const share = async ({ afterGrant }: { afterGrant: boolean }) => {
    const result: ExportResult = await exportProject({
      name,
      files: await readFiles(),
    });
    switch (result.status) {
      case "created":
        show({ step: "created", url: result.url });
        return;
      case "needs-sign-in":
        gistTelemetry.track("gist_export_failed", { reason: "signed-out" });
        show({ step: "sign-in" });
        return;
      case "needs-gist-scope":
        if (afterGrant) {
          gistTelemetry.track("gist_export_failed", {
            reason: "needs-gist-scope",
          });
          show({ step: "failed", reason: "scope-not-granted" });
          return;
        }
        gistTelemetry.track("gist_export_scope_requested", {});
        show({ step: "grant" });
        return;
      case "failed":
        gistTelemetry.track("gist_export_failed", { reason: result.reason });
        show({ step: "failed", reason: result.reason });
        return;
    }
  };

  const signInThen = async (
    scopes: string[] | undefined,
    retry: (error: string) => ShareStep
  ) => {
    try {
      await signIn(scopes ? { scopes } : undefined);
    } catch (e) {
      // `signIn` has logged and counted its own failure; this is the share's
      gistTelemetry.track("gist_export_failed", { reason: "sign-in-failed" });
      show(retry(messageOf(e)));
      return;
    }
    await share({ afterGrant: !!scopes });
  };

  return (
    <BaseShareGist
      name={name}
      state={state}
      onCreate={() => share({ afterGrant: false })}
      onSignIn={() =>
        signInThen(undefined, (error) => ({ step: "sign-in", error }))
      }
      onGrant={() =>
        signInThen([GIST_SCOPE], (error) => ({ step: "grant", error }))
      }
    />
  );
};

export default ShareGist;
