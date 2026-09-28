import { reloadCurrentFromDisk } from "./tab-reload";
import { PgEditorModels } from "./editor-models";
import { clearFailures, getFailures } from "./diagnostics";
import { PgCommon } from "../../../utils/common";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgFs } from "../../../utils/explorer/fs";
import { PgWorkspace } from "../../../utils/explorer/workspace";

jest.mock("./editor-models", () => ({
  PgEditorModels: {
    valueOf: jest.fn(async () => null),
    drop: jest.fn(async () => {}),
    dropUnder: jest.fn(async () => {}),
    anyEditedUnder: jest.fn(async () => false),
  },
}));

const store = () =>
  (PgFs as unknown as { __files: Map<string, string> }).__files;

/** What this tab holds in memory, keyed the way the explorer keys it */
let memory: Record<string, { content?: string }>;

beforeEach(() => {
  store().clear();
  clearFailures();
  memory = { "/alpha/src/lib.rs": { content: "old" } };
  store().set("/alpha/src/lib.rs", "old");
  jest
    .spyOn(PgExplorer, "currentWorkspaceName", "get")
    .mockReturnValue("alpha");
  jest.spyOn(PgExplorer, "isTemporary", "get").mockReturnValue(false);
  jest
    .spyOn(PgExplorer, "files", "get")
    .mockImplementation(() => memory as typeof PgExplorer.files);
  jest.spyOn(PgExplorer, "getCurrentFile").mockImplementation(
    () =>
      ({
        path: "/alpha/src/lib.rs",
        ...memory["/alpha/src/lib.rs"],
      } as ReturnType<typeof PgExplorer.getCurrentFile>)
  );
  jest.spyOn(PgExplorer, "switchWorkspace").mockResolvedValue(undefined);
  jest.spyOn(PgCommon, "createAndDispatchCustomEvent");
  // CRA's jest preset sets `resetMocks: true`, which wipes the
  // implementation `jest.mock` above baked in before every test, not just
  // once. Without this, `valueOf` answers `undefined` by default rather than
  // `null`, and every path reads as "someone is typing in it".
  (PgEditorModels.valueOf as jest.Mock).mockResolvedValue(null);
  (PgEditorModels.anyEditedUnder as jest.Mock).mockResolvedValue(false);
  // The real one runs `then` once the models are gone; so does this
  (PgEditorModels.dropUnder as jest.Mock).mockImplementation(
    async (_prefix: string, then?: () => void) => then?.()
  );
});

afterEach(() => jest.restoreAllMocks());

const dispatched = () =>
  (PgCommon.createAndDispatchCustomEvent as jest.Mock).mock.calls.map(
    ([name]) => name
  );

describe("reloadCurrentFromDisk", () => {
  it("does nothing when memory already matches disk", async () => {
    expect(await reloadCurrentFromDisk()).toBe("unchanged");
    expect(PgEditorModels.drop).not.toHaveBeenCalled();
    expect(PgExplorer.switchWorkspace).not.toHaveBeenCalled();
  });

  it("takes another tab's edit into state and the editor, quietly", async () => {
    store().set("/alpha/src/lib.rs", "from the other tab");

    expect(await reloadCurrentFromDisk()).toBe("contents");
    expect(memory["/alpha/src/lib.rs"].content).toBe("from the other tab");
    expect(PgEditorModels.drop).toHaveBeenCalledWith(["/alpha/src/lib.rs"]);
    // The open file is re-announced so the editor rebuilds its model...
    expect(dispatched()).toContain(PgExplorer.events.ON_DID_OPEN_FILE);
    // ...and nothing that schedules an upload fires
    expect(dispatched()).not.toContain(PgExplorer.events.ON_DID_SAVE_FILE);
    expect(PgExplorer.switchWorkspace).not.toHaveBeenCalled();
  });

  it("keeps a file the user is typing in", async () => {
    store().set("/alpha/src/lib.rs", "from the other tab");
    (PgEditorModels.valueOf as jest.Mock).mockResolvedValueOnce("typing");

    expect(await reloadCurrentFromDisk()).toBe("unchanged");
    expect(memory["/alpha/src/lib.rs"].content).toBe("old");
    expect(PgEditorModels.drop).not.toHaveBeenCalled();
  });

  it("keeps an autosave that lands while the store is being read", async () => {
    // The autosave puts its text into state first and writes it second. A
    // reload reading the store in between found the older text on disk and
    // put it back over the newer text in state.
    store().set("/alpha/src/lib.rs", "old on disk");
    const read = PgFs.readToString.bind(PgFs);
    jest.spyOn(PgFs, "readToString").mockImplementationOnce(async (path) => {
      memory["/alpha/src/lib.rs"].content = "typed, write in flight";
      return await read(path);
    });

    expect(await reloadCurrentFromDisk()).toBe("unchanged");
    expect(memory["/alpha/src/lib.rs"].content).toBe("typed, write in flight");
    expect(PgEditorModels.drop).not.toHaveBeenCalled();
  });

  it("re-opens when the other tab changed which files exist", async () => {
    store().set("/alpha/src/new.rs", "created elsewhere");

    expect(await reloadCurrentFromDisk()).toBe("reopened");
    expect(PgEditorModels.dropUnder).toHaveBeenCalledWith(
      "/alpha/",
      expect.any(Function)
    );
    expect(PgExplorer.switchWorkspace).toHaveBeenCalledWith("alpha");
  });

  it("switches before dropping the models, then opens the file again", async () => {
    // Dropping first left the editor with no model for as long as the
    // switch's saves took, and a pending autosave then saved the empty
    // editor over the open file
    const order: string[] = [];
    (PgExplorer.switchWorkspace as jest.Mock).mockImplementation(async () => {
      order.push("switch");
    });
    (PgEditorModels.dropUnder as jest.Mock).mockImplementation(
      async (_prefix: string, then?: () => void) => {
        order.push("drop");
        then?.();
      }
    );
    (PgCommon.createAndDispatchCustomEvent as jest.Mock).mockImplementation(
      (name: string) => {
        if (name === PgExplorer.events.ON_DID_OPEN_FILE) order.push("open");
      }
    );
    store().set("/alpha/src/new.rs", "created elsewhere");

    expect(await reloadCurrentFromDisk()).toBe("reopened");
    expect(order).toEqual(["switch", "drop", "open"]);
  });

  it("waits to re-open while a model holds unsaved keystrokes", async () => {
    store().set("/alpha/src/new.rs", "created elsewhere");
    (PgEditorModels.anyEditedUnder as jest.Mock).mockResolvedValue(true);

    expect(await reloadCurrentFromDisk()).toBe("deferred");
    expect(PgEditorModels.anyEditedUnder).toHaveBeenCalledWith(
      "/alpha/",
      expect.any(Function)
    );
    expect(PgExplorer.switchWorkspace).not.toHaveBeenCalled();
    expect(PgEditorModels.dropUnder).not.toHaveBeenCalled();
  });

  it("leaves the tree alone when another tab changed the project list", async () => {
    // A re-open saves this tab's list of workspaces over the store's, which
    // would delete the project the other tab just created
    store().set("/alpha/src/new.rs", "created elsewhere");
    store().set(
      PgWorkspace.WORKSPACES_CONFIG_PATH,
      JSON.stringify({
        workspaces: [
          { id: "a1", name: "alpha" },
          { id: "b1", name: "beta" },
        ],
        currentId: "b1",
      })
    );
    jest
      .spyOn(PgExplorer, "allWorkspaceNames", "get")
      .mockReturnValue(["alpha"]);
    jest.spyOn(PgExplorer, "workspaceIdOf").mockReturnValue("a1");

    expect(await reloadCurrentFromDisk()).toBe("deferred");
    expect(PgExplorer.switchWorkspace).not.toHaveBeenCalled();
    expect(PgEditorModels.dropUnder).not.toHaveBeenCalled();
  });

  it("re-opens when the project list on disk is the one it holds", async () => {
    // Which one is current is every tab's own, so it is not a difference
    store().set("/alpha/src/new.rs", "created elsewhere");
    store().set(
      PgWorkspace.WORKSPACES_CONFIG_PATH,
      JSON.stringify({
        workspaces: [{ id: "a1", name: "alpha" }],
        currentId: "someone-else",
      })
    );
    jest
      .spyOn(PgExplorer, "allWorkspaceNames", "get")
      .mockReturnValue(["alpha"]);
    jest.spyOn(PgExplorer, "workspaceIdOf").mockReturnValue("a1");

    expect(await reloadCurrentFromDisk()).toBe("reopened");
  });

  it("re-opens on request over unsaved keystrokes", async () => {
    // `adopt`: the user has chosen to discard this tab's copy
    (PgEditorModels.anyEditedUnder as jest.Mock).mockResolvedValue(true);

    expect(await reloadCurrentFromDisk({ reopen: true })).toBe("reopened");
    expect(PgExplorer.switchWorkspace).toHaveBeenCalledWith("alpha");
  });

  it("re-opens on request even when nothing differs", async () => {
    expect(await reloadCurrentFromDisk({ reopen: true })).toBe("reopened");
    expect(PgExplorer.switchWorkspace).toHaveBeenCalledWith("alpha");
  });

  it("ignores dotfiles, which the in-memory tree never holds", async () => {
    store().set("/alpha/.workspace/program-info.json", "{}");

    expect(await reloadCurrentFromDisk()).toBe("unchanged");
  });

  it("skips a temporary workspace, which has nothing on disk", async () => {
    jest.spyOn(PgExplorer, "isTemporary", "get").mockReturnValue(true);
    store().set("/alpha/src/lib.rs", "irrelevant");

    expect(await reloadCurrentFromDisk()).toBe("skipped");
  });

  it("skips when the workspace directory is gone", async () => {
    // Renamed or deleted in the other tab: recreating it would be worse
    store().clear();

    expect(await reloadCurrentFromDisk()).toBe("skipped");
    expect(PgExplorer.switchWorkspace).not.toHaveBeenCalled();
    // The expected case, so not a failure
    expect(getFailures()).toEqual([]);
  });

  it("reports a store that fails to read, and skips", async () => {
    jest
      .spyOn(PgFs, "readDir")
      .mockRejectedValueOnce(new Error("QuotaExceededError"));

    expect(await reloadCurrentFromDisk()).toBe("skipped");
    expect(getFailures()).toEqual([
      expect.objectContaining({ what: "reload /alpha: read" }),
    ]);
  });
});
