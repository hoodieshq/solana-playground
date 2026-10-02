# Design System Package Implementation Plan (Stream C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land `design-system/` from PR #32 on `master-2.0` as its own
package whose registry installs from the repo and never reaches
`https://solana-playground-ds.vercel.app`.

**Architecture:** Take the package verbatim from commit `4fcb29b` (one
commit that adds only `design-system/`, authored by Nikita), then rewrite
every `registryDependencies` URL on that host to a namespaced name,
`@playground/<item>`. A consumer maps the `@playground` namespace in its own
`components.json`; for the repo that is a zero-dependency static server
over `registry-dist/r` on port 3010. Components are not touched.

**Tech Stack:** npm (the package's own `package-lock.json`), shadcn CLI
4.21.0, Vite 8, Tailwind 4, Node 22.

**Spec:** `docs/superpowers/specs/2026-10-01-ui-migration-design.md`,
section "How the design system reaches the code".

## Global Constraints

- Worktree off `origin/master-2.0`; branch
  `slavakoreshkov/ui-migration-design-system-package`.
- Do not touch `client-v2/` (or `client/`, `server/`).
- Components, hooks, styles and the showcase under `design-system/src/`
  stay byte-identical to `4fcb29b`.
- No URL on `solana-playground-ds.vercel.app` in any
  `registryDependencies`, in `registry.json` or in the built
  `registry-dist/r/*.json`.
- Never install through a symlinked `node_modules`; `design-system/` gets a
  real one from `npm ci`.
- Dev ports 3010 and up.
- Everything committed is English; no AI attribution in commits or PR.
- PR: Linear link first, concise, reviewers rogaldh and iamanikeev,
  assignee ocatave.

## Why a namespace and not a file path

shadcn 4.21 resolves a `registryDependencies` entry in one of four ways
(`mt()` in `shadcn/dist/chunk-B2MD6U5O.js`): URL, file (`*.json`, not a
URL), `@namespace/item`, or a bare name (the stock shadcn registry). A file
path is resolved with `path.resolve` against the *consumer's* cwd, so
`registry.json` would have to know where `client-v2` sits. A namespace
keeps the registry free of any location: the consumer decides where
`@playground` lives. Namespaces are fetched over HTTP only (`K()` uses
`fetch`), hence the local server.

Bare stock names (`button`, `spinner`, `tooltip` in `async-button`,
`copy-button`, `help-tip`) still resolve to `ui.shadcn.com`. That host is
not the one the spec names, and the design system's stock copies are
"untouched" shadcn, so they stay as they are and the PR says so.

## Review Focus

1. A dependency two levels down (`playground` -> `stepper` ->
   `use-indicator`) still resolving to the old host - the dry run on
   `playground` walks the whole tree.
2. `shadcn build` rewriting or rejecting `@playground/...` names - checked
   by grepping the built JSON, not only the source.
3. The serve script answering a missing item with 200 HTML, which would
   make shadcn fail with a parse error instead of "not found" - the script
   answers 404 JSON.
4. Port 3010 taken - the script takes `PORT` and fails loudly on
   `EADDRINUSE`.
5. The README still telling people to install from the Vercel host.

---

### Task 1: Worktree and the package, verbatim

**Files:**
- Create: `design-system/**` (119 files from `4fcb29b`)

- [ ] **Step 1: Create the worktree**

```bash
cd /Users/viacheslav_koreshkov/git/hoodies/solana-playground
git fetch origin
git worktree add -b slavakoreshkov/ui-migration-design-system-package \
  .claude/worktrees/design-system-package origin/master-2.0
```

- [ ] **Step 2: Cherry-pick the package commit (keeps Nikita's authorship)**

```bash
cd .claude/worktrees/design-system-package
git cherry-pick 4fcb29b
git show --stat HEAD | tail -1   # 119 files changed, 22411 insertions(+)
git diff --stat origin/master-2.0 -- client-v2 | wc -l   # 0
```

- [ ] **Step 3: Install and build as-is (baseline)**

```bash
cd design-system
test ! -L node_modules
npm ci
npm run build:registry
grep -l 'solana-playground-ds.vercel.app/r/' registry-dist/r/*.json | wc -l
```

Expected: build succeeds; the grep counts 28 files (27 items plus
`playground.json`). This is the failing "test" Task 2 turns to 0.

### Task 2: In-repo registry names and a local server

**Files:**
- Modify: `design-system/registry.json` (registryDependencies only)
- Modify: `design-system/components.json` (`registries`)
- Create: `design-system/scripts/serve-registry.mjs`
- Modify: `design-system/package.json` (scripts)
- Modify: `design-system/README.md` ("Using ours in client-v2")

**Interfaces:**
- Produces: item names `@playground/<name>`; `npm run registry:serve`
  serving `registry-dist/r/<name>.json` on `PORT` (default 3010).

- [ ] **Step 1: Rewrite the dependencies**

```bash
sed -i '' 's#"https://solana-playground-ds.vercel.app/r/\([a-z0-9-]*\)\.json"#"@playground/\1"#' registry.json
grep -c 'solana-playground-ds.vercel.app/r/' registry.json   # 0
git diff --stat -- registry.json   # only this file, 55 lines each way
```

- [ ] **Step 2: Map the namespace for the package itself**

`components.json`: `"registries": {}` becomes

```json
"registries": {
  "@playground": "http://localhost:3010/r/{name}.json"
}
```

- [ ] **Step 3: Serve script** (`scripts/serve-registry.mjs`)

```js
// Serve the built registry (registry-dist/r) to `shadcn add` from the
// repo, so installs resolve @playground/<name> without the public host.
import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "registry-dist")
const PORT = Number(process.env.PORT ?? 3010)

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost")
  const match = pathname.match(/^\/r\/([a-z0-9-]+)\.json$/)
  try {
    if (!match) throw new Error("not a registry item")
    const body = await readFile(join(ROOT, "r", `${match[1]}.json`))
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(body)
  } catch {
    res.writeHead(404, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "Not Found", message: pathname }))
  }
  console.log(res.statusCode, pathname)
})
  .on("error", (err) => {
    console.error(err.message)
    process.exit(1)
  })
  .listen(PORT, "127.0.0.1", () =>
    console.log(`registry on http://localhost:${PORT}/r`)
  )
```

`package.json` scripts gain `"registry:serve": "node scripts/serve-registry.mjs"`.

- [ ] **Step 4: README** - replace the two Vercel `shadcn add` lines with:
build (`npm run build:registry`), serve (`npm run registry:serve`), and in
the consumer `components.json` map `"@playground":
"http://localhost:3010/r/{name}.json"`, then
`npx shadcn add @playground/playground-tokens @playground/stepper`. Leave
the publishing section (`scripts/site.sh`) as it is.

- [ ] **Step 5: Build and check the output**

```bash
npm run build:registry
grep -l 'solana-playground-ds.vercel.app/r/' registry-dist/r/*.json | wc -l   # 0
grep -h -o '"@playground/[a-z0-9-]*"' registry-dist/r/*.json | sort -u | wc -l   # 27
```

- [ ] **Step 6: Commit**

```bash
git add design-system/registry.json design-system/components.json \
  design-system/scripts/serve-registry.mjs design-system/package.json \
  design-system/README.md
git commit -m "design-system: Resolve registry dependencies inside the repo"
```

### Task 3: Offline install proof

**Files:** none committed; consumer in the scratchpad.

- [ ] **Step 1: Scratch consumer** - a directory with `package.json`
  (`react`, `tailwindcss` names only), `tsconfig.json` with `@/*`,
  `src/index.css` (`@import "tailwindcss";`) and a `components.json` like the
  package's with `"@playground": "http://localhost:3010/r/{name}.json"`.

- [ ] **Step 2: Serve and dry-run with the outside world cut off**

```bash
PORT=3010 npm --prefix <wt>/design-system run registry:serve &
cd <consumer>
HTTPS_PROXY=http://127.0.0.1:9 HTTP_PROXY=http://127.0.0.1:9 \
  NO_PROXY=localhost,127.0.0.1 \
  npx --offline shadcn@4.21.0 add @playground/playground @playground/stepper --dry-run
```

Expected: dry run lists the 27 items' files and the server log shows only
`200 /r/<name>.json`; no request to any other host. If shadcn ignores the
proxy variables, the claim rests on the server log plus the 0-count grep,
and the PR says that. `playground` pulls `async-button`, whose stock deps
(`button`, `spinner`) go to `ui.shadcn.com` - run it once more on
`@playground/stepper` alone (no stock deps) to show a fully offline tree,
and report the `playground` result as it is.

- [ ] **Step 3: Kill the server** (by PID, not by port sweep).

### Task 4: PR

- [ ] Push the branch, open the PR against `master-2.0`: title "Add the
  design system as its own package", body: Linear link, what moved, the
  rewrite, the proof commands with their output, the stock-name note.
- [ ] Reviewers rogaldh, iamanikeev; assignee ocatave.
- [ ] Linear ticket for Stream C to In Review; mirror into the team sheet
  (`linear-sheet-sync`).

## Outcome (2026-10-01)

Shipped as PR #44 on branch
`slavakoreshkov/hoo-1852-move-the-design-system-into-the-repo-with-a-registry-that`
(renamed from the plan's branch to match Linear). Two changes beyond the
plan:

- `homepage` in `registry.json` now points at the package in the repo.
  shadcn requires it on the root registry, so it cannot simply be dropped.
- `scripts/snapshot.mjs` loaded Playwright from a path on the author's
  machine; it now resolves `client-v2/node_modules/playwright` relative to
  the repo, so `npm run build` runs from a clone.

Offline dry run: 25 of 29 items resolve with the outside network cut off.
`async-button`, `copy-button`, `help-tip` and `playground` need stock
`button` / `spinner` / `tooltip` from `ui.shadcn.com`; none reach the
Vercel host. A consumer needs `tailwind.baseColor: ""`, or shadcn fetches
`colors/<base>.json` from `ui.shadcn.com` on every add.

HOO-1852 items 3-4 (`client-v2/components.json`, the reinstall script,
moving `gradient-button`) are not in #44; they touch `client-v2/`.
