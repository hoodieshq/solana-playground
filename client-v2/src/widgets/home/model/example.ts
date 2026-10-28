import { createLogger } from "@/shared/lib/logger";
import {
  PgCommand,
  PgExplorer,
  PgFramework,
  PgGlobal,
  isTerminalUnmounted,
} from "@/utils";

const log = createLogger("home:first-run");

/**
 * The first-run example's project, found by this name: "Run it" shows only
 * while the browser holds no project, but another tab or sync can make the
 * example after Home drew it, and then it is opened rather than copied.
 * Spec 06 has the Anchor starter stand in until an example is picked.
 */
const EXAMPLE_NAME = "anchor-example";

/** How often, and for how long, the build waits for the work to mount */
const MOUNT_POLL_MS = 100;
const MOUNT_WAIT_MS = 15_000;

/** Why the example's build did not run */
type BuildSkipped =
  | "left-example"
  | "already-building"
  | "terminal-never-mounted";

/**
 * Start the build once a terminal is there to run it. On a first visit Home
 * mounts no work, so the terminal comes only after the new project has
 * replaced Home; until then the command throws `TerminalUnmounted`. Builds
 * only while the example is still the open project (the command builds
 * whatever is open, and the user may have moved on during the wait) and no
 * build runs yet (the stage's Build may have been pressed). Gives
 * up after `MOUNT_WAIT_MS`, leaving the Build stage's own Build button.
 */
const buildWhenMounted = async (): Promise<BuildSkipped | null> => {
  const until = Date.now() + MOUNT_WAIT_MS;
  for (;;) {
    if (PgExplorer.currentWorkspaceName !== EXAMPLE_NAME) return "left-example";
    // The stage's own Build, pressed during the wait, is the one build
    if (PgGlobal.buildLoading) return "already-building";
    try {
      await PgCommand.build.execute();
      return null;
    } catch (e) {
      if (!isTerminalUnmounted(e)) throw e;
      if (Date.now() >= until) return "terminal-never-mounted";
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
  const names = PgExplorer.allWorkspaceNames;
  // Unknown is not empty: making the example now could put it beside work
  // the explorer has not listed yet
  if (!names) throw new Error("The project list has not loaded yet.");
  if (names.includes(EXAMPLE_NAME)) {
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
  // to show, however long it runs. A compile error resolves (the stage lists
  // it); a rejection is a build server that did not answer, which the stage
  // shows as unreached, so neither is a bug for the team to hear of
  buildWhenMounted().then(
    (skipped) => {
      if (skipped) {
        log.warn("the example's build did not start", {
          context: { reason: skipped },
        });
      }
    },
    (e: unknown) =>
      log.warn("the example's build failed to run", {
        context: { e, workspace: EXAMPLE_NAME },
      })
  );
  return "created";
};
