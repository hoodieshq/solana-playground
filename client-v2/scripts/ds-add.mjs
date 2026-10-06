// Installs or reinstalls design-system components into `shared/ui`:
//
//   yarn ds-add <name...> [shadcn flags, e.g. --dry-run]
//
// Builds the registry in ../design-system, serves it on the port
// components.json maps `@playground` to, runs the shadcn CLI the design
// system pins with `--overwrite` (the CLI never overwrites silently, and
// `shared/ui` is installed, never edited), then stops the server. Nothing is
// fetched from the design system's public site.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLIENT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DS = path.resolve(CLIENT, "../design-system");
const SHADCN = path.join(DS, "node_modules/.bin/shadcn");
const PORT = "3010";

const args = process.argv.slice(2);
const names = args.filter((a) => !a.startsWith("-"));
const flags = args.filter((a) => a.startsWith("-"));

if (names.length === 0) {
  console.error("Usage: yarn ds-add <name...> [--dry-run | --diff]");
  process.exit(1);
}
if (!existsSync(SHADCN)) {
  console.error(`ds-add: run \`npm ci\` in ${DS} first.`);
  process.exit(1);
}

const build = spawnSync("npm", ["run", "build:registry"], {
  cwd: DS,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status ?? 1);

const server = await startServer().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
let status = 1;
try {
  const add = spawnSync(
    SHADCN,
    [
      "add",
      ...names.map((n) => `@playground/${n}`),
      "--overwrite",
      "--yes",
      ...flags,
    ],
    { cwd: CLIENT, stdio: "inherit" }
  );
  status = add.status ?? 1;
} finally {
  server.kill();
}
process.exit(status);

/**
 * Starts the design system's registry server and resolves once it listens.
 * A busy port is an error, not something to reuse: another worktree's server
 * would serve that worktree's registry without a word.
 */
function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["scripts/serve-registry.mjs"], {
      cwd: DS,
      env: { ...process.env, PORT },
      stdio: ["ignore", "pipe", "inherit"],
    });
    child.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("registry on")) resolve(child);
    });
    child.on("exit", (code) =>
      reject(
        new Error(
          `ds-add: the registry server exited (${code}); is port ${PORT} ` +
            "taken? Stop whatever holds it and run again."
        )
      )
    );
  });
}
