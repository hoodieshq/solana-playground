import { useState } from "react";

import { createLogger } from "@/shared/lib/logger";

import type { LinkImport } from "../model/link-import";
import { newProjectTelemetry } from "../model/telemetry";
import type { UrlImport } from "./BaseImportFromUrl";
import BaseImportFromUrl from "./BaseImportFromUrl";

const log = createLogger("new-project:import");

export interface ImportFromUrlProps {
  /**
   * Imports the link and says how it ended; never throws. The widget passes
   * it, since routing a link to the repository or the gist import meets two
   * features
   */
  importLink: (link: string) => Promise<LinkImport>;
  /** Something else runs (Start, a card's Open): Import waits for it */
  held?: boolean;
  /** Hears when an import starts and ends, so others can wait */
  onRunning?: (running: boolean) => void;
  /** Runs once the project is open: New project closes its page here */
  onImported?: () => void;
  /**
   * Hears a failed import's message, after the field shows it: New project
   * toasts it once its page was left, when no field is left to show it
   */
  onFailed?: (message: string) => void;
}

/**
 * Import from GitHub, connected: the link goes to `importLink`, the card
 * shows the import while it runs and what went wrong under the field. A
 * closed program picker is the user changing their mind, not a failure.
 */
const ImportFromUrl = ({
  importLink,
  held = false,
  onRunning,
  onImported,
  onFailed,
}: ImportFromUrlProps) => {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<UrlImport>({ state: "idle" });

  const run = async () => {
    const link = url.trim();
    if (!link || held || status.state === "importing") return;

    setStatus({ state: "importing" });
    onRunning?.(true);
    const result = await importLink(link);
    onRunning?.(false);

    switch (result.outcome) {
      case "cancelled":
        setStatus({ state: "idle" });
        return;

      case "failed": {
        const { source, reason, message, error } = result;
        // A link GitHub refuses or cannot find is the user's to fix; the
        // rest is a failure to hear about
        if (reason === "request-failed") {
          log.error(error ?? message, { report: true, context: { source } });
        } else {
          log.warn("import refused", { context: { source, reason } });
        }
        newProjectTelemetry.track("new_project_import_failed", {
          source,
          reason,
        });
        setStatus({ state: "failed", error: message });
        onFailed?.(message);
        return;
      }

      case "imported":
        // The project is open from here on: nothing below may call it a
        // failure
        newProjectTelemetry.track("new_project_imported", {
          source: result.source,
        });
        setStatus({ state: "idle" });
        try {
          onImported?.();
        } catch (e) {
          log.error(e, { report: true, context: { after: "imported" } });
        }
    }
  };

  return (
    <BaseImportFromUrl
      url={url}
      onUrl={(next) => {
        setUrl(next);
        if (status.state !== "importing") setStatus({ state: "idle" });
      }}
      status={status}
      held={held}
      onImport={run}
    />
  );
};

export default ImportFromUrl;
