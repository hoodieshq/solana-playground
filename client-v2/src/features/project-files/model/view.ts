import { importReasonOf } from "./reason";
import { projectFilesTelemetry } from "./telemetry";

/**
 * Load a GitHub link's repository and count it: `project_viewed` once `run`
 * resolves with the files, else `project_view_failed` with the reason read
 * from the error's type (spec `client-v2-project-files`, "A project opened
 * from a GitHub link is counted"). The error is rethrown, so the route still
 * reports it.
 *
 * @param run the load, which resolves with the repository's files
 * @returns what `run` resolves with
 */
export const trackView = async <T>(run: () => Promise<T>) => {
  try {
    const result = await run();
    projectFilesTelemetry.track("project_viewed", {});
    return result;
  } catch (e) {
    projectFilesTelemetry.track("project_view_failed", {
      reason: importReasonOf(e),
    });
    throw e;
  }
};
