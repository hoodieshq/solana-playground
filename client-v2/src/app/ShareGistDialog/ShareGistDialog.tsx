import { useState } from "react";
import { TriangleAlert } from "lucide-react";

import { isSignInFailure, PgSession } from "@/features/auth";
import { useRenderOnChange } from "@/hooks";
import { ShareGist } from "@/features/gist";
import { createLogger } from "@/shared/lib/logger";
import { Callout, CalloutDescription } from "@/shared/ui/callout";
import { PgView } from "@/utils/view";
import { ModalFrame } from "@/widgets/overlays";
import { GithubMark } from "@/widgets/session-footer";

const log = createLogger("app:share-gist");

interface ShareGistDialogProps {
  name: string;
  readFiles: () => Promise<Record<string, string>>;
}

/**
 * What a signed-out Share shows first (Spec 05, "Sign-in prompt"): why
 * sharing needs GitHub, and the sign-in. Signing in is a popup, so the
 * project stays as it is; the session it brings turns the dialog into the
 * share dialog, which sends nothing until its own button is pressed.
 */
const SignInToShare = () => {
  // A known failure (a closed or blocked popup) is the user's to see, not
  // the team's: thrown, the frame would report it
  const [failure, setFailure] = useState<string>();

  const signIn = async () => {
    setFailure(undefined);
    try {
      await PgSession.signIn();
    } catch (error) {
      if (!isSignInFailure(error)) throw error;
      // `auth_sign_in_failed` has counted it with its reason
      log.info("sign-in to share ended without a session", {
        context: { error: String(error) },
      });
      setFailure(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <ModalFrame
      name="share-gist-sign-in"
      title="Sign in to share"
      buttonProps={{
        text: "Sign in with GitHub",
        icon: <GithubMark className="size-4" />,
        onSubmit: signIn,
        noCloseOnSubmit: true,
      }}
    >
      <div className="flex max-w-md flex-col gap-3">
        <p className="text-body font-read text-muted-foreground">
          Your project goes to a gist on your GitHub account.
        </p>
        {failure && (
          <Callout variant="error">
            <TriangleAlert />
            <CalloutDescription>{failure}</CalloutDescription>
          </Callout>
        )}
      </div>
    </ModalFrame>
  );
};

/**
 * Share a project as a gist: the gist feature's body in a dialog of
 * `PgView`'s stack, with sign-in from the auth feature. Here, in the app,
 * because neither feature may import the other, nor a widget the frame.
 * Signed out, the sign-in prompt stands in its place.
 */
const ShareGistDialog = ({ name, readFiles }: ShareGistDialogProps) => {
  // The first session read may still be on its way when the dialog opens,
  // and a sign-in, from the prompt or elsewhere, moves the dialog on
  useRenderOnChange(PgSession.onDidChange);
  if (!PgSession.get()) return <SignInToShare />;
  return (
    <ModalFrame name="share-gist" title={`Share ${name} as a gist`}>
      <ShareGist
        name={name}
        readFiles={readFiles}
        signedIn
        signIn={(options) => PgSession.signIn(options)}
      />
    </ModalFrame>
  );
};

/** Open the share dialog; settles when it closes */
export const openShareGistDialog = (
  name: string,
  readFiles: () => Promise<Record<string, string>>
) =>
  PgView.setModal<unknown, ShareGistDialogProps>(ShareGistDialog, {
    name,
    readFiles,
  });
