// Generate crates for Rust Analyzer.
//
// Usage: `generate-crates.mjs` generates, or exits early when `KEY_PATH` matches;
// `generate-crates.mjs --key` prints the key and exits.

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { execSync, spawnSync } from "child_process";

import {
  CLIENT_PATH,
  exists,
  readJSON,
  REPO_ROOT_PATH,
  resetDir,
  SUPPORTED_CRATES_PATH,
} from "./utils.mjs";

/** Crates output directory path */
const CRATES_PATH = path.join(CLIENT_PATH, "public", "crates");

/** Key of the inputs the supported crates in `CRATES_PATH` were generated from */
const KEY_PATH = path.join(CRATES_PATH, ".crates-key");

/** Path to the `Cargo.lock` */
const LOCK_FILE_PATH = path.join(
  REPO_ROOT_PATH,
  "server",
  "programs",
  "Cargo.lock"
);

/** `syn-file-expand-cli` name */
const CLI_NAME = "syn-file-expand-cli";

/** `syn-file-expand-cli` version for the supported crates */
const CLI_VERSION = "0.3.0";

// The script's own source carries the tool version and the flags
const key = crypto
  .createHash("sha256")
  .update(await fs.readFile(fileURLToPath(import.meta.url)))
  .update("\0")
  .update(await fs.readFile(LOCK_FILE_PATH))
  .digest("hex");

if (process.argv.includes("--key")) {
  console.log(key);
  process.exit(0);
}

if (
  (await exists(path.join(CRATES_PATH, "versions.json"))) &&
  (await exists(KEY_PATH)) &&
  (await fs.readFile(KEY_PATH, "utf8")).trim() === key
) {
  console.log(`Crates are current (${key}). Skipping...`);
  process.exit(0);
}

// Exit early if Rust is not installed
try {
  execSync("rustc --help", { stdio: "ignore" });
} catch {
  console.log("Could not find Rust installation. Skipping crate generation...");
  process.exit(0);
}

/** Cargo home the registry and the tool live in */
const cargoHome = process.env.CARGO_HOME ?? path.join(homedir(), ".cargo");

// The registry holds only what something downloaded; fetch every locked crate first
run("cargo", [
  "fetch",
  "--locked",
  "--manifest-path",
  path.join(path.dirname(LOCK_FILE_PATH), "Cargo.toml"),
]);

// A root of its own, so a different release on `PATH` never decides the output
const cliRoot = path.join(cargoHome, "tools", `${CLI_NAME}-${CLI_VERSION}`);
const cliPath = path.join(cliRoot, "bin", CLI_NAME);
if (!(await exists(cliPath))) {
  run("cargo", [
    "install",
    CLI_NAME,
    "--version",
    CLI_VERSION,
    "--locked",
    "--root",
    cliRoot,
  ]);
}

/** Local crates.io registry */
const registry = await getRegistry();

/** `Cargo.lock` file for dependencies */
const lockFile = await parseLockFile(LOCK_FILE_PATH);

/** Cached crate names */
const cachedCrates = [];

/**
 * Crates to skip.
 *
 * [`mpl-token-metadata`] adds `r#` prefix to the module declarations for some
 * reason which results in `syn-file-expand-cli` trying to find instruction
 * files starting with `r#`.
 *
 * [`mpl-token-metadata`]: https://github.com/metaplex-foundation/mpl-token-metadata/blob/4e5bcca44000f151fe64682826bbe2eb61cd7b87/clients/rust/src/generated/instructions/mod.rs#L8
 */
const skippedCrates = ["mpl-token-metadata"];

await withReset(async () => {
  // Generate crates
  const crates = await getCrates();
  await generateDependencies(crates);

  // Save versions
  await fs.writeFile(
    path.join(CRATES_PATH, "versions.json"),
    JSON.stringify(crates)
  );
});

// Written last, so an interrupted run never looks current
await fs.writeFile(KEY_PATH, `${key}\n`);

/**
 * Execute the given callback after crates directory has been reset.
 *
 * @param {() => Promise<void>} cb callback to execute
 */
async function withReset(cb) {
  // Everything `generate-default-crates.mjs` writes, its key included, so a current copy survives
  const paths = [
    ...["alloc", "core", "std"].flatMap((name) => [
      `${name}.rs`,
      `${name}.rs.br`,
    ]),
    ".default-crates-key",
  ].map((file) => ({
    initial: path.join(CRATES_PATH, file),
    temp: path.join(CRATES_PATH, "..", file),
  }));

  // Move default crates
  for (const { initial, temp } of paths) {
    try {
      await fs.rename(initial, temp);
    } catch {}
  }

  // Reset crates directory
  await resetDir(CRATES_PATH);

  // Execute callback
  await cb();

  // Move back default crates
  for (const { initial, temp } of paths) {
    try {
      await fs.rename(temp, initial);
    } catch {}
  }
}

/**
 * Generate dependencies recursively.
 *
 * NOTE: Currently only proc macro transitive dependencies are supported.
 *
 * @param {{ [name: string]: string }} crates crates map to get dependencies from
 * @param {boolean} transitive  whether the dependency is a transitive dependency
 */
async function generateDependencies(crates, transitive) {
  for (const name in crates) {
    if (cachedCrates.includes(name) || skippedCrates.includes(name)) continue;

    const version = crates[name];
    const dirPath = registry.find(`${name}-${version}`);
    if (!dirPath) {
      // `cargo fetch` downloaded every locked crate, so a miss is a broken setup
      throw new Error(
        `Crate \`${name}(v${version})\` not found in ${registry.root}`
      );
    }

    // Get transitive deps
    if (transitive) {
      // Only get proc macro transitive deps for now
      const cargoToml = await fs.readFile(path.join(dirPath, "Cargo.toml"));
      if (!cargoToml.includes("proc-macro = true")) continue;
    }

    // Generate crate
    const snakeCaseName = name.replaceAll("-", "_");
    const result = spawnSync(cliPath, [
      path.join(dirPath, "src", "lib.rs"),
      "--loopify",
      "--cfg-true-by-default",
      "--output",
      path.join(CRATES_PATH, `${snakeCaseName}.rs`),
    ]);
    if (result.status !== 0) throw new Error(result.output?.toString());

    // Get `Cargo.toml`
    await fs.copyFile(
      path.join(dirPath, "Cargo.toml.orig"),
      path.join(CRATES_PATH, `${snakeCaseName}.toml`)
    );

    // Cache crate
    cachedCrates.push(name);
    console.log({ name, version });

    // Generate transitive dependencies
    await generateDependencies(getDependencies(name, version), true);
  }
}

/**
 * Get dependencies from the lock file.
 *
 * @param {string} name name of the dependency
 * @param {string} version version of the dependency
 * @returns the dependencies in { [name: string]: <VERSION: string> } format
 */
function getDependencies(name, version) {
  if (!lockFile) return {};

  const crate = lockFile.find(
    (crate) => crate.name === name && crate.version === version
  );
  if (!crate) {
    throw new Error(`Crate \`${name}(v${version})\` not found in lock file`);
  }

  return crate.dependencies.reduce((acc, { name, version }) => {
    const deps = lockFile.filter((crate) => crate.name === name);
    if (deps.length) acc[name] = version ?? deps[0].version;
    return acc;
  }, {});
}

/** Get all supported crates. */
export async function getCrates() {
  if (lockFile) {
    const dependencies = lockFile
      .find((crate) => crate.name === "solpg")
      .dependencies.reduce((acc, dep) => {
        acc[dep.name] =
          dep.version ??
          lockFile.find((crate) => crate.name === dep.name).version;
        return acc;
      }, {});

    await fs.writeFile(
      SUPPORTED_CRATES_PATH,
      JSON.stringify(dependencies, null, 2)
    );
  }

  return await readJSON(SUPPORTED_CRATES_PATH);
}

/**
 * Get the local crates.io registries. Cargo releases name the directory
 * differently, so a cargo home can hold several; each crate is looked up in all.
 *
 * @returns the registry root and a lookup from `<name>-<version>` to its source directory
 */
async function getRegistry() {
  const root = path.join(cargoHome, "registry", "src");
  const dirs = (await fs.readdir(root))
    .filter((dir) => dir.startsWith("index.crates.io"))
    .map((dir) => path.join(root, dir));
  if (!dirs.length) throw new Error(`No crates.io registry in ${root}`);

  const sources = new Map();
  for (const dir of dirs) {
    for (const crate of await fs.readdir(dir)) {
      if (!sources.has(crate)) sources.set(crate, path.join(dir, crate));
    }
  }

  return { root, find: (crate) => sources.get(crate) };
}

/**
 * Run a command and throw with its output when it fails.
 *
 * @param {string} command program to run
 * @param {string[]} args its arguments
 */
function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `\`${command} ${args.join(" ")}\` failed:\n${
        result.stderr ?? result.error
      }`
    );
  }
}

/**
 * Parse a `Cargo.lock` file.
 *
 * @param {string} lockPath `Cargo.lock` file path
 * @returns the parsed lock file
 */
async function parseLockFile(lockPath) {
  const lockFileExists = await exists(LOCK_FILE_PATH);
  if (!lockFileExists) return null;

  const lockFile = await fs.readFile(lockPath, "utf8");
  return lockFile
    .split("[[package]]")
    .filter((_, i) => i !== 0)
    .map((pkg) => pkg.replaceAll("\n", ""))
    .map((pkg) => {
      const name = /name\s=\s"([\w-]+)"/.exec(pkg)[1];
      const version = /version\s=\s"([\w\d-\.\+]+)"/.exec(pkg)[1];
      const dependencies = JSON.parse(
        /dependencies\s=\s(.*)/.exec(pkg)?.[1].replace(",]", "]") ?? "[]"
      ).map((dep) => {
        const result = /([\w-]+)\s?(\S*)?\s?(\S*)?/.exec(dep);
        const name = result[1];
        const version = result[2];
        const registry = result[3];
        return { name, version, registry };
      });
      return { name, version, dependencies };
    });
}
