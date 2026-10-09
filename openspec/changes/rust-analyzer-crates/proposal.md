# Proposal

## Why

No deployment of `client-v2` serves the crate files the editor's Rust Analyzer
loads from `/crates/`, so the analyzer has no standard library and no
supported crate. Preview and production answer `/crates/std.rs`,
`/crates/anchor_lang.rs`, and every other crate file with the app's
`index.html` and HTTP 200 (preview and production of
[`b1bf2cf`](https://github.com/hoodieshq/solana-playground/commit/b1bf2cfc374b39c6bf016e638baa9b4ffc913490)).
Rust Analyzer parses that HTML as the standard library, and `Vec::`,
`Result`, `format!`, and most of `anchor_lang` resolve to nothing.

Two gaps cause it:

- **The default crates have no recipe.** `rust-analyzer.ts` calls `core`,
  `alloc`, and `std` the default crates (`loadDefaultCrates`). No script, CI
  step, deploy step, or tracked file in the history of `master` or
  `master-2.0` produces them; `generate-crates` only keeps copies that already
  exist (`withReset`). `beta.solpg.io` serves copies from Amazon S3 (design.md,
  section "Upstream reference"). How upstream made those copies is not
  recorded; their format is `syn-file-expand-cli` output, and their newest
  stabilization is Rust 1.60. The generator this change adds is the first
  recipe for them.
- **The supported crates are never found on Vercel.** `generate-crates` copies
  each supported crate out of the local cargo registry. On Vercel that
  registry never holds the crates of `server/programs`, so every supported
  crate is "not found. Skipping...", and the build still succeeds.

A local test at `b1bf2cf` showed the fix works. With generated default crates,
typing `Vec::` completes `allocator`, `append`, `capacity`, and `clear`. With
the default crates removed, it completes nothing.

## What Changes

- A script generates the default crates from the `rust-src` component of the
  toolchain in
  [`wasm/rust-analyzer/rust-toolchain.toml`](../../../wasm/rust-analyzer/rust-toolchain.toml),
  the toolchain the Rust Analyzer wasm is built with. That toolchain is Rust
  1.68.0-nightly. User programs compile with Rust 1.68.0: the build server
  runs Solana 1.17.34, whose `cargo-build-sbf`
  [pins platform-tools v1.37](https://github.com/anza-xyz/agave/blob/77daab497df191ef485a7ad36ed291c1874596e5/sdk/cargo-build-sbf/src/main.rs),
  which
  [builds Solana's Rust branch `solana-tools-v1.37`](https://github.com/anza-xyz/platform-tools/blob/390112a3f6d25e17662e83bf73d73f3d483b556e/build.sh),
  whose
  [`src/version`](https://github.com/solana-labs/rust/blob/solana-tools-v1.37/src/version)
  reads `1.68.0`.
- The script expands the default crates with `syn-file-expand-cli` 0.2.0. The
  0.3.0 release that `generate-crates` installs depends on `syn` 2, which
  cannot parse the unstable `box` expressions in the standard library.
- The script unifies two versions upstream keeps apart. `beta.solpg.io` pairs a
  1.68.0-nightly Rust Analyzer with default crates from about Rust 1.60. Here
  both come from the analyzer's toolchain, and a comment in the script records
  the difference from upstream.
- `generate-crates` downloads the crates of `server/programs/Cargo.lock` with
  `cargo fetch --locked` before it reads the registry. It fails, naming the
  crate, when it cannot generate a supported crate.
- The Vercel build restores the default crates from Vercel Remote Cache, keyed
  on their inputs, and generates them only when the key is absent; it
  generates the supported crates in every build. The Docker image build
  generates both, and a `client-v2-standalone` compose profile runs the client
  without the server. The crate files ship as static assets of our own
  deployment. No file is uploaded by hand and no generated file is committed.
- No slice under `features/` or `widgets/` changes. No telemetry event is
  added, renamed, or removed.

## Capabilities

### New Capabilities

- `client-v2-editor-crates`: the crate files the editor's Rust Analyzer loads
  from `/crates/`: which files every deployment serves, and how they are
  produced from pinned inputs.

### Modified Capabilities

None.

## Impact

- [`client-v2/scripts/`](../../../client-v2/scripts/): a generator for the
  default crates. [`generate-crates.mjs`](../../../client-v2/scripts/generate-crates.mjs)
  gains the registry fetch, the failure on a missing crate, and a key that
  skips the work when the inputs are unchanged.
- [`client-v2/scripts/vercel-install.sh`](../../../client-v2/scripts/vercel-install.sh):
  restores and uploads the default crates through Vercel Remote Cache, as it
  does for the wasm packages.
- [`client-v2/package.json`](../../../client-v2/package.json): the
  `generate-default-crates` script, run by `generate`.
- [`client-v2/Dockerfile`](../../../client-v2/Dockerfile),
  [`compose.yaml`](../../../compose.yaml), and
  [`.dockerignore`](../../../.dockerignore): the image bakes every crate file,
  and the `client-v2-standalone` profile.
- [`client-v2/docs/deploy-client-vercel.md`](../../../client-v2/docs/deploy-client-vercel.md):
  how a Vercel build produces the crate files.
- Users: completion, hover, and diagnostics for the standard library and the
  supported crates work in the editor. The first editor load downloads more:
  in the local test, the default crates generated from Rust 1.61 transferred
  as 1.27 MB compressed.
- Vercel: a build whose inputs changed runs the generation: the toolchain
  download, a `cargo fetch` of about 800 MB, and the expansion. Every other
  build restores `public/crates` from the cache.
- Out of scope:
  - Changing the Rust Analyzer wasm or its toolchain.
  - Shrinking `core.rs`, 10.3 MB uncompressed.
  - `mpl-token-metadata`, which `generate-crates` skips on purpose.
  - Moving the build server to another Solana release.
  - An editor message when the crate files fail to load.
  - A 404 for a missing file under `/crates/`. Vercel answers a missing path
    with `index.html` through a route outside `vercel.json`, and a 404 there
    needs the legacy `routes` array. Every crate the editor requests is
    generated, and `generate-crates.mjs` fails the build when a supported crate
    is missing, so no request reaches that fallback.
  - `yarn setup` on a checkout that started from `wasm/stub-packages.sh`: it
    rebuilds the wasm packages, but yarn 1 keeps the stub Rust Analyzer in
    `node_modules` because the lockfile did not change. `yarn install
    --check-files` replaces it. This is local set-up, not serving the crate
    files.
  - Moving the wasm, default crates, and supported crates caches to
    Turborepo's Remote Cache, which would replace the cache code in
    `vercel-install.sh`. Deferred until `client-v2` moves to Next.
