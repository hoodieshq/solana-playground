import { PgProjectSync } from "./project-sync";
import { PgSyncClient } from "./sync-client";
import { reconcile, releaseLocalProjects } from "./project-restore";
import { PgSession } from "../../auth";
import { projectSync } from "../../../effects/project-sync/project-sync";
import { PgCommon } from "../../../utils/common";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgFs } from "../../../utils/explorer/fs";

/**
 * One person, two browsers.
 *
 * The halves are unit-tested either side of the wire, and both were
 * individually fine while the feature did not work: nothing uploaded a project
 * that had not been typed in since signing in, what did upload named itself by
 * its id, and a single refused write left the project unable to sync for the
 * rest of the page's life. None of those shows up in a test of one side.
 *
 * The server here is a stand-in that keeps the `/api/projects` contract --
 * including its three write modes, because which one a client takes is most of
 * what this file is about. The real one is covered against a real database in
 * `src/features/persistence/server/projects.test.mjs`.
 */

interface StoredProject {
  id: string;
  name: string;
  kind: string;
  snapshot: unknown;
  updatedAt: string;
  deleted?: boolean;
}

const server = new Map<string, StoredProject>();

/** Monotonic, because two writes in the same millisecond would tie */
let clock = 0;
const tick = () => `2026-01-01T00:00:${String(++clock).padStart(2, "0")}.000Z`;

const fakeFetch = async (url: string, init?: RequestInit) => {
  if (url === "/api/sync") {
    return { ok: true, json: async () => ({ enabled: true, db: "ok" }) };
  }

  if (init?.method === "DELETE") {
    const id = new URL(url, "http://x").searchParams.get("id")!;
    const existing = server.get(id);
    if (existing) {
      existing.deleted = true;
      existing.snapshot = null;
    }
    return { ok: true, json: async () => ({ deleted: true }) };
  }

  if (init?.method === "PUT") {
    const body = JSON.parse(init.body as string);
    const existing = server.get(body.id);
    const live = existing && !existing.deleted ? existing : null;

    const refuse = () => ({
      ok: false,
      status: 409,
      json: async () => ({
        conflict: true,
        updatedAt: live ? live.updatedAt : null,
      }),
    });

    if (!body.force) {
      if (body.baseUpdatedAt) {
        // Compare-and-swap: the write lands only if the row still holds the
        // timestamp this client read
        if (!live || live.updatedAt !== body.baseUpdatedAt) return refuse();
      } else if (live && live.snapshot !== null) {
        // Create-only. A row with no snapshot is adoptable -- a chat turn
        // creates one before the project's own first upload.
        return refuse();
      } else if (existing?.deleted) {
        return refuse();
      }
    }

    const stored: StoredProject = {
      id: body.id,
      name: body.name,
      kind: body.kind,
      snapshot: body.snapshot,
      updatedAt: tick(),
    };
    server.set(stored.id, stored);
    return { ok: true, json: async () => ({ updatedAt: stored.updatedAt }) };
  }

  const id = new URL(url, "http://x").searchParams.get("id");
  const live = [...server.values()].filter((p) => !p.deleted);
  if (id) {
    const project = server.get(id);
    return project && !project.deleted
      ? { ok: true, json: async () => ({ project }) }
      : { ok: false, status: 404, json: async () => ({}) };
  }
  return { ok: true, json: async () => ({ projects: live }) };
};

const storedFiles = () =>
  (PgFs as unknown as { __files: Map<string, string> }).__files;

const signedIn = () =>
  PgSession.refreshWith({ id: "u1", name: null, image: null, login: null });

/**
 * Point the module statics at one browser.
 *
 * Marks live in `PgFs`, which is shared across every `asDevice` call in a
 * test, so a test that means "a different browser" clears them explicitly.
 */
const asDevice = (
  workspaces: Array<{ id: string; name: string }>,
  content = "declare_id!();"
) => {
  const current = workspaces[0];
  jest
    .spyOn(PgExplorer, "currentWorkspaceId", "get")
    .mockReturnValue(current?.id);
  jest
    .spyOn(PgExplorer, "currentWorkspaceName", "get")
    .mockReturnValue(current?.name);
  jest
    .spyOn(PgExplorer, "allWorkspaceNames", "get")
    // Read through to the list rather than snapshotting it, so a test that
    // removes a workspace mid-way sees the explorer it would really have
    .mockImplementation(() => workspaces.map((w) => w.name));
  jest
    .spyOn(PgExplorer, "workspaceIdOf")
    .mockImplementation(
      (name) => workspaces.find((w) => w.name === name)?.id as string
    );
  jest
    .spyOn(PgExplorer, "workspaceNameOf")
    .mockImplementation(
      (id) => workspaces.find((w) => w.id === id)?.name as string
    );
  jest
    .spyOn(PgExplorer, "getAllFiles")
    .mockReturnValue(current ? [[`/${current.name}/src/lib.rs`, content]] : []);
  return jest
    .spyOn(PgExplorer, "importWorkspace")
    .mockResolvedValue(undefined as never);
};

/** Everything a fresh browser starts without */
const asFreshDevice = (
  workspaces: Array<{ id: string; name: string }>,
  content?: string
) => {
  PgProjectSync.reset();
  storedFiles().clear();
  jest.restoreAllMocks();
  return asDevice(workspaces, content);
};

const setUp = () => {
  server.clear();
  clock = 0;
  PgSession.reset();
  PgSyncClient.reset();
  PgProjectSync.reset();
  storedFiles().clear();
  global.fetch = jest.fn(fakeFetch) as unknown as typeof fetch;
};

/**
 * A write from the *other* browser.
 *
 * Applied to the stand-in server directly rather than through
 * `PgProjectSync`: that would record a sync mark, and the mark is this
 * device's record of what it uploaded. Routing the other device's write
 * through it would hand this device an agreement it never made.
 */
const otherDeviceWrote = (id: string, content: string) => {
  const existing = server.get(id)!;
  server.set(id, {
    ...existing,
    snapshot: { files: { "src/lib.rs": content } },
    updatedAt: tick(),
  });
};

/** The other browser deleted it, so the row is tombstoned */
const otherDeviceDeleted = (id: string) => {
  const existing = server.get(id)!;
  server.set(id, { ...existing, deleted: true, snapshot: null });
};

const HELLO = { id: "tut:hello-anchor", name: "Hello Anchor" };

describe("a tutorial started on one browser, opened on another", () => {
  beforeEach(setUp);
  afterEach(() => jest.restoreAllMocks());

  it("arrives under the name the user knows it by", async () => {
    asDevice([HELLO]);
    await signedIn();
    expect(await PgProjectSync.pushCurrent()).toBe("ok");

    const importWorkspace = asFreshDevice([]);
    await signedIn();

    expect((await reconcile()).imported).toEqual(["Hello Anchor"]);
    expect(importWorkspace).toHaveBeenCalledWith("Hello Anchor", {
      id: "tut:hello-anchor",
      files: { "src/lib.rs": "declare_id!();" },
    });
  });

  it("asks nothing when the second browser's copy is already identical", async () => {
    // The id is derived from the name, so opening the tutorial by link on a
    // second browser mints the same id there. Same bytes, nothing to decide.
    asDevice([HELLO]);
    await signedIn();
    await PgProjectSync.pushCurrent();

    const importWorkspace = asFreshDevice([HELLO]);
    await signedIn();
    const result = await reconcile();

    expect(result.imported).toEqual([]);
    expect(result.conflicts).toEqual([]);
    expect(importWorkspace).not.toHaveBeenCalled();
    // and having recorded the agreement, it does not push it back up
    expect(await PgProjectSync.pushCurrent()).toBe("skipped");
  });

  it("asks when the second browser's copy has different work in it", async () => {
    asDevice([HELLO]);
    await signedIn();
    await PgProjectSync.pushCurrent();

    const replace = jest
      .spyOn(PgExplorer, "replaceWorkspaceFiles")
      .mockResolvedValue(undefined as never);
    asFreshDevice([HELLO], "my own half-finished attempt");
    await signedIn();

    const result = await reconcile();

    expect(result.conflicts).toEqual([
      { projectId: "tut:hello-anchor", kind: "divergent" },
    ]);
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("work that never reached the server", () => {
  beforeEach(setUp);
  afterEach(() => jest.restoreAllMocks());

  /**
   * The sequence the old code lost an afternoon to: this device pushes, then
   * edits again while the push fails, while the other device writes.
   */
  const diverge = async () => {
    asDevice([HELLO]);
    await signedIn();
    await PgProjectSync.pushCurrent();

    otherDeviceWrote(HELLO.id, "the other device");

    // ...and this device has local work it never managed to upload
    jest
      .spyOn(PgExplorer, "getAllFiles")
      .mockReturnValue([[`/${HELLO.name}/src/lib.rs`, "an afternoon of work"]]);
  };

  it("is not overwritten by a reload", async () => {
    await diverge();
    const replace = jest
      .spyOn(PgExplorer, "replaceWorkspaceFiles")
      .mockResolvedValue(undefined as never);

    const result = await reconcile();

    expect(replace).not.toHaveBeenCalled();
    expect(result.conflicts).toEqual([
      { projectId: HELLO.id, kind: "divergent" },
    ]);
  });

  it("stops being retried, instead of 409ing for the life of the page", async () => {
    await diverge();
    await reconcile();

    const before = (global.fetch as jest.Mock).mock.calls.length;
    expect(await PgProjectSync.pushCurrent()).toBe("skipped");
    expect(await PgProjectSync.pushCurrent()).toBe("skipped");
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(before);
  });

  it("uploads this device's copy when the user keeps it", async () => {
    await diverge();
    await reconcile();

    expect(await PgProjectSync.resolve(HELLO.id, "keep-local")).toBe(true);

    expect(server.get(HELLO.id)!.snapshot).toEqual({
      files: { "src/lib.rs": "an afternoon of work" },
    });
    expect(PgProjectSync.conflictFor(HELLO.id)).toBeNull();
    // and the project syncs normally again afterwards
    expect(await PgProjectSync.pushCurrent()).toBe("skipped");
  });

  it("takes the other device's copy when the user picks that", async () => {
    await diverge();
    await reconcile();
    const replace = jest
      .spyOn(PgExplorer, "replaceWorkspaceFiles")
      .mockResolvedValue(undefined as never);
    jest.spyOn(PgExplorer, "switchWorkspace").mockResolvedValue(undefined);

    expect(await PgProjectSync.resolve(HELLO.id, "take-server")).toBe(true);

    expect(replace).toHaveBeenCalledWith(HELLO.name, {
      "src/lib.rs": "the other device",
    });
    expect(PgProjectSync.conflictFor(HELLO.id)).toBeNull();
  });
});

describe("deleting on one device", () => {
  beforeEach(setUp);
  afterEach(() => jest.restoreAllMocks());

  it("removes it from this one too, and does not resurrect it", async () => {
    // This browser is in sync with the account, and then the project is
    // deleted elsewhere. The tombstone is what tells the difference between
    // that and a project this device simply never uploaded.
    asDevice([HELLO]);
    await signedIn();
    await PgProjectSync.pushCurrent();

    otherDeviceDeleted(HELLO.id);

    const deleteWorkspace = jest
      .spyOn(PgExplorer, "deleteWorkspace")
      .mockResolvedValue(undefined as never);
    const importWorkspace = jest
      .spyOn(PgExplorer, "importWorkspace")
      .mockResolvedValue(undefined as never);

    const result = await reconcile();

    expect(importWorkspace).not.toHaveBeenCalled();
    expect(deleteWorkspace).toHaveBeenCalledWith(HELLO.name);
    expect(result.removed).toEqual([HELLO.name]);
  });

  it("asks this one before removing work it never uploaded", async () => {
    asDevice([HELLO]);
    await signedIn();
    await PgProjectSync.pushCurrent();

    otherDeviceDeleted(HELLO.id);
    // ...and only then does this device get work that never uploaded
    jest
      .spyOn(PgExplorer, "getAllFiles")
      .mockReturnValue([[`/${HELLO.name}/src/lib.rs`, "unsaved"]]);
    const deleteWorkspace = jest
      .spyOn(PgExplorer, "deleteWorkspace")
      .mockResolvedValue(undefined as never);

    const result = await reconcile();

    expect(deleteWorkspace).not.toHaveBeenCalled();
    expect(result.conflicts).toEqual([
      { projectId: HELLO.id, kind: "deleted-elsewhere" },
    ]);
  });
});

describe("picking up where the account left off", () => {
  beforeEach(setUp);
  afterEach(() => jest.restoreAllMocks());

  it("names the most recently touched project, so it can be opened", async () => {
    asDevice([{ id: "older", name: "Older" }]);
    await signedIn();
    await PgProjectSync.pushCurrent();
    jest.restoreAllMocks();
    asDevice([{ id: "newer", name: "Newer" }]);
    await PgProjectSync.pushCurrent();

    asFreshDevice([]);
    await signedIn();

    expect((await reconcile()).latest).toBe("Newer");
  });

  it("hands over a project made before signing in", async () => {
    // Only the editor's change handler used to push, so a project that was
    // made and then left alone never reached the account at all
    asDevice([{ id: "local-only", name: "Scratch" }]);
    await signedIn();

    const result = await reconcile();

    expect(result.pushed).toEqual(["Scratch"]);
    expect(server.get("local-only")!.snapshot).toEqual({
      files: { "src/lib.rs": "declare_id!();" },
    });
  });

  it("pushes from inside the gate it is holding", async () => {
    // `reconcile` runs with pushes held, and releases them when it returns.
    // A push issued from inside it that waited on that gate would wait for
    // itself, and the pass would hang with nothing uploaded -- which is what
    // happened, and which no test mocking `push` could ever see.
    asDevice([{ id: "local-only", name: "Scratch" }]);
    await signedIn();
    PgProjectSync.holdPushes();

    const result = await Promise.race([
      reconcile(),
      new Promise<"hung">((resolve) => setTimeout(() => resolve("hung"), 1000)),
    ]);

    expect(result).not.toBe("hung");
    expect(server.get("local-only")).toBeDefined();
    PgProjectSync.releasePushes();
  });
});

describe("signing out of a browser", () => {
  beforeEach(setUp);
  afterEach(() => jest.restoreAllMocks());

  /**
   * Take the workspace off this device the way `PgExplorer` does.
   *
   * The event at the end is the point: the real `deleteWorkspace` dispatches
   * it unconditionally, and the `project-sync` effect is subscribed to it.
   */
  const explorerForgets = (workspaces: Array<{ id: string; name: string }>) =>
    jest
      .spyOn(PgExplorer, "deleteWorkspace")
      .mockImplementation(async (name?: string) => {
        const index = workspaces.findIndex((w) => w.name === name);
        if (index >= 0) workspaces.splice(index, 1);
        PgCommon.createAndDispatchCustomEvent(
          PgExplorer.events.ON_DID_DELETE_WORKSPACE
        );
      });

  it("leaves the account's projects on the server", async () => {
    // Sign-out removes this browser's copy of projects the account keeps, so
    // the next person here is not shown them. It is not the user deleting
    // their work -- but it reaches the `project-sync` effect as the same
    // event, and that effect answers a workspace that no longer resolves by
    // tombstoning it. Signing out therefore emptied the account, and signing
    // back in restored nothing because there was nothing left to restore.
    const workspaces = [{ id: "p1", name: "Alpha" }];
    asDevice(workspaces);
    await signedIn();

    // On the server, and this device's mark says so -- which is what makes it
    // eligible for release in the first place
    await reconcile();
    expect(server.get("p1")!.snapshot).toBeTruthy();

    explorerForgets(workspaces);
    const effect = projectSync();
    try {
      await releaseLocalProjects();
      // The effect's subscriber awaits the mark listing and then a call per
      // orphaned project
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      effect.dispose();
    }

    expect(server.get("p1")!.deleted).toBeFalsy();
    expect(server.get("p1")!.snapshot).toBeTruthy();
  });

  it("gives them back on the next sign-in", async () => {
    // The whole round trip, which is how this was reported: sign out, sign
    // back in, and the projects list is empty -- and stays empty through a
    // reload, because the emptiness is on the server by then
    const workspaces = [{ id: "p1", name: "Alpha" }];
    asDevice(workspaces);
    await signedIn();
    await reconcile();

    explorerForgets(workspaces);
    const effect = projectSync();
    try {
      await releaseLocalProjects();
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      effect.dispose();
    }
    // Gone from this browser, which is the point of releasing it
    expect(workspaces).toEqual([]);

    // Signing back in. The marks were left behind on purpose and the
    // workspace was not, which is exactly the "never had it" case.
    const result = await reconcile();

    expect(result.imported).toEqual(["Alpha"]);
  });

  it("still tombstones a project the user deletes by hand", async () => {
    // The other half of the same event. Without this the fix is just a
    // disabled delete, and a project removed here comes back on the next load.
    const workspaces = [{ id: "p1", name: "Alpha" }];
    asDevice(workspaces);
    await signedIn();
    await reconcile();

    explorerForgets(workspaces);
    const effect = projectSync();
    try {
      await PgExplorer.deleteWorkspace("Alpha");
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      effect.dispose();
    }

    expect(server.get("p1")!.deleted).toBe(true);
  });
});
