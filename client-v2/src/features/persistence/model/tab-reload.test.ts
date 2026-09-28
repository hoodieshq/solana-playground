import { reloadCurrentFromDisk } from "./tab-reload";
import { PgEditorModels } from "./editor-models";
import { PgCommon } from "../../../utils/common";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgFs } from "../../../utils/explorer/fs";

jest.mock("./editor-models", () => ({
  PgEditorModels: {
    valueOf: jest.fn(async () => null),
    drop: jest.fn(async () => {}),
    dropUnder: jest.fn(async () => {}),
  },
}));

const store = () =>
  (PgFs as unknown as { __files: Map<string, string> }).__files;

/** What this tab holds in memory, keyed the way the explorer keys it */
let memory: Record<string, { content?: string }>;

beforeEach(() => {
  store().clear();
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

  it("re-opens when the other tab changed which files exist", async () => {
    store().set("/alpha/src/new.rs", "created elsewhere");

    expect(await reloadCurrentFromDisk()).toBe("reopened");
    expect(PgEditorModels.dropUnder).toHaveBeenCalledWith("/alpha/");
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
  });
});
