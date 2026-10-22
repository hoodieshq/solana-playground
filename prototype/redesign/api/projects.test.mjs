import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

// Read before `beforeEach` clears it: the cases below assert on an unconfigured
// environment, and the one that needs a real database opens its own connection.
const DB = process.env.DATABASE_URL;

const load = async () => {
  // Fresh module per case: `db.mjs` memoises its pool at module scope
  const url = new URL("./projects.mjs", import.meta.url);
  url.searchParams.set("t", String(Math.random()));
  return import(url.href);
};

/** Minimal stand-in for the platform's response object */
const makeRes = () => ({
  statusCode: 0,
  headers: {},
  body: "",
  setHeader(k, v) {
    this.headers[k] = v;
  },
  end(b) {
    this.body = b ?? "";
  },
});

describe("/api/projects", () => {
  // Cleared before each case, not after: `yarn test-api` loads `.env`, so the
  // environment these cases assert is absent would otherwise be present.
  beforeEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.SYNC_ENABLED;
    // Same reasoning, one gate further along: with a base URL set, the origin
    // check has something to compare against, and every case that sends no
    // `Origin` would be answering a question it is not asking.
    delete process.env.AUTH_BASE_URL;
    delete process.env.VERCEL_URL;
  });

  /** Past the kill switch, so the case can assert on a later gate */
  const enableSync = () => {
    process.env.DATABASE_URL = "postgres://x/y";
    process.env.SYNC_ENABLED = "true";
  };

  /** Enough of the platform's request object for a body-less call */
  const makeReq = (over) => ({ method: "GET", url: "/", headers: {}, ...over });

  it("503s while the sync kill switch is off", async () => {
    const mod = await load();
    const res = makeRes();
    await mod.default({ method: "GET", url: "/", headers: {} }, res);
    assert.equal(res.statusCode, 503);
  });

  it("401s when enabled but signed out", async () => {
    process.env.DATABASE_URL = "postgres://x/y";
    process.env.SYNC_ENABLED = "true";
    const mod = await load();
    const res = makeRes();
    await mod.default({ method: "GET", url: "/", headers: {} }, res);
    assert.equal(res.statusCode, 401);
  });

  it("puts the auth gate ahead of the method check", async () => {
    process.env.DATABASE_URL = "postgres://x/y";
    process.env.SYNC_ENABLED = "true";
    const mod = await load();
    const res = makeRes();
    await mod.default({ method: "PATCH", url: "/", headers: {} }, res);
    assert.equal(res.statusCode, 401);
  });

  describe("origin", () => {
    it("refuses a write from another origin", async () => {
      enableSync();
      process.env.AUTH_BASE_URL = "https://solpg.example";
      const mod = await load();
      const res = makeRes();
      await mod.default(
        makeReq({ method: "PUT", headers: { origin: "https://evil.example" } }),
        res
      );
      assert.equal(res.statusCode, 403);
    });

    it("refuses a DELETE from another origin too", async () => {
      enableSync();
      process.env.AUTH_BASE_URL = "https://solpg.example";
      const mod = await load();
      const res = makeRes();
      await mod.default(
        makeReq({
          method: "DELETE",
          url: "/?id=p1",
          headers: { origin: "https://evil.example" },
        }),
        res
      );
      assert.equal(res.statusCode, 403);
    });

    it("lets our own origin through, path on the base URL or not", async () => {
      // Better Auth's base URL may carry `/api/auth`; an `Origin` never does,
      // so both sides are compared as origins rather than as strings.
      enableSync();
      process.env.AUTH_BASE_URL = "https://solpg.example/api/auth";
      const mod = await load();
      const res = makeRes();
      await mod.default(
        makeReq({
          method: "PUT",
          headers: { origin: "https://solpg.example" },
        }),
        res
      );
      // 401 rather than 200: it got past the origin gate and stopped at auth,
      // which is as far as a direct call can go
      assert.equal(res.statusCode, 401);
    });

    it("checks nothing when there is no deployment origin to check", async () => {
      // Neither AUTH_BASE_URL nor VERCEL_URL, which is local development
      enableSync();
      const mod = await load();
      const res = makeRes();
      await mod.default(
        makeReq({
          method: "PUT",
          headers: { origin: "http://localhost:3000" },
        }),
        res
      );
      assert.equal(res.statusCode, 401);
    });

    it("leaves reads alone", async () => {
      enableSync();
      process.env.AUTH_BASE_URL = "https://solpg.example";
      const mod = await load();
      const res = makeRes();
      await mod.default(
        makeReq({ headers: { origin: "https://evil.example" } }),
        res
      );
      assert.equal(res.statusCode, 401);
    });
  });

  describe("readBody", () => {
    /** A request body delivered as the platform delivers one */
    const streamOf = (...chunks) => ({
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) yield chunk;
      },
    });

    it("tells a syntax error from an oversized body", async () => {
      // The two used to share a `try`, so a 400's worth of malformed JSON came
      // back as 413 -- telling a client to shrink a body that was never big
      const mod = await load();
      assert.deepEqual(await mod.readBody(streamOf(Buffer.from("{oops"))), {
        error: "malformed",
      });
    });

    it("reads an empty body as an empty object", async () => {
      const mod = await load();
      assert.deepEqual(await mod.readBody(streamOf()), { body: {} });
    });

    it("stops at the cap rather than buffering the whole body", async () => {
      const mod = await load();
      // One buffer yielded nine times: the point is the running total, and
      // allocating 9 MB to prove it would be the test's own bug
      const mb = Buffer.alloc(1_000_000);
      const chunks = Array.from({ length: 9 }, () => mb);
      assert.deepEqual(await mod.readBody(streamOf(...chunks)), {
        error: "too-large",
      });
    });
  });

  describe("describeDriverError", () => {
    it("maps a name collision to a 409 the client can tell apart", async () => {
      const mod = await load();
      const { status, body } = mod.describeDriverError({ code: "23505" });

      assert.equal(status, 409);
      assert.equal(body.reason, "name-taken");
      // Deliberately absent. The client branches on `conflict === true` to
      // decide whether a project diverged; setting it here would raise a
      // "keep this version or take the other" banner about a name, which is
      // not a question either answer fits.
      assert.equal(body.conflict, undefined);
    });

    it("keeps the driver's own text out of any other answer", async () => {
      const mod = await load();
      const { status, body } = mod.describeDriverError(
        Object.assign(new Error('column "secret" does not exist'), {
          code: "42703",
        })
      );

      assert.equal(status, 500);
      assert.ok(!JSON.stringify(body).includes("secret"));
    });

    it(
      "maps the code Postgres actually sends",
      { skip: !DB && "DATABASE_URL not set" },
      async () => {
        // The unit cases above assert on a literal `23505`. This one earns it:
        // two live projects under one name in one account is the collision the
        // route exists to answer, and `pushCurrent` sends whatever the local
        // workspace is called, so `reconcile` reaches it on its own.
        //
        // Its own connection rather than `server/db.mjs`: that module memoises
        // its pool, and the signed-out cases above have already built one --
        // Better Auth asks for it on the way to reading a session -- against
        // the placeholder URL they set. Reusing it here would test that string.
        const pg = (await import("pg")).default;
        const pool = new pg.Pool({ connectionString: DB, max: 1 });
        pool.on("error", () => {});
        const userId = "test-user-api-projects";
        const row = (id, name) =>
          pool.query(
            `insert into projects (id, user_id, name, kind, snapshot, updated_at)
             values ($1, $2, $3, 'project', '{"files":{}}'::jsonb, now())`,
            [id, userId, name]
          );

        try {
          await pool.query(
            `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
             values ($1, 'Test', 'api-projects@example.com', false, now(), now())
             on conflict (id) do nothing`,
            [userId]
          );
          await pool.query("delete from projects where user_id = $1", [userId]);

          await row("p1", "taken");
          const e = await row("p2", "taken").then(
            () => null,
            (err) => err
          );

          assert.ok(e, "a second live project under one name is refused");
          assert.equal(e.code, "23505");
          assert.equal(e.constraint, "projects_user_name_idx");

          const mod = await load();
          const { status, body } = mod.describeDriverError(e);
          assert.equal(status, 409);
          assert.equal(body.reason, "name-taken");
          assert.equal(body.conflict, undefined);
        } finally {
          await pool
            .query("delete from projects where user_id = $1", [userId])
            .catch(() => {});
          await pool.end();
        }
      }
    );
  });
});
