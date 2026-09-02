# CI Production Bundle (D27 floor, half-project 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `CI=true yarn build` produce a production bundle of
`client-v2`, and add a GitHub Actions workflow that guards types,
formatting, the unit suite and that bundle on every PR to `master-2.0`.

**Architecture:** One rename in an upstream-derived tutorial directory
removes the module-casing clash that fails the production build on
case-insensitive filesystems. A `build-fast` script mirrors `dev`'s
cheap generate chain so CI (where rustc is preinstalled) does not fall
into `generate-crates`. A single new workflow file under
`.github/workflows/` reproduces the documented local setup step for
step - submodule, WASM stubs, frozen install, generate chain - and runs
the four checks. No existing workflow is touched.

**Tech Stack:** GitHub Actions (`actions/checkout@v6`,
`actions/setup-node@v6` with yarn cache), yarn 1.22, CRA 5 + craco,
prettier 2, jest via `craco test`. No new dependencies.

**Spec:** `docs/internal/2026-09-03-launch-floor-brief.md` (half-project
1) and D27 in `docs/decisions.md`. Baseline evidence: the failing
`CI=true yarn build` on `master-2.0` (recorded 2026-09-03, 1:00 wall
clock, exit 1, "multiple modules with names that only differ in
casing": `__template/Template.ts` vs `__template/template.ts`).

## Global Constraints

- Branch `fix/ci-production-bundle`, cut from `master-2.0`
  (`1d908844`). PR against `master-2.0`. No AI attribution. Nothing
  from `docs/`, no `CLAUDE.md` on the branch. English only.
- CONTRIBUTING formatting: 80 columns, 2-space indent, prettier.
  Commits present tense; prefix `ci:` for workflow-only commits, no
  prefix for client changes.
- `client/` stays byte-identical to upstream. `server/` untouched.
  Existing `.github/workflows/{ci,cicd,reusable-checks}.yml` untouched.
- Touch upstream-derived files in `client-v2/` minimally: the rename
  plus its one-line `index.ts` import and one README line.
- Node `~/.nvm/versions/node/v22.23.2/bin` on PATH locally; CI uses
  `client-v2/.nvmrc` (22.20.0).
- Verification per task is by hand until the workflow itself runs;
  baseline on `master-2.0`: 242 unit tests / 27 suites.
- Every spec-vs-reality conflict is appended to
  `docs/internal/2026-09-03-launch-floor-friction.md` on
  `context-archive` at the moment it is found.
- Out of scope (brief): deploys, hosting, production OAuth app,
  Playwright e2e in CI.

## Decisions the brief leaves to the implementation

1. **Rename target is `__template/__template.ts`**, not
   `Template.tsx`. Every shipped tutorial directory is
   `<kebab>/<kebab>.ts` + `<kebab>/<Pascal>.tsx` (`hello-anchor.ts` +
   `HelloAnchor.tsx`), and `index.ts` re-exports `./<kebab>`. The
   template gets the same shape with its directory name, so copying it
   and renaming both files is exactly what `README.md` already
   instructs.
2. **CI runs `yarn build-fast`, a new script** =
   `yarn generate-fast && GENERATE_SOURCEMAP=false craco build`.
   `yarn build` runs `yarn generate`, whose `generate-crates` step skips
   itself only when rustc is *absent*; `ubuntu-latest` ships rustc, so
   `yarn build` in CI would `cargo install syn-file-expand-cli` and then
   skip every crate anyway (no local registry). `build-fast` is the
   `dev`/`generate-fast` pattern applied to the build; `yarn build`
   keeps its meaning for Vercel. The workflow sets `CI=true`
   explicitly, so the step is literally the "CI=true production build".
3. **`client-v2/public` comes from `scripts/update-static.mjs`**,
   already the first step of `generate-fast`: it copies tracked files
   out of the `client/public` submodule (the primary checkout's) and
   writes tutorial timestamps from that submodule's git history. CI
   therefore needs `submodules: true` on checkout and nothing else.
   `fetch-depth: 0` is set so the timestamps are the real add dates
   (the assets repo is 16 commits / 4.9 MiB; the cost is seconds).
4. **`check-format` and `format` widen to `src/ api/`** in
   `package.json` rather than the workflow inlining a second glob - the
   script is what a contributor runs locally, and D27 names the missing
   `api/` as the gap. `api/` passes today (verified), so the change is
   a guard, not a reformat.
5. **Workflow triggers:** `pull_request` targeting `master-2.0` and
   `push` to `master-2.0`, plus `workflow_dispatch` for a manual run.
   Not `master`: upstream's `ci.yml` owns that branch and this workflow
   would only fail there (`client-v2` predates none of its history).
6. **No TDD task in this plan.** The change is a rename, a script line
   and a YAML file; there is no logic to put under a unit test. The
   test is the workflow run itself (definition of done, item 3).

---

### Task 1: Remove the module-casing clash in `src/tutorials/__template`

**Files:**
- Rename: `client-v2/src/tutorials/__template/template.ts` ->
  `client-v2/src/tutorials/__template/__template.ts`
- Modify: `client-v2/src/tutorials/__template/index.ts:1`
- Modify: `client-v2/src/tutorials/README.md:80`

**Interfaces:**
- Consumes: nothing.
- Produces: a tree where `find src/tutorials -iname 'template.*'`
  returns only `Template.tsx`; Task 3's build step depends on it.

- [ ] **Step 1: Confirm the failing baseline is reproduced in this worktree**

Run (from `client-v2`, node 22 on PATH):
```sh
CI=true yarn build 2>&1 | tail -20
```
Expected: `Failed to compile.` and `There are multiple modules with
names that only differ in casing` naming `__template/Template.ts` and
`__template/template.ts`. Exit code 1. (Already recorded on
`master-2.0` at the same commit; re-running is optional if the log is
at hand.)

- [ ] **Step 2: Rename and repoint the barrel**

```sh
git mv src/tutorials/__template/template.ts \
       src/tutorials/__template/__template.ts
```

`src/tutorials/__template/index.ts` becomes:
```ts
export * from "./__template";
```

- [ ] **Step 3: Update the contributor instructions**

`src/tutorials/README.md` line 80, in the "Copy the `__template`
directory" list, changes from

```md
   - `template.ts` file to `cool-tutorial.ts`
```
to
```md
   - `__template.ts` file to `cool-tutorial.ts`
```

- [ ] **Step 4: Check nothing else resolves the old casing**

```sh
grep -rn "__template/template\|\"./template\"\|'./template'" src scripts craco.config.js
```
Expected: no output.

- [ ] **Step 5: Type-check and format-check**

```sh
npx tsc --noEmit && npx prettier --check src/ api/
```
Expected: no tsc errors; "All matched files use Prettier code style!".

- [ ] **Step 6: Commit**

```sh
git add -A src/tutorials/__template src/tutorials/README.md
git commit -m "Rename the tutorial template module to its directory name

\`__template/template.ts\` and \`__template/Template.tsx\` differ only in
casing. The tutorials' lazy import context resolves \`./__template/Template\`
through the filesystem, and on a case-insensitive one that lands on
\`template.ts\`, so webpack reports two modules whose names differ only in
casing; under CI=true the warning is an error and the production build
fails. The shipped tutorials name their data module after the directory
(\`hello-anchor/hello-anchor.ts\`); the template now does the same."
```

---

### Task 2: A `build-fast` script and `api/` in the format scripts

**Files:**
- Modify: `client-v2/package.json:96-99` (the `build`, `format`,
  `check-format` lines in `scripts`)

**Interfaces:**
- Produces: `yarn build-fast` (production bundle without the crate
  step), `yarn check-format` covering `src/` and `api/`. Task 3's
  workflow calls both by name.

- [ ] **Step 1: Add the script and widen the globs**

In `client-v2/package.json` `scripts`, after `"build"`:
```json
    "build-fast": "yarn generate-fast && GENERATE_SOURCEMAP=false craco build",
```
and change
```json
    "format": "prettier --write src/",
    "check-format": "prettier --check src/",
```
to
```json
    "format": "prettier --write src/ api/",
    "check-format": "prettier --check src/ api/",
```

- [ ] **Step 2: Verify the format script still passes**

```sh
yarn check-format
```
Expected: "All matched files use Prettier code style!" with `api/*.mjs`
listed among the checked files (add `--loglevel debug` if in doubt).

- [ ] **Step 3: Produce the bundle the way CI will**

```sh
time CI=true yarn build-fast 2>&1 | tail -30
```
Expected: `Compiled successfully.` (or `Compiled with warnings` is NOT
acceptable - CI=true must treat them as errors, so the expected tail
has no warnings block), a `File sizes after gzip` table, exit 0, and a
`build/index.html`. Record the wall-clock time for the workflow budget.
If a *new* failure appears behind the casing one, it is a friction-log
entry first and a fix second; keep the fix in its own commit.

- [ ] **Step 4: Run the unit suite once, as CI will**

```sh
CI=true yarn test-unit 2>&1 | tail -8
```
Expected: `Tests: 242 passed, 242 total`, `Test Suites: 27 passed`.

- [ ] **Step 5: Commit**

```sh
git add package.json
git commit -m "Add a build-fast script and format-check api/ alongside src/

\`yarn build\` runs the full generate chain, whose crate step installs a
cargo tool whenever rustc is present and then, without a local registry,
skips every crate. CI runners ship rustc, so the production build there
takes the same cheap chain as \`yarn dev\`. The format scripts now cover
\`api/\`, which the old glob missed."
```

---

### Task 3: The `client-v2` GitHub Actions workflow

**Files:**
- Create: `.github/workflows/client-v2.yml`

**Interfaces:**
- Consumes: `yarn build-fast`, `yarn check-format` (Task 2); the
  casing-clean tree (Task 1); `wasm/stub-packages.sh`;
  `client-v2/.nvmrc`; `client-v2/yarn.lock`.
- Produces: a required-check candidate named `client-v2 / checks`.

- [ ] **Step 1: Write the workflow**

```yaml
name: client-v2

# Types, formatting, the unit suite and the CI=true production bundle
# for the fork's frontend. Upstream's ci.yml guards `client/` on master;
# this one guards `client-v2/` on master-2.0 and never touches the
# Rust workspaces.
on:
  push:
    branches: ["master-2.0"]
  pull_request:
    branches: ["master-2.0"]

  workflow_dispatch:

concurrency:
  group: client-v2-${{ github.ref }}
  cancel-in-progress: true

jobs:
  checks:
    name: checks
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      CI: "true"

    defaults:
      run:
        working-directory: client-v2

    steps:
      # `client-v2/public` is not tracked: scripts/update-static.mjs
      # copies it out of the `client/public` submodule and dates each
      # tutorial from that submodule's history, so the submodule is
      # checked out with full history.
      - uses: actions/checkout@v6
        with:
          submodules: true
          fetch-depth: 0

      - uses: actions/setup-node@v6
        with:
          node-version-file: client-v2/.nvmrc
          cache: "yarn"
          cache-dependency-path: "client-v2/yarn.lock"

      # Six of the eight local `wasm/*/pkg` deps are compiled from Rust
      # (about an hour). `yarn install` refuses to run while the
      # directories are missing, so stand them in; none is on the UI
      # or test path.
      - name: Stub the unbuilt WASM packages
        run: ../wasm/stub-packages.sh

      - name: Install
        run: yarn install --frozen-lockfile

      # Same cheap chain as `yarn dev`: static assets, export barrels,
      # package and tutorial data, assistant context. The build step
      # runs it again internally; it is here so type-check and tests
      # see the generated files too.
      - name: Generate
        run: yarn generate-fast

      - name: Check types
        run: yarn test-types

      - name: Check format
        run: yarn check-format

      - name: Unit tests
        run: yarn test-unit

      - name: Production build
        run: yarn build-fast
```

- [ ] **Step 2: Lint the YAML locally**

```sh
npx --yes yaml-lint ../.github/workflows/client-v2.yml 2>&1 | tail -2 \
  || python3 -c "import yaml,sys; yaml.safe_load(open('../.github/workflows/client-v2.yml')); print('yaml ok')"
```
Expected: no parse error. (`actionlint` if installed: `actionlint
../.github/workflows/client-v2.yml`, expected no output.)

- [ ] **Step 3: Rehearse the exact step list locally from a clean state**

```sh
cd .. && git clean -ndx client-v2 | head   # see what a clean clone lacks
cd client-v2 && rm -rf build node_modules/.cache
../wasm/stub-packages.sh && yarn install --frozen-lockfile \
  && yarn generate-fast && yarn test-types && yarn check-format \
  && CI=true yarn test-unit && CI=true yarn build-fast \
  && echo LOCAL-REHEARSAL-GREEN
```
Expected: `LOCAL-REHEARSAL-GREEN`.

- [ ] **Step 4: Commit**

```sh
git add ../.github/workflows/client-v2.yml
git commit -m "ci: check types, format, tests and the production bundle of client-v2

Runs on pull requests to master-2.0 and pushes to it. Reproduces the
documented local setup - assets submodule, WASM stubs, frozen install,
the cheap generate chain - then tsc, prettier over src/ and api/, the
unit suite and the CI=true production build."
```

---

### Task 4: Push, open the PR, and let the workflow produce the evidence

**Files:**
- none in the repo; the PR body and screenshots.

- [ ] **Step 1: Push and open a draft PR**

```sh
git push -u origin fix/ci-production-bundle
gh pr create --base master-2.0 --draft \
  --title "Make the production bundle build and guard client-v2 with CI" \
  --body-file /path/to/body.md
```
Body sections, per the CLAUDE.md "Pull requests" rule: *What this is*
(with links to D27, the brief and this plan on `context-archive`),
*How it works* (the three commits), *Before / after* - stated
explicitly: **no UI surface; the evidence is the CI story** - the
failing `CI=true yarn build` tail from `master-2.0` in a code block and
the green Actions run (link + screenshot), *How to test by hand*
(`CI=true yarn build-fast` locally; the Actions tab).

- [ ] **Step 2: Watch the run**

```sh
gh run list --workflow client-v2 --branch fix/ci-production-bundle --limit 3
gh run watch <run-id> --exit-status
```
Expected: exit 0, all steps green, total time under 10 minutes. If a
step fails, that is a friction entry (the runner differs from macOS)
and a fix commit; re-watch.

- [ ] **Step 3: Screenshot the green check list**

Open the PR's "Checks" tab in the browser at the run summary; capture
the green step list. Save as
`docs/internal/assets/2026-09-03-pr-ci/after-checks-green.png` on
`context-archive` and commit there ("Add the CI evidence shots for the
production-bundle PR"). Embed via
`https://raw.githubusercontent.com/hoodieshq/solana-playground/context-archive/docs/internal/assets/2026-09-03-pr-ci/after-checks-green.png`.

- [ ] **Step 4: Finish the PR body and mark ready**

```sh
gh pr edit <n> --body-file /path/to/body.md
gh pr ready <n>
```

---

### Task 5: Round-close docs on `context-archive`

**Files:**
- Create/append: `docs/internal/2026-09-03-launch-floor-friction.md`
- Modify: `docs/roadmap.md` (the week table row 1 and "New launch
  blockers" first bullet)
- Modify: `docs/decisions.md` D27 (one line: the floor's first item
  shipped as PR #n)

- [ ] **Step 1: Friction entries** - written as found; at minimum:
  (1) the casing clash is a case-insensitive-filesystem defect, so a
  Linux runner alone would not have caught it - CI guards the bundle,
  the rename guards macOS contributors; (2) `yarn build` in CI would
  run `generate-crates` because rustc is present - `build-fast`; (3)
  the local `client/public` checkout sits at `df14c26` while the
  superproject pins `1098ecfa` - CI builds the pinned one, local dev
  the stale one; (4) anything the Actions run surfaces.

- [ ] **Step 2: Roadmap** - week-1 row: "production bundle, CI" ->
  "**PR #n**"; first launch blocker: "fixed in PR #n (rename), guarded
  by the `client-v2` workflow".

- [ ] **Step 3: Commit on `context-archive`**

```sh
git add docs/internal/2026-09-03-launch-floor-friction.md docs/roadmap.md docs/decisions.md
git commit -m "Record the production-bundle round: friction, roadmap, D27 status"
```

- [ ] **Step 4: Notify the owner** that PR #n is up, then start
  half-project 2 (`feat/api-build-proxy`, its own plan).
