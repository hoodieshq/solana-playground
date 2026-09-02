# Round brief: the launch floor, stream 1 (production bundle + CI, then the build proxy)

Date: 2026-09-03. This is D27's week-1 floor, run in parallel with the
lesson-ledger corrections (PR #20, its own session). The two streams
share no files: this one lives in `.github/`, configs, one upstream
rename and `api/*.mjs`; the ledger lives in `views/flow/lessons/`.

Full cycle per half-project, same shape as the ledger round: read ->
plan (superpowers writing-plans, committed to `docs/superpowers/plans/`
on `context-archive`) -> TDD where there is logic to test -> hand
verification -> PR per the CLAUDE.md "Pull requests" section (visual
evidence rules included) -> friction log entry for every
spec-vs-reality conflict. **Notify the owner when a half-project's PR
is up, then continue to the next.**

## Read before starting

1. `CLAUDE.md` on `context-archive` - especially "Pull requests"
   (before/after evidence is now mandatory) and "Merge safety".
2. `docs/roadmap.md` - "The September frame (D27)" and "New launch
   blockers"; keep the week table current when a PR lands.
3. `docs/decisions.md` - D27 (the frame), D28 (the `/api/build` proxy:
   the measured origin-allowlist table and the two rejections), D20
   (why `api/*.mjs` middleware exists), D22/D23 if touching auth
   paths.
4. `docs/internal/2026-09-02-september-launch-scope-handoff.md` - the
   scope's source.
5. The previous round as the model:
   `docs/internal/2026-09-01-lesson-implementation-brief.md` (shape),
   `docs/internal/2026-09-01-lesson-implementation-friction.md`
   (findings, incl. #8 - rollback), PR #20 (description format).
6. Project memory (auto-loaded): `lesson-ledger-round`,
   `pr-screenshots-required`, `no-ai-attribution`,
   `english-only-in-repo`, `context-docs-archived`.

## Ground rules (unchanged)

Branches cut fresh from `master-2.0`; **do not branch from or depend on
`feat/lesson-ledger`** - it is unmerged and under review. PRs against
`master-2.0`, one approval (rogaldh), no self-merge, no AI attribution,
nothing from `docs/` and no `CLAUDE.md` on a PR branch, English only,
CONTRIBUTING formatting. Baseline on `master-2.0`: 242 unit tests / 27
suites; `CI=true yarn build` currently FAILS everywhere (that is
half-project 1).

## Half-project 1: the production bundle and the CI that guards it

Branch: `fix/ci-production-bundle`.

In:

- **Make `CI=true yarn build` pass.** The known blocker is the
  `src/tutorials/__template/` case pair (`Template.tsx` vs
  `template.ts` - webpack's case check). The fix is a rename in an
  upstream-derived file; keep it minimal and check nothing else
  resolves the old casing. Then run the build to find whatever hides
  behind it - nobody has seen a green `CI=true` build on this tree, so
  treat every next failure as a finding for the friction log.
- **A `client-v2` GitHub Actions workflow** that runs on PRs and on
  `master-2.0` pushes: `tsc --noEmit`, `prettier --check` over `src/`
  **and** `api/` (the repo glob misses `api/` - D27 notes it), the
  unit suite, and `CI=true yarn build`. It must reproduce the local
  setup honestly: submodule init, `./wasm/stub-packages.sh`, yarn
  install, the cheap generate chain (`generate-exports`,
  `sync-assistant-context`, `generate-packages`,
  `generate-tutorials`). Discover how `client-v2/public` materializes
  on a clean clone (locally it exists as a copy of the `client/public`
  submodule; the truth is in the repo, verify rather than assume) and
  wire CI accordingly. Cache yarn; keep the run under ~10 min.
- Verification evidence in the PR description, per the CLAUDE.md rule:
  this change has no UI surface - say so explicitly, and the
  before/after is the CI story instead (the failing `CI=true yarn
  build` output on `master-2.0`, and the green Actions run on the PR:
  link plus a screenshot of the green check list).

Out: deploys, hosting, the OAuth production app (owner-side accounts),
Playwright e2e in CI (own decision later - note it, do not add it).

## Half-project 2: the same-origin `/api/build` proxy (D28)

Branch: `feat/api-build-proxy`. Start after PR 1 is up and the owner is
notified.

In:

- An `api/build.mjs` handler proxying the build round trip to
  `https://api.solpg.io` (D28: production domains are refused at
  api.solpg.io's preflight; localhost:3000 is allowed, so local dev
  keeps hitting it directly if that is simpler - decide and record).
  It follows the existing `api/*.mjs` conventions (D20 middleware
  serves them under `yarn dev`; Vercel serves them in prod), reads any
  env from `client-v2/.env.local` semantics, and returns the build
  server's errors transparently - the assistant reads stderr from
  them, so do not launder error bodies.
- The client-side switch: the build server URL the client uses in
  production resolves to the same-origin `/api/build`. Find where the
  build server URL is configured (settings default) and change the
  *default wiring*, not the user's ability to point elsewhere.
  Merge-safety warning: `commands/build/build.ts` is warm (7 commits
  upstream) - keep any edit there to a couple of delegating lines, per
  CLAUDE.md.
- Tests for the handler's logic where it is pure (request shaping,
  error pass-through); by-hand verification for the round trip: a real
  build through `yarn dev`'s `/api/build` in ~3.5s, plus the PR's
  evidence per the rule (terminal/network screenshots - the surface is
  not UI but the evidence must still show the thing working).
- H1 relevance: D27 notes D28 widens H1 (an open relay concern). Do
  the cheap hardening that fits this PR (method allowlist, payload
  size cap, no header pass-through beyond what the build needs) and
  record the rest as the H1 item's scope, not this PR's.

Out: the Foundation allowlist ask (owner-side, runs in parallel),
`/api/agent` (its own stream), metering.

## The friction log

Same file as the ledger round:
`docs/internal/2026-09-01-lesson-implementation-friction.md` - append
under a "Launch floor stream" heading, or start
`docs/internal/2026-09-03-launch-floor-friction.md` if the entries
outgrow a section; either way the entries are written the moment the
conflict is found.

## Environment notes (from the ledger round, verbatim so nothing is rediscovered)

- Node: `~/.nvm/versions/node/v22.23.2/bin` on PATH; yarn 1.22.22.
- Worktree setup that works: `git worktree add .claude/worktrees/<name>
  <branch>`; then `git submodule update --init`,
  `./wasm/stub-packages.sh`, copy `client-v2/public` from the main
  checkout, **and rewrite the copied `client-v2/public/.git` file to
  point at the absolute submodule gitdir**
  (`<repo>/.git/worktrees/<name>/modules/client/public`) or craco's
  git call crashes the dev server.
- Then `yarn install`, `yarn generate-exports`,
  `yarn sync-assistant-context`, `yarn generate-packages`,
  `yarn generate-tutorials`. Unit suite: `CI=true npx craco test
  --watchAll=false`.
- Port 3000 is contended (the ledger session also runs dev servers for
  corrections): check `lsof -ti :3000` before starting one, and kill
  only processes you started.

## Definition of done, per half-project

1. Plan committed to `docs/superpowers/plans/` on `context-archive`.
2. PR open against `master-2.0`, description per the CLAUDE.md rule
   (what/why, how, links, test instructions, evidence).
3. Checks green - by hand for PR 1 until its own workflow runs, then
   the workflow itself is the check.
4. Friction entries committed; roadmap week table and "New launch
   blockers" updated on `context-archive`.
5. Owner notified that the half-project is up for review.
