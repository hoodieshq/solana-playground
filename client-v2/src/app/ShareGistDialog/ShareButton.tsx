import { useRenderOnChange } from "@/hooks";
import { Button } from "@/shared/ui/button";
import { PgExplorer } from "@/utils";
import { readProjectFiles } from "@/widgets/app-nav";
import { GithubMark } from "@/widgets/session-footer";
import { openShareGistDialog } from "./ShareGistDialog";

/**
 * The frame header's Share (Spec 05): opens the share dialog for the open
 * project. It draws nothing while no project is open. The stage bar it sits
 * in is desktop-only, so a phone shares from the open project's row.
 */
const ShareButton = () => {
  useRenderOnChange(PgExplorer.onDidSwitchWorkspace);
  useRenderOnChange(PgExplorer.onDidRenameWorkspace);
  const name = PgExplorer.currentWorkspaceName;
  if (!name) return null;
  return (
    <Button
      id="flow-share"
      type="button"
      variant="ghost"
      className="h-7.5 gap-1.5 rounded-lg pr-2.5 pl-2 text-[0.8125rem] text-muted-foreground hover:bg-accent hover:text-foreground dark:hover:bg-accent"
      aria-label={`Share ${name}`}
      // The dialog counts and reports its own outcome
      onClick={() =>
        void openShareGistDialog(
          name,
          () => readProjectFiles(name, PgExplorer.fs),
          "header"
        )
      }
    >
      <GithubMark className="size-4" />
      Share
    </Button>
  );
};

export default ShareButton;
