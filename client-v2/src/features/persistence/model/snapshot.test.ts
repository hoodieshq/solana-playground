import {
  buildSnapshotOf,
  filterSnapshotPaths,
  hashSnapshot,
  snapshotOf,
  SYNCED_WORKSPACE_FILES,
} from "./snapshot";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgFs } from "../../../utils/explorer/fs";

describe("filterSnapshotPaths", () => {
  it("keeps user source files", () => {
    expect(filterSnapshotPaths(["src/lib.rs", "client/client.ts"])).toEqual([
      "src/lib.rs",
      "client/client.ts",
    ]);
  });

  it("keeps the workspace files the spec names, program keypair included", () => {
    expect(filterSnapshotPaths(SYNCED_WORKSPACE_FILES)).toEqual(
      SYNCED_WORKSPACE_FILES
    );
  });

  it("drops anything else under .workspace", () => {
    expect(filterSnapshotPaths([".workspace/scratch.json"])).toEqual([]);
  });

  it("does not carry the editor's tabs and cursors between devices", () => {
    // Every open rewrites them, so syncing them would make simply looking at a
    // project a change the other device has to reconcile
    expect(filterSnapshotPaths([".workspace/metadata.json"])).toEqual([]);
  });
});

describe("buildSnapshotOf", () => {
  const store = (PgFs as unknown as { __files: Map<string, string> }).__files;

  beforeEach(() => store.clear());

  it("reads a project the user is not looking at", async () => {
    store.set("/beta/src/lib.rs", "other project");
    store.set("/beta/client/client.ts", "console.log()");

    expect((await buildSnapshotOf("beta")).files).toEqual({
      "src/lib.rs": "other project",
      "client/client.ts": "console.log()",
    });
  });

  it("reads a workspace whose files never landed as empty, not as a failure", async () => {
    expect((await buildSnapshotOf("ghost")).files).toEqual({});
  });

  it("applies the same filter, so the two agree on what a project is", async () => {
    store.set("/beta/src/lib.rs", "code");
    store.set("/beta/.workspace/metadata.json", '{"tabs":[]}');
    store.set("/beta/.workspace/program-info.json", '{"kp":[1]}');

    expect(Object.keys((await buildSnapshotOf("beta")).files).sort()).toEqual([
      ".workspace/program-info.json",
      "src/lib.rs",
    ]);
  });

  it("carries tutorial progress, so a lesson resumes where it was left", async () => {
    store.set("/beta/.tutorial.json", '{"pageNumber":3,"completed":false}');
    store.set("/beta/.workspace/tutorial-storage.json", '{"answered":true}');

    const { files } = await buildSnapshotOf("beta");

    expect(files[".tutorial.json"]).toBe('{"pageNumber":3,"completed":false}');
    expect(files[".workspace/tutorial-storage.json"]).toBe('{"answered":true}');
  });
});

describe("snapshotOf", () => {
  const store = (PgFs as unknown as { __files: Map<string, string> }).__files;

  beforeEach(() => {
    store.clear();
    // The pre-fix implementation branched on this to decide whether to read
    // memory or disk for the current workspace. Left in place, mocked to
    // still say "alpha" and to still hold a different value than the store,
    // so a regression back to reading memory for the current workspace fails
    // this test rather than passing it by accident.
    jest
      .spyOn(PgExplorer, "currentWorkspaceName", "get")
      .mockReturnValue("alpha");
    jest
      .spyOn(PgExplorer, "getAllFiles")
      .mockReturnValue([["/alpha/src/lib.rs", "unsaved edit"]]);
  });

  afterEach(() => jest.restoreAllMocks());

  it("reads the current workspace off the store too", async () => {
    // Memory is per tab and disk is shared, so memory is the copy that can
    // be stale. An edit reaches disk straight after state, so nothing the
    // user typed is missing from here by the time a push runs.
    store.set("/alpha/src/lib.rs", "what is on disk");

    expect((await snapshotOf("alpha")).files["src/lib.rs"]).toBe(
      "what is on disk"
    );
  });

  it("reads any other workspace off the store", async () => {
    store.set("/beta/src/lib.rs", "on disk");

    expect((await snapshotOf("beta")).files["src/lib.rs"]).toBe("on disk");
  });
});

describe("hashSnapshot", () => {
  it("does not depend on the order the files came in", async () => {
    // The comparison this feeds crosses Postgres, and `snapshot` is stored as
    // `jsonb`, which orders keys by length then bytewise rather than keeping
    // insertion order. Hashing the raw JSON would make a snapshot that had
    // round-tripped through the server hash differently from the identical one
    // held here, so every reconcile would read as a change.
    const one = await hashSnapshot({
      files: { "a.rs": "1", "bb.rs": "2", "c.rs": "3" },
    });
    const other = await hashSnapshot({
      files: { "c.rs": "3", "a.rs": "1", "bb.rs": "2" },
    });

    expect(one).toBe(other);
  });

  it("is a real digest, because it decides whether files are replaced", async () => {
    // Not "has anything changed since the last upload" any more: reconcile
    // replaces a project's files on the strength of two of these matching, so
    // a collision is silent data loss rather than a skipped upload
    expect(await hashSnapshot({ files: { "a.rs": "1" } })).toMatch(
      /^[0-9a-f]{64}$/
    );
  });

  it("separates a path change from a content change", async () => {
    const moved = await hashSnapshot({ files: { "b.rs": "1" } });
    const edited = await hashSnapshot({ files: { "a.rs": "2" } });
    const original = await hashSnapshot({ files: { "a.rs": "1" } });

    expect(new Set([moved, edited, original]).size).toBe(3);
  });

  it("tells an empty project from a missing one the same way every time", async () => {
    expect(await hashSnapshot({ files: {} })).toBe(
      await hashSnapshot({ files: {} })
    );
  });
});
