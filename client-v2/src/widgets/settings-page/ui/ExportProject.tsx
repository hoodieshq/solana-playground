import { ExportFile } from "@/components/Icons";
import { useExplorer } from "@/hooks";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { cn } from "@/shared/lib/utils";
import { AsyncButton } from "@/shared/ui/async-button";
import { PgFramework } from "@/utils";

interface ExportProjectProps {
  className?: string;
}

/**
 * Settings › Export project: downloads the open project as is, and says
 * which one, since the page shows no other sign of it (HOO-2691). Its zip is
 * what Import › From files takes back.
 */
const ExportProject = ({ className }: ExportProjectProps) => {
  const { currentWorkspaceName: name } = useExplorer();
  return (
    <AsyncButton
      variant="outline"
      className={cn("min-w-0", className)}
      disabled={!name}
      // The name shown, not whatever is open when the click lands
      onClick={() => PgFramework.exportWorkspace({ name: name ?? "" })}
      onError={reportButtonFailure("export the project")}
    >
      <ExportFile data-icon="inline-start" />
      {name ? (
        <>
          Export <span className="max-w-48 truncate">{name}</span> (zip)
        </>
      ) : (
        "Export project (zip)"
      )}
    </AsyncButton>
  );
};

export default ExportProject;
