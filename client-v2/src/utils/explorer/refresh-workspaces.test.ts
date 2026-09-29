import { PgExplorer } from "./explorer";
import { PgWorkspace } from "./workspace";

/**
 * Tabs of one browser share the workspaces config, and each used to read it
 * once at load. `refreshWorkspaces` is how a tab catches up with a neighbour
 * that created, deleted or renamed a workspace since -- without taking the
 * neighbour's current workspace as its own.
 */

const stored = () =>
  (PgExplorer.fs as unknown as { __files: Map<string, string> }).__files;

const readConfig = () =>
  JSON.parse(stored().get(PgWorkspace.WORKSPACES_CONFIG_PATH)!) as {
    workspaces: Array<{ id: string; name: string }>;
    currentId?: string;
  };

/** What a neighbour's save leaves in the store */
const writeConfig = (config: {
  workspaces: Array<{ id: string; name: string }>;
  currentId?: string;
}) => stored().set(PgWorkspace.WORKSPACES_CONFIG_PATH, JSON.stringify(config));

beforeEach(async () => {
  stored().clear();
  const statics = PgExplorer as unknown as {
    _workspace: unknown;
    _initializedWorkspaceName: unknown;
  };
  statics._workspace = null;
  statics._initializedWorkspaceName = null;
  await PgExplorer.init();

  await PgExplorer.createWorkspace("alpha", {
    files: [["/alpha/src/lib.rs", "a"]],
  });
  await PgExplorer.createWorkspace("beta", {
    files: [["/beta/src/lib.rs", "b"]],
  });
});

describe("PgExplorer.refreshWorkspaces", () => {
  it("takes a neighbour's list and keeps this tab's current", async () => {
    const alpha = PgExplorer.workspaceIdOf("alpha")!;
    const beta = PgExplorer.workspaceIdOf("beta")!;
    writeConfig({
      workspaces: [
        { id: alpha, name: "alpha" },
        { id: beta, name: "beta" },
        { id: "g1", name: "gamma" },
      ],
      // The neighbour saved last, with its own current workspace
      currentId: "g1",
    });

    await PgExplorer.refreshWorkspaces();

    expect(PgExplorer.allWorkspaceNames).toEqual(["alpha", "beta", "gamma"]);
    expect(PgExplorer.currentWorkspaceId).toBe(beta);
    expect(PgExplorer.currentWorkspaceName).toBe("beta");
  });

  it("follows the current workspace through a rename elsewhere", async () => {
    const alpha = PgExplorer.workspaceIdOf("alpha")!;
    const beta = PgExplorer.workspaceIdOf("beta")!;
    writeConfig({
      workspaces: [
        { id: alpha, name: "alpha" },
        { id: beta, name: "renamed" },
      ],
      currentId: alpha,
    });

    await PgExplorer.refreshWorkspaces();

    expect(PgExplorer.currentWorkspaceName).toBe("renamed");
  });

  it("drops a workspace deleted elsewhere", async () => {
    const alpha = PgExplorer.workspaceIdOf("alpha")!;
    writeConfig({
      workspaces: [{ id: alpha, name: "alpha" }],
      currentId: alpha,
    });

    await PgExplorer.refreshWorkspaces();

    expect(PgExplorer.allWorkspaceNames).toEqual(["alpha"]);
    // Deleted while this tab had it open: nothing is current any more, which
    // `reloadCurrentFromDisk` answers by moving on
    expect(PgExplorer.currentWorkspaceName).toBeUndefined();
  });

  it("writes nothing", async () => {
    const alpha = PgExplorer.workspaceIdOf("alpha")!;
    const config = {
      workspaces: [{ id: alpha, name: "alpha" }],
      currentId: "x",
    };
    writeConfig(config);

    await PgExplorer.refreshWorkspaces();

    expect(readConfig()).toEqual(config);
  });

  it("keeps the list in memory when the config cannot be read", async () => {
    // A missing file reads as the empty default elsewhere. Taken here, that
    // would empty this tab's list, and its next save would empty the store's.
    stored().delete(PgWorkspace.WORKSPACES_CONFIG_PATH);

    await PgExplorer.refreshWorkspaces();

    expect(PgExplorer.allWorkspaceNames).toEqual(["alpha", "beta"]);
    expect(PgExplorer.currentWorkspaceName).toBe("beta");
  });

  it("does nothing in a temporary workspace", async () => {
    await PgExplorer.init({ files: [["/src/lib.rs", "t"]] });

    await PgExplorer.refreshWorkspaces();

    expect(PgExplorer.allWorkspaceNames).toBeUndefined();
  });
});
