import { ImportCancelledError } from "@/utils/import-error";

import { importReasonOf } from "./reason";
import type { ImportVia } from "./telemetry";
import { projectFilesTelemetry } from "./telemetry";

/**
 * Count a failed import: `project_import_failed` with the reason read from
 * the error's type (spec `client-v2-project-files`, "Import failures carry an
 * enumerated reason"). A closed program choice (`ImportCancelledError`) is
 * the user changing their mind and sends nothing.
 *
 * @param via where the import started
 * @param error what it threw
 */
export const trackImportFailure = (via: ImportVia, error: unknown) => {
  if (error instanceof ImportCancelledError) return;
  projectFilesTelemetry.track("project_import_failed", {
    via,
    reason: importReasonOf(error),
  });
};

/**
 * Run an import and count its outcome: `project_imported` once `run`
 * resolves, else `trackImportFailure`. The error is rethrown either way, so
 * the dialog still shows it.
 *
 * @param run the import, which resolves once the project exists
 * @param via where the import started
 * @returns what `run` resolves with
 */
export const trackImport = async <T>(run: () => Promise<T>, via: ImportVia) => {
  try {
    const result = await run();
    projectFilesTelemetry.track("project_imported", { via });
    return result;
  } catch (e) {
    trackImportFailure(via, e);
    throw e;
  }
};
