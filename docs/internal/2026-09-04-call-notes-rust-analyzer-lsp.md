# rust-analyzer over WebSocket -- notes for the 2026-09-04 call

Plain-language version first, technical status after. Updated 17:05 WITA.

## What it is, in one paragraph

The Playground editor gives Rust hints (autocomplete, hover docs, red
squiggles) from a copy of rust-analyzer that runs inside the browser. That
copy only knows a frozen set of old library versions (Anchor 0.29). The
maintainer asked us to add a second mode where the real rust-analyzer runs
on the build server -- the same machine that already compiles programs --
using the *current* toolchain (Anchor 1.1.2, Solana 3.x). The editor
talks to it over a WebSocket. A setting switches between the two modes;
the old mode stays the default.

## What works today (built 2026-09-04, ~5 hours)

Shown in the browser against the real server and a real Docker container
built from our Dockerfile:

- Hover on `Account` / `Signer`: real documentation from anchor-lang 1.1.2.
- Autocomplete after `ctx.accounts.` lists the program's own accounts
  (`new_account`, `signer`, `system_program`) -- this requires expanding
  Anchor's macros, which the browser copy cannot do for new versions.
- A type error (`u8` vs `u64`) shows as a red squiggle with the real
  compiler message `rustc E0308` -- before pressing Build. Edits reach
  the compiler: pause typing for a second, the check runs on the server.
- Go to Definition jumps to the struct.
- Adding a file in the explorer reaches the server.
- If the server is down, one clear line in the terminal; nothing breaks.

Numbers (real Docker, amd64 emulated on the Mac, 1 CPU per session):
container start + files + rust-analyzer up 1.7 s; initialize 0.2 s;
edit -> compiler diagnostics in the editor ~9 s. Native (no emulation):
first autocomplete 2.2 s, diagnostics 1.2 s. One-off image build: 17 min
on the Mac under emulation (a Linux box would be ~3x faster).

## What is real and what is not (honest scope)

Real and committed (3 commits on `feat/rust-analyzer-lsp`, off upstream):
- The whole editor side (client): ~1200 lines, 23 unit tests.
- The server route in Rust: one container per session, message pipe,
  limits (max 4 sessions, 10 min idle, 4 h max, 4 GiB RAM, 1 CPU,
  1 MiB project, allowed origins only), keepalive pings, cleanup of
  leftover containers on restart. Compiles, clippy-clean, 7 unit tests.
- The Docker image change (rust-analyzer + std sources, warm cache).
- Independent code review done (21 findings); the correctness and
  security ones are fixed and folded into the commits.

Not yet done:
- Not deployed anywhere; upstream decides when/if to enable it on their
  server (it is behind their `--features unstable` flag anyway). A
  session costs 1 CPU + up to 4 GiB for as long as the editor is open --
  that is the maintainer's capacity call, not ours.
- No automatic reconnect if the socket drops; the user re-selects the
  setting. Quick fixes (code actions) and the WASM backend's code lenses
  are not wired for the server mode yet.
- Our own v2 deployment proxies the build server through Vercel, which
  cannot carry WebSockets -- this feature needs a direct server URL there.

## The question for the call (now smaller)

Docker verification happened on the Mac, so no VPS is needed for the PR.
What remains to decide: do we open the upstream PR this week as-is
(recommended -- the maintainer asked for a self-contained feature and
this is one), and who runs the conversation with him about server
capacity for the unstable deployment.

## Effort so far and remaining

- Today: spike (risk measured), client, server route, Dockerfile, tests,
  review pass, real-Docker verification.
- Remaining before PR: ~30 min -- the PR text with the numbers and the
  honest scope note (README paragraph done, folded into the server commit).
- Follow-ups the maintainer may ask for: reconnect on drop, code
  actions, opening crate sources from go-to-definition, sharing the
  template-selection code with the build route.
