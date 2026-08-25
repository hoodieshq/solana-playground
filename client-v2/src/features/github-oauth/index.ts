// Public API of the slice: import from here, never from its internals.
export { PgGithubAuth, checkGithubSignIn } from "./model/github-auth";
export type { GithubUser } from "./model/github-auth";
