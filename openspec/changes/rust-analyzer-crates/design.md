# Design

## Context

See [proposal.md](proposal.md), section "Why", for the gap. The approach
depends on these facts, read at
[`b1bf2cf`](https://github.com/hoodieshq/solana-playground/commit/b1bf2cfc374b39c6bf016e638baa9b4ffc913490):

- [`rust-analyzer.ts`](../../../client-v2/src/components/Editor/Monaco/languages/rust/rust-analyzer/rust-analyzer.ts)
  fetches the default crates on every editor start (`loadDefaultCrates`), and
  `/crates/<name>.rs` plus `/crates/<name>.toml` per dependency
  (`loadDependency`). `PgCommon.fetchText` throws on a non-OK response, so a
  404 stops the analyzer's start-up instead of feeding it HTML.
- [`craco.config.js`](../../../client-v2/craco.config.js) defines `CRATES` by
  listing `public/crates` at compile time (`defineFromPublicDir`), so the crate
  files must exist before `craco build` runs.
- [`generate-crates.mjs`](../../../client-v2/scripts/generate-crates.mjs) runs
  in `yarn generate`, which `yarn build` runs. `withReset` empties
  `public/crates` except the default crates, then the script expands each
  supported crate from `$CARGO_HOME/registry/src/index.crates.io-*`.
- [`vercel-install.sh`](../../../client-v2/scripts/vercel-install.sh) caches the
  wasm packages in Vercel Remote Cache (`remote_has`, `remote_fetch`,
  `remote_upload`). Its `CARGO_HOME`, `.cache/rust/cargo`, is exported only
  inside that script, so `yarn build` reads `~/.cargo` instead.
- Vercel answers a missing path with `index.html` and HTTP 200. That includes
  a path with a dot, such as `/no-such-file.xyz`, which the SPA rewrite in
  [`vercel.json`](../../../client-v2/vercel.json) excludes. The build output has
  no `404.html`.

Measurements on macOS at `b1bf2cf`, one run each:

| Step | Result |
| ---------------------------------------------------------------------- | ------------------------- |
| `syn-file-expand-cli` 0.2.0 install | 14 s |
| `std`, `alloc`, `core` from `nightly-2022-12-12` with 0.2.0 | 2.1 MB, 1.0 MB, 10.3 MB |
| `cargo fetch --locked` of `server/programs` into an empty `CARGO_HOME` | 796 MB, about 420 MB peak |
| `generate-crates` after that fetch | 85 files, 0 skipped |
| The same fetch on a filled registry | 0.25 s |

### Upstream reference

Every comparison with upstream in this change is against the files below.
`beta.solpg.io` serves them from Amazon S3, outside any repository, so a
commit cannot pin them. The SHA-256 identifies the exact bytes; `ETag` and
`Last-Modified` are what S3 answered. All four were uploaded within six
seconds, so `Last-Modified` dates an upload, not a generation. At the time,
upstream's
[`solana-playground`](https://github.com/solana-playground/solana-playground/commit/3fb888f38961738635e6b971b3fd724fc86ce198)
was at `3fb888f`, and
[`assets`](https://github.com/solana-playground/assets/commit/7fa9f326867f48f7e3abf47494d9a1849beff01f)
at `7fa9f32`; neither contains these files.

| File | Bytes | SHA-256 | `ETag` | `Last-Modified` |
| -------------------------------------------- | --------- | ------------------------------------------------------------------ | ---------------------------------- | ----------------------------- |
| `https://beta.solpg.io/crates/core.rs` | 2,879,532 | `8efecd687c73dc8c1c2dc6972da42ef33568bf9e1b532a4f9da53bd726c1d764` | `187e6243e4e0a5b1699cd18815ef3a66` | Fri, 21 Aug 2026 18:42:20 GMT |
| `https://beta.solpg.io/crates/alloc.rs` | 815,113 | `83ce2a8d81dfa75b7c2248e55ae71799f39dbc7870eb360f7553d5562fb99078` | `31d1fe7d4c8d9af37190e9dac52d739e` | Fri, 21 Aug 2026 18:42:18 GMT |
| `https://beta.solpg.io/crates/std.rs` | 1,509,878 | `c1c2b7cbf5f597e1bdc89fe2cd2eb916c48fc941aa00de20031c123357f8045f` | `a3de96aced38def4f40687718f6cad32` | Fri, 21 Aug 2026 18:42:23 GMT |
| `https://beta.solpg.io/crates/versions.json` | 728 | `36a5637374859fd5ee9facab6c91666c4ef164e14048e3ff33849d35b56fcfe5` | `09d9d359d686cb3c8669de38f4edcb16` | Fri, 21 Aug 2026 18:42:24 GMT |

To check whether upstream has replaced the files, compare the SHA-256 of a
fresh download with this table.

## Goals / Non-Goals

**Goals:**

- One command produces all of `public/crates` from pinned inputs, on a
  developer machine and on Vercel.
- A build on unchanged inputs runs no Rust tool.

**Non-Goals:**

- Generating crates in the browser, or on the build server per request.
- Matching upstream's hand-made default crates byte for byte.

## Decisions

### `syn-file-expand-cli` 0.2.0 for the default crates only

The 0.3.0 release depends on `syn` 2, which removed the unstable `box`
expression. Eighteen files of the 1.61 `std` use `box`, `thread/local.rs`
among them. The 0.2.0 release depends on `syn` 1 and expands `std`, `alloc`,
and `core` of `nightly-2022-12-12`. The supported crates keep the release
`generate-crates.mjs` installs, which generates all 85 files. Each release is
installed with `cargo install --locked --version <version> --root <dir>` into
a directory of its own under the cargo home, so the two never shadow each
other on `PATH`.

- Alternative: 0.2.0 for every crate. One tool, but it changes the output of
  85 files that work, and that change is not measured.

### The toolchain comes from `wasm/rust-analyzer/rust-toolchain.toml`

The default crates must match the analyzer that reads them. The generator
reads `channel` from
[`wasm/rust-analyzer/rust-toolchain.toml`](../../../wasm/rust-analyzer/rust-toolchain.toml)
the way [`wasm/build.sh`](../../../wasm/build.sh) does, and runs
`rustup toolchain install <channel> --profile minimal --component rust-src`.
At `b1bf2cf` that channel is `nightly-2022-12-12`, Rust 1.68.0-nightly. User
programs compile with Rust 1.68.0; proposal.md, section "What Changes", links
the chain of sources for that version.

This departs from upstream on purpose, as of the files in section "Upstream
reference". `beta.solpg.io` serves two versions:
its Rust Analyzer is built with the same 1.68.0-nightly, and its hand-made
default crates come from about Rust 1.60, the newest stabilization they
contain. There, an API stabilized in 1.61 to 1.68, such as
`std::array::from_fn`, shows as unknown in the editor although it compiles.
Here the generator produces the default crates, so both come from the
analyzer's toolchain. A comment at the generator's toolchain lookup records
this difference from upstream.

- Alternative: generate from Rust 1.60 to match upstream. The 0.2.0 release
  expands it, but the output still differs from upstream's files (`std` 2.0 MB
  against 1.5 MB, `core` 9.4 MB against 2.9 MB; upstream's flags are unknown).
  It would reproduce neither upstream nor our compiler.

### Flags

All three default crates take these flags:

```sh
--loopify --cfg-true-by-default --unset-cfg test
```

Without `--unset-cfg test`, `core` reaches test files that `rust-src` does not
ship.

`core` also takes this flag:

```sh
--unset-cfg "all(target_arch=x86_64,target_feature=avx512f)"
```

Its module `core_simd::masks::mask_impl` picks between two `#[path]` files
through `cfg_attr`. With every cfg true, both paths apply and the tool stops.
Unsetting the AVX-512 variant keeps the generic `full_masks.rs`.

- Alternative: `--full-crate-tree`, which also gets past that error (9.3 MB of
  output) but keeps duplicate modules instead of naming the variant it drops.

### The registry is fetched into the cargo home the generation reads

`generate-crates` runs this command against the `CARGO_HOME` it reads
afterwards, so the registry holds the locked version of every supported crate:

```sh
cargo fetch --locked --manifest-path ../server/programs/Cargo.toml
```

### A key file lets generation skip unchanged inputs

The generation writes `public/crates/.inputs`, a SHA-256 over the inputs the
spec names. When `.inputs` matches, `generate-crates` exits without emptying
`public/crates`. A `public/crates` restored from the cache survives
`yarn build`, which runs `generate-crates` again, only because of this key.

### Remote Cache in `vercel-install.sh`

The install script computes the same key and restores `public/crates` from a
tar in Vercel Remote Cache. When the key is absent, the script runs the
generation and uploads the tar, before `yarn install`, as it does for the wasm
packages. The script reuses `remote_has`, `remote_fetch`, and `remote_upload`.

- Alternative: commit the output to the assets submodule. The script can
  reproduce it, but 12 MB of generated text goes into a repository, and every
  input change needs a commit by hand.

### 404 for a missing crate file

A rewrite in `vercel.json`, placed before the SPA rewrite, sends `/crates/(.*)`
to itself, so a missing file falls through to Vercel's 404. Vercel does not
document whether a project with `framework: null` then answers 404 or still
`index.html`. Task 2.2 checks it on a preview before this approach is kept.

### `setup` installs with `--check-files`

Yarn 1 decides whether to copy a `file:` dependency from `package.json`,
`yarn.lock`, and its integrity file, and never from the content of the
source folder. `setup` becomes:

```sh
yarn build-wasm && yarn install --check-files && yarn generate
```

## Risks / Trade-offs

- [A cache miss on Vercel adds the toolchain download, an 800 MB fetch, and
  the expansion to the build] → Only when an input changes. The key covers
  every input, so the build after it restores from the cache.
- [Vercel's build image has no `rustup`] → `vercel-install.sh` installs
  `rustup` under `.cache/rust` when the wasm cache misses; the generation
  installs it the same way when it is missing.
- [`core.rs` is 10.3 MB] → In the local test, an 8.5 MB `core.rs` from Rust
  1.61 transferred as 0.78 MB, and indexing finished within 30 s. A slow
  machine is not measured.
- [Two runs produce different bytes] → Unverified; task 1.2 checks it. The
  key covers the inputs either way, and the cached copy is the one that ships.

## Migration Plan

1. Land the change. The first preview build misses the cache and generates.
2. Rollback: revert the change. Deployments return to serving no crate files.

## Open Questions

- How long a build that misses the cache takes on Vercel's 4-core machine.
  Task 4.1 measures it.
