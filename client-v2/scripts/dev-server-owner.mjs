// Tells whether the dev server on a port belongs to this worktree's
// client-v2. A local e2e run used to reuse whatever answered on the port,
// often another worktree's server, and reported false passes and failures
// (HOO-2106). `craco.config.js` makes the dev server name its own root in
// `DEV_SERVER_ROOT_HEADER`; `playwright.config.mts` asks `decideDevServer`.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Response header the client-v2 dev server names its own root in. */
export const DEV_SERVER_ROOT_HEADER = "X-Dev-Server-Root";

/**
 * @typedef {{ kind: "free" }
 *   | { kind: "ours" }
 *   | { kind: "foreign", root: string | null }} PortOwner
 */

// A path that does not exist here (another machine's, a deleted worktree)
// cannot be resolved; it is compared as written, and then it never matches.
const resolveRoot = (value) => {
  try {
    return fs.realpathSync(value);
  } catch (error) {
    if (error.code === "ENOENT") return value;
    throw error;
  }
};

/**
 * Asks the server on `port` whose it is.
 *
 * @param {{ port: number, root: string, timeoutMs?: number }} options
 * @returns {Promise<PortOwner>}
 */
export async function whoseServer({ port, root, timeoutMs = 3000 }) {
  let response;
  try {
    response = await fetch(`http://localhost:${port}/`, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error.cause?.code === "ECONNREFUSED") return { kind: "free" };
    // A timeout or a reset means something holds the port but does not answer
    // like our dev server, so the run must not reuse it nor start on top of it.
    return { kind: "foreign", root: null };
  }

  const theirs = response.headers.get(DEV_SERVER_ROOT_HEADER);
  if (theirs === null) return { kind: "foreign", root: null };
  if (resolveRoot(theirs) === resolveRoot(root)) return { kind: "ours" };
  return { kind: "foreign", root: theirs };
}

/**
 * The same answer, synchronously, for a config file that is evaluated
 * synchronously: runs this module as a child `node` and parses its stdout.
 *
 * @param {{ port: number, root: string }} options
 * @returns {PortOwner}
 * @throws {Error} when the child fails
 */
export function whoseServerSync({ port, root }) {
  const child = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url), String(port), root],
    { encoding: "utf8" }
  );
  if (child.error) throw child.error;
  if (child.status !== 0) {
    throw new Error(`dev-server-owner probe failed: ${child.stderr}`);
  }
  return JSON.parse(child.stdout);
}

/**
 * The fail-fast message for a port held by something that is not this
 * worktree's dev server.
 *
 * @param {{ port: number, root: string | null }} options `root` is the other
 *   worktree's, when the server named it
 * @returns {string}
 */
export function foreignServerMessage({ port, root }) {
  const holder =
    root === null
      ? "a server that is not a client-v2 dev server of this worktree (or does not answer)"
      : `the client-v2 dev server of another worktree: ${root}`;
  return [
    `Port ${port} is held by ${holder}.`,
    "The e2e run will not reuse it. Pick a free port from your slot",
    "(13000 + 10k, docs/testing.md section 8) and run:",
    `  PORT=<free port> yarn test-e2e`,
  ].join("\n");
}

/**
 * What the e2e run does with the port: "start" when nothing is there (the
 * runner starts the dev server), "reuse" for this worktree's own server.
 *
 * @param {{ port: number, root: string }} options
 * @returns {"start" | "reuse"}
 * @throws {Error} with `foreignServerMessage` for any other server
 */
export function decideDevServer({ port, root }) {
  const owner = whoseServerSync({ port, root });
  if (owner.kind === "free") return "start";
  if (owner.kind === "ours") return "reuse";
  throw new Error(foreignServerMessage({ port, root: owner.root }));
}

// No top-level await: craco.config.js `require`s this module, which Node
// refuses for an ES module that awaits at the top level.
if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [port, root] = process.argv.slice(2);
  whoseServer({ port: Number(port), root }).then(
    (owner) => console.log(JSON.stringify(owner)),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    }
  );
}
