# CLAUDE.md — Playground v2 (AI assistant prototype)

Context file for Claude Code. Read this before touching anything.

Two people and two Claude Code sessions work on one branch
(`feat/client-v2`). This file and `docs/` are how we stay in sync —
if you learn something that contradicts what is written here, fix it here.

## Where the knowledge lives

| Document | What it answers |
| --- | --- |
| `docs/product-brief.md` | Why this work exists, the roadmap, principles, open questions for the Foundation |
| `docs/decisions.md` | What we chose, what we rejected, and what would make us revisit |
| `docs/codebase-map.yaml` (+ `.html`) | How the existing client actually works — verified by reading and running, with file paths |
| `docs/assistant-context.md` | What the in-product assistant knows about itself |
| `docs/superpowers/specs/` | Design specs for work in progress |

`codebase-map.yaml` is the reference for anything about the existing client —
layout, state, data flows, and which files upstream keeps changing. Read it
before going exploring; it will usually save the trip.

## What this repository is

A fork of Solana Playground — a browser IDE where developers write, build,
deploy and test Solana programs with no local setup. Upstream is
`solana-foundation/solana-playground`. **`client/` is at zero divergence from
upstream**; the fork's work lives in `client-v2/`, so upstream syncs stay a
fast-forward.

```
client/      upstream frontend, untouched (React 17, CRA 5 + craco)
client-v2/   the fork's frontend: upstream + assistant panel + redesign
server/      build service — Rust/axum; compiles programs, serves the ELF, stores shares
wasm/        8 packages compiled to WASM
vscode/      VS Code extension
compose.yaml one file, profiles: dev | prod | client-standalone (runs client/)
```

## Running it locally

**Do not run `yarn setup`** unless you specifically need the WASM toolchain — it
compiles six Rust packages and takes about an hour.

```sh
nvm install 22 && nvm use 22      # package.json engines: ^22.20.0
npm i -g yarn@1.22.22             # yarn is not on PATH under a fresh nvm node

git submodule update --init       # client-v2/public — icons, fonts, themes, tutorials
./wasm/stub-packages.sh           # stand-ins for the 6 unbuilt WASM packages (~3 min total setup)

cd client-v2 && yarn install
yarn generate-exports             # REQUIRED — writes the gitignored src/*/generated.ts barrels
yarn sync-assistant-context       # REQUIRED — copies docs/assistant-context.md into the bundle
yarn generate-packages && yarn generate-tutorials
BROWSER=none npx craco start      # http://localhost:3000, ~32s first compile
```

Both `REQUIRED` lines write gitignored files that the app imports, so the build
fails without them. `yarn generate` runs the whole chain including the expensive
crate step; the four above are the cheap subset.

**Why the stubs.** `client-v2/package.json` declares eight local `file:` deps under
`wasm/*/pkg`. Two (Playnet, rustfmt) are committed prebuilt; the other six are
compiled from Rust and **`yarn install` refuses to run while those directories
are missing**. All six are behind lazy `import()` in
`client-v2/src/utils/package.ts` and none are on the UI boot path, so stubs let the
whole UI, editor, terminal, Playnet and wallet work. What you lose: Rust
intellisense and the `solana` / `anchor` / `spl-token` / `sugar` commands, plus
Seahorse builds. Each throws a clear message pointing at `wasm/build.sh`.

**`yarn dev` when you need the API endpoint.** It runs the cheap generate
subset (`yarn generate-fast`) and then `npx vercel dev`, which starts the CRA
dev server *and* serves `client-v2/api/*` functions locally — the assistant's
MCP gateway needs that, and plain `craco start` serves no `/api` path (the SPA
rewrite would hand back `index.html`, so you get `Unexpected token '<'` rather
than a 404). Listens on 3000; override with `VERCEL_DEV_PORT`.

Two things it needs that `craco start` does not: `vercel login` **and** access
to this Vercel team — `vercel dev` calls the API to retrieve the project before
it serves anything, so it is neither offline nor available to a contributor
without team access. It also has to run from the repo root (`--cwd ..`, already
in the script): the only `.vercel/project.json` is there, it sets
`rootDirectory: client-v2`, and running the CLI from `client-v2` makes it
resolve that path twice, miss `vercel.json`, fall back to the `dev` script and
abort on recursive invocation. Anything that does not touch `/api` should use
`npx craco start` instead.

**Use `npx craco start`, not `yarn start`.** `yarn start` runs `yarn generate`,
which includes `generate-crates.mjs`; that script skips itself only when rustc is
*absent*, so with Rust installed it will `cargo install syn-file-expand-cli` and
churn through the crate registry. Its only output is Rust-Analyzer crate data,
which the stubs make moot.

**No backend needed.** The client can point at the public build server. Settings
(gear, bottom of the icon rail) → **Build server URL** → `SolPg`
(`https://api.solpg.io`). Verified: CORS allows `http://localhost:3000`, and a
real build round-trips in ~3.5s. Docker exists (`compose.yaml`) but every service
is pinned `linux/amd64` because Solana ships no Linux ARM64 binaries — on Apple
Silicon it is all emulated and slow. You almost certainly do not need it.

**Gotchas.** Yarn 1 *copies* `file:` deps into `node_modules` instead of
symlinking — editing anything under `wasm/*/pkg` needs a re-install or a manual
copy, and clear `node_modules/.cache` since webpack does not watch node_modules.
One pre-existing webpack warning about `src/tutorials/__template` is a filename
case mismatch and unrelated to anything we do.

## What we are building

An **AI assistant inside the environment** — a panel beside the editor that
shares context with the open project and can act on it: explain the actual build
error against the actual code, propose a patch applied with one click, then build
and deploy. See `docs/product-brief.md` for the full roadmap and
`docs/superpowers/specs/2026-08-19-assistant-panel-design.md` for the design.

Runtime: `@anthropic-ai/sdk` browser build + its Tool Runner, `claude-opus-5`,
entirely client-side, no backend of ours. Why that and not the Vercel AI SDK or
the Claude Agent SDK: `docs/decisions.md` → D1.

**Milestone:** a clickable end-to-end demo — build → error → explanation → patch
→ Apply → build succeeds → deploy to devnet → Explorer link. The demo must be
honest about what is real and what is mocked.

## Hard constraints

- **`client/` is upstream and stays byte-identical to it.** All frontend work
  happens in `client-v2/`.
- **Do not modify the backend**, the build server, the supported crate list,
  deploy mechanics, or the sharing infrastructure. If the assistant needs server
  capacity it belongs in a separate service, not in `server/`.
- **Touch pre-existing upstream files inside `client-v2/` as little as
  possible.** The panel is all new files; the pre-existing files the fork
  edits are listed in `docs/decisions.md` D2, D4 and D9.
- **Everything stays open source.** No closed modules, no proprietary service.
- **No API keys in the repository**, and not in `REACT_APP_*` either — CRA
  inlines those into the bundle for every visitor to read. The key is supplied by
  the user at runtime; see `decisions.md` → D3, which explains why it is not in
  `localStorage` yet.
- **Anything that changes state — writing files, triggering a build, sending a
  transaction — requires an explicit human action in the UI.** Proposing is
  automatic; applying is not.

## Merge safety

The fork is level with upstream, and upstream is active — 223 commits in six
months. Extend through the registries, stay out of the runtime internals.

**Cold — safe to extend** (commits in the last 12 months):
`views/sidebar/sidebar.ts` 0 · `views/main/secondary/secondary.ts` 0 ·
`commands/commands.ts` 0 · `views/sidebar/create.ts` 1

**Hot — touch carefully** (commits in the last 6 months):
`commands/deploy/deploy.ts` 29 · `utils/common.ts` 15 ·
`utils/terminal/terminal.ts` 13 · `commands/deploy/bpf-loader-upgradeable.ts` 12 ·
`utils/decorators/updatable.ts` 11 · `utils/wallet/wallet.ts` 9 ·
`utils/program-info.ts` 8

`commands/build/build.ts` sits between the two at 7, and is exactly the file D4
needs. Keep that edit to a couple of lines that delegate to a new module.

## Environment facts worth knowing

- Programs are Rust, compiled server-side. Compilation cannot happen in the
  browser.
- Supported crates are a fixed whitelist; `anchor-lang` is pinned at 0.29 and
  `solana-program` at 1.16. There is no Pinocchio template. Upstream intends to
  address this; we do not.
- Tests are TypeScript, run against devnet. There is no Rust-side test workflow
  in the browser.
- The built-in wallet is an in-browser keypair in local storage. Clearing browser
  data destroys it along with the projects.
- A built program's IDL drives an automatically generated test panel — useful
  context for the assistant, and it lives on `PgProgramInfo.idl`.
- Deploy target is devnet.
- Project code — including code from a *shared* project — executes in a
  same-origin iframe guarded by a string blacklist
  (`client-v2/src/utils/js-runtime/js-runtime.ts`). Relevant to anything you
  consider storing in browser storage.

## Conventions

Follow `CONTRIBUTING.md` — it is short and CI enforces the formatting. The parts
that bite most often: 80 columns, 2-space indent, prettier in CI; no `any` or
`@ts-ignore`; import `PgWeb3` rather than `@solana/web3.js`; default exports for
React components and named exports for everything else; `import type` for types;
no non-ASCII in source.

Commits: present tense, no prefix for client changes (`"Add feature"`), location
prefix for others (`"server: Add feature"`). Prefer small, reviewable commits —
this branch will be demoed and read by others.

## Working agreement

- Update `docs/decisions.md` when you make a call worth remembering — especially
  when you reject something. The rejected options are why the next person does
  not re-litigate.
- Keep `docs/assistant-context.md` true. It is what the product tells customers
  about itself; a stale claim there is a demo that overclaims.
- Note anything the environment prevented the assistant from doing well — a fix
  needing a crate outside the whitelist, a Rust-side test, a current Anchor API.
  That friction log is the raw material for the next strategic conversation, and
  it has to be collected while working, not reconstructed afterwards.
