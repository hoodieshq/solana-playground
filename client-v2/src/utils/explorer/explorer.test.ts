import { PgExplorer } from "./explorer";
import { PgWorkspace } from "./workspace";

/**
 * The two states the explorer could not hold: no current workspace, and a
 * config naming workspaces that are not on disk.
 *
 * Both are ordinary -- one is a step inside every delete, the other is what
 * the recovery path exists for -- and both went through
 * `getRequiredCurrentWorkspacePath`, which treats them as faults.
 *
 * `deleteWorkspace` removes the workspace from state and *then* moves to
 * another one, so for the length of that call the explorer holds workspaces
 * with none of them current. Upstream survived it by accident: the current
 * pointer was a name, so it went on naming the deleted workspace and the
 * metadata save bailed out of its own accord. The pointer is an id now and
 * resolves through the list, so the same window answers "no current
 * workspace" -- and `saveMeta`, the first thing `switchWorkspace` does,
 * demanded one.
 *
 * It surfaced through sign-out, which removes every workspace in a loop: the
 * first delete threw half-way, leaving workspaces on the list with nothing
 * current, and the explorer sidebar renders that state by asking for the
 * current workspace's path -- so the whole app fell into the error boundary
 * with "Current workspace not found".
 */

const files = (name: string): Array<[string, string]> => [
  [`/${name}/src/lib.rs`, "declare_id!();"],
];

const reset = async () => {
  (
    PgExplorer.fs as unknown as { __files: Map<string, string> }
  ).__files.clear();

  // The explorer keeps its workspaces in a module static, so a test that means
  // "a fresh browser" has to say so
  const statics = PgExplorer as unknown as {
    _workspace: unknown;
    _initializedWorkspaceName: unknown;
  };
  statics._workspace = null;
  statics._initializedWorkspaceName = null;

  await PgExplorer.init();
};

describe("a config that names workspaces the filesystem does not have", () => {
  beforeEach(reset);

  it("resets rather than looping, and finishes initializing", async () => {
    // What `_initCurrentWorkspace` exists to recover: file data lost while the
    // config survived -- a partial eviction, or a delete that removed the
    // files and then failed before saving. Its reset is `new PgWorkspace()`,
    // which returned the shared `DEFAULT` -- by then holding the very
    // workspaces it was meant to clear, so it re-saved them and re-entered
    // itself forever. `init` never resolved, so the main panel sat on its
    // spinner, and nothing threw for a boundary to catch.
    const stored = (
      PgExplorer.fs as unknown as { __files: Map<string, string> }
    ).__files;
    stored.set(
      PgWorkspace.WORKSPACES_CONFIG_PATH,
      JSON.stringify({
        workspaces: [{ id: "w1", name: "alpha" }],
        currentId: "w1",
      })
    );
    (PgExplorer as unknown as { _workspace: unknown })._workspace = null;

    // Raced rather than awaited: a regression here does not fail, it hangs,
    // and a hung suite says far less than a failed assertion
    const settled = await Promise.race([
      PgExplorer.init().then(() => "initialized" as const),
      new Promise<"hung">((resolve) => setTimeout(() => resolve("hung"), 1000)),
    ]);

    expect(settled).toBe("initialized");
    expect(PgExplorer.allWorkspaceNames).toEqual([]);
  });
});

describe("deleting the current workspace", () => {
  beforeEach(reset);

  it("moves to another one rather than throwing", async () => {
    await PgExplorer.createWorkspace("alpha", { files: files("alpha") });
    await PgExplorer.createWorkspace("beta", { files: files("beta") });
    expect(PgExplorer.currentWorkspaceName).toBe("beta");

    await PgExplorer.deleteWorkspace("beta");

    expect(PgExplorer.allWorkspaceNames).toEqual(["alpha"]);
    expect(PgExplorer.currentWorkspaceName).toBe("alpha");
  });

  it("leaves nothing current when it was the last one", async () => {
    await PgExplorer.createWorkspace("alpha", { files: files("alpha") });

    await PgExplorer.deleteWorkspace("alpha");

    expect(PgExplorer.allWorkspaceNames).toEqual([]);
    expect(PgExplorer.currentWorkspaceName).toBeUndefined();
  });

  it("can be repeated until there are none left", async () => {
    // Sign-out's release, which is where this was found: every workspace goes
    // in one loop, and the second delete only works if the first left a valid
    // current workspace behind
    await PgExplorer.createWorkspace("alpha", { files: files("alpha") });
    await PgExplorer.createWorkspace("beta", { files: files("beta") });
    await PgExplorer.createWorkspace("gamma", { files: files("gamma") });

    for (const name of [...PgExplorer.allWorkspaceNames!]) {
      await PgExplorer.deleteWorkspace(name);
    }

    expect(PgExplorer.allWorkspaceNames).toEqual([]);
  });
});
