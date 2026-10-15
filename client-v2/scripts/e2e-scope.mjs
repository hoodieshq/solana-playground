// Tells a local run of the whole e2e suite from a run of a few specs. Three
// full suites at once ran a laptop out of memory; a session needs only the
// specs it touched, and the full suite is CI's. `playwright.config.mts` refuses
// a local full suite unless `E2E_FULL=1`.

import path from "node:path";

// `playwright test` options that take a value, so the word after one is not a
// spec (Playwright 1.62, `playwright test --help`).
const VALUE_FLAGS = new Set([
  "--browser",
  "-c",
  "--config",
  "-g",
  "--grep",
  "-G",
  "--grep-invert",
  "--global-timeout",
  "-j",
  "--workers",
  "--last-failed-file",
  "--max-failures",
  "--output",
  "--project",
  "--repeat-each",
  "--reporter",
  "--retries",
  "--run-agents",
  "--shard",
  "--test-list",
  "--test-list-invert",
  "--timeout",
  "--trace",
  "--tsconfig",
  "--ui-host",
  "--ui-port",
  "--update-source-method",
]);

// Options whose value is optional: the next word is theirs only when it is
// one of their choices. `--only-changed [ref]` is left out: it narrows the run
// whatever follows it.
const OPTIONAL_VALUE_FLAGS = new Map([
  ["--debug", new Set(["inspector", "cli"])],
  ["-u", new Set(["all", "changed", "missing", "none"])],
  ["--update-snapshots", new Set(["all", "changed", "missing", "none"])],
]);

const NARROWING_FLAGS = new Set([
  "-g",
  "--grep",
  "--last-failed",
  "--only-changed",
]);

const isWithin = (child, parent) => {
  const relative = path.relative(parent, child);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
};

/**
 * Whether `playwright test` with these arguments runs the whole suite: no spec
 * filter and no flag that picks tests. A filter naming the test directory or a
 * directory above it (`e2e/`, `.`) matches every spec, so it counts as none.
 *
 * @param {string[]} args `process.argv.slice(2)`: the command, then its options
 * @param {{ cwd: string, testDir: string }} where
 * @returns {boolean} false for any command other than `test`
 */
export function isFullSuite(args, { cwd, testDir }) {
  if (args[0] !== "test") return false;
  const filters = [];
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") {
      filters.push(...args.slice(i + 1));
      break;
    }
    if (!arg.startsWith("-")) {
      filters.push(arg);
      continue;
    }
    const name = arg.split("=", 1)[0];
    if (NARROWING_FLAGS.has(name)) return false;
    if (arg.includes("=")) continue;
    if (VALUE_FLAGS.has(name)) {
      i++;
    } else if (OPTIONAL_VALUE_FLAGS.get(name)?.has(args[i + 1])) {
      i++;
    }
  }
  return filters.every((filter) =>
    isWithin(testDir, path.resolve(cwd, filter))
  );
}

/**
 * The message a local full-suite run exits with, or null when the run may go
 * on: it names specs, or `E2E_FULL=1` asks for the whole suite on purpose.
 *
 * @param {{ args: string[], env: Record<string, string | undefined>,
 *   cwd: string, testDir: string }} options
 * @returns {string | null}
 */
export function fullSuiteRefusal({ args, env, cwd, testDir }) {
  if (env.E2E_FULL === "1") return null;
  if (!isFullSuite(args, { cwd, testDir })) return null;
  return [
    "A local e2e run takes only the specs you touched:",
    "  yarn test-e2e e2e/<spec>.e2e.spec.ts",
    "The full suite is CI's. To run it here anyway (it still waits for a",
    "queue slot): E2E_FULL=1 yarn test-e2e",
  ].join("\n");
}
