// Public API of the slice: import from here, never from its internals.
// Names are deliberately un-prefixed - the slice should not know the naming
// convention of the app consuming it. Callers alias to `Pg*` at the import.
export { GithubAuth, checkGithubSignIn } from "./model/github-auth";
export type { GithubUser } from "./model/github-auth";
