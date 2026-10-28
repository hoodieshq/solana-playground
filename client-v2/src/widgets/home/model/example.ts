import { createLogger } from "@/shared/lib/logger";
import {
  PgCommand,
  PgExplorer,
  PgFramework,
  isTerminalUnmounted,
} from "@/utils";

const log = createLogger("home:first-run");

/**
 * The first-run example's project, found by this name: a second "Run it"
 * opens it rather than making a copy. Spec 06 has the Anchor starter stand
 * in until an example is picked.
 */
export const EXAMPLE_NAME = "anchor-example";

/** How often, and for how long, the build waits for the work to mount */
const MOUNT_POLL_MS = 100;
const MOUNT_WAIT_MS = 15_000;

/**
 * Start the build once a terminal is there to run it. On a first visit Home
 * mounts no work, so the terminal comes only after the new project has
 * replaced Home; until then the command answers "unmounted". Gives up after
 * `MOUNT_WAIT_MS`, leaving the Build stage's own Build button.
 */
const buildWhenMounted = async () => {
  const until = Date.now() + MOUNT_WAIT_MS;
  for (;;) {
    try {
      await PgCommand.build.execute();
      return;
    } catch (e) {
      if (!isTerminalUnmounted(e) || Date.now() >= until) throw e;
    }
    await new Promise((resolve) => setTimeout(resolve, MOUNT_POLL_MS));
  }
};

/** What "Run it" did: made the example, opened it, or found it open already */
export type ExampleRun = "created" | "opened" | "current";

/**
 * Open the example, or make it and start its one build. The build is part
 * of making it, never read back from storage, so a reload cannot start
 * another (Spec 06: the build starts on its own only once). It is started,
 * not awaited: a build that fails is the Build stage's to show, and the
 * example exists, so this answers `created` either way.
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
  // Not awaited: the example exists now, and the build is the Build stage's
  // to show, however long it runs
  buildWhenMounted().catch((e: unknown) =>
    log.error(e, { report: true, context: { after: "example-created" } })
  );
  return "created";
};
