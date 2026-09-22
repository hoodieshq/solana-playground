/**
 * What this feature offers a server route. The one door into it.
 *
 * `index.ts` is the same thing for the browser; this is its counterpart for
 * `api/*.mjs`, which Vercel executes as plain ESM with no build step -- hence
 * `.mjs` rather than `.ts`. See `features/persistence/server.mjs` for the
 * reasoning in full.
 */
export {
  getAuth,
  missingConfig,
  requireUser,
  resolveBaseURL,
} from "./model/auth.mjs";
