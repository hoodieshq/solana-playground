import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import { query, transaction } from "./db.mjs";
import {
  deleteProject,
  getProject,
  listProjects,
  saveProject,
  writeProject,
} from "./projects.mjs";

// `yarn test-api` loads `.env`; without a database this suite skips rather
// than fails, which is what lets the unit suites run on their own.
const DB = process.env.DATABASE_URL;

describe("projects", { skip: !DB && "DATABASE_URL not set" }, () => {
  const userId = "test-user-projects";

  before(async () => {
    await query(
      `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       values ($1, 'Test', 'projects@example.com', false, now(), now())
       on conflict (id) do nothing`,
      [userId]
    );
  });

  beforeEach(async () => {
    await query("delete from projects where user_id = $1", [userId]);
  });

  const files = { "src/lib.rs": "fn main() {}", "Cargo.toml": "[package]" };

  /** One project, `p1`, written in whichever mode the case names */
  const put = (input) =>
    saveProject(userId, { id: "p1", name: "one", kind: "project", ...input });

  /** Row versions, so a case can tell a rewritten row from an untouched one */
  const versions = async () => {
    const { rows } = await query(
      `select path, xmin::text as version from project_files
        where user_id = $1 and project_id = 'p1' order by path`,
      [userId]
    );
    return Object.fromEntries(rows.map((r) => [r.path, r.version]));
  };

  it("saves a whole file set and reads it back", async () => {
    await put({ files });
    assert.deepEqual((await getProject(userId, "p1")).snapshot, { files });
  });

  it("reads a project with no files as having no snapshot", async () => {
    await query(
      `insert into projects (id, user_id, name, kind) values ('p1', $1, 'p1', 'project')`,
      [userId]
    );
    assert.equal((await getProject(userId, "p1")).snapshot, null);
  });

  it("accepts a swap that carries the current updatedAt", async () => {
    const first = await put({ files });
    const second = await put({ files, baseUpdatedAt: first.updatedAt });
    assert.ok(second.updatedAt);
    assert.notEqual(second.conflict, true);
  });

  it("refuses a write built on a stale read, and changes nothing", async () => {
    await put({ files });
    const result = await put({
      changed: { "src/lib.rs": "stale" },
      removed: [],
      baseUpdatedAt: "2000-01-01T00:00:00.000Z",
    });
    assert.equal(result.conflict, true);
    assert.deepEqual((await getProject(userId, "p1")).snapshot, { files });
  });

  it("hands back a token the client can retry with", async () => {
    await put({ files });
    const stale = await put({
      files,
      baseUpdatedAt: "2000-01-01T00:00:00.000Z",
    });
    assert.equal(stale.conflict, true);

    const retry = await put({
      files,
      name: "two",
      baseUpdatedAt: stale.updatedAt,
    });
    assert.notEqual(retry.conflict, true);
    assert.equal((await getProject(userId, "p1")).name, "two");
  });

  it("patches only the files named, and removes the ones listed", async () => {
    const first = await put({ files: { ...files, "old.rs": "gone soon" } });
    await put({
      changed: { "src/lib.rs": "fn main() { edited }", "new.rs": "added" },
      removed: ["old.rs"],
      baseUpdatedAt: first.updatedAt,
    });
    assert.deepEqual((await getProject(userId, "p1")).snapshot, {
      files: {
        "src/lib.rs": "fn main() { edited }",
        "Cargo.toml": "[package]",
        "new.rs": "added",
      },
    });
  });

  it("leaves the rows a patch does not name unwritten", async () => {
    // The point of the table: an edit to one file costs one row
    const first = await put({ files });
    const before = await versions();
    await put({
      changed: { "src/lib.rs": "edited" },
      removed: [],
      baseUpdatedAt: first.updatedAt,
    });
    const after = await versions();
    assert.equal(after["Cargo.toml"], before["Cargo.toml"]);
    assert.notEqual(after["src/lib.rs"], before["src/lib.rs"]);
  });

  it("creates a template-sized project in two statements, not one per file", async () => {
    // Counted through the real database: a regression to per-file inserts
    // would still pass every other case here, just slowly
    const statements = [];
    const counting = (text, params) => {
      statements.push(text);
      return query(text, params);
    };
    const many = Object.fromEntries(
      Array.from({ length: 200 }, (_, i) => [`src/file${i}.rs`, `// ${i}`])
    );

    const created = await writeProject(counting, userId, {
      id: "p1",
      name: "one",
      kind: "project",
      files: many,
    });
    assert.equal(statements.length, 2);
    assert.equal(
      Object.keys((await getProject(userId, "p1")).snapshot.files).length,
      200
    );

    statements.length = 0;
    await writeProject(counting, userId, {
      id: "p1",
      name: "one",
      kind: "project",
      changed: { "src/file7.rs": "edited" },
      removed: ["src/file8.rs"],
      baseUpdatedAt: created.updatedAt,
    });
    assert.ok(statements.length <= 3);
  });

  it("replaces the file set on a full swap, deleting what it omits", async () => {
    const first = await put({ files });
    await put({
      files: { "src/lib.rs": "only" },
      baseUpdatedAt: first.updatedAt,
    });
    assert.deepEqual((await getProject(userId, "p1")).snapshot, {
      files: { "src/lib.rs": "only" },
    });
  });

  it("does not rewrite unchanged rows on a full swap", async () => {
    const first = await put({ files });
    const before = await versions();
    await put({
      files: { ...files, "src/lib.rs": "edited" },
      baseUpdatedAt: first.updatedAt,
    });
    assert.equal((await versions())["Cargo.toml"], before["Cargo.toml"]);
  });

  it("refuses to clobber an existing project when no token is offered", async () => {
    await put({ files });
    const result = await put({ files: { "src/lib.rs": "someone else" } });
    assert.equal(result.conflict, true);
    assert.deepEqual((await getProject(userId, "p1")).snapshot, { files });
  });

  it("adopts a row a conversation created, rather than refusing it", async () => {
    // `ensureConversation` inserts a parent `projects` row so a chat turn has
    // somewhere to hang, with no files at all. The project's own first push
    // carries no token and takes the create-only branch.
    await query(
      `insert into projects (id, user_id, name, kind) values ('p1', $1, 'p1', 'project')`,
      [userId]
    );
    const result = await put({ files });
    assert.notEqual(result.conflict, true);
    const project = await getProject(userId, "p1");
    assert.deepEqual(project.snapshot, { files });
    assert.equal(project.name, "one");
  });

  it("does not adopt a tombstoned row", async () => {
    // A tombstone has no files either, so "no files" alone would make every
    // delete undoable by any device that had not seen it
    await put({ files });
    await deleteProject(userId, "p1");
    const result = await put({ files });
    assert.equal(result.conflict, true);
    assert.equal(await getProject(userId, "p1"), null);
  });

  it("clobbers only when the caller says so in as many words", async () => {
    // Removed with the client's last use of it, in the resolution task
    await put({ files });
    const result = await put({ files: { "src/lib.rs": "mine" }, force: true });
    assert.notEqual(result.conflict, true);
    assert.deepEqual((await getProject(userId, "p1")).snapshot, {
      files: { "src/lib.rs": "mine" },
    });
  });

  it("tombstones rather than deleting, and drops the files", async () => {
    await put({ files });
    await deleteProject(userId, "p1");

    assert.equal(await getProject(userId, "p1"), null);
    const { rows } = await query(
      "select deleted_at from projects where id = 'p1' and user_id = $1",
      [userId]
    );
    assert.ok(rows[0].deleted_at);
    assert.deepEqual(await versions(), {});
  });

  it("omits tombstoned projects from the list", async () => {
    await put({ files });
    await saveProject(userId, {
      id: "p2",
      name: "two",
      kind: "project",
      files,
    });
    await deleteProject(userId, "p1");
    assert.deepEqual(
      (await listProjects(userId)).map((p) => p.id),
      ["p2"]
    );
  });

  it("refuses a create that races another first upload, and keeps one file set", async () => {
    // Two devices uploading a brand-new project at once. B blocks on A's
    // uncommitted row; when A commits, B's create-only insert must be refused,
    // not adopt A's row and merge its files into A's.
    const filesA = { "a.rs": "from A" };
    const filesB = { "b.rs": "from B" };
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    let aWritten;
    const written = new Promise((resolve) => (aWritten = resolve));

    const a = transaction(async (q) => {
      await writeProject(q, userId, {
        id: "p1",
        name: "one",
        kind: "project",
        files: filesA,
      });
      aWritten();
      await gate;
    });
    await written;

    const b = put({ files: filesB });

    // Polled rather than slept: B is ready once Postgres reports it waiting
    // on a lock, which is the state this case needs it in
    for (let i = 0; i < 100; i++) {
      const { rows } = await query(
        `select 1 from pg_stat_activity
          where datname = current_database() and wait_event_type = 'Lock'`
      );
      if (rows.length) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    release();
    const [, result] = await Promise.all([a, b]);
    assert.equal(result.conflict, true);
    assert.deepEqual((await getProject(userId, "p1")).snapshot, {
      files: filesA,
    });
  });

  it("frees the name for reuse once tombstoned", async () => {
    await put({ files });
    await deleteProject(userId, "p1");
    const again = await saveProject(userId, {
      id: "p2",
      name: "one",
      kind: "project",
      files,
    });
    assert.ok(again.updatedAt);
  });
});
