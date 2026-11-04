// Generate Rust Analyzer's crates for the dev server, unless Rust Analyzer is a stub.
//
// The dev server answers a missing `public/crates` file with `index.html` (CRA's
// history fallback), so the real analyzer needs them; a stub never asks. Both
// generators exit early when their key matches, so only the first run, or one
// after `Cargo.lock` or the toolchain moves, takes minutes. Without cargo or
// rustup they warn and skip outside CI.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { CLIENT_PATH } from "./utils.mjs";
import { WASM_STUB_VERSION } from "./wasm-stubs.mjs";

const manifestPath = path.join(
  CLIENT_PATH,
  "node_modules",
  "@solana-playground",
  "rust-analyzer",
  "package.json"
);
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : undefined;

if (manifest === undefined || manifest.version === WASM_STUB_VERSION) {
  console.log(
    "Rust Analyzer is not installed or is a stub, so its crates are not generated. Skipping..."
  );
  process.exit(0);
}

// `generate-crates` first: it clears every crate file but the default crates'
for (const script of ["generate-crates.mjs", "generate-default-crates.mjs"]) {
  const result = spawnSync(
    process.execPath,
    [path.join(CLIENT_PATH, "scripts", script)],
    { stdio: "inherit" }
  );
  if (result.status === 0) continue;

  // CI restores current crates, so a failure there is real
  if (process.env.CI) process.exit(result.status ?? 1);
  // A local toolchain problem must not keep the dev server down; Rust
  // Analyzer turns itself off, or skips the crate, with a warning instead
  console.warn(
    `${script} failed (above), so the dev server starts without those crates.`
  );
}
