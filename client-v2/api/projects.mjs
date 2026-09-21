/**
 * Project snapshot sync.
 *
 * Deliberately plain ESM using raw Node request/response APIs, like the rest
 * of `api/` -- see `api/health.mjs` for why. The four helpers below are
 * duplicated from `api/conversations.mjs` on purpose: `api/` has no shared
 * module yet, and copying four small functions is cheaper than inventing one.
 */
import { requireUser } from "../src/features/auth/server/auth.mjs";
import { isEnabled } from "../src/features/persistence/server/db.mjs";
import {
  deleteProject,
  getProject,
  listProjects,
  saveProject,
} from "../src/features/persistence/server/projects.mjs";

/** A workspace larger than this is not something we sync silently */
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

const readBody = async (req) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Payload too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
export default async function handler(req, res) {
  if (!isEnabled()) return sendJson(res, 503, { error: "Sync is disabled" });

  const user = await requireUser(req);
  if (!user) return sendJson(res, 401, { error: "Not signed in" });

  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");

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
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      return sendJson(res, 413, { error: e.message });
    }

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

    // Reaches SQL as a timestamptz. Unchecked, a malformed one is a cast error
    // from the driver, which is a 500 for what is really a bad request.
    if (
      body.baseUpdatedAt !== undefined &&
      (typeof body.baseUpdatedAt !== "string" ||
        Number.isNaN(Date.parse(body.baseUpdatedAt)))
    ) {
      return sendJson(res, 400, { error: "baseUpdatedAt must be a timestamp" });
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

  return sendJson(res, 405, { error: "Method not allowed" });
}
