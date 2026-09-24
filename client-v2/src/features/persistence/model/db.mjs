/**
 * The one Postgres entry point for every API route.
 *
 * Plain `pg` against a pooled connection string, deliberately: the target
 * instance is client-managed and its flavour is not confirmed, so nothing here
 * may depend on a vendor driver. `max` is small because a serverless platform
 * runs many instances -- the real pooling happens in front of the database,
 * not here.
 */
import pg from "pg";

let pool = null;

/** Whether a connection string is present at all */
export const isConfigured = () => !!process.env.DATABASE_URL;

/** Whether sync should serve traffic. The kill switch is opt-in. */
export const isEnabled = () =>
  isConfigured() && process.env.SYNC_ENABLED === "true";

/**
 * The shared pool, created on first use.
 *
 * @returns {import("pg").Pool | null} the pool, or `null` when no connection
 * string is configured
 */
export const getPool = () => {
  if (!isConfigured()) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      // Encrypted and verified unless the connection string says otherwise.
      //
      // node-postgres connects in the clear when the URL mentions no
      // `sslmode`, where dbmate refuses -- so the same URL that a migration
      // rejects would have been used by the app to send credentials in
      // plaintext, silently. Production is the case that matters, and a URL
      // there will be pasted from a provider's dashboard with no thought about
      // this flag, so the default has to be the safe one.
      //
      // A `sslmode` in the URL overrides this, which is how the local and CI
      // containers -- which serve no TLS at all -- opt out with
      // `?sslmode=disable`. `rejectUnauthorized` rather than bare `true`
      // because unverified TLS is the footgun this is meant to close: a
      // provider needing a looser mode says so in its URL, where it is visible.
      ssl: { rejectUnauthorized: true },
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
    // Without a listener, an error on an idle client is an unhandled 'error'
    // event, which takes the whole function down rather than the one query
    pool.on("error", () => {});
  }
  return pool;
};

/**
 * Run one statement on a caller's client, tagging any failure with its text.
 *
 * `pg` raises the server's error verbatim and attaches no SQL to it, so a
 * driver error reaching a route names neither the statement that produced it
 * nor the module it came from. For most codes that is survivable -- the
 * constraint name says enough -- but the schema-shaped ones say nothing at
 * all: `42P10` reports that an `on conflict` target matches no constraint
 * without naming either side of the comparison, and the two things that cause
 * it read identically in a log. Either the schema is behind the code, or the
 * code is behind the schema.
 *
 * The text here comes from the module that is actually loaded, which is the
 * half nothing else can reconstruct after the fact: compare it against the
 * source and a process serving a cached copy of an edited file -- which the
 * dev server does by design, see the note in `craco.config.js` -- stops
 * looking like a database problem.
 *
 * `??=` rather than `=`: an inner statement's text is the specific one, and a
 * caller that wraps this must not overwrite it with its own.
 *
 * @param {import("pg").PoolClient | import("pg").Pool} client
 * @param {string} text SQL with `$1`-style placeholders
 * @param {unknown[]} [params] bound values
 */
export const run = async (client, text, params) => {
  try {
    return await client.query(text, params);
  } catch (e) {
    e.statement ??= text;
    throw e;
  }
};

/**
 * Run one statement on the shared pool.
 *
 * @param {string} text SQL with `$1`-style placeholders
 * @param {unknown[]} [params] bound values
 */
export const query = async (text, params) => {
  const p = getPool();
  if (!p) throw new Error("DATABASE_URL is not configured");
  return run(p, text, params);
};
