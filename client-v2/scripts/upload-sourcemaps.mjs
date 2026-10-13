// The last step of `build:slim`: uploads the bundle's source maps to Sentry
// where `sourcemapsEnabled` made the build emit them, then deletes them, since
// Vercel would otherwise serve every map in `build/` publicly.
import { execFileSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { sourcemapsEnabled } from "./sourcemap-gate.mjs";

const SENTRY_ORG = "solana-fndn";
const SENTRY_PROJECT = "solana-playground";

const clientDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const buildDir = path.join(clientDir, "build");
const sentryCli = path.join(clientDir, "node_modules", ".bin", "sentry-cli");

/** Every `.map` file under `dir` */
const findMaps = async (dir) => {
  const entries = await fs.readdir(dir, { recursive: true });
  return entries
    .filter((entry) => entry.endsWith(".map"))
    .map((entry) => path.join(dir, entry));
};

if (!sourcemapsEnabled(process.env)) {
  console.log("source maps: off for this build, nothing to upload");
  process.exit(0);
}

const maps = await findMaps(buildDir);
if (process.env.SENTRY_AUTH_TOKEN) {
  // `inject` stamps a debug id into each bundle and its map, which is how Sentry pairs them
  const run = (command) =>
    execFileSync(
      sentryCli,
      [
        "sourcemaps",
        command,
        "--org",
        SENTRY_ORG,
        "--project",
        SENTRY_PROJECT,
        buildDir,
      ],
      { stdio: "inherit" }
    );
  run("inject");
  run("upload");
} else {
  console.warn(
    "warning: SENTRY_AUTH_TOKEN is not set; source maps are not uploaded to Sentry"
  );
}

await Promise.all(maps.map((map) => fs.rm(map)));
console.log(`source maps: deleted ${maps.length} from build/`);
