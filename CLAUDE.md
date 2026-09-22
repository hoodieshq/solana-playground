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
| `docs/upstream-divergences.md` | Every place `client-v2` differs from `client/` and why -- read before a roadmap update, a release, or an upstream sync |
| `docs/codebase-map.yaml` (+ `.html`) | How the existing client actually works — verified by reading and running, with file paths |
| `docs/assistant-context.md` | What the in-product assistant knows about itself |
| `docs/linear-conventions.md` | How to file a ticket for this repo — the team, the project, and the two substitutions the shared Bug template needs |
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

**`yarn dev` is the normal command, and it serves `/api`.** It runs the cheap
generate subset (`yarn generate-fast`) and then `craco start`. The handlers in
`client-v2/api/*.mjs` are served by a middleware in `craco.config.js`, so the
assistant's MCP gateway works with no Vercel and no login — `decisions.md` D20
records why we supply that piece ourselves rather than using `vercel dev`. An
unknown `/api` route answers a `404` JSON body instead of falling through to
`index.html`, which is what used to surface as `Unexpected token '<'`.

Env vars those handlers read go in `client-v2/.env.local` (gitignored):
react-scripts loads it into `process.env` at boot and the middleware reads it
per request. Do not reach for `REACT_APP_*` for anything secret — CRA inlines
those into the bundle.

**`yarn dev-vercel` only to rehearse the real runtime** before a deploy. It
needs `vercel login` **and** membership of this Vercel team, because `vercel
dev` calls the API to retrieve the project before it serves anything — neither
offline nor available to an outside contributor, which is the whole reason the
middleware exists. It also has to run from the repo root (`--cwd ..`, already
in the script): the only `.vercel/project.json` is there, it sets
`rootDirectory: client-v2`, and running the CLI from `client-v2` makes it
resolve that path twice, miss `vercel.json`, fall back to the `dev` script and
abort on recursive invocation. Listens on 3000; override with
`VERCEL_DEV_PORT`.

**Use `yarn dev`, not `yarn start`.** `yarn start` runs `yarn generate`,
which includes `generate-crates.mjs`; that script skips itself only when rustc is
*absent*, so with Rust installed it will `cargo install syn-file-expand-cli` and
churn through the crate registry. Its only output is Rust-Analyzer crate data,
which the stubs make moot. The same applies to `yarn build`: for a production
bundle without the crate step use **`CI=true yarn build-fast`**, which is what
the `client-v2` GitHub Actions workflow runs (with `test-types`,
`check-format` over `src/` and `api/`, and `test-unit`) on every PR to
`master-2.0`.

**No backend needed.** The client can point at the public build server. Settings
(gear, bottom of the icon rail) → **Build server URL** → `SolPg`
(`https://api.solpg.io`). Verified: CORS allows `http://localhost:3000`, and a
real build round-trips in ~3.5s. Docker exists (`compose.yaml`) but every service
is pinned `linux/amd64` because Solana ships no Linux ARM64 binaries — on Apple
Silicon it is all emulated and slow. You almost certainly do not need it.

**Gotchas.** Yarn 1 *copies* `file:` deps into `node_modules` instead of
symlinking — editing anything under `wasm/*/pkg` needs a re-install or a manual
copy, and clear `node_modules/.cache` since webpack does not watch node_modules.
In a linked worktree, run `git submodule update` in the *primary* checkout
first — `scripts/update-static.mjs` copies whatever `client/public` has checked
out there, and a stale checkout silently ships older assets than CI builds.

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

### Feature layout

A feature under `src/features/<name>/` is `model/` (its logic, browser and
server alike), `Component/` (its React), `lib/` (leaf helpers), and **two
doors**: `index.ts` for the browser and `server.mjs` for `api/*.mjs`.

- **Nothing outside a feature imports past its door.** `api/conversations.mjs`
  imports from `features/persistence/server.mjs`, never from
  `features/persistence/model/db.mjs`. One feature reaching into another goes
  through the door too — `features/auth/model/auth.mjs` takes its pool from
  `features/persistence/server.mjs`.
- **Every statement that touches Postgres lives in `model/`.** There is no
  `server/` directory; the runtime a module happens to need does not give it a
  layer of its own. Sergey's review of PR #30 asked for this, and D46 records
  it.
- **The server door is `.mjs`, not `.ts`, and cannot become `.ts`.** Vercel
  executes `api/*.mjs` as plain ESM with no build step, and `tsconfig.json`
  covers `src` for type-checking only (`noEmit`). Nothing compiles it.
- A barrel is imports and re-exports only — `CONTRIBUTING.md` already says so
  for `index.ts`, and `server.mjs` is held to the same rule.

### Naming and duplication

- **`_` prefixes a private static.** 94 private static methods in `client-v2`
  carry it and none do not; it is upstream's convention in `explorer.ts`,
  `wallet.ts`, `theme.ts` and the rest. Do not strip it from one file to
  match a preference — a review comment asking for that is answered with the
  count.
- **A uuid is `uuid`'s job.** `validate` to check one, `v4` to mint one, in
  source and in tests alike. The RFC 4122 regex was written out in five files
  before PR #30; it is written out in none now. `model/ids.ts` wraps `v4` and
  is what app code calls.
- **Prefer a package already in the tree** over a new download. `uuid` was
  there transitively, so declaring it changed `package.json` and left
  `yarn.lock` byte-identical, which is also how `CONTRIBUTING.md`'s *"prefer
  no new dependency when feasible"* is satisfied rather than argued with.

### Migrations

- **A migration another open PR also edits gets a new file, not an edit.** The
  squash-while-unshipped rule in `client-v2/db/README.md` holds only while
  nothing is stacked on the file; two branches editing one `create table`
  conflict in SQL on every rebase and cost everyone with a preview database a
  rollback. Alexander's call on PR #30; the README carries the exception.
- Regenerate `db/schema.sql` with `yarn db-dump` and verify on a **clean**
  Postgres -- a dev database that was migrated from an earlier shape of the
  same file dumps something the migrations do not produce.

### Tests

- **The runner is Jest**, via `craco test` out of react-scripts 5 — not
  vitest. Use `jest.*`; adopting vitest is its own change, tracked separately.
- **Mock through the runner, do not overwrite the global.**
  `jest.spyOn(globalThis, "fetch")` with `jest.restoreAllMocks()` in
  `afterEach`, so a stub one test installs cannot answer the next one's
  request. `setupTests.ts` puts a throwing `fetch` on the jsdom global for the
  spy to replace; assigning `global.fetch =` is the older pattern and is being
  retired file by file.
- Fixture ids are minted, not typed out. Where a test needs the same id twice,
  memoise the minted one rather than hand-writing a uuid-shaped string.
- **A test states the contract, not the bug it came from.** Name it and
  write its header as what the code guarantees ("refuses a body that is
  not a JSON object"), not as history ("answers 400, not 500", "M3 from
  the #13 review"); the history belongs in the commit message. Sergey's
  review of PR #25.
- **No silent `catch`.** A caught error is at least logged
  (`console.warn` with the error). If it changes what the user gets --
  lost progress, say -- they are told, once rather than on every repeat.
  A comment explaining why the error is swallowed does not replace the
  log. Sergey's review of PR #26.

## Pull requests

**Every PR description opens with a link to its Linear ticket** — the
`linear.app/solana-fndn/issue/HOO-...` URL on its own line, before anything
else. Work with no ticket says so in that line instead. See
`docs/linear-conventions.md` for filing one.

Every PR description must let a reviewer understand and check the change
without asking: what it is and why, how it works, links to the spec /
decision / brief it implements, and instructions for testing it by hand.

**That list is a floor, not a licence.** `CONTRIBUTING.md` asks for a
description that is *concise (no slop)*, and it wins on length: the body
answers **"can this merge?"** and nothing else. Reasoning that explains *how
the code came to be this way* belongs in the commit messages, where this
repo already keeps it; background belongs in the ticket. If the body is long
because the change is surprising, that is a signal the change wants
splitting, not a longer preamble.

A reviewer should reach the diff within a screen of reading.

**The final step of preparing any PR — especially at the end of a
Superpowers round — is visual testing, and its screenshots go into the
description.** If the change is visual in any way (a new surface, a
changed control, different copy in the UI), the description must carry
**before and after screenshots** — before from the base branch, after
from the PR branch, same view and same state so the diff reads at a
glance. A feature with no prior UI needs only the after shots. A change
with no visual surface at all states that explicitly instead of
skipping the section.

Screenshots are committed to `docs/internal/assets/` on
`context-archive` (never to the PR branch) and embedded in the PR body
via their `raw.githubusercontent.com` URLs — the repo is public, so
they render inline.

## Working agreement

- Record every edit to a pre-existing upstream file, and every behaviour
  that differs from upstream, in `docs/upstream-divergences.md` in the
  same round -- with the decision that justifies it (Slava, 2026-09-08).
- Update `docs/decisions.md` when you make a call worth remembering — especially
  when you reject something. The rejected options are why the next person does
  not re-litigate.
- Keep `docs/assistant-context.md` true. It is what the product tells customers
  about itself; a stale claim there is a demo that overclaims.
- Note anything the environment prevented the assistant from doing well — a fix
  needing a crate outside the whitelist, a Rust-side test, a current Anchor API.
  That friction log is the raw material for the next strategic conversation, and
  it has to be collected while working, not reconstructed afterwards.
