# rust-analyzer over WebSocket -- notes for the 2026-09-04 call

Plain-language version first, technical status after.

## What it is, in one paragraph

The Playground editor gives Rust hints (autocomplete, hover docs, red
squiggles) from a copy of rust-analyzer that runs inside the browser. That
copy only knows a frozen set of old library versions (Anchor 0.29). The
maintainer asked us to add a second mode where the real rust-analyzer runs
on the build server -- the same machine that already compiles programs --
using the *current* toolchain (Anchor 1.1.2, Solana 3.x). The editor
talks to it over a WebSocket. A setting switches between the two modes;
the old mode stays the default.

## What works today (built 2026-09-04, ~4 hours)

Shown in the browser against a real rust-analyzer:

- Hover on `Account` / `Signer`: real documentation from anchor-lang 1.1.2.
- Autocomplete after `ctx.accounts.` lists the program's own accounts
  (`new_account`, `signer`, `system_program`) -- this requires expanding
  Anchor's macros, which the browser copy cannot do for new versions.
- A type error (`u8` vs `u64`) shows as a red squiggle with the real
  compiler message `rustc E0308` -- before pressing Build.
- Go to Definition jumps to the struct.
- Adding a file in the explorer reaches the server.
- If the server is down, one clear line in the terminal; nothing breaks.

Numbers: first autocomplete 2.2 s after opening; compiler diagnostics
1.2 s after a pause in typing (warm). One-off warm-up per image 38 s.

## What is real and what is not (honest scope)

Real and committed (3 commits on `feat/rust-analyzer-lsp`, off upstream):
- The whole editor side (client): ~1100 lines, 23 unit tests.
- The server route in Rust: starts a container per session, pipes
  messages, enforces limits (max 4 sessions, 10 min idle, 4 GiB RAM,
  1 CPU). Compiles, 4 unit tests, exercised end-to-end from the browser.
- The Docker image change (install rust-analyzer, warm the cache).

Verified against real Docker (2026-09-04, later the same day): Docker
Desktop on the Mac built the `program-anchor-1.1.2` image under amd64
emulation in 17 minutes, and the real server route drove a real
container: session start 1.65 s, `initialize` 0.2 s, a saved type error
surfaced as `rustc E0308` in about 9 s. An independent code review of
the branch raised 21 findings; the ones that mattered are fixed inside
the three commits.

Not yet done:
- Remaining before the PR, ~1-2 h: the `rust-src` sysroot component in
  the image, a README paragraph for the two new env vars, the PR text.
- Not deployed anywhere; upstream decides when/if to enable it on their
  server (it is behind their `--features unstable` flag anyway).
- Our own v2 deployment proxies the build server through Vercel, which
  cannot carry WebSockets -- this feature needs a direct server URL there.

## The question for the call -- answered before it happened

It was: where do we verify with real Docker before opening the upstream
PR -- a Linux VPS for an afternoon, the Mac under emulation, or ask the
maintainer to run it? Option (b) won on the same day: the image builds
in 17 minutes under emulation and the route was driven against a real
container, so no VPS is needed and no one else's time is spent.

The question that remains for the call is smaller and ours: our own v2
deployment proxies the build server through Vercel, which cannot carry
WebSockets -- so if we ever want this backend in v2, v2 needs a direct
server URL for it (a setting, not a proxy route).

## Effort so far and remaining

- 2026-09-04, ~4.5 h: spike (risk measured), client, server route,
  Dockerfile, tests, real-Docker verification, review fixes.
- Remaining before the PR, ~1-2 h: the `rust-src` sysroot component, a
  README paragraph for the new env vars, PR text with the numbers.
- Follow-ups the maintainer may ask for: reconnect on drop, opening
  crate sources from go-to-definition, sharing the template-selection
  code with the build route.
