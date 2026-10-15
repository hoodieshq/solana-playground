import type { BuildOutput } from "../../sidebar/assistant/bridge/build-output";
import type { FlowState, StageStatus } from "../state/stage";

/**
 * The build report this workspace may show, or `null`.
 *
 * `PgBuildOutput` holds one value for the whole session, so it outlives the
 * project that produced it: opening a second project left the first one's
 * report on screen, announcing a build the new workspace never had. The
 * stepper reads the workspace's own record and was right; only the surface
 * was not.
 *
 * Output recorded before the tag existed counts as someone else's - it cannot
 * be attributed, and claiming it for the current workspace is the very bug.
 */
export const ownOutput = (
  out: BuildOutput | null,
  workspace: string | null
): BuildOutput | null =>
  out && workspace && out.workspace === workspace ? out : null;

/**
 * Whether the surface is showing a build the workspace remembers but this
 * page never watched.
 *
 * `PgProgramInfo.lastBuildFailed` survives a reload; the compiler's output
 * does not. Without this the surface offered a first build over a verdict
 * that says one already happened, and for a restored failure it went further
 * and named a cause ("failed before the compiler ran") it cannot know.
 *
 * `buildStartedAt` is the discriminator: a build this session started sets
 * it, so a missing report there means the run produced none, which is a
 * different story with its own surface.
 */
export const isRestoredBuild = (
  settled: StageStatus,
  own: BuildOutput | null,
  buildStartedAt: number | null
) =>
  own === null &&
  buildStartedAt === null &&
  (settled === "done" || settled === "failed");

/** Which of the Build stage's surfaces is on screen */
export type BuildSurface =
  | { kind: "restored"; failed: boolean }
  | { kind: "unreached" }
  | { kind: "empty" }
  | { kind: "succeeded" }
  | { kind: "failed"; stderr: string };

/**
 * The Build stage's surface for a flow state and this workspace's report.
 *
 * The surface is chosen by the last *settled* status, never by "running": an
 * unreachable build server fails in milliseconds, and swapping surfaces for
 * that round trip reads as a blink (failed -> building -> failed). While a
 * run is in flight the previous surface stays put and only its action shows
 * "Building...".
 */
export const buildSurface = ({
  flow,
  own,
}: {
  flow: Pick<FlowState, "build" | "buildSettled" | "buildStartedAt">;
  own: BuildOutput | null;
}): BuildSurface => {
  const settled = flow.build === "running" ? flow.buildSettled : flow.build;

  // `own` only fills in once a build reaches the compiler and returns; a
  // build that fails before that (e.g. the build server is unreachable)
  // still flips the status to "failed", but `own` stays `null` or, if a
  // previous run left one behind, goes stale.
  const stale =
    own !== null &&
    flow.buildStartedAt !== null &&
    own.at < flow.buildStartedAt;

  // The workspace's own record outlived the page; the compiler's words did
  // not. Say what is known and no more: the other surfaces would either
  // offer a first build over a finished one, or blame a build server for a
  // failure whose cause this page never saw.
  if (isRestoredBuild(settled, own, flow.buildStartedAt)) {
    return { kind: "restored", failed: settled === "failed" };
  }
  if (settled === "failed" && (!own || stale)) return { kind: "unreached" };
  // Also reached while the very first build is in flight: there is no
  // previous surface to hold onto, so the empty state says "Building...".
  if (!own) return { kind: "empty" };
  if (!own.failed) return { kind: "succeeded" };
  return { kind: "failed", stderr: own.stderr };
};
