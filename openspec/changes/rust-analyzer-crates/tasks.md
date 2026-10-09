# Tasks

Group 1 comes first. Groups 2 and 3 depend on it and may run at the same time.
Group 4 needs all three.

## 1. Generation

- [x] 1.1 Add a script under `client-v2/scripts/` that installs the toolchain
      in `wasm/rust-analyzer/rust-toolchain.toml` with `rust-src`, installs
      `syn-file-expand-cli` 0.2.0 into a root of its own, and writes the
      default crates `core.rs`, `alloc.rs`, and `std.rs` to `public/crates`
      with the flags in design.md, section "Flags", plus a brotli copy of
      each (`<name>.rs.br`, design.md, section "Brotli copies"). A comment at
      the toolchain lookup states that upstream serves default crates from
      about Rust 1.60 beside a 1.68.0-nightly analyzer, and that this script
      takes both from the analyzer's toolchain. Verify: in the editor on
      `yarn dev-cra`, `Vec::` completes `capacity` and `clear`, and
      `std::array::from_fn` resolves; with the default crates removed,
      neither works. Ticket to file.
- [ ] 1.2 In `generate-crates.mjs`, run `cargo fetch --locked` on
      `server/programs` first, fail naming any supported crate it cannot
      generate, and write and honor `public/crates/.crates-key` for the supported
      crates. Verify: with an empty `CARGO_HOME`, `yarn generate-crates`
      produces every supported crate; a second run on the same inputs leaves
      the files untouched; two runs from empty produce the same SHA-256 per
      file; a version in `supported-crates.json` that does not exist fails
      the run. Depends on 1.3. Ticket to file.
- [x] 1.3 Run the default crates in every pipeline: the generator writes
      `public/crates/.default-crates-key` (a hash of the script,
      `wasm/rust-analyzer/rust-toolchain.toml`, and Node's brotli version),
      skips when it matches, and prints it with `--key`; `withReset` in
      `generate-crates.mjs` keeps the default crates, their `.br` copies, and
      the key; `yarn generate` runs the generator after `generate-crates`;
      `vercel-install.sh` restores them from the Build Cache, then Vercel
      Remote Cache, and otherwise installs `rustup` and generates and
      uploads; `client-v2/Dockerfile` generates them, and the supported
      crates, at image build with toolchains removed in the same layer, and
      the `client-v2-standalone` compose profile runs that image without the
      server. Verify: a second run skips;
      `yarn generate-crates` keeps all seven files; the install path, run
      cold against empty Rust and cache folders, generates and packs, and a
      second run logs a hit in the Build Cache; the `client-v2-standalone`
      container serves every crate file and the editor completes `Vec::` and
      `Pubkey::`. Depends on 1.1. Ticket to file.

## 2. Serving on Vercel

- [x] 2.1 Generate the supported crates in every Vercel build, with no cache:
      `yarn generate` runs `generate-crates.mjs` with the Rust in Vercel's
      image (design.md, section "Remote Cache in `vercel-install.sh`").
      Verify: the preview build log shows `cargo fetch` and every supported
      crate, `/crates/anchor_lang.rs` and `/crates/anchor_lang.toml` serve
      Rust source and TOML, and the editor resolves the Anchor prelude.
      Depends on 1.2. Ticket to file.

## 3. Local setup

- [ ] 3.1 Change `setup` in `client-v2/package.json` to install with
      `--check-files`, and describe in `client-v2/README.md` how the crate
      files are produced. Verify: after `wasm/stub-packages.sh`,
      `yarn install`, and `yarn setup`,
      `node_modules/@solana-playground/rust-analyzer` holds
      `rust_analyzer_wasm_bg.wasm`. Depends on 1.2. Ticket to file.

## 4. Integration

- [ ] 4.1 Walk the manual scenarios of `client-v2-editor-crates` on a preview
      deployment and in the `client-v2-standalone` container, and record the
      result of each in the PR. Walked at `86f0395c` and `ec6f2b0d`: the
      Vercel build and the Docker image build place the default crates in
      `public/crates`, the preview and the container serve every crate file, Rust Analyzer starts without a panic,
      `Vec::`, `std::array::`, and `Pubkey::find_` complete, the build logs
      show every supported crate and the default crates' cache hit, and the
      crate files are byte-identical on macOS, Vercel, and Docker. Still to
      walk: the `Context` hover, the build after
      `wasm/rust-analyzer/rust-toolchain.toml` changes, and the scenarios of
      tasks 1.2 and 3.1. Depends on 1.2 and 3.1. Ticket to file.
