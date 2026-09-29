import { PgEditorModels } from "./editor-models";
import { reconcile } from "./project-restore";
import { reloadCurrentFromDisk } from "./tab-reload";
import { tabSync } from "../../../effects/tab-sync/tab-sync";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgWorkspace } from "../../../utils/explorer/workspace";

/**
 * Another tab renames or deletes the workspace this one has open, and this
 * one hears of it the two ways it can: the channel, and a reconcile.
 *
 * Nothing is stubbed between the message and the store -- the real reload
 * re-reads the real list over the in-memory filesystem. The unit tests of
 * each piece passed while the pieces together did not: the list used to be
 * re-read before the reload started, so the reload never saw the change it
 * was meant to act on.
 */

jest.mock("./editor-models", () => ({
  PgEditorModels: {
    valueOf: jest.fn(async () => null),
    drop: jest.fn(async () => {}),
    dropUnder: jest.fn(async () => {}),
    anyEditedUnder: jest.fn(async () => false),
  },
}));

const store = () =>
  (PgExplorer.fs as unknown as { __files: Map<string, string> }).__files;

const opened: FakeChannel[] = [];
class FakeChannel {
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  constructor(public name: string) {
    opened.push(this);
  }
  postMessage() {}
  close() {}
}

type Config = {
  workspaces: Array<{ id: string; name: string }>;
  currentId?: string;
};
const config = () =>
  JSON.parse(store().get(PgWorkspace.WORKSPACES_CONFIG_PATH)!) as Config;

/** What the other tab leaves in the store, and nothing in this tab's memory */
const elsewhere = {
  rename(from: string, to: string) {
    for (const [path, content] of [...store().entries()]) {
      if (!path.startsWith(`/${from}/`)) continue;
      store().delete(path);
      store().set(`/${to}/` + path.slice(from.length + 2), content);
    }
    const next = config();
    next.workspaces = next.workspaces.map((w) =>
      w.name === from ? { ...w, name: to } : w
    );
    store().set(PgWorkspace.WORKSPACES_CONFIG_PATH, JSON.stringify(next));
  },
  delete(name: string) {
    for (const path of [...store().keys()]) {
      if (path.startsWith(`/${name}/`)) store().delete(path);
    }
    const next = config();
    next.workspaces = next.workspaces.filter((w) => w.name !== name);
    next.currentId = next.workspaces.at(-1)?.id;
    store().set(PgWorkspace.WORKSPACES_CONFIG_PATH, JSON.stringify(next));
  },
};

/** The channel: a neighbour's list message, then whatever reload it runs */
const viaChannel = async () => {
  const effect = tabSync();
  opened.forEach((channel) =>
    channel.onmessage?.({ data: { type: "workspaces-written", from: "x" } })
  );
  await new Promise((done) => setTimeout(done, 400));
  // Queued behind the one the message started, so this waits for it
  await reloadCurrentFromDisk();
  effect.dispose();
};

const viaReconcile = async () => {
  await reconcile();
};

const paths = () => Object.keys(PgExplorer.files).filter((p) => p !== "/");

beforeEach(async () => {
  store().clear();
  opened.length = 0;
  Object.defineProperty(globalThis, "BroadcastChannel", {
    value: FakeChannel,
    configurable: true,
  });
  (PgEditorModels.valueOf as jest.Mock).mockResolvedValue(null);
  (PgEditorModels.anyEditedUnder as jest.Mock).mockResolvedValue(false);
  (PgEditorModels.dropUnder as jest.Mock).mockImplementation(
    async (_prefix: string, then?: () => void) => then?.()
  );

  const statics = PgExplorer as unknown as {
    _workspace: unknown;
    _initializedWorkspaceName: unknown;
  };
  statics._workspace = null;
  statics._initializedWorkspaceName = null;
  await PgExplorer.init();
  await PgExplorer.createWorkspace("alpha", {
    files: [["/alpha/src/lib.rs", "// alpha"]],
  });
  await PgExplorer.createWorkspace("beta", {
    files: [["/beta/src/lib.rs", "// beta"]],
  });
});

const ways: Array<[string, () => Promise<void>]> = [
  ["the channel", viaChannel],
  ["a reconcile", viaReconcile],
];

for (const [how, hear] of ways)
  describe(`heard through ${how}`, () => {
    it("follows a rename made in another tab", async () => {
      const id = PgExplorer.currentWorkspaceId;
      elsewhere.rename("beta", "renamed");

      await hear();

      expect(PgExplorer.currentWorkspaceId).toBe(id);
      expect(PgExplorer.currentWorkspaceName).toBe("renamed");
      expect(paths().every((p) => p.startsWith("/renamed/"))).toBe(true);
      // Keystrokes are looked for, and models dropped, under the old name
      expect(PgEditorModels.anyEditedUnder).toHaveBeenCalledWith(
        "/beta/",
        expect.any(Function)
      );
      expect(PgEditorModels.dropUnder).toHaveBeenCalledWith("/beta/");
      // And a save now carries the other tab's list, not this one's old copy
      expect(config().workspaces.map((w) => w.name)).toEqual([
        "alpha",
        "renamed",
      ]);
    });

    it("waits over keystrokes under the old name", async () => {
      (PgEditorModels.anyEditedUnder as jest.Mock).mockResolvedValue(true);
      elsewhere.rename("beta", "renamed");

      await hear();

      // Still the old tree, with the typing in it, until autosave lands
      expect(paths().every((p) => p.startsWith("/beta/"))).toBe(true);
    });

    it("moves on from a workspace deleted in another tab", async () => {
      elsewhere.delete("beta");

      await hear();

      expect(PgExplorer.currentWorkspaceName).toBe("alpha");
      expect(paths().every((p) => p.startsWith("/alpha/"))).toBe(true);
      expect(PgEditorModels.dropUnder).toHaveBeenCalledWith(
        "/beta/",
        expect.any(Function)
      );
      expect(config().workspaces.map((w) => w.name)).toEqual(["alpha"]);
      // Not brought back
      expect(store().has("/beta/src/lib.rs")).toBe(false);
    });

    it("empties the tree when the last one was deleted", async () => {
      elsewhere.delete("alpha");
      elsewhere.delete("beta");

      await hear();

      expect(PgExplorer.allWorkspaceNames).toEqual([]);
      expect(paths()).toEqual([]);
      expect(PgExplorer.tabs).toEqual([]);
    });
  });
