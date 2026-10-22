/**
 * Better Auth in database mode, over GitHub.
 *
 * Replaced the hand-rolled PKCE/state/cookie flow that used to live in
 * `api/github-oauth.mjs`, exactly as its own FIXME asked. The scope widens from "" to
 * `read:user` because a stateless sign-in needed no identity of its own and a
 * persisted one does. The stable key is the numeric GitHub id -- never the
 * login, which the user can change.
 *
 * Built lazily so the module can be imported with nothing configured: the
 * probe in `/api/sync` and the dev server both need that.
 */
import { betterAuth } from "better-auth";

import { getPool, isConfigured } from "../../persistence/server/db.mjs";

let instance = null;

/**
 * The origin Better Auth builds its callback and redirect URLs from.
 *
 * Production sets `AUTH_BASE_URL` explicitly. A preview cannot: every deployment
 * gets its own URL and only learns it once it exists, so there is nothing to put
 * in the variable beforehand. Vercel injects that URL at runtime as `VERCEL_URL`
 * -- hostname only, no scheme -- which lets a preview describe itself and need
 * no configuration at all.
 *
 * `undefined` rather than `""` when neither is set, so local development falls
 * through to Better Auth's own default instead of being handed a base URL that
 * is not one.
 *
 * Exported because `api/projects.mjs` and `api/conversations.mjs` compare it
 * against a write request's `Origin`. Deliberately the same value the session
 * cookie is issued for, rather than a second copy of "where we are deployed"
 * that could drift from it: an origin check keyed off a different answer than
 * the cookie's would be a check of nothing in particular.
 *
 * @returns {string | undefined} the origin, or `undefined` to let Better Auth decide
 */
export const resolveBaseURL = () =>
  process.env.AUTH_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

/**
 * Which of the settings sign-in needs are absent.
 *
 * The same list `getAuth` refuses on, so the two cannot drift, and the reason
 * `/api/auth` gives for a 503. Names only, never values: on a platform where
 * every deployment carries its own environment, "which variable is missing
 * here" is the question a deployment cannot answer from the outside, and the
 * names are already in `.env.example` and in this file. An unconfigured
 * deployment is one that does not hold the secrets to begin with.
 *
 * @returns {string[]} the missing variable names, empty when sign-in can run
 */
export const missingConfig = () =>
  [
    isConfigured() ? null : "DATABASE_URL",
    process.env.GITHUB_CLIENT_ID ? null : "GITHUB_CLIENT_ID",
    process.env.GITHUB_CLIENT_SECRET ? null : "GITHUB_CLIENT_SECRET",
  ].filter(Boolean);

/**
 * The auth instance, created on first use.
 *
 * @returns {ReturnType<typeof betterAuth> | null} the instance, or `null` when
 * the database or the GitHub credentials are missing
 */
export const getAuth = () => {
  if (missingConfig().length) return null;
  const pool = getPool();

  if (!instance) {
    instance = betterAuth({
      database: pool,
      baseURL: resolveBaseURL(),
      secret: process.env.AUTH_SECRET,
      user: {
        additionalFields: {
          // The @handle. Better Auth's core schema has `name` and `image` but
          // not the login, and the profile chip renders it. Never an identity
          // key -- a login can be changed; ownership keys off `user.id`.
          login: { type: "string", required: false, input: false },
        },
      },
      socialProviders: {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          mapProfileToUser: (profile) => ({ login: profile.login }),
          // Scope is deliberately not set. Better Auth already requests
          // `read:user user:email`, and the option appends rather than
          // replaces -- passing `["read:user"]` only duplicated it in the
          // authorize URL. `user:email` is not droppable either: the `email`
          // column it fills is `not null unique`, so sign-in fails without it
          // for any account whose email is private.
        },
      },
    });
  }
  return instance;
};

/**
 * Resolve the signed-in user for a request.
 *
 * @param {import("node:http").IncomingMessage} req
 * @returns {Promise<{id: string} | null>} the user, or `null` when signed out
 */
export const requireUser = async (req) => {
  const auth = getAuth();
  if (!auth) return null;

  try {
    const { fromNodeHeaders } = await import("better-auth/node");
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    return session?.user ? { id: String(session.user.id) } : null;
  } catch {
    // An unreadable session is a signed-out request, not a server error
    return null;
  }
};
