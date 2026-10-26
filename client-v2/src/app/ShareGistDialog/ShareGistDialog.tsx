import { PgSession } from "@/features/auth";
import { ShareGist } from "@/features/gist";
import { PgView } from "@/utils/view";
import { ModalFrame } from "@/widgets/overlays";

interface ShareGistDialogProps {
  name: string;
  readFiles: () => Promise<Record<string, string>>;
}

/**
 * Share a project as a gist: the gist feature's body in a dialog of
 * `PgView`'s stack, with sign-in from the auth feature. Here, in the app,
 * because neither feature may import the other, nor a widget the frame.
 */
const ShareGistDialog = ({ name, readFiles }: ShareGistDialogProps) => (
  <ModalFrame name="share-gist" title={`Share ${name} as a gist`}>
    <ShareGist
      name={name}
      readFiles={readFiles}
      isSignedIn={() => !!PgSession.get()}
      signIn={(options) => PgSession.signIn(options)}
    />
  </ModalFrame>
);

/** Open the share dialog; settles when it closes */
export const openShareGistDialog = (
  name: string,
  readFiles: () => Promise<Record<string, string>>
) =>
  PgView.setModal<unknown, ShareGistDialogProps>(ShareGistDialog, {
    name,
    readFiles,
  });
