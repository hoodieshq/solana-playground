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
    `workspace/configuration` answered with the same config sent at
    initialize), `$/cancelRequest` on Monaco cancellation, pending
    requests fail on close. Reconnect is out of scope for v1: a dropped socket
    surfaces as a terminal line.
  - `client.ts` -- the socket is JSON-RPC from the first byte. The
    bridge answers two methods itself: `solpg/open` (request: project
    files in, `{rootUri, programPath}` out) and `solpg/sync` (request:
    rewrite the tree; a failure is one terminal line, not the end of the
    session). Every other message is forwarded to rust-analyzer verbatim.
    Document sync: `didOpen` every project `.rs`, `didChange` (full text)
    on model change, then one second after the last edit a `sync`
    followed by `didSave` -- rust-analyzer runs `cargo check` on save,
    `cargo check` reads the disk, and the playground autosaves. A save is
    also sent once after opening so the project gets compiler
    diagnostics on load.
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
  `routes/unstable/lsp.rs`; one route in `main.rs`; `Config` fields
  `PG_LSP_CONCURRENCY` (4), `PG_LSP_IDLE_TIMEOUT` (600 s),
  `PG_LSP_MAX_LIFETIME` (4 h); `PG_PAYLOAD_LIMIT` caps the project bytes
  and `PG_CLIENT_URLS` is the WebSocket `Origin` allowlist (browsers do
  not apply CORS to WebSockets).
- Session: `solpg/open` carries `files` (same shape and path rules as
  the build request, minus the legacy `/` prefix); the template is
  chosen from the `cargo` files exactly as `unstable/build` does; one
  container starts from `program-<template>`, the project's `src/` is
  written over the template's (the `cargo` files already match -- that
  is how the template was picked), `rust-analyzer` runs on stdio via
  `docker exec -i`, and a single `select!` loop pumps: WebSocket text ->
  `Content-Length`-framed stdin, framed stdout -> WebSocket text,
  `solpg/sync` -> rewrite `src/`, ping every 30 s, idle or lifetime
  deadline -> close. Socket close or server exit kills the container
  (`--rm` removes it); on startup the server kills containers with the
  `solpg.lsp` label left by a previous process.
- `LspSession` (`server/src/lsp.rs`) next to `Sandbox`, not a mode of
  it: a long-lived streamed process does not fit run -> exec -> remove,
  and `sandbox.rs` is under active change by the maintainer. Same
  hardening flags as builds; 4 GiB memory (`cargo check` on an Anchor
  program), 1 CPU, 256 PIDs. Files travel as a tar stream unpacked by
  the image user: `--cap-drop=ALL` leaves even root without
  `CAP_DAC_OVERRIDE`/`CAP_CHOWN`, so `docker cp` + `chown` cannot work.
- `Dockerfile.program`: `rustup component add rust-analyzer rust-src` and a
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

1. Client + setting, demonstrated 2026-09-04 against a throwaway Node dev
   bridge (scratchpad only, never committed): hover with anchor-lang
   1.1.2 docs, account completion, rustc E0308 in the editor, go to
   definition, terminal error when the server is down. 23 jest tests.
2. Server route, `LspSession`, Dockerfile changes, limits from config:
   compiles, clippy-clean, 7 unit tests. Independent code review (21
   findings) folded into the commits: no root inside the container
   (tar as the image user), `sync` before every save so `cargo check`
   sees edits, `sync` as a request whose failure does not end the
   session, `Origin` check, project byte cap, max session lifetime,
   keepalive pings, leftover-container cleanup on server start, request
   cancellation, `workspace/configuration` answered with the real
   config, shutdown with a timeout, WASM backend disposable.
3. **Verified against real Docker** 2026-09-04 16:40-17:00 WITA: image
   `program-anchor-1.1.2` built on the Mac under amd64 emulation
   (17 min), real axum route -> container -> rust-analyzer: open 1.7 s,
   initialize 0.2 s, edit -> rustc E0308 in the editor ~9 s (1 CPU,
   emulated). Only the anchor image was built; the server was started
   behind a `docker` shim that skips `build` and maps the default
   (legacy) image to it -- test harness only, not in the branch.
4. Next: README paragraph for `PG_LSP_*`, PR to upstream with the numbers
   above and the honest scope note. Deferred, to raise in the PR:
   reconnect, code actions, sharing template selection with the build
   route, image size (2.35 GB for anchor-1.1.2).
