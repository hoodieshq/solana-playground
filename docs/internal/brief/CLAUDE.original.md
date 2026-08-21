# CLAUDE.md — Playground v2 client (AI assistant prototype)

Context file for Claude Code. Read this before touching anything.

## What this repository is

A fork of Solana Playground — a browser IDE where developers write, build, deploy and test Solana programs without any local setup. Upstream lives in the `solana-playground` GitHub organisation. Our fork is a full 1:1 fork, which means we keep receiving upstream changes; nothing we do should make merging upstream painful.

Repository layout (verify before relying on it):
- `client/` — the existing frontend (TypeScript/React)
- `server/` — build service that compiles Rust programs into bytecode
- `wasm/` — Solana client compiled to WebAssembly, used by the browser to talk to the network
- `vscode/` — VS Code extension
- `docker-compose*` — full local configuration for client + server (dev and prod profiles)

## What we are building

A **second client** (referred to as "client-2") developed in parallel with the existing one, in its own branch. Three focus areas, in priority order:

1. **AI assistant inside the environment** — a chat module next to the editor that shares context with the open project (files, build errors, program interface, deploy state) and can reason about it and act on it, not just talk. This is the current task.
2. **Real wallet support** — standard wallet adapters (Phantom, Solflare, Backpack) alongside the existing in-browser keypair.
3. **Modern, responsive interface** — current visual language, works on tablet.

The assistant should eventually be grounded in the ecosystem's own knowledge sources — the Solana Developer MCP for documentation, the official Solana skill, the Explorer MCP — and expose a channel for plugging in new MCP servers and skills, so the environment inherits ecosystem knowledge without a release. That is the direction; the first prototype does not need all of it.

## Hard constraints

- **Do not modify the backend, the build server, the supported crate list, deploy mechanics or the sharing infrastructure.** They are out of scope by agreement. If the assistant needs server capacity, it belongs in a separate service, not in `server/`.
- **Do not modify the existing `client/` beyond what is strictly necessary.** New work goes into the new client.
- **Everything stays open source.** No closed modules, no proprietary service assumed. The upstream project is public and any service integrated into it is expected to be public too.
- **No API keys in the repository.** The assistant uses a key supplied by the user (env var in development). A limited demo mode with a request quota is planned later; an unlimited open endpoint is not acceptable.
- **Anything the assistant does that changes state — writing files, triggering a build, sending a transaction — requires an explicit human action in the UI.** Proposing is automatic; applying is not.

## Current environment facts worth knowing

- Programs are written in Rust and compiled server-side; compilation cannot happen in the browser.
- Supported crates are a fixed whitelist; anchor-lang is pinned at 0.29 and solana-program at 1.16. There is no Pinocchio template. Upstream intends to address this; we do not.
- Tests in this environment are written in TypeScript and run against devnet. There is no Rust-side test workflow in the browser.
- The built-in wallet is an in-browser keypair kept in local storage; clearing browser data destroys it along with the projects.
- The IDL of a built program drives an automatically generated test panel — useful context for the assistant.
- Deploy target is devnet.

## Definition of done for the current milestone

A clickable end-to-end demo, running locally, showing: a user hits build → gets an error → the assistant explains it using project context → proposes a fix → the user applies it with one click → build succeeds → deploy to devnet → result linked in Explorer.

The demo must be honest about what is real and what is mocked, and the mock boundary must be a single, clearly named module so it can be swapped for the real backend later.

## Conventions

- Branch: `feat/client-2-ai-assistant` (announce the branch name in the team channel before the first push).
- Keep the mock layer isolated behind one interface so the real implementation is a drop-in replacement.
- Prefer small, reviewable commits; this branch is likely to be demoed and read by others.
