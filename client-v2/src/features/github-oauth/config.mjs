// Values shared by both halves of the feature: the browser model under `src`
// and the serverless handler under `api`, which is plain ESM outside the TS
// build (see api/health.mjs). `.mjs` so Node can import it directly; `allowJs`
// lets the TypeScript side import the same file rather than restate it.
//
// The wire values below were previously duplicated string literals on both
// sides. Changing one alone breaks sign-in at runtime with no type error,
// which is exactly the failure a shared constant removes.

/** Where the popup sends the user to consent */
export const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

/** Where the handler redeems the code, using the client secret */
export const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

/** Where the browser reads the identity the token stands for */
export const GITHUB_USER_URL = "https://api.github.com/user";

/** The handler's own route: the model opens it, the handler echoes it back
 *  as `redirect_uri`, and GitHub matches the two. */
export const OAUTH_ROUTE = "/api/github-oauth";

/**
 * How long one flow may take, in seconds.
 *
 * It bounds two things that have to agree: the lifetime of the cookies the
 * handler pins, and how long the browser waits for the popup to answer. The
 * wait outliving the cookies would leave the user watching a spinner for a
 * flow the server had already forgotten.
 */
export const FLOW_MAX_AGE_SECONDS = 600;

/** Discriminates our messages from anything else on the page */
export const MESSAGE_TYPE = "pg-github-auth";

/** Names both the popup window and the BroadcastChannel fallback */
export const CHANNEL_NAME = "pg-github-auth";
