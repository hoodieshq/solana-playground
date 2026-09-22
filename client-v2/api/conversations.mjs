/**
 * Conversation sync.
 *
 * Deliberately plain ESM using raw Node request/response APIs, like the rest
 * of `api/` -- see `api/health.mjs` for why.
 */
import {
  requireUser,
  resolveBaseURL,
} from "../src/features/auth/server/auth.mjs";
import {
  appendMessages,
  listMessages,
} from "../src/features/persistence/server/conversations.mjs";
import { isEnabled } from "../src/features/persistence/server/db.mjs";

/** Anything larger is not a conversation batch, it is an attack or a bug */
const MAX_BODY_BYTES = 2_000_000;
const MAX_ITEMS = 500;

/**
 * The kinds `messages_kind_check` accepts. Checked here so that a malformed
 * item is a 400 from this route rather than a constraint violation surfacing
 * as a 500 from the driver.
 */
const KINDS = new Set([
  "user",
  "assistant",
  "tool",
  "approval",
  "error",
  "notice",
]);

/**
 * The layout Postgres accepts for a `uuid`, which `appendMessages` casts every
 * item id to.
 *
 * Hex groups only, with no attempt to pin the version or variant nibbles --
 * deliberately looser than `crypto.randomUUID`'s output. The job here is to
 * keep a cast from throwing, not to police how an id was minted: a v7 id, or
 * one carried over from an older client, casts perfectly well, and rejecting
 * it would drop a message the database would have taken. Postgres also accepts
 * a braced or unhyphenated form; we mint our own ids and never write those, so
 * nothing is lost by not matching them.
 */
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/**
 * Whether one item is something the insert can be handed.
 *
 * Every check here stands in for a cast in `appendMessages`: `v.id::uuid` and
 * `(payload ->> 'createdAt')::timestamptz`. Unvalidated, a bad value is a
 * driver error escaping the route as a 500 -- for what is plainly a bad
 * request, and a reachable one: threads are stored in IndexedDB, which the
 * user can edit, and `chat-codec.isStoredItem` accepts any string for an id.
 *
 * Exported for `api/conversations.test.mjs`: the POST branch is behind the
 * auth gate, which a direct call cannot pass.
 */
export const isValidItem = (i) =>
  !!i &&
  typeof i.id === "string" &&
  UUID.test(i.id) &&
  typeof i.createdAt === "string" &&
  !Number.isNaN(Date.parse(i.createdAt)) &&
  KINDS.has(i.kind);

const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
};

/**
 * Read and parse the request body.
 *
 * Reports its two failures separately rather than through one `catch`: over
 * the cap is a 413 and unparseable JSON is a 400, and sharing a `try` made the
 * second answer the first. See `api/projects.mjs` for the longer note.
 *
 * Exported for `api/conversations.test.mjs`, which cannot pass the auth gate.
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
 * The same guard as `api/projects.mjs`, duplicated for the reason the note at
 * the top of that file gives. Why it exists at all when `SameSite=Lax` already
 * covers it, why `resolveBaseURL()` being `undefined` means there is nothing
 * to check, and why a missing `Origin` is allowed through are all written down
 * there rather than twice.
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
    return false;
  }
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

  // One `try` around both branches that reach the database: without it a
  // driver error is an unhandled rejection on the platform rather than a
  // response. Nothing here maps to a status of its own the way a name
  // collision does in `api/projects.mjs` -- the append either conflicts
  // harmlessly, which `on conflict do nothing` already absorbs, or fails for a
  // reason no client can act on, so a generic 500 is the honest answer.
  try {
    if (req.method === "GET") {
      const projectId = url.searchParams.get("projectId");
      if (!projectId)
        return sendJson(res, 400, { error: "projectId required" });
      return sendJson(res, 200, {
        items: await listMessages(user.id, projectId),
      });
    }

    if (req.method === "POST") {
      const read = await readBody(req);
      if (read.error === "too-large") {
        return sendJson(res, 413, {
          error: `A batch must be under ${MAX_BODY_BYTES} bytes`,
          reason: "too-large",
        });
      }
      if (read.error) return sendJson(res, 400, { error: "Body must be JSON" });

      const { projectId, items } = read.body;
      if (typeof projectId !== "string" || !Array.isArray(items)) {
        return sendJson(res, 400, { error: "projectId and items required" });
      }
      if (items.length > MAX_ITEMS) {
        return sendJson(res, 413, {
          error: `At most ${MAX_ITEMS} items`,
          reason: "too-large",
        });
      }
      if (!items.every(isValidItem)) {
        return sendJson(res, 400, { error: "Malformed items" });
      }

      return sendJson(res, 200, {
        written: await appendMessages(user.id, projectId, items),
      });
    }
  } catch (e) {
    // The driver's own text stays server side: it names columns, constraints
    // and sometimes the values that tripped them.
    console.error("api/conversations:", e);
    return sendJson(res, 500, { error: "Sync failed" });
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}
