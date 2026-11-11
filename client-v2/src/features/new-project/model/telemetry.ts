import { createTracker } from "@/shared/lib/telemetry";

import type { LinkImportFailure, LinkSource } from "./link-import";

type NewProjectEvents = {
  /**
   * Start made a project from the framework's starter, from New project or
   * from Home; the event does not say which.
   */
  new_project_started: { framework: string };
  /**
   * Start could not make the project; the reason shows under the name field
   * and was logged. A refused name is not counted: nothing was attempted.
   */
  new_project_start_failed: { framework: string };
  /**
   * Import from GitHub opened a repository or a gist as a project, made now
   * or already there. A closed program picker is not counted.
   */
  new_project_imported: { source: LinkSource };
  /**
   * Import from GitHub stopped; the message shows under the field. `source`
   * is `unknown` for a link that is neither a repository nor a gist.
   */
  new_project_import_failed: {
    source: LinkSource | "unknown";
    reason: LinkImportFailure;
  };
};

export const newProjectTelemetry = createTracker<NewProjectEvents>();
