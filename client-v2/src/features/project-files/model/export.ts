import type { ExportProfile, ExportVia } from "./telemetry";
import { projectFilesTelemetry } from "./telemetry";

/** What an export made: how the zip was made and how many files it holds */
export type Exported = { profile: ExportProfile; files: number };

/**
 * Count a zip handed to the browser (spec `client-v2-project-files`, "An
 * export is counted with where it started"): `project_exported`, converted
 * unless the zip holds the project's files as they are.
 *
 * @param via where the export started
 * @param zip how the zip was made and how many files it holds
 */
export const trackExported = (via: ExportVia, zip: Exported) =>
  projectFilesTelemetry.track("project_exported", {
    via,
    converted: zip.profile !== "as-is",
    profile: zip.profile,
    files: zip.files,
  });

/**
 * Count an export that saved nothing: `project_export_failed`. A conversion
 * that failed and fell back to the plain export is not one; the fallback
 * reports its own outcome.
 *
 * @param via where the export started
 * @param profile how the zip was being made
 */
export const trackExportFailed = (via: ExportVia, profile: ExportProfile) =>
  projectFilesTelemetry.track("project_export_failed", { via, profile });

/**
 * Count an export of the project's files as they are: `project_exported`
 * with the files `run` resolves with once the zip is handed to the browser,
 * `project_export_failed` when `run` rejects. The rejection is rethrown, so
 * the caller still tells the user.
 *
 * @param run the export; resolves with the number of files in the zip
 * @param via where the export started
 * @returns what `run` resolved with
 */
export const trackExportAsIs = async (
  run: () => Promise<number>,
  via: ExportVia
) => {
  let files: number;
  try {
    files = await run();
  } catch (e) {
    trackExportFailed(via, "as-is");
    throw e;
  }
  trackExported(via, { profile: "as-is", files });
  return files;
};
