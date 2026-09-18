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

import { getPool } from "../../persistence/server/db.mjs";

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
 * @returns {string | undefined} the origin, or `undefined` to let Better Auth decide
 */
const resolveBaseURL = () =>
  process.env.AUTH_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

/**
 * The auth instance, created on first use.
 *
 * @returns {ReturnType<typeof betterAuth> | null} the instance, or `null` when
 * the database or the GitHub credentials are missing
 */
export const getAuth = () => {
  const pool = getPool();
  if (!pool) return null;
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return null;
  }

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
