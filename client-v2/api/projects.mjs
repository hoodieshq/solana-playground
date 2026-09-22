/**
 * Project snapshot sync.
 *
 * Deliberately plain ESM using raw Node request/response APIs, like the rest
 * of `api/` -- see `api/health.mjs` for why. The small helpers below
 * (`sendJson`, `readBody`, `isAllowedOrigin`) are duplicated from
 * `api/conversations.mjs` on purpose: `api/` has no shared module yet, and
 * copying a handful of short functions is cheaper than inventing one. The
 * reasoning that would be worth sharing is written down here once and pointed
 * at from there.
 */
import { requireUser, resolveBaseURL } from "../src/features/auth/server.mjs";
import {
  deleteProject,
  getProject,
  isEnabled,
  listProjects,
  saveProject,
} from "../src/features/persistence/server.mjs";

/**
 * A workspace larger than this is not something we sync silently.
 *
 * Ours, not the platform's. Vercel Functions accept a request body of up to
 * 100 MB, so this sits well under the cap and is a product decision about what
 * a reasonable workspace is -- written down because the figure has already
 * been re-derived once from the old 4.5 MB limit and judged, wrongly, to be
 * over it. Nothing here needs to change if that platform number moves.
 *
 * The rejection carries `reason: "too-large"` for the same reason the name
 * collision below carries one: the client files every failure it cannot name
 * under a silent "skipped", so a workspace that is genuinely too big has to
 * arrive as something it can tell apart and say out loud.
 */
const MAX_BODY_BYTES = 8_000_000;

/** Matches `projects_kind_check`, so a bad kind is a 400 and not a 500 */
const KINDS = ["project", "tutorial"];

/**
 * Whether a snapshot is something a client can be handed back.
 *
 * Checked on the way *in* because the read side is destructive: restoring a
 * project clears the workspace directory before writing the snapshot's files,
 * so a row holding `{}` or `{"files": null}` empties that project on every
 * device that syncs it, leaving nothing behind but a diagnostics line. The
 * client re-checks before the same call; this is what stops the bad row
 * existing in the first place.
 *
 * `undefined` is allowed through: `ensureConversation` creates rows with no
 * snapshot at all, and this endpoint is not the only writer.
 */
const isValidSnapshot = (snapshot) => {
  if (snapshot === undefined || snapshot === null) return true;
  if (typeof snapshot !== "object" || Array.isArray(snapshot)) return false;

  const { files } = snapshot;
  if (!files || typeof files !== "object" || Array.isArray(files)) return false;
  return Object.values(files).every((content) => typeof content === "string");
};

const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
};

/**
 * Read and parse the request body.
 *
 * Reports the two ways it can fail separately, rather than throwing both into
 * one `catch`. They used to share a `try`, which made a JSON syntax error --
 * a 400 by any reading -- answer 413, telling a client to shrink a body whose
 * size was never the problem. A returned result rather than a thrown error
 * because the caller has to branch on which one happened anyway.
 *
 * Exported for `api/projects.test.mjs`: the handler itself is behind the auth
 * gate, which a direct call cannot pass.
 *
 * @param {import("node:http").IncomingMessage} req
 * @returns {Promise<{body: object} | {error: "too-large" | "malformed"}>}
 */
export const readBody = async (req) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return { error: "too-large" };
    chunks.push(chunk);
  }
  try {
    return { body: JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") };
  } catch {
    return { error: "malformed" };
  }
};

/**
 * Whether a state-changing request came from our own deployment.
 *
 * Not a bug today, and kept deliberately. The session cookie is `SameSite=Lax`,
 * which keeps it off a cross-site PUT, and a JSON PUT or a DELETE needs a
 * preflight that nothing here answers -- but both of those are inherited
 * defaults rather than decisions made in this file. The day someone sets
 * `sameSite: "none"`, which embedding or a sibling subdomain would require,
 * these routes become CSRF over a signed-in user's projects, and nothing in
 * the code would flag that change as load-bearing. This is that control
 * written down, so the next person to touch cookie attributes finds it here.
 *
 * `resolveBaseURL()` is `undefined` when neither `AUTH_BASE_URL` nor
 * `VERCEL_URL` is set, which is local development: there is no deployment
 * origin to compare against, so there is no check to make. Both sides are
 * reduced to `URL.origin` because `AUTH_BASE_URL` may legitimately carry a
 * path and an `Origin` header never does.
 *
 * A request carrying no `Origin` at all is allowed through. Every browser
 * sends one on PUT, POST and DELETE, so a missing header is a client that had
 * to attach the session cookie itself -- not the attack this guards against.
 * It also keeps the tests honest: `yarn test-api` calls these handlers
 * directly, and making every body-level case fake a header would have each of
 * them assert the header rather than the thing the case is about.
 *
 * @param {import("node:http").IncomingMessage} req
 */
const isAllowedOrigin = (req) => {
  const expected = resolveBaseURL();
  const origin = req.headers.origin;
  if (!expected || !origin) return true;

  try {
    return new URL(origin).origin === new URL(expected).origin;
  } catch {
    // An `Origin` we cannot even parse is not one of ours
    return false;
  }
};

/**
 * What to answer when the driver throws.
 *
 * Only one driver error is a client's fault rather than ours. `23505` on
 * `projects_user_name_idx` -- `unique (user_id, name) where deleted_at is
 * null` -- means the account already has a live project under this name, and
 * `pushCurrent` sends whatever the local workspace is called, so two local
 * workspaces that resolve to the same name collide on the first reconcile.
 *
 * It answers 409 **without** `conflict: true`, and the omission is the whole
 * point. The client branches on `body.conflict === true`, not on the status:
 * a bare 409 reads to it as "this project diverged" and raises a banner asking
 * the user to keep this version or take the other, which is not a question
 * about a name and has no answer. `reason` is the discriminator that lets it
 * tell a collision from a divergence before it decides which banner to raise.
 * The client half of this is written elsewhere; the contract is this shape.
 *
 * Anything else is ours, so the client gets a generic 500 and the driver's own
 * text stays server side -- it names columns, constraints and sometimes values.
 *
 * Exported for `api/projects.test.mjs`, which feeds it a `23505` raised by a
 * real database so the code this keys on cannot drift from the code Postgres
 * sends.
 *
 * @returns {{status: number, body: object}}
 */
export const describeDriverError = (e) => {
  if (e?.code === "23505") {
    return {
      status: 409,
      body: {
        error: "A project with this name already exists in your account",
        reason: "name-taken",
      },
    };
  }
  return { status: 500, body: { error: "Sync failed" } };
};

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
export default async function handler(req, res) {
  if (!isEnabled()) return sendJson(res, 503, { error: "Sync is disabled" });

  // Ahead of the session lookup: a request from somewhere else is refused on
  // its own terms, whoever it turns out to be signed in as.
  if (req.method !== "GET" && !isAllowedOrigin(req)) {
    return sendJson(res, 403, { error: "Cross-origin request refused" });
  }

  const user = await requireUser(req);
  if (!user) return sendJson(res, 401, { error: "Not signed in" });

  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");

  // One `try` around every branch that reaches the database, rather than one
  // per call. Without it a driver error is an unhandled rejection on the
  // platform, which the client sees as a bodiless 500 it cannot tell from a
  // network failure -- and `push` files any such answer under a silent
  // "skipped", so the project simply stops syncing.
  try {
    if (req.method === "GET") {
      if (!id) {
        return sendJson(res, 200, { projects: await listProjects(user.id) });
      }
      const project = await getProject(user.id, id);
      return project
        ? sendJson(res, 200, { project })
        : sendJson(res, 404, { error: "Not found" });
    }

    if (req.method === "PUT") {
      const read = await readBody(req);
      if (read.error === "too-large") {
        return sendJson(res, 413, {
          error: `A workspace snapshot must be under ${MAX_BODY_BYTES} bytes`,
          reason: "too-large",
        });
      }
      if (read.error) return sendJson(res, 400, { error: "Body must be JSON" });
      const { body } = read;

      if (
        typeof body.id !== "string" ||
        typeof body.name !== "string" ||
        !KINDS.includes(body.kind)
      ) {
        return sendJson(res, 400, { error: "id, name and kind required" });
      }

      if (!isValidSnapshot(body.snapshot)) {
        return sendJson(res, 400, {
          error: "snapshot.files must be a map of paths to strings",
        });
      }

      // Reaches SQL as a timestamptz. Unchecked, a malformed one is a cast
      // error from the driver, which is a 500 for what is really a bad request.
      if (
        body.baseUpdatedAt !== undefined &&
        (typeof body.baseUpdatedAt !== "string" ||
          Number.isNaN(Date.parse(body.baseUpdatedAt)))
      ) {
        return sendJson(res, 400, {
          error: "baseUpdatedAt must be a timestamp",
        });
      }

      // Spread rather than passed through: `force` bypasses the concurrency
      // check entirely, so it is read as a boolean from a named field rather
      // than whatever truthy value happened to arrive on the body.
      const result = await saveProject(user.id, {
        id: body.id,
        name: body.name,
        kind: body.kind,
        snapshot: body.snapshot,
        baseUpdatedAt: body.baseUpdatedAt,
        force: body.force === true,
      });
      return result.conflict
        ? sendJson(res, 409, result)
        : sendJson(res, 200, result);
    }

    if (req.method === "DELETE") {
      if (!id) return sendJson(res, 400, { error: "id required" });
      await deleteProject(user.id, id);
      return sendJson(res, 200, { deleted: true });
    }
  } catch (e) {
    const { status, body } = describeDriverError(e);
    // Only the generic branch is a surprise, and its text is the half that
    // must not travel: driver messages name columns, constraints and values.
    //
    // Field by field, because `console.error` on the platform stringifies an
    // Error to its `message` and `stack` and drops every property `pg` hangs
    // off it -- `code` and `constraint` among them, which are the two that say
    // what to do next. `statement` is added by `db.mjs`: it is the text held by
    // the module that is actually running, and a schema-shaped failure needs
    // exactly that to tell code behind the database from a database behind the
    // code. Same shape as `api/conversations.mjs`, duplicated for the reason
    // the note at the top of this file gives.
    if (status === 500) {
      console.error("api/projects:", {
        message: e.message,
        code: e.code,
        constraint: e.constraint,
        table: e.table,
        column: e.column,
        detail: e.detail,
        hint: e.hint,
        routine: e.routine,
        statement: e.statement,
        stack: e.stack,
      });
    }
    return sendJson(res, status, body);
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}
