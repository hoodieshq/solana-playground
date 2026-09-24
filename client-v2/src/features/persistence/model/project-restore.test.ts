import { reconcile, releaseLocalProjects } from "./project-restore";
import { PgProjectSync } from "./project-sync";
import { hashSnapshot, hashUserFiles } from "./snapshot";
import { PgSyncMark } from "./sync-mark";
import { PgSession } from "../../auth";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgFs } from "../../../utils/explorer/fs";
import type { ServerProject } from "./project-sync";
import type { Snapshot } from "./snapshot";

const project = (
  id: string,
  name: string,
  updatedAt = "2026-01-01T00:00:00.000Z"
): ServerProject => ({ id, name, kind: "project", updatedAt });

const storedFiles = () =>
  (PgFs as unknown as { __files: Map<string, string> }).__files;

const signedIn = () =>
  PgSession.refreshWith({ id: "u1", name: null, image: null, login: null });

/** Pretend the explorer holds these workspaces, name -> id */
const withLocal = (local: Record<string, string>) => {
  jest
    .spyOn(PgExplorer, "allWorkspaceNames", "get")
    .mockReturnValue(Object.keys(local));
  jest
    .spyOn(PgExplorer, "workspaceIdOf")
    .mockImplementation((name: string) => local[name]);
  jest
    .spyOn(PgExplorer, "workspaceNameOf")
    .mockImplementation((id: string) =>
      Object.keys(local).find((name) => local[name] === id)
    );
  // Nothing is "current", so every local snapshot is read off the store --
  // which is what reconcile does for the projects the user is not looking at
  jest
    .spyOn(PgExplorer, "currentWorkspaceName", "get")
    .mockReturnValue(undefined);
};

/** Put a workspace's files where `buildSnapshotOf` will find them */
const withFiles = (name: string, files: Record<string, string>) => {
  for (const [path, content] of Object.entries(files)) {
    storedFiles().set(`/${name}/${path}`, content);
  }
};

const stubCreation = () => {
  const created: { name: string; id?: string }[] = [];
  jest
    .spyOn(PgExplorer, "importWorkspace")
    .mockImplementation(async (name: string, opts: { id: string }) => {
      created.push({ name, id: opts.id });
    });
  return created;
};

const serverHas = (
  projects: ServerProject[],
  snapshots: Record<string, Snapshot | null> = {}
) => {
  jest.spyOn(PgProjectSync, "list").mockResolvedValue(projects);
  jest.spyOn(PgProjectSync, "fetch").mockImplementation(async (id: string) => {
    const found = projects.find((p) => p.id === id);
    if (!found) return null;
    return {
      ...found,
      snapshot: id in snapshots ? snapshots[id] : { files: {} },
    };
  });
};

/** Record that this device and the server agreed on `snapshot` at `updatedAt` */
const agreed = async (
  id: string,
  snapshot: Snapshot,
  updatedAt: string,
  name = "alpha"
) => {
  await PgSyncMark.write(id, {
    hash: await hashSnapshot(snapshot),
    contentHash: await hashUserFiles(snapshot),
    name,
    updatedAt,
    dirty: false,
  });
};

/**
 * The same, plus an edit made since -- which is what the effect records before
 * it attempts the upload, so this is the state a failed or interrupted push
 * leaves behind.
 */
const pending = async (
  id: string,
  snapshot: Snapshot,
  updatedAt: string,
  name = "alpha"
) => {
  await PgSyncMark.write(id, {
    hash: await hashSnapshot(snapshot),
    contentHash: await hashUserFiles(snapshot),
    name,
    updatedAt,
    dirty: true,
  });
};

describe("reconcile", () => {
  beforeEach(async () => {
    PgSession.reset();
    PgProjectSync.reset();
    storedFiles().clear();
    await signedIn();
    // The probe behind this reaches the network; the server's *answers* are
    // what these tests stub, one layer up
    jest.spyOn(PgProjectSync, "isAvailable").mockResolvedValue(true);
  });

  afterEach(() => jest.restoreAllMocks());

  it("matches on id, not name, so a local project sharing a name is left alone", async () => {
    withLocal({ alpha: "local-uuid" });
    withFiles("alpha", { "src/lib.rs": "local" });
    const created = stubCreation();
    jest.spyOn(PgProjectSync, "push").mockResolvedValue("ok");
    serverHas([project("server-uuid", "alpha")]);

    const result = await reconcile();

    expect(result.imported).toEqual(["alpha (imported)"]);
    expect(created[0].id).toBe("server-uuid");
  });

  it("does not replace a local copy that has work the server never got", async () => {
    // This is the failure the whole design exists to prevent: the old version
    // replaced unconditionally, so a push that had failed -- offline, or a tab
    // closed mid-debounce -- was resolved on the next load by deleting the
    // work and writing the server's older copy over it.
    withLocal({ alpha: "p1" });
    withFiles("alpha", { "src/lib.rs": "an afternoon of work" });
    await agreed("p1", { files: { "src/lib.rs": "old" } }, "t1");
    const replace = jest
      .spyOn(PgExplorer, "replaceWorkspaceFiles")
      .mockResolvedValue(undefined as never);
    serverHas([project("p1", "alpha", "t2")], {
      p1: { files: { "src/lib.rs": "the other device" } },
    });

    const result = await reconcile();

    expect(replace).not.toHaveBeenCalled();
    expect(result.conflicts).toEqual([{ projectId: "p1", kind: "divergent" }]);
    expect(PgProjectSync.conflictFor("p1")).not.toBeNull();
  });

  it("takes the server's copy when this device has nothing pending", async () => {
    withLocal({ alpha: "p1" });
    withFiles("alpha", { "src/lib.rs": "old" });
    await agreed("p1", { files: { "src/lib.rs": "old" } }, "t1");
    const replace = jest
      .spyOn(PgExplorer, "replaceWorkspaceFiles")
      .mockResolvedValue(undefined as never);
    serverHas([project("p1", "alpha", "t2")], {
      p1: { files: { "src/lib.rs": "newer" } },
    });

    const result = await reconcile();

    expect(replace).toHaveBeenCalledWith("alpha", { "src/lib.rs": "newer" });
    expect(result.replaced).toEqual(["alpha"]);
    expect(result.conflicts).toEqual([]);
  });

  it("trusts the hash over the dirty flag, and does not ask about an untouched project", async () => {
    // `dirty` is a hint that saves reconcile from hashing every project; the
    // hash is the truth. Treating the flag as decisive made a project that had
    // merely been *opened* -- the switch event flags it on every load -- read
    // as having unsaved work, so taking the server's copy silently became
    // unreachable and any difference turned into a question.
    withLocal({ alpha: "p1" });
    withFiles("alpha", { "src/lib.rs": "exactly what was uploaded" });
    await pending(
      "p1",
      { files: { "src/lib.rs": "exactly what was uploaded" } },
      "t1"
    );
    const replace = jest
      .spyOn(PgExplorer, "replaceWorkspaceFiles")
      .mockResolvedValue(undefined as never);
    serverHas([project("p1", "alpha", "t2")], {
      p1: { files: { "src/lib.rs": "the other device" } },
    });

    const result = await reconcile();

    expect(result.conflicts).toEqual([]);
    expect(replace).toHaveBeenCalledWith("alpha", {
      "src/lib.rs": "the other device",
    });
  });

  it("does not call a regenerated workspace file this device's work", async () => {
    // `PgProgramInfo` rewrites the keypair file every time a workspace opens,
    // so a device that has just taken another's copy differs from the snapshot
    // it adopted within a second, through nothing anyone typed. Counting that
    // as local work meant the *second* exchange in an ordinary back-and-forth
    // -- they edit, I pick it up, they edit again -- was reported as a
    // divergence and the user was asked to choose.
    withLocal({ alpha: "p1" });
    withFiles("alpha", {
      "src/lib.rs": "theirs",
      ".workspace/program-info.json": '{"kp":"regenerated here"}',
    });
    await agreed(
      "p1",
      // What the server handed over: the same code, without the keypair file
      { files: { "src/lib.rs": "theirs" } },
      "t1"
    );
    const replace = jest
      .spyOn(PgExplorer, "replaceWorkspaceFiles")
      .mockResolvedValue(undefined as never);
    serverHas([project("p1", "alpha", "t2")], {
      p1: { files: { "src/lib.rs": "theirs, and then some" } },
    });

    const result = await reconcile();

    expect(result.conflicts).toEqual([]);
    expect(replace).toHaveBeenCalledWith("alpha", {
      "src/lib.rs": "theirs, and then some",
    });
  });

  it("pushes when this device is ahead and nothing else has written", async () => {
    withLocal({ alpha: "p1" });
    withFiles("alpha", { "src/lib.rs": "newer here" });
    await pending("p1", { files: { "src/lib.rs": "old" } }, "t1");
    const push = jest.spyOn(PgProjectSync, "push").mockResolvedValue("ok");
    serverHas([project("p1", "alpha", "t1")]);

    const result = await reconcile();

    // `immediate` because reconcile runs inside the push gate it is the point
    // of -- waiting on it here would wait for itself
    expect(push).toHaveBeenCalledWith(
      "p1",
      { files: { "src/lib.rs": "newer here" } },
      "alpha",
      { immediate: true }
    );
    expect(result.pushed).toEqual(["alpha"]);
  });

  it("does nothing at all when neither side has moved", async () => {
    withLocal({ alpha: "p1" });
    withFiles("alpha", { "src/lib.rs": "same" });
    await agreed("p1", { files: { "src/lib.rs": "same" } }, "t1");
    const replace = jest
      .spyOn(PgExplorer, "replaceWorkspaceFiles")
      .mockResolvedValue(undefined as never);
    const push = jest.spyOn(PgProjectSync, "push").mockResolvedValue("ok");
    serverHas([project("p1", "alpha", "t1")]);

    const result = await reconcile();

    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(result.conflicts).toEqual([]);
  });

  it("records the agreement instead of asking, when both copies are identical", async () => {
    // A tutorial's id is derived from its name, so a second browser mints the
    // same id locally and has no mark for it. Same bytes, no question to ask.
    withLocal({ alpha: "tut:hello" });
    withFiles("alpha", { "src/lib.rs": "same" });
    serverHas([project("tut:hello", "alpha", "t5")], {
      "tut:hello": { files: { "src/lib.rs": "same" } },
    });

    const result = await reconcile();

    expect(result.conflicts).toEqual([]);
    expect((await PgSyncMark.read("tut:hello"))?.updatedAt).toBe("t5");
  });

  it("uploads to a row a conversation created, rather than calling it a conflict", async () => {
    // `ensureConversation` inserts a parent `projects` row, so a project whose
    // assistant was used before its first upload already exists server-side
    // with no snapshot. There is nothing in it to lose.
    withLocal({ alpha: "p1" });
    withFiles("alpha", { "src/lib.rs": "mine" });
    const push = jest.spyOn(PgProjectSync, "push").mockResolvedValue("ok");
    serverHas([project("p1", "p1", "t1")], { p1: null });

    const result = await reconcile();

    expect(result.conflicts).toEqual([]);
    expect(push).toHaveBeenCalledWith(
      "p1",
      { files: { "src/lib.rs": "mine" } },
      "alpha",
      { immediate: true }
    );
  });

  it("finishes a delete that happened on another device", async () => {
    withLocal({ alpha: "p1" });
    withFiles("alpha", { "src/lib.rs": "same" });
    await agreed("p1", { files: { "src/lib.rs": "same" } }, "t1");
    const remove = jest
      .spyOn(PgExplorer, "deleteWorkspace")
      .mockResolvedValue(undefined as never);
    serverHas([]);

    const result = await reconcile();

    expect(remove).toHaveBeenCalledWith("alpha");
    expect(result.removed).toEqual(["alpha"]);
    expect(await PgSyncMark.read("p1")).toBeNull();
  });

  it("touches nothing when the account could not be read", async () => {
    // Offline, an expired cookie, a 500. Reading that as "the account holds
    // nothing" deleted every clean synced project here -- and each delete
    // then tombstoned its row.
    withLocal({ alpha: "p1", beta: "p2", gamma: "local-only" });
    withFiles("alpha", { "src/lib.rs": "same" });
    withFiles("beta", { "src/lib.rs": "edited" });
    withFiles("gamma", { "src/lib.rs": "never synced" });
    await agreed("p1", { files: { "src/lib.rs": "same" } }, "t1");
    await pending("p2", { files: { "src/lib.rs": "old" } }, "t1", "beta");
    const remove = jest
      .spyOn(PgExplorer, "deleteWorkspace")
      .mockResolvedValue(undefined as never);
    const push = jest.spyOn(PgProjectSync, "push").mockResolvedValue("ok");
    const tombstone = jest.spyOn(PgProjectSync, "remove");
    jest.spyOn(PgProjectSync, "list").mockResolvedValue(null);

    const result = await reconcile();

    expect(remove).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(tombstone).not.toHaveBeenCalled();
    expect(result).toEqual({
      imported: [],
      replaced: [],
      pushed: [],
      removed: [],
      conflicts: [],
      latest: null,
    });
    expect(await PgSyncMark.read("p1")).not.toBeNull();
  });

  it("asks before finishing a delete over unsaved work", async () => {
    withLocal({ alpha: "p1" });
    withFiles("alpha", { "src/lib.rs": "work that never uploaded" });
    await pending("p1", { files: { "src/lib.rs": "old" } }, "t1");
    const remove = jest
      .spyOn(PgExplorer, "deleteWorkspace")
      .mockResolvedValue(undefined as never);
    serverHas([]);

    const result = await reconcile();

    expect(remove).not.toHaveBeenCalled();
    expect(result.conflicts).toEqual([
      { projectId: "p1", kind: "deleted-elsewhere" },
    ]);
  });

  it("hands over a project the account has never seen", async () => {
    // Previously this waited for the user to open the project, because only
    // the editor's own change handler pushed -- so a project made before
    // signing in and not touched since stayed on one device forever.
    withLocal({ alpha: "local-only" });
    withFiles("alpha", { "src/lib.rs": "never uploaded" });
    const push = jest.spyOn(PgProjectSync, "push").mockResolvedValue("ok");
    serverHas([]);

    const result = await reconcile();

    expect(push).toHaveBeenCalledWith(
      "local-only",
      { files: { "src/lib.rs": "never uploaded" } },
      "alpha",
      { immediate: true }
    );
    expect(result.pushed).toEqual(["alpha"]);
  });

  it("does not hand another account's project to whoever is signed in now", async () => {
    // Workspaces are not account-scoped and survive sign-out, so the next
    // person to use this browser sees the previous one's projects. Uploading
    // them would copy one person's work into another's account.
    withLocal({ alpha: "theirs" });
    withFiles("alpha", { "src/lib.rs": "someone else's work" });
    await PgSyncMark.write("theirs", {
      hash: "whatever",
      contentHash: "whatever",
      name: "alpha",
      updatedAt: "t1",
      dirty: false,
    });
    await PgSession.refreshWith({
      id: "u2",
      name: null,
      image: null,
      login: null,
    });
    const push = jest.spyOn(PgProjectSync, "push").mockResolvedValue("ok");
    serverHas([]);

    const result = await reconcile();

    expect(push).not.toHaveBeenCalled();
    expect(result.pushed).toEqual([]);
  });

  it("still hands over a project nobody has ever synced", async () => {
    // Made locally while signed out, so it belongs to whoever signs in
    withLocal({ alpha: "nobodys" });
    withFiles("alpha", { "src/lib.rs": "made while logged out" });
    const push = jest.spyOn(PgProjectSync, "push").mockResolvedValue("ok");
    serverHas([]);

    expect((await reconcile()).pushed).toEqual(["alpha"]);
    expect(push).toHaveBeenCalled();
  });

  it("never switches workspace itself, so a sync cannot interrupt the user", async () => {
    withLocal({});
    stubCreation();
    const switchSpy = jest
      .spyOn(PgExplorer, "switchWorkspace")
      .mockResolvedValue(undefined as never);
    serverHas([project("server-uuid", "alpha")]);

    await reconcile();

    expect(switchSpy).not.toHaveBeenCalled();
  });

  it("adopts the server's id, so the two devices converge", async () => {
    withLocal({});
    const created = stubCreation();
    serverHas([project("server-uuid", "alpha")]);

    await reconcile();

    expect(created).toEqual([{ name: "alpha", id: "server-uuid" }]);
  });

  it("keeps going when one project cannot be fetched", async () => {
    withLocal({});
    const created = stubCreation();
    jest
      .spyOn(PgProjectSync, "list")
      .mockResolvedValue([project("a", "alpha"), project("b", "beta")]);
    jest
      .spyOn(PgProjectSync, "fetch")
      .mockImplementation(async (id: string) =>
        id === "b" ? { ...project("b", "beta"), snapshot: { files: {} } } : null
      );

    const result = await reconcile();

    expect(result.imported).toEqual(["beta"]);
    expect(created).toHaveLength(1);
  });

  it("reports the newest project, whatever order the server listed them in", async () => {
    withLocal({});
    stubCreation();
    serverHas([
      project("a", "older", "2026-01-01T00:00:00.000Z"),
      project("b", "newer", "2026-03-01T00:00:00.000Z"),
    ]);

    expect((await reconcile()).latest).toBe("newer");
  });

  it("does nothing at all when both sides are empty", async () => {
    withLocal({});
    const replace = jest
      .spyOn(PgExplorer, "replaceWorkspaceFiles")
      .mockResolvedValue(undefined as never);
    serverHas([]);

    const result = await reconcile();

    expect(result).toEqual({
      imported: [],
      replaced: [],
      removed: [],
      pushed: [],
      conflicts: [],
      latest: null,
    });
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("releasing local projects at sign-out", () => {
  beforeEach(async () => {
    PgSession.reset();
    PgProjectSync.reset();
    storedFiles().clear();
    await signedIn();
    // Sign-out flushes the open workspace first. Nothing here is testing that
    // request, and letting it reach the network would make every case below
    // depend on it.
    jest.spyOn(PgProjectSync, "pushCurrent").mockResolvedValue("ok");
  });

  afterEach(() => jest.restoreAllMocks());

  const stubDelete = () =>
    jest
      .spyOn(PgExplorer, "deleteWorkspace")
      .mockResolvedValue(undefined as never);

  it("removes a project the account demonstrably already holds", async () => {
    // The whole point: workspaces are not account-scoped and used to survive
    // sign-out, so the next person to sign in on a shared browser found the
    // previous user's projects waiting in the explorer.
    withLocal({ alpha: "p1" });
    withFiles("alpha", { "src/lib.rs": "same" });
    await agreed("p1", { files: { "src/lib.rs": "same" } }, "t1");
    const remove = stubDelete();

    expect(await releaseLocalProjects()).toEqual(["alpha"]);
    expect(remove).toHaveBeenCalledWith("alpha");
  });

  it("keeps a project the server has never seen", async () => {
    // No mark at all: made locally, never uploaded by anyone. Deleting it
    // would be destroying the only copy.
    withLocal({ beta: "p2" });
    withFiles("beta", { "src/lib.rs": "only here" });
    const remove = stubDelete();

    expect(await releaseLocalProjects()).toEqual([]);
    expect(remove).not.toHaveBeenCalled();
  });

  it("keeps a project holding work that never uploaded", async () => {
    // Sign-out completes with no network -- `PgSession.signOut` swallows the
    // request's failure on purpose -- so this is reachable by signing out
    // offline, and it is the case where being wrong costs an afternoon.
    withLocal({ alpha: "p1" });
    withFiles("alpha", { "src/lib.rs": "written since the last push" });
    await agreed(
      "p1",
      { files: { "src/lib.rs": "what the server has" } },
      "t1"
    );
    const remove = stubDelete();

    expect(await releaseLocalProjects()).toEqual([]);
    expect(remove).not.toHaveBeenCalled();
  });

  it("keeps a project renamed since it was pushed", async () => {
    // A rename changes no bytes, so only the mark's `name` catches it. The
    // server still holds the files, but under the name the user moved away
    // from -- the rename itself is work that has not been handed over.
    withLocal({ renamed: "p1" });
    withFiles("renamed", { "src/lib.rs": "same" });
    await agreed("p1", { files: { "src/lib.rs": "same" } }, "t1", "alpha");
    const remove = stubDelete();

    expect(await releaseLocalProjects()).toEqual([]);
    expect(remove).not.toHaveBeenCalled();
  });

  it("decides per project rather than for the set", async () => {
    // The mistake this mirrors the fix for, one directory over in
    // `PgChatSync.handOver`: one project that cannot be handed over is no
    // reason to leave the others on a browser the account is done with.
    withLocal({ alpha: "p1", beta: "p2" });
    withFiles("alpha", { "src/lib.rs": "same" });
    withFiles("beta", { "src/lib.rs": "never uploaded" });
    await agreed("p1", { files: { "src/lib.rs": "same" } }, "t1");
    stubDelete();

    expect(await releaseLocalProjects()).toEqual(["alpha"]);
  });

  it("leaves the mark behind, so signing back in re-imports rather than re-asks", async () => {
    // Marks are per account, so they are not the next user's to read, and
    // keeping them is what lets the next reconcile recognise the server's copy
    // instead of treating it as a project this device has never seen.
    withLocal({ alpha: "p1" });
    withFiles("alpha", { "src/lib.rs": "same" });
    await agreed("p1", { files: { "src/lib.rs": "same" } }, "t1");
    stubDelete();

    await releaseLocalProjects();

    expect(await PgSyncMark.read("p1")).not.toBeNull();
  });

  it("flushes the open workspace before deciding anything", async () => {
    // Up to a debounce window of edits sits unpushed at any moment, and they
    // are the difference between this project qualifying and being kept
    withLocal({ alpha: "p1" });
    withFiles("alpha", { "src/lib.rs": "same" });
    await agreed("p1", { files: { "src/lib.rs": "same" } }, "t1");
    stubDelete();

    await releaseLocalProjects();

    expect(PgProjectSync.pushCurrent).toHaveBeenCalled();
  });
});
