import { createLogger } from "@/shared/lib/logger";
import { PgCommand, PgExplorer, PgFramework } from "@/utils";

const log = createLogger("home:first-run");

/**
 * The first-run example's project, found by this name: a second "Run it"
 * opens it rather than making a copy. Spec 06 has the Anchor starter stand
 * in until an example is picked.
 */
export const EXAMPLE_NAME = "anchor-example";

/** What "Run it" did: made the example, opened it, or found it open already */
export type ExampleRun = "created" | "opened" | "current";

/**
 * Open the example, or make it and start its one build. The build is part
 * of making it, never read back from storage, so a reload cannot start
 * another (Spec 06: the build starts on its own only once). A build that
 * fails to start is the Build stage's to show; the example exists, so this
 * still answers `created`.
 */
export const runExample = async (): Promise<ExampleRun> => {
  if (PgExplorer.allWorkspaceNames?.includes(EXAMPLE_NAME)) {
    if (PgExplorer.currentWorkspaceName === EXAMPLE_NAME) return "current";
    await PgExplorer.switchWorkspace(EXAMPLE_NAME);
    return "opened";
  }
  const framework = PgFramework.get("Anchor");
  if (!framework) throw new Error("Anchor is not available.");
  const { files } = await framework.getDefaultFiles();
  await PgExplorer.createWorkspace(EXAMPLE_NAME, {
    files,
    defaultOpenFile: framework.defaultOpenFile,
  });
  try {
    await PgCommand.build.execute();
  } catch (e) {
    log.error(e, { report: true, context: { after: "example-created" } });
  }
  return "created";
};
