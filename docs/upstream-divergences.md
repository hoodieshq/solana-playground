# Upstream divergences: where `client-v2` differs from `client/`, and why

**Started:** 2026-09-08 (Slava, on the PR #27 retrospective) · **Owner:**
whoever touches a pre-existing upstream file in `client-v2/` next.

`client/` is byte-identical to upstream and stays that way (CLAUDE.md,
hard constraints). `client-v2/` is a *copy* of it plus the fork's work,
so every difference between the two is a decision -- made on purpose or
by omission -- that somebody will have to re-make on three occasions:

1. **Updating the roadmap.** A divergence with a "resolve by" date is a
   roadmap item; one without is a debt the board should know about.
2. **Releasing to production.** Every entry below marked **release**
   changes what a user gets on the production origin compared with
   upstream's own deployment.
3. **Syncing with upstream** (week 4's ~21 commits, and every one after).
   Every entry marked **sync** is a place where `git merge` or a file
   copy will conflict, or -- worse -- will *not* conflict and silently
   undo a fork decision.

Rule: **a divergence is recorded here the moment it is made**, in the
same PR round that makes it, with the decision that justifies it. An
entry without a decision number is a divergence we have not yet
decided to keep. `docs/roadmap.md` *Upstream drift* carries the
status; this file carries the register.

## 1. Behavioural divergences (deliberate)

What a user or an operator observes differently from upstream. Each
row: what differs, why, the decision, and what to do on sync / release.

| # | Divergence | Why | Decision | On sync | On release |
| --- | --- | --- | --- | --- | --- |
| B1 | `experimental.unstable` defaults to **`false` everywhere**; upstream defaults to `NODE_ENV !== "production"` | No hosted build server enables the `unstable` feature; upstream's default turns every dev build into a 404 | D37, D38 (PR #27) | `settings/experimental/experimental.ts` is ours by one line (`default`) and the description wording; keep ours. `876fa552`'s other four files are already verbatim | If a production server ever enables `unstable`, revisit the default and the `/api/build` allowlist |
| B2 | The default build server is the **Foundation's App Engine server in every environment, development included**, never `api.solpg.io`; upstream defaults development to `http://localhost:8080` and production to `api.solpg.io`. The picker offers Foundation / Local / SolPg, labelled. **Settled (2026-09-21):** the same-origin `/api/build` proxy (D28) is dropped -- the Foundation server's `PG_CLIENT_URLS` already admits our domains. PR #22 closed; the default-endpoint work landed on HOO-1688 | Solana's users are served by Solana's infrastructure, not Acheron's (D30); the CORS premise behind the proxy held for `api.solpg.io` only (D28, amended). Nothing in this repository starts a local build server, so upstream's development default made the first build of a fresh checkout fail against an empty port (HOO-1688); the Foundation server allowlists `localhost:3000` | D30 kept; D28 overturned (PR #22 closed 2026-09-21, reopened as HOO-1688) | `settings/server/server.ts` and `default-endpoint.ts` are ours; upstream's `server.ts` setting is a two-line default -- never take it | The deploy target's `PG_CLIENT_URLS` must list every origin we serve from, `localhost:3000` included for development. `REACT_APP_SERVER_URL` is the single knob, and it reaches stored profiles too: a profile on it holds `configured`, not the address, even when the env names a listed server (B16, D47) |
| B3 | Deploy's upgrade length arithmetic lives in **`commands/deploy/additional-len.ts`** (pure, 6 tests); upstream inlines it in `deploy.ts` | `deploy.ts` is hot (29 upstream commits / 6 months) and untestable without the whole module; the merge-safety rule asks for a two-line delegate | Spec 2026-09-08 demo-path port, confirmed by Slava 2026-09-08 (PR #27) | When `getAdditionalLen` changes upstream, port the change into `additional-len.ts` and keep the delegate | none |
| B4 | The client boots on **Flow** (stepper, stages, left/right panels) instead of upstream's sidebar-and-tabs layout; classic behind a flag | The product is the dev loop as navigation | D10, D17, D18 | Flow is all new files under `views/flow/`; the touch points in upstream files are listed in section 2 | Flow *is* the product surface |
| B5 | The **assistant panel** is the first sidebar page and the one the app opens on | The prototype's reason to exist | D2, D15 | `views/sidebar/sidebar.ts` and `create.ts` are registries, cold upstream | BYO key at runtime; no key in the bundle (D3) |
| B6 | Build errors are captured **raw at the source** (`commands/build/build.ts`) and given to the assistant | Upstream's `improveOutput` is lossy | D4 | `build.ts` is warm (7 commits); keep the edit to the delegating lines | none |
| B7 | **GitHub OAuth** sign-in (`/api/github/*`), and the devnet airdrop is gated behind it | Identity first (D21); abuse control on the faucet | D21, D22, D23 (PRs #9, #14, #17) | `commands/airdrop/airdrop.ts`, `useAirdrop.tsx`, `automatic-airdrop.tsx` carry the gate | Needs the production OAuth app (owner) |
| B8 | GitHub **imports read the Trees API** and group programs the way Anchor's importer does | Upstream's importer misses multi-program repos | D22 (PR #14) | `utils/github.ts`, `frameworks/anchor/anchor.ts` | none |
| B9 | **Platform RPC endpoints** and a header cluster toggle; connection default differs | Product's own RPC, not upstream's list | PR #16 | `constants/connection.ts`, `settings/connection/connection.ts`, `utils/connection.ts`. Upstream `1d906604` (2026-09-01) changes the same default to localnet in non-prod -- **a conflict waiting** | Endpoint URLs are product config |
| B10 | **Tutorials are a scenario** with a ledger, a cursor and toolchain-graded steps; upstream's tutorial storage is a step index | The learning core | D24, D25, D26, D34 (PRs #19, #20, #24, #26) | `utils/tutorial/tutorial.ts`, `routes/tutorials/tutorials.tsx`, `routes/common.tsx` | Migration of a learner's stored progress is one-way (D25 rollback note) |
| B11 | **Solana-brand theme** as default, thin component layer | Redesign | D8, D9 | `themes/playground/playground.ts`, `utils/theme/*`, `index.css`, `components/Button/Default.tsx`, `Folders.tsx`, `Workspaces.tsx` | none |
| B12 | **`/api/*` handlers** (agent relay, MCP gateway, health; no build proxy -- D28 overturned) served by a craco middleware in dev and Vercel functions in prod; upstream has no API layer | The assistant's server side, without a backend of ours | D1, D12, D19, D20, D28, D36 | `craco.config.js`, `vercel.json`, `api/*.mjs` are ours entirely | `maxDuration` 300 (D36); env vars per `client-v2/.env.example` |
| B13 | **`client-v2/public` is a gitignored mirror** of the `client/public` submodule, not a submodule | Submodules fight linked worktrees | PR #11; friction log 2026-09-04 | `make update-static` after every submodule bump in the primary checkout | The Docker profile and Vercel install script copy it |
| B14 | **Projects and conversations persist in Postgres** for a signed-in user (Better Auth session, `/api/projects`, `/api/conversations`, `client-v2/db`); a conversation is a thread with its own id, recording the backend it was created with, and each reply records the backend that wrote it. Upstream has no account, no database and no assistant | Work survives a reload and follows the account across browsers (PR #29); HOO-1633 asks for the history to be identifiable by what produced it | PR #29; D39 (this round) | All new: `client-v2/api/*`, `src/features/auth`, `src/features/persistence`, `db/`. The touch points in pre-existing files are `views/sidebar/assistant/store.ts` and `effects/` -- both fork-only | Needs `DATABASE_URL` and `SYNC_ENABLED`, and the migrations applied as a deploy step. Without them the client is exactly upstream's local-only behaviour; the probe at `/api/sync` is what ships it dark |
| B15 | **No package bundler**: `/bundle`, `PgJsPackage` and `pm install` are not ported. The runtime's package imports and Monaco's package types always read the bundled packages and the static `/packages/*` files, with the `unstable` switch on or off; upstream reads the installed bundle when the switch is on | Sergey, PR #27 review 2026-09-22: `pm install` is not needed, and the bundler's server side has an undefined blast radius (D38) | D38, amended 2026-09-23 (PR #27) | Skip every upstream commit that touches `js-package.ts`, `commands/package-manager/` or `PgServer.bundle`; in `package-import-template.ts.raw` and `declarations/helper.ts` keep ours | none: no hosted server has `/bundle` |
| B16 | **Endpoints are stored as the option picked, not its address.** `connection.endpoint` and `server.endpoint` go into `localStorage` as an option key (`devnet-platform`, `foundation`, `configured`, ...) and resolve from the env on read; a custom address is stored as `{ option: "custom", url }`, untouched. Upstream stores the address | A rotated platform RPC key or a moved build server has to reach profiles that stored the old one; a custom URL may carry the user's own token (Sergey, PR #31) | D47 (PR #31) | `utils/settings.ts` is ours by two calls in `storage.read`/`write`; take upstream's file and re-apply them. A new option in either picker needs its key in `settings/stored-endpoint.ts`; `stored-endpoint.test.ts` fails until it has one | A key whose option the deploy drops reads as the default |

## 2. Pre-existing upstream files the fork has edited

`git diff --name-status 849670c7:client feat/upstream-demo-path:client-v2`
on 2026-09-08 (`849670c7` is the upstream commit `client-v2` was copied
from). 60 modified files; 143 files are new and are not listed -- new
files never conflict. **Every file here is a merge conflict on the
next sync**; the *Why* column says which side wins.

| File | Why (decision / PR) | On sync |
| --- | --- | --- |
| `craco.config.js` | `/api` middleware (D20), MCP (D12) | ours; upstream rarely touches it |
| `vercel.json` | rewrites, `maxDuration` (D28, D36) | ours |
| `package.json`, `yarn.lock` | `@anthropic-ai/sdk`, playwright, scripts (#10) | merge; keep our scripts and deps |
| `Dockerfile`, `Makefile.vercel`, `.prettierignore` | static assets, docker profile (#11) | ours |
| `README.md`, `docs/deploy-client-vercel.md`, `src/tutorials/README.md` | fork docs | ours |
| `scripts/generate-crates.mjs`, `scripts/utils.mjs` | worktree-aware paths (#5) | ours |
| `scripts/package-import-template.ts.raw` | always the bundled packages, no `PgJsPackage` branch (PR #27, B15) | ours |
| `scripts/generate-packages.mjs` | two spaces less on the generated `case` lines, which lost their `if` (PR #27, B15) | ours; re-apply if upstream touches the line |
| `src/app/Panels/Panels.tsx` | Flow as the default layout (D17) | ours |
| `src/commands/airdrop/airdrop.ts`, `src/components/Wallet/hooks/useAirdrop.tsx`, `src/effects/automatic-airdrop/automatic-airdrop.tsx` | airdrop behind sign-in (#9, D21) | ours |
| `src/commands/build/build.ts` | raw stderr capture (D4); **warm upstream file** | take upstream, re-apply the delegating lines |
| `src/commands/deploy/deploy.ts` | port of three upstream commits + delegation to `additional-len.ts` (PR #27, B3); **hot** | take upstream, re-apply the delegate |
| `src/commands/deploy/bpf-loader-upgradeable.ts` | port of `ef8ba918` (PR #27); **hot** | identical to upstream at `57479351` |
| `src/components/Button/Default.tsx` | tutorials scenario (#19) | ours |
| `src/components/CodeBlock/highlight.ts` | Flow visual parity (#10) | ours |
| `src/components/Editor/Monaco/Monaco.tsx` | theme layer (D9) | merge |
| `src/components/Editor/Monaco/languages/typescript/declarations/helper.ts` | always the static type files, no `PgJsPackage` branch (PR #27, B15) | ours |
| `src/constants/connection.ts`, `src/settings/connection/connection.ts`, `src/utils/connection.ts` | platform RPC (#16, B9) | ours; watch upstream `1d906604` |
| `src/frameworks/anchor/anchor.ts`, `src/utils/github.ts` | Trees API import (D22) | ours |
| `src/hooks/useOnClickOutside.tsx` | header cluster toggle (#16) | merge |
| `src/index.css`, `src/themes/playground/playground.ts`, `src/utils/theme/interface.ts`, `src/utils/theme/theme.ts` | Solana theme (D9) | ours |
| `src/routes/common.tsx`, `src/routes/tutorials/tutorials.tsx` | assistant as landing (D15), tutorial race (D16) | ours |
| `src/routes/share/share.tsx` | Flow visual parity (#10) | merge |
| `src/settings/server/server.ts` | picker + Foundation default (D30; PR #31) | ours |
| `src/utils/common.ts` | tutorials (#19); **hot** | merge; upstream's `formatSeconds` line (`8f4d7567`) is not ours -- it came with `pm install` (B15) |
| `src/utils/explorer/explorer.ts` | workspace events (#19); port of `346adeae`/`837732bc` (PR #27) | merge |
| `src/utils/explorer/fs.ts` | port of `837732bc` (PR #27) | identical to upstream at `57479351` |
| `src/utils/keybind.ts` | cmd+B (#15), tutorials (#19) | ours |
| `src/utils/program-info.ts` | port of `346adeae` (PR #27); **hot** | identical to upstream at `57479351` |
| `src/utils/settings.ts` | settings storage stores endpoint options, not addresses (PR #31, B16) | take upstream, re-apply the two calls |
| `src/utils/server.ts` | unstable routes ported, `bundle()` not (PR #27, B15); flag reads the setting | take upstream, delete `bundle()` and `BundleRequest` |
| `src/utils/tutorial/tutorial.ts` | port of `346adeae` (PR #27) | identical to upstream at `57479351` |
| `src/utils/wallet/wallet.ts` | GitHub identity (D21); port of `ef8ba918` (PR #27); **hot** | merge |
| `src/utils/web3/bpf-loader-upgradeable.ts` | port of `4e7a933b` (PR #27) | identical to upstream at `57479351` |
| `src/views/index.ts`, `src/views/sidebar/index.ts`, `src/views/sidebar/sidebar.ts`, `src/views/sidebar/create.ts` | assistant page registered (D2, D15) | ours; cold registries |
| `src/views/sidebar/build-deploy/Component/ProgramSettings/ProgramSettings.tsx` | port of `876fa552` (PR #27) | identical to upstream at `876fa552` |
| `src/views/sidebar/build-deploy/build-deploy.ts`, `src/views/sidebar/explorer/explorer.ts`, `src/views/sidebar/programs/programs.ts`, `src/views/sidebar/test/test.ts`, `src/views/sidebar/tutorials/tutorials.ts` | sidebar pages re-homed for Flow (#5, D15, D16) | ours |
| `src/views/sidebar/explorer/Component/ExplorerButtons.tsx`, `Folders.tsx`, `Workspaces.tsx`, `Modals/DeleteWorkspace.tsx` | Flow parity (#10), theme (D9), tutorials (#19) | merge |

Deleted relative to upstream: `public` (the submodule; B13).

## 3. Upstream commits not yet in `client-v2`

### 3a. In `master-2.0`'s `client/`, not ported (11) -- week 4's sync

| Hash | Date | Subject | Note |
| --- | --- | --- | --- |
| `3dda4cf7` | 08-07 | Show error page when there is a route handler error | new `/error` route; touches `routes/common.tsx` (ours) |
| `bb138214` | 08-08 | Replace `NotFound` view with `Error` and remove `NotFound` | with the above |
| `618fada6` | 08-09 | Fix not managing button state during wallet send with `Enter` | small, safe |
| `628db96a` | 08-10 | Add home icon to the "Go home" button | with `/error` |
| `6c1fe3d0` | 08-11 | Fix "Go back" button not being visible on the `/error` route | with `/error` |
| `8afdebe2` | 08-12 | Fix `f64` serialization to use `Buffer.writeDoubleLE` (#473) | **bug fix on the test panel; take early** |
| `75643e4a` | 08-13 | Remove `PgCommon.withoutPreSlash` | `common.ts` is hot and ours |
| `6ed43caf` | 08-14 | Remove `Approve` wallet modal | check Flow's wallet chrome first |
| `6948a6f4` | 08-16 | Add `PgCompression` | refactors `framework.ts` |
| `c21be53c` | 08-17 | Rename `PgPackage` to `PgWasmPackage` | 9 files incl. `build.ts` (B6) |
| `82766e9b` | 08-18 | Suggest solutions for common build errors (#472) | **upstream starting on what the assistant sells**; input for the Foundation conversation before it is merged |

### 3b. In `upstream/master` beyond `master-2.0` (client, 8)

| Hash | Date | Subject | Note |
| --- | --- | --- | --- |
| `b1572a5d` | 08-28 | Fix `Button.Import` not triggering on same file names | safe |
| `0be1f9aa` | 08-29 | Always remove the Rust compiling message from build outputs | touches `build.ts` output path; **check D4's raw capture** |
| `1d906604` | 09-01 | Set `connection.endpoint` default to localnet in non-prod | **conflicts with B9** |
| `1648e117` | 09-02 | Fix infinite loop due to the override of the default workspaces value | `explorer.ts`, ours-merged |
| `e3a221b1` | 09-04 | Fix being unable to pass `PgExplorer.getRelativePath` as a callback | safe |
| `da2528b4` | 09-05 | Cache package import `Blob` URLs in `PgJsPackage` | skip: `js-package.ts` is not ported (B15) |
| `2519b9cf` | 09-06 | Fix method name inconsistencies | rename sweep; check the assistant bridge |
| `876fa552` | 09-07 | Add `experimental.unstable` setting | **ported whole in PR #27** (setting, `server.ts`, template, `helper.ts`, `ProgramSettings.tsx`); only the `default` differs (B1) |

### 3c. In `upstream/master` beyond `master-2.0` (server, 8)

Not ours to port (hard constraint: do not modify the backend), but they
change what a server built from this tree can do, and B1/B2 depend on
that: `144b5c99` templates in unstable builds, `6f00ab9b`
`anchor-1.1.2` template, `f18a9091` dynamic template choice,
`5f20d4e3`, `d9b6fa71`, `d5e8a5e7` bundle cache, `5792608d` and
`1cb4017c` concurrency limits on unstable builds and `/bundle`. When
the Foundation's server picks these up, the `unstable` routes stop
being a local-only affair and B1's default is due for a revisit.

## 4. How to keep this true

- **A PR that edits a pre-existing upstream file** adds or updates its
  row in section 2 in the same round, with the decision or PR number.
- **A PR that ports upstream commits** removes them from section 3 and
  notes any file that is now "identical to upstream at `<hash>`".
- **`git fetch upstream` before a roadmap update** and refresh 3b/3c:
  `git log --format='%h %ad %s' --date=short master-2.0..upstream/master -- client/`.
- **Before a release**, read section 1's *On release* column top to
  bottom.
- **Before a sync**, read section 2's *On sync* column and section 3's
  notes; the bold entries are the known conflicts.
