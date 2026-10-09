# Spec Delta

## Purpose

The crate files the editor's Rust Analyzer loads from `/crates/`: which files
every deployment serves, how they are produced from pinned inputs, and how a
missing file answers.

## ADDED Requirements

### Requirement: Every deployment serves the default crates

Every deployment SHALL serve the default crates `/crates/core.rs`,
`/crates/alloc.rs`, and `/crates/std.rs` as Rust source, generated from the
`rust-src` component of the toolchain in
`wasm/rust-analyzer/rust-toolchain.toml`.

#### Scenario: A preview deployment (manual)

- **WHEN** `/crates/std.rs` is requested from a preview deployment
- **THEN** the response is HTTP 200 with Rust source, not HTML

#### Scenario: Standard library completion in the editor (manual)

- **WHEN** a user types `let v = Vec::` in `src/lib.rs` of an Anchor project
  and asks for completion
- **THEN** the list offers `Vec`'s associated functions, such as `capacity`
  and `clear`

#### Scenario: An API stabilized after Rust 1.60 (manual)

- **WHEN** a user writes `std::array::from_fn` in `src/lib.rs`
- **THEN** Rust Analyzer resolves the function, which Rust stabilized in 1.63

### Requirement: Every deployment serves every supported crate

Every deployment SHALL serve `/crates/<name>.rs` and `/crates/<name>.toml` for
every crate in `supported-crates.json` and for their proc-macro dependencies,
with each crate name in snake case. The one exception is
`mpl-token-metadata`.

#### Scenario: The Anchor prelude (manual)

- **WHEN** an Anchor project's `src/lib.rs` starts with
  `use anchor_lang::prelude::*;` in the editor
- **THEN** `Context`, `Account`, and `Signer` resolve, and hovering one shows
  its definition

### Requirement: Generation fails when a supported crate cannot be generated

The crate generation SHALL exit non-zero, naming the crate, when it cannot
produce a supported crate.

#### Scenario: A crate missing from the registry (manual)

- **WHEN** the generation runs and a supported crate cannot be found
- **THEN** it fails with the crate's name and version, and the build fails

### Requirement: Generated files are reproducible from pinned inputs

The crate files SHALL depend on pinned inputs only:
`wasm/rust-analyzer/rust-toolchain.toml`, the versions of the expansion tool,
`server/programs/Cargo.lock`, `supported-crates.json`, and the generation
scripts. Two runs on the same inputs SHALL produce identical bytes.

#### Scenario: Two runs (manual)

- **WHEN** the generation runs twice on the same inputs, on one machine or two
- **THEN** every file under `public/crates` has the same SHA-256 in both runs

### Requirement: A build reuses the default crates of an unchanged input set

A Vercel build SHALL restore the default crates from a cache keyed on their
pinned inputs, and SHALL run their generation only when that key is absent
from the cache. The supported crates are generated in every build.

#### Scenario: A build with unchanged inputs (manual)

- **WHEN** a Vercel build runs on inputs that an earlier build generated
- **THEN** the build log reports the default crates restored from the cache,
  and the build installs no Rust toolchain for them

#### Scenario: A build after an input changes (manual)

- **WHEN** `wasm/rust-analyzer/rust-toolchain.toml` changes
- **THEN** the next build generates the default crates and stores them under
  the key of the changed inputs

### Requirement: A missing crate file answers 404

A request for a path under `/crates/` with no file behind it SHALL answer HTTP
404, never the app's `index.html`.

#### Scenario: A crate that is not supported (manual)

- **WHEN** `/crates/no_such_crate.rs` is requested from a deployment
- **THEN** the response is HTTP 404

### Requirement: Local setup installs the wasm packages it builds

`yarn setup` SHALL leave `node_modules` holding the wasm packages it builds,
including on a checkout whose `node_modules` holds the stubs from
`wasm/stub-packages.sh`.

#### Scenario: Setup after the stubs (manual)

- **WHEN** a developer runs `wasm/stub-packages.sh`, `yarn install`, and then
  `yarn setup`
- **THEN** `node_modules/@solana-playground/rust-analyzer` holds
  `rust_analyzer_wasm_bg.wasm`
