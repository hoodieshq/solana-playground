# rust-analyzer over WebSocket: server-side LSP as a second Rust backend

Date: 2026-09-04. Target: upstream `solana-playground/solana-playground`
(branch `feat/rust-analyzer-lsp` off `upstream/master`), requested by the
maintainer (acheron) as a self-contained feature. Not part of the v2
roadmap; runs in parallel and touches none of its files.

## Problem

Rust intellisense today is rust-analyzer compiled to WASM, fed by
flattened crate sources in `public/crates/*.rs`. The crate set and
versions are frozen (anchor-lang 0.29, solana-program 1.16). The server
now builds per-template Docker images (`program-<template>`, e.g.
`anchor-1.1.2` on Solana 3.1.10 / Rust 1.89) behind `--features
unstable`; those images already hold the real toolchain and a warm
dependency cache. The editor cannot see any of that.

## Decision

Add a second Rust backend: a real `rust-analyzer` running inside the
template image, reached from Monaco over a WebSocket that carries plain
LSP JSON-RPC. WASM stays the default; a setting selects the backend.

Measured on the anchor-1.1.2 template (2026-09-04, native macOS,
rust-analyzer 1.95): cold `cargo check` 38 s (paid once at image build);
with a warm `target/`, initialize -> first completion at `ctx.accounts.`
listing the proc-macro-expanded accounts 2.2 s; `cargo check`
diagnostics 1.2 s.

## Design

### Client (`client/src/components/Editor/Monaco/languages/rust/`)

- `init.ts` is a dispatcher: read `editor.rustAnalyzer`
  (`"wasm" | "server"`, default `"wasm"`), start the chosen backend,
  swap on setting change, restart the server backend on workspace switch
  (a server session holds one project). Failures print one terminal
  line. Existing `rust-analyzer/` (WASM) is untouched.
- New `lsp/`: a thin hand-written LSP client, no `monaco-languageclient`.
  Reason: that library pins `monaco-editor` through
  `@codingame/monaco-vscode-api`; we are on `monaco-editor =0.37.1` under
  CRA, and it is a heavy dependency for one language.
  - `jsonrpc.ts` -- JSON-RPC 2.0 over `WebSocket`, one message per
    frame: request/notify, server->client requests
    (`workDoneProgress/create`, `registerCapability`,
    `workspace/configuration` answered with `null`s), pending requests
    fail on close. Reconnect is out of scope for v1: a dropped socket
    surfaces as a terminal line.
  - `client.ts` -- the socket is JSON-RPC from the first byte. The
    bridge answers two methods itself: `solpg/open` (request: project
    files in, `{rootUri, programPath}` out) and `solpg/sync`
    (notification: rewrite the tree after create/rename/delete). Every
    other message is forwarded to rust-analyzer verbatim. Document sync:
    `didOpen` every project `.rs`, `didChange` (full text) on model
    change, a debounced `didSave` one second after the last edit because
    rust-analyzer runs `cargo check` on save and the playground autosaves.
  - `workspace.ts` -- path mapping `/<workspace>/src/lib.rs` <->
    `<rootUri>/<programPath>/src/lib.rs`; documents outside the project
    (crate sources) are dropped from results.
  - `providers.ts` -- LSP<->Monaco mapping, registered only for the
    capabilities the server announces: diagnostics -> markers, hover,
    completion (+ resolve), signature help, definition / type definition
    / implementation, references, document highlight, rename (+ prepare),
    document symbols, folding, inlay hints, formatting.
- Endpoint: `PgSettings.server.endpoint` with `http(s)` -> `ws(s)` plus
  `/unstable/lsp`. Only the `unstable` server exposes it.

### Server (`server/`)

- `GET /unstable/lsp` (axum `ws` feature), new module
  `routes/unstable/lsp.rs`; one route in `main.rs`; two `Config` fields
  (`PG_LSP_CONCURRENCY` default 4, `PG_LSP_IDLE_TIMEOUT` default 600 s).
- Session: `solpg/open` carries `files` (same shape and path rules as
  the build request, minus the legacy `/` prefix); the template is
  chosen from the `cargo` files exactly as `unstable/build` does; one
  container starts from `program-<template>`, the project's `src/` is
  written over the template's (the `cargo` files already match -- that
  is how the template was picked), `rust-analyzer` runs on stdio via
  `docker exec -i`, and a single `select!` loop pumps: WebSocket text ->
  `Content-Length`-framed stdin, framed stdout -> WebSocket text,
  `solpg/sync` -> rewrite `src/`, idle deadline -> close. Socket close
  or server exit kills the container (`--rm` removes it).
- `LspSession` (`server/src/lsp.rs`) next to `Sandbox`, not a mode of
  it: a long-lived streamed process does not fit run -> exec -> remove,
  and `sandbox.rs` is under active change by the maintainer. Same
  hardening flags as builds; 4 GiB memory (`cargo check` on an Anchor
  program), 1 CPU, 256 PIDs. `docker cp` creates root-owned files, so
  the sync removes and `chown`s as root.
- `Dockerfile.program`: `rustup component add rust-analyzer` and a
  `cargo check --locked` warm-up after the initial build. Without the
  latter the first analysis costs the 38 s above under a 1-CPU limit and
  Anchor proc-macros do not expand (no built proc-macro crates), which
  empties account completion -- the whole point of the feature.
- Not in scope: production rollout (a session is minutes of RAM, not 30 s
  of build), WebSocket through the v2 `/api/build` proxy (Vercel
  functions cannot carry WS -- v2 needs a direct server URL for this),
  reconnect/resume, opening crate sources from go-to-definition.

### Rejected

- `monaco-languageclient` -- version coupling and weight, see above.
- Parsing LSP on the server (e.g. to inject files) -- the server reads
  only the `method` of client frames to catch its own two methods;
  everything else is a byte pipe.
- A separate `lsp-<template>` image -- doubles image build time for the
  same toolchain; the program image plus a warm `cargo check` suffices.
- Control frames outside JSON-RPC for the handshake -- a second framing
  on the same socket; a `solpg/open` request is one dispatcher on the
  client and one `method` check on the server.

## Delivery

1. Client + setting (commits `d2d6170d`, `77e1e994`), demonstrated
   2026-09-04 against a throwaway Node dev bridge (WS <-> local
   `rust-analyzer` on the template; scratchpad only, never committed):
   hover with anchor-lang 1.1.2 docs, account completion, rustc E0308
   in the editor, go to definition, terminal error when the server is
   down. 23 jest tests (converters, JSON-RPC).
2. Server route, `LspSession`, Dockerfile changes, limits from config
   (commit `e54cd116`): compiles, 4 unit tests (framing, path rules,
   method detection), exercised end-to-end with a `docker` shell
   stand-in first, then **against real Docker on 2026-09-04**: the
   `program-anchor-1.1.2` image built under amd64 emulation on the Mac
   in 17 minutes (not the hour feared), and the real axum route drove
   it -- container start + project write + rust-analyzer up in 1.65 s,
   `initialize` 0.2 s, `didSave` -> `cargo check` -> `rustc E0308`
   published in ~9 s. The "Linux box or emulation" question is
   therefore closed: emulation suffices, and the PR does not wait on
   a VPS.
3. An independent code review of the branch raised 21 findings; the
   ones that mattered are fixed and folded into the three commits.
4. Remaining before the PR (~1-2 h): the `rust-src` sysroot component
   in the image, a README paragraph for the `PG_LSP_*` env vars, and
   the PR text with the numbers above. Nothing is pushed upstream
   without the owner's word.
