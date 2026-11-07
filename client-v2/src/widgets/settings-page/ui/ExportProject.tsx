import { ExportFile } from "@/components/Icons";
import { useExplorer } from "@/hooks";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { cn } from "@/shared/lib/utils";
import { AsyncButton } from "@/shared/ui/async-button";
import { PgFramework } from "@/utils";

/** The project Export project takes: the open one */
const useOpenProject = () => useExplorer().currentWorkspaceName;

/**
 * The line above the Project section's buttons that names what Export
 * project takes, since the page shows no other sign of it (HOO-2691)
 */
export const OpenProjectLine = ({ phone }: { phone: boolean }) => {
  const name = useOpenProject();
  const text = name
    ? `Exports ${name}, the project open now.`
    : "No project is open.";
  return (
    <p
      data-testid="settings-open-project"
      title={text}
      className={cn(
        "truncate text-xs text-muted-foreground",
        phone && "text-control font-read"
      )}
    >
      {text}
    </p>
  );
};

/**
 * Settings › Export project: downloads the open project as is. Its zip is
 * what Import › From files takes back.
 */
const ExportProject = ({ className }: { className?: string }) => {
  const name = useOpenProject();
  return (
    <AsyncButton
      variant="outline"
      className={className}
      disabled={!name}
      // The project the line names, not whatever is open when the click lands
      onClick={() => PgFramework.exportWorkspace({ name: name ?? "" })}
      onError={reportButtonFailure("export the project")}
    >
      <ExportFile data-icon="inline-start" />
      Export project (zip)
    </AsyncButton>
  );
};

export default ExportProject;
