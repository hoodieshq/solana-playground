// Generate the default crates (`core`, `alloc`, `std`) for Rust Analyzer.

import path from "path";
import fs from "fs/promises";
import zlib from "zlib";
import { homedir } from "os";
import { execFileSync, spawnSync } from "child_process";

import { CLIENT_PATH, REPO_ROOT_PATH, exists } from "./utils.mjs";

/** Crates output directory path */
const CRATES_PATH = path.join(CLIENT_PATH, "public", "crates");

/** Toolchain file of the Rust Analyzer WASM, read the way `wasm/build.sh` reads it */
const TOOLCHAIN_PATH = path.join(
  REPO_ROOT_PATH,
  "wasm",
  "rust-analyzer",
  "rust-toolchain.toml"
);

/** `syn-file-expand-cli` name */
const CLI_NAME = "syn-file-expand-cli";

/** 0.3.0 is built on `syn` 2, which cannot parse the `box` expressions in `std` */
const CLI_VERSION = "0.2.0";

/** Flags per crate; `core` drops the AVX-512 variant of a module with two `#[path]`s */
const CRATES = {
  core: ["--unset-cfg", "all(target_arch=x86_64,target_feature=avx512f)"],
  alloc: [],
  std: [],
};

// The brotli copies' bytes come from the brotli bundled with Node, so run only on the pinned Node
const nodeVersion = (
  await fs.readFile(path.join(CLIENT_PATH, ".nvmrc"), "utf8")
).trim();
if (process.versions.node.split(".")[0] !== nodeVersion.split(".")[0]) {
  throw new Error(
    `Node ${process.versions.node} is running; .nvmrc pins ${nodeVersion}. Run \`nvm use\` in client-v2`
  );
}

// Upstream (beta.solpg.io) serves default crates from about Rust 1.60 beside a 1.68.0-nightly analyzer; we take both from the analyzer's toolchain
const channel = (await fs.readFile(TOOLCHAIN_PATH, "utf8")).match(
  /^channel\s*=\s*"([^"]+)"/m
)?.[1];
if (!channel) throw new Error(`No \`channel\` in ${TOOLCHAIN_PATH}`);

run("rustup", [
  "toolchain",
  "install",
  channel,
  "--profile",
  "minimal",
  "--component",
  "rust-src",
]);
const libraryPath = path.join(
  execFileSync("rustc", [`+${channel}`, "--print", "sysroot"], {
    encoding: "utf8",
  }).trim(),
  "lib",
  "rustlib",
  "src",
  "rust",
  "library"
);

// A root of its own, so it never shadows the release `generate-crates` installs
const cargoHome = process.env.CARGO_HOME ?? path.join(homedir(), ".cargo");
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

await fs.mkdir(CRATES_PATH, { recursive: true });
for (const [name, flags] of Object.entries(CRATES)) {
  const outPath = path.join(CRATES_PATH, `${name}.rs`);
  run(cliPath, [
    path.join(libraryPath, name, "src", "lib.rs"),
    "--loopify",
    "--cfg-true-by-default",
    "--unset-cfg",
    "test",
    ...flags,
    "--output",
    outPath,
  ]);

  // Quality 11 compresses ~30% below gzip -9; window 24 is the largest every browser decodes
  const source = await fs.readFile(outPath);
  await fs.writeFile(
    `${outPath}.br`,
    zlib.brotliCompressSync(source, {
      params: {
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_LGWIN]: 24,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: source.length,
      },
    })
  );
  console.log({
    name,
    toolchain: channel,
    node: process.versions.node,
    brotli: process.versions.brotli,
  });
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
