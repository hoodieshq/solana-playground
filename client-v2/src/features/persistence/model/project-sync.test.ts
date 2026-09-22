import { PgProjectSync } from "./project-sync";
import { PgSyncClient } from "./sync-client";
import { PgSyncMark } from "./sync-mark";
import { PgSession } from "../../auth";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgFs } from "../../../utils/explorer/fs";

/**
 * A stubbed `fetch` response.
 *
 * Named rather than inferred: a stub shared between a ternary's two branches
 * and a `jest.fn()` whose own return is `any` gives TypeScript no fixed point
 * to infer `json` from.
 */
type StubResponse = {
  ok: boolean;
  status?: number;
  json: () => Promise<Record<string, unknown>>;
};

const okProbe: StubResponse = {
  ok: true,
  json: async () => ({ enabled: true, db: "ok" }),
};

const signedIn = () =>
  PgSession.refreshWith({ id: "u1", name: null, image: null, login: null });

/** The in-memory stand-in from `setupTests`, where marks land */
const storedFiles = () =>
  (PgFs as unknown as { __files: Map<string, string> }).__files;

const reset = () => {
  PgSession.reset();
  PgSyncClient.reset();
  PgProjectSync.reset();
  storedFiles().clear();
};

/** The body of the most recent request */
const lastBody = () =>
  JSON.parse((global.fetch as jest.Mock).mock.calls.at(-1)![1].body);

const putCalls = () =>
  (global.fetch as jest.Mock).mock.calls.filter(
    ([url, init]) => url === "/api/projects" && init?.method === "PUT"
  );

describe("PgProjectSync", () => {
  beforeEach(reset);

  it("skips entirely when signed out", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    expect(await PgProjectSync.push("p1", { files: {} })).toBe("skipped");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("skips an unchanged snapshot rather than re-uploading it", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) =>
      url === "/api/sync"
        ? Promise.resolve(okProbe)
        : Promise.resolve({
            ok: true,
            json: async () => ({ updatedAt: "t1" }),
          })
    ) as unknown as typeof fetch;
    await signedIn();

    expect(await PgProjectSync.push("p1", { files: { a: "1" } })).toBe("ok");
    expect(await PgProjectSync.push("p1", { files: { a: "1" } })).toBe(
      "skipped"
    );
  });

  it("records what the server accepted, so the next push is a swap against it", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) =>
      url === "/api/sync"
        ? Promise.resolve(okProbe)
        : Promise.resolve({
            ok: true,
            json: async () => ({ updatedAt: "t1" }),
          })
    ) as unknown as typeof fetch;
    await signedIn();

    await PgProjectSync.push("p1", { files: { a: "1" } }, "one");
    await PgProjectSync.push("p1", { files: { a: "2" } }, "one");

    expect(lastBody().baseUpdatedAt).toBe("t1");
    expect(lastBody().name).toBe("one");
  });

  it("survives a reload: the mark is read back, not rebuilt from memory", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) =>
      url === "/api/sync"
        ? Promise.resolve(okProbe)
        : Promise.resolve({
            ok: true,
            json: async () => ({ updatedAt: "t1" }),
          })
    ) as unknown as typeof fetch;
    await signedIn();
    await PgProjectSync.push("p1", { files: { a: "1" } });

    // What a reload does to this module: every in-memory map goes, and only
    // what was written to storage is left. Before marks were persisted, this
    // is exactly where the ability to tell "behind" from "ahead" was lost.
    PgProjectSync.reset();
    await signedIn();

    expect(await PgSyncMark.read("p1")).toEqual({
      hash: expect.any(String),
      contentHash: expect.any(String),
      name: "p1",
      updatedAt: "t1",
      dirty: false,
    });
  });

  it("skips a rewrite of identical content, however dirty the mark says it is", async () => {
    // `dirty` is set by any write at all, and `PgProgramInfo` rewrites
    // `program-info.json` with the content it already had on every load. When
    // that forced an upload, every reload bumped the row -- and a bumped row
    // is exactly what the *other* browser reads as "changed elsewhere", so two
    // idle browsers generated conflicts against each other.
    global.fetch = jest.fn().mockImplementation((url: string) =>
      url === "/api/sync"
        ? Promise.resolve(okProbe)
        : Promise.resolve({
            ok: true,
            json: async () => ({ updatedAt: "t1" }),
          })
    ) as unknown as typeof fetch;
    await signedIn();

    await PgProjectSync.push("p1", { files: { a: "1" } }, "one");
    await PgSyncMark.markDirty("p1");
    expect((await PgSyncMark.read("p1"))?.dirty).toBe(true);

    expect(await PgProjectSync.push("p1", { files: { a: "1" } }, "one")).toBe(
      "skipped"
    );
  });

  it("uploads a rename, which changes no bytes at all", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) =>
      url === "/api/sync"
        ? Promise.resolve(okProbe)
        : Promise.resolve({
            ok: true,
            json: async () => ({ updatedAt: "t1" }),
          })
    ) as unknown as typeof fetch;
    await signedIn();

    await PgProjectSync.push("p1", { files: { a: "1" } }, "one");
    expect(await PgProjectSync.push("p1", { files: { a: "1" } }, "two")).toBe(
      "ok"
    );
    expect(lastBody().name).toBe("two");
  });

  it("keeps marks apart per account", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) =>
      url === "/api/sync"
        ? Promise.resolve(okProbe)
        : Promise.resolve({
            ok: true,
            json: async () => ({ updatedAt: "t1" }),
          })
    ) as unknown as typeof fetch;

    // A tutorial's id is derived from its name, so it is byte-identical in
    // every account. Sharing marks would have the second user's push checked
    // against the first user's token, and refused for good.
    await signedIn();
    await PgProjectSync.push("tut:hello", { files: { a: "1" } });
    expect(await PgSyncMark.read("tut:hello")).not.toBeNull();

    await PgSession.refreshWith({
      id: "u2",
      name: null,
      image: null,
      login: null,
    });
    expect(await PgSyncMark.read("tut:hello")).toBeNull();
  });

  it("lists nothing when signed out, rather than calling the server", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    expect(await PgProjectSync.list()).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("lists the server's projects", async () => {
    const projects = [
      { id: "p1", name: "one", kind: "project", updatedAt: "t1" },
    ];
    global.fetch = jest
      .fn()
      .mockImplementation((url: string) =>
        url === "/api/sync"
          ? Promise.resolve(okProbe)
          : Promise.resolve({ ok: true, json: async () => ({ projects }) })
      ) as unknown as typeof fetch;
    await signedIn();

    expect(await PgProjectSync.list()).toEqual(projects);
  });
});

describe("a conflict is asked once, not retried forever", () => {
  const refusal: StubResponse = {
    ok: false,
    status: 409,
    json: async () => ({ conflict: true, updatedAt: "t9" }),
  };

  beforeEach(reset);

  it("stops pushing the project until the user has answered", async () => {
    // The bug this replaces: the 409 left the stale token in place and did not
    // record the hash, so the editor's debounce re-sent the same doomed swap
    // every few seconds for the life of the page, and the project never synced
    // again.
    global.fetch = jest
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(url === "/api/sync" ? okProbe : refusal)
      ) as unknown as typeof fetch;
    await signedIn();

    expect(await PgProjectSync.push("p1", { files: { a: "1" } })).toBe(
      "conflict"
    );
    expect(await PgProjectSync.push("p1", { files: { a: "2" } })).toBe(
      "skipped"
    );
    expect(await PgProjectSync.push("p1", { files: { a: "3" } })).toBe(
      "skipped"
    );

    expect(putCalls()).toHaveLength(1);
  });

  it("leaves other projects alone", async () => {
    global.fetch = jest.fn().mockImplementation((url: string, init: any) => {
      if (url === "/api/sync") return Promise.resolve(okProbe);
      return Promise.resolve(
        JSON.parse(init.body).id === "p1"
          ? refusal
          : { ok: true, json: async () => ({ updatedAt: "t2" }) }
      );
    }) as unknown as typeof fetch;
    await signedIn();

    expect(await PgProjectSync.push("p1", { files: { a: "1" } })).toBe(
      "conflict"
    );
    expect(await PgProjectSync.push("p2", { files: { a: "1" } })).toBe("ok");
  });

  it("announces the conflict, and announces it being settled", async () => {
    // The banner had no way to hear the second half, so once shown it stayed
    // up for the rest of the session -- over unrelated projects included.
    let status = 409;
    global.fetch = jest.fn().mockImplementation((url: string) =>
      url === "/api/sync"
        ? Promise.resolve(okProbe)
        : Promise.resolve({
            ok: status === 200,
            status,
            json: async () =>
              status === 200
                ? { updatedAt: "t2" }
                : { conflict: true, updatedAt: "t9" },
          })
    ) as unknown as typeof fetch;
    await signedIn();

    let changes = 0;
    PgProjectSync.onDidChangeConflicts(() => changes++);

    await PgProjectSync.push("p1", { files: { a: "1" } });
    expect(changes).toBe(1);
    expect(PgProjectSync.conflictFor("p1")).toEqual({
      projectId: "p1",
      kind: "divergent",
    });

    status = 200;
    await PgProjectSync.push("p1", { files: { a: "2" } }, undefined, {
      force: true,
    });
    expect(changes).toBe(2);
    expect(PgProjectSync.conflictFor("p1")).toBeNull();
  });
});

describe("resolving a conflict", () => {
  const asWorkspace = (id: string, name: string) => {
    jest.spyOn(PgExplorer, "currentWorkspaceId", "get").mockReturnValue(id);
    jest.spyOn(PgExplorer, "currentWorkspaceName", "get").mockReturnValue(name);
    jest.spyOn(PgExplorer, "workspaceNameOf").mockReturnValue(name);
    jest
      .spyOn(PgExplorer, "getAllFiles")
      .mockReturnValue([[`/${name}/src/lib.rs`, "mine"]]);
  };

  beforeEach(reset);
  afterEach(() => jest.restoreAllMocks());

  it("sends force when the user keeps this device's version", async () => {
    // `force` is the server's third door and nothing ever opened it: the
    // banner documented it as the recovery and no client code sent it.
    let status = 409;
    global.fetch = jest.fn().mockImplementation((url: string) =>
      url === "/api/sync"
        ? Promise.resolve(okProbe)
        : Promise.resolve({
            ok: status === 200,
            status,
            json: async () =>
              status === 200
                ? { updatedAt: "t2" }
                : { conflict: true, updatedAt: "t9" },
          })
    ) as unknown as typeof fetch;
    await signedIn();
    asWorkspace("p1", "mine");

    await PgProjectSync.pushCurrent();
    expect(PgProjectSync.conflictFor("p1")).not.toBeNull();

    status = 200;
    expect(await PgProjectSync.resolve("p1", "keep-local")).toBe(true);

    const body = lastBody();
    expect(body.force).toBe(true);
    expect(body.baseUpdatedAt).toBeUndefined();
    expect(body.snapshot.files["src/lib.rs"]).toBe("mine");
    expect(PgProjectSync.conflictFor("p1")).toBeNull();
  });

  it("takes the server's files when the user picks the other version", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === "/api/sync") return Promise.resolve(okProbe);
      if (url.includes("id=p1")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            project: {
              id: "p1",
              name: "mine",
              kind: "project",
              snapshot: { files: { "src/lib.rs": "theirs" } },
              updatedAt: "t9",
            },
          }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 409,
        json: async () => ({ conflict: true, updatedAt: "t9" }),
      });
    }) as unknown as typeof fetch;
    await signedIn();
    asWorkspace("p1", "mine");
    const replace = jest
      .spyOn(PgExplorer, "replaceWorkspaceFiles")
      .mockResolvedValue(undefined);
    jest.spyOn(PgExplorer, "switchWorkspace").mockResolvedValue(undefined);

    await PgProjectSync.pushCurrent();
    expect(await PgProjectSync.resolve("p1", "take-server")).toBe(true);

    expect(replace).toHaveBeenCalledWith("mine", { "src/lib.rs": "theirs" });
    expect(PgProjectSync.conflictFor("p1")).toBeNull();
    // The mark now says the server's copy, so nothing is pushed back up
    expect((await PgSyncMark.read("p1"))?.updatedAt).toBe("t9");
  });

  it("re-reads the workspace it just replaced, so the editor stops showing the old code", async () => {
    // `replaceWorkspaceFiles` writes to the backing store and leaves the
    // in-memory copy alone, and only the *current* workspace has one. Without
    // a forced re-read the user keeps looking at the version they chose to
    // discard -- and worse, the next debounce uploads it back over the one
    // they chose to keep.
    //
    // `switchWorkspace` is not enough on its own: `_initCurrentWorkspace`
    // skips when the workspace is already the initialized one.
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === "/api/sync") return Promise.resolve(okProbe);
      return Promise.resolve({
        ok: true,
        json: async () => ({
          project: {
            id: "p1",
            name: "mine",
            kind: "project",
            snapshot: { files: { "src/lib.rs": "theirs" } },
            updatedAt: "t9",
          },
        }),
      });
    }) as unknown as typeof fetch;
    await signedIn();
    asWorkspace("p1", "mine");
    jest
      .spyOn(PgExplorer, "replaceWorkspaceFiles")
      .mockResolvedValue(undefined);
    const reload = jest
      .spyOn(PgExplorer, "switchWorkspace")
      .mockResolvedValue(undefined);

    await PgProjectSync.adopt("p1");

    expect(reload).toHaveBeenCalledWith("mine");
  });

  it("does not re-read a project the user is not looking at", async () => {
    // Only the current workspace is held in memory, so re-opening any other
    // would be a navigation the user did not ask for
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === "/api/sync") return Promise.resolve(okProbe);
      return Promise.resolve({
        ok: true,
        json: async () => ({
          project: {
            id: "p2",
            name: "other",
            kind: "project",
            snapshot: { files: { "src/lib.rs": "theirs" } },
            updatedAt: "t9",
          },
        }),
      });
    }) as unknown as typeof fetch;
    await signedIn();
    asWorkspace("p1", "mine");
    jest.spyOn(PgExplorer, "workspaceNameOf").mockReturnValue("other");
    jest
      .spyOn(PgExplorer, "replaceWorkspaceFiles")
      .mockResolvedValue(undefined);
    const reload = jest
      .spyOn(PgExplorer, "switchWorkspace")
      .mockResolvedValue(undefined);

    await PgProjectSync.adopt("p2");

    expect(reload).not.toHaveBeenCalled();
  });

  it("refuses to empty a workspace over a malformed snapshot", async () => {
    // `replaceWorkspaceFiles` removes the directory before it discovers there
    // is nothing to write back, so an unusable snapshot is not a no-op -- it
    // is the project being deleted on every device that syncs it.
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === "/api/sync") return Promise.resolve(okProbe);
      return Promise.resolve({
        ok: true,
        json: async () => ({
          project: {
            id: "p1",
            name: "mine",
            kind: "project",
            snapshot: { files: null },
            updatedAt: "t9",
          },
        }),
      });
    }) as unknown as typeof fetch;
    await signedIn();
    asWorkspace("p1", "mine");
    const replace = jest
      .spyOn(PgExplorer, "replaceWorkspaceFiles")
      .mockResolvedValue(undefined);

    expect(await PgProjectSync.adopt("p1")).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("PgProjectSync.pushCurrent", () => {
  const okPush = { ok: true, json: async () => ({ updatedAt: "t1" }) };

  const asWorkspace = (id: string | undefined, name: string | undefined) => {
    jest.spyOn(PgExplorer, "currentWorkspaceId", "get").mockReturnValue(id);
    jest.spyOn(PgExplorer, "currentWorkspaceName", "get").mockReturnValue(name);
    jest
      .spyOn(PgExplorer, "getAllFiles")
      .mockReturnValue([[`/${name}/src/lib.rs`, "fn main() {}"]]);
  };

  beforeEach(() => {
    reset();
    global.fetch = jest
      .fn()
      .mockImplementation((url: string) =>
        url === "/api/sync" ? Promise.resolve(okProbe) : Promise.resolve(okPush)
      ) as unknown as typeof fetch;
  });

  afterEach(() => jest.restoreAllMocks());

  it("uploads the workspace the user is looking at", async () => {
    asWorkspace("tut:hello-anchor", "Hello Anchor");
    await signedIn();

    expect(await PgProjectSync.pushCurrent()).toBe("ok");
    expect(lastBody().id).toBe("tut:hello-anchor");
    expect(lastBody().snapshot.files["src/lib.rs"]).toBe("fn main() {}");
  });

  it("names it as the user sees it, not by its id", async () => {
    // The id is all the origin device had to go on, so a tutorial arrived on
    // the second browser called "tut:hello-anchor" -- a name `PgTutorial` does
    // not recognise, leaving the tutorial looking unstarted there
    asWorkspace("tut:hello-anchor", "Hello Anchor");
    await signedIn();

    await PgProjectSync.pushCurrent();
    expect(lastBody().name).toBe("Hello Anchor");
  });

  it("refuses to upload an empty snapshot over a project that has one", async () => {
    // The explorer clears its file map before re-reading a workspace from the
    // store, so a push landing in that window builds nothing at all. Taking
    // another device's copy re-opens the workspace, which is precisely when a
    // push is most likely to be pending -- so the version the user asked to
    // keep would be replaced by an empty project.
    asWorkspace("p1", "mine");
    jest.spyOn(PgExplorer, "getAllFiles").mockReturnValue([]);
    await signedIn();

    expect(await PgProjectSync.pushCurrent()).toBe("skipped");
    expect(putCalls()).toHaveLength(0);
  });

  it("does nothing when there is no workspace to push", async () => {
    asWorkspace(undefined, undefined);
    await signedIn();

    expect(await PgProjectSync.pushCurrent()).toBe("skipped");
    expect(putCalls()).toHaveLength(0);
  });
});

describe("deleting a project", () => {
  beforeEach(reset);

  it("tells the server, so a reload does not bring it back", async () => {
    // The tombstone machinery, its `deleted_at` column and its "does not
    // resurrect" tests were all server-side only: nothing ever issued the
    // DELETE, so deleting a project was undone by the next reconcile.
    global.fetch = jest
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          url === "/api/sync"
            ? okProbe
            : { ok: true, json: async () => ({ deleted: true }) }
        )
      ) as unknown as typeof fetch;
    await signedIn();

    expect(await PgProjectSync.remove("p1")).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/projects?id=p1",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

describe("holding pushes until the account is reconciled", () => {
  beforeEach(() => {
    reset();
    global.fetch = jest
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          url === "/api/sync"
            ? okProbe
            : { ok: true, json: async () => ({ updatedAt: "t1" }) }
        )
      ) as unknown as typeof fetch;
  });

  it("does not let a push out before the first reconcile", async () => {
    await signedIn();
    PgProjectSync.holdPushes();

    let done = false;
    const push = PgProjectSync.push("p1", { files: { a: "1" } }).then((r) => {
      done = true;
      return r;
    });
    await Promise.resolve();
    expect(done).toBe(false);

    PgProjectSync.releasePushes();
    expect(await push).toBe("ok");
  });

  it("is inert once released, so later pushes go straight out", async () => {
    await signedIn();
    PgProjectSync.holdPushes();
    PgProjectSync.releasePushes();

    expect(await PgProjectSync.push("p1", { files: { a: "1" } })).toBe("ok");
  });

  it("holds nothing by default, so a caller that never reconciles still works", async () => {
    await signedIn();
    expect(await PgProjectSync.push("p1", { files: { a: "1" } })).toBe("ok");
  });
});
