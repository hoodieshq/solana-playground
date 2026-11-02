/**
 * `GET /api/ai/status`: whether an AI key is available to the caller, and
 * whose it would be. The client gates every AI surface on this answer
 * (spec `assistant-ai-status`).
 *
 * The answer never holds a key or any part of one: it says `hosted` or `own`,
 * and names the hosted model, which `GET /api/agent` publishes already.
 *
 * Reached through a `vercel.json` rewrite from `/api/ai/status`: the platform
 * maps a file to one path, and the dev server dispatches `/api/ai/...` to this
 * file by its first segment, so one file serves both.
 *
 * Plain ESM on raw Node request/response APIs — see `api/health.mjs` for why.
 */

import {
  warnAboutMissingObservabilityIds,
  withObservability,
} from "../src/features/api/server.mjs";
import { missingConfig, readSession } from "../src/features/auth/server.mjs";
import { agentEnv } from "../src/shared/config/server-env.mjs";

/**
 * @typedef {{
 *   available: boolean;
 *   key: "hosted" | "own";
 *   reason: "signed-out" | "unavailable" | null;
 *   model: string | null;
 * }} AiStatus
 */

/** No hosted key here: the user supplies their own in settings */
const OWN = { available: false, key: "own", reason: null, model: null };

/**
 * The hosted model's id, or `null` when this deployment offers no hosted key.
 *
 * The same rule as `api/agent.mjs`'s `GET`: a key alone is not enough,
 * because without sign-in that route refuses every turn. Settings only, not
 * `getAuth`: building auth opens the pool, which can throw.
 */
const hostedModel = () => {
  const agent = agentEnv();
  if (!agent.API_KEY || missingConfig().length > 0) return null;
  return agent.MODEL;
};

/**
 * What the caller can use, from the hosted model and their session.
 *
 * `unavailable` is not `signed-out`: signing in needs the same lookup that
 * just failed, so pointing the user at sign-in would not help.
 *
 * @param {string} model
 * @param {Awaited<ReturnType<typeof readSession>>} session
 * @returns {AiStatus}
 */
const hostedStatus = (model, session) => {
  switch (session.status) {
    case "signed-in":
      return { available: true, key: "hosted", reason: null, model };
    case "signed-out":
      return { available: false, key: "hosted", reason: "signed-out", model };
    case "unavailable":
      return { available: false, key: "hosted", reason: "unavailable", model };
    default:
      // `unconfigured`: the settings read as complete, yet auth would not
      // build from them, so no turn could be taken
      return OWN;
  }
};

const send = (req, res, status, body) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  // The answer depends on the caller's session cookie
  res.setHeader("cache-control", "no-store");
  res.end(req.method === "HEAD" ? undefined : JSON.stringify(body));
};

/**
 * The route, with the session reader injected so tests reach every caller
 * state without a database.
 *
 * @param {{ readSession: typeof readSession }} deps
 */
export const statusHandler =
  ({ readSession }) =>
  /**
   * @param {import("node:http").IncomingMessage} req
   * @param {import("node:http").ServerResponse} res
   */
  async (req, res) => {
    warnAboutMissingObservabilityIds();
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("allow", "GET, HEAD");
      return send(req, res, 405, {
        error: "Use GET to read whether an AI key is available.",
      });
    }

    const model = hostedModel();
    if (model === null) return send(req, res, 200, OWN);

    return send(req, res, 200, hostedStatus(model, await readSession(req)));
  };

export default withObservability("ai", statusHandler({ readSession }));
