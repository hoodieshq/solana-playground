import { buildSurface, isRestoredBuild, ownOutput } from "./build-surface";
import type { BuildOutput } from "../../sidebar/assistant/bridge/build-output";
import type { StageStatus } from "../state/stage";

const outputFrom = (workspace: string | null): BuildOutput => ({
  stderr: "",
  failed: false,
  at: 1000,
  workspace,
});

describe("ownOutput", () => {
  it("keeps output recorded by the workspace on screen", () => {
    const out = outputFrom("proj-a");
    expect(ownOutput(out, "proj-a")).toBe(out);
  });

  /**
   * `PgBuildOutput` is one session-wide value, so switching project leaves the
   * previous project's report behind it. Shown, it claims a build the new
   * workspace never had.
   */
  it("drops output recorded by a different workspace", () => {
    expect(ownOutput(outputFrom("proj-a"), "proj-b")).toBeNull();
  });

  it("drops output that predates workspace tagging", () => {
    expect(ownOutput(outputFrom(null), "proj-a")).toBeNull();
  });

  it("has nothing to keep when no build has run", () => {
    expect(ownOutput(null, "proj-a")).toBeNull();
  });
});

describe("isRestoredBuild", () => {
  /**
   * A reload keeps the workspace's verdict but not the compiler's words, so
   * the surface must say the build happened without pretending to a report it
   * does not have.
   */
  it("is true for a verdict read back with no report behind it", () => {
    expect(isRestoredBuild("done", null, null)).toBe(true);
    expect(isRestoredBuild("failed", null, null)).toBe(true);
  });

  it("is false once this session has started a build of its own", () => {
    expect(isRestoredBuild("done", null, 1000)).toBe(false);
  });

  it("is false while the report is on hand", () => {
    const out: BuildOutput = {
      stderr: "",
      failed: false,
      at: 1,
      workspace: "proj-a",
    };
    expect(isRestoredBuild("done", out, null)).toBe(false);
  });

  it("is false for a workspace with no verdict to restore", () => {
    expect(isRestoredBuild("upcoming", null, null)).toBe(false);
  });
});

const flowOf = (
  build: StageStatus,
  buildSettled: StageStatus,
  buildStartedAt: number | null
) => ({ build, buildSettled, buildStartedAt });

const report = (failed: boolean, at: number): BuildOutput => ({
  stderr: failed ? "error[E0308]: mismatched types" : "",
  failed,
  at,
  workspace: "proj-a",
});

describe("buildSurface", () => {
  it("is empty before any build", () => {
    expect(
      buildSurface({ flow: flowOf("active", "active", null), own: null })
    ).toEqual({ kind: "empty" });
  });

  it("stays empty while the first build runs", () => {
    expect(
      buildSurface({ flow: flowOf("running", "active", 5), own: null })
    ).toEqual({ kind: "empty" });
  });

  it("restores a verdict the page never watched", () => {
    expect(
      buildSurface({ flow: flowOf("failed", "failed", null), own: null })
    ).toEqual({ kind: "restored", failed: true });
    expect(
      buildSurface({ flow: flowOf("done", "done", null), own: null })
    ).toEqual({ kind: "restored", failed: false });
  });

  it("blames the server when a run left no report", () => {
    expect(
      buildSurface({ flow: flowOf("failed", "failed", 5), own: null })
    ).toEqual({ kind: "unreached" });
  });

  /** A report from an earlier run is not this run's verdict */
  it("blames the server when the report predates the run", () => {
    expect(
      buildSurface({
        flow: flowOf("failed", "failed", 5),
        own: report(false, 1),
      })
    ).toEqual({ kind: "unreached" });
  });

  /** Swapping surfaces for the round trip of a run reads as a blink */
  it("keeps the previous surface while a run is in flight", () => {
    expect(
      buildSurface({
        flow: flowOf("running", "done", 5),
        own: report(false, 9),
      })
    ).toEqual({ kind: "succeeded" });
  });

  it("shows a failed report", () => {
    expect(
      buildSurface({
        flow: flowOf("failed", "failed", 5),
        own: report(true, 9),
      })
    ).toEqual({ kind: "failed", stderr: "error[E0308]: mismatched types" });
  });
});
