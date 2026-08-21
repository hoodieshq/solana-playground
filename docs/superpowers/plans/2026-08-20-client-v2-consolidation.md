# Client v2 Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold PRs #2, #3 and #4 into one branch `feat/client-v2`, move the fork's frontend into `client-v2/`, restore `client/` to upstream, and open a single PR against `master`.

**Architecture:** Pure git surgery plus path updates. No application code changes except one conflict resolution in `Connect.tsx`. The history of all three branches is preserved by cherry-picking in order; one final mechanical commit performs the `client` -> `client-v2` move and restores upstream's `client/`.

**Tech Stack:** git, gh CLI, yarn 1.22 / node 22, craco (CRA 5).

**Spec:** `docs/superpowers/specs/2026-08-20-client-v2-consolidation-design.md`

## Global Constraints

- `client/` must end byte-identical to `origin/master`: `git diff origin/master -- client` prints nothing.
- `.github/workflows/*` and `compose.yaml` are not modified.
- No changes to `server/` or to `wasm/` sources (only the echo line of `wasm/stub-packages.sh`).
- Commit messages: present tense, no prefix for client work, location prefix otherwise (`CONTRIBUTING.md`).
- No co-author trailers and no AI attribution in commits or the PR.
- PRs #2, #3, #4 are closed only after the author has reviewed PR #5 (Task 6 is gated on the user).

## Reference facts (verified 2026-08-20)

| Ref | SHA | Note |
| --- | --- | --- |
| `origin/master` | `40050103` | = `master-2.0` |
| `origin/feat/client-2-ai-assistant` (#2 tip) | `3e2c4e40` | 8 commits over master |
| `origin/feat/client-2-redesign` (#3 tip) | `3326b7b9` | 19 commits over #2 |
| local `feat/client-2-redesign` | `fc09f056` | #3 tip + the spec commit (ahead 1, unpushed) |
| `origin/feat/client-2-ai-assistant-ui-polish` (#4 tip) | `2ebcff7d` | 5 commits over #2 |

Dry-run `git merge-tree fc09f056 2ebcff7d`: only
`client/src/views/sidebar/assistant/Component/Connect.tsx` conflicts;
`ChatItem.tsx` auto-merges. The redesign's side of `Connect.tsx` is two
lines: `import GradientButton from "./GradientButton";` and
`const ConnectButton = styled(GradientButton)`.

---

### Task 1: Create `feat/client-v2` with the combined history

**Files:**
- Modify (conflict only): `client/src/views/sidebar/assistant/Component/Connect.tsx`

**Interfaces:**
- Produces: branch `feat/client-v2` whose tree equals #3 + spec + #4 merged, all under `client/`.

- [ ] **Step 1: Start from the local redesign tip (already contains #2 and #3 linearly)**

```bash
cd /Users/viacheslav_koreshkov/git/hoodies/solana-playground
git status --short            # expect only: ?? docs/internal/  ?? docs/research/
git checkout -b feat/client-v2 fc09f056
git log --oneline origin/master..HEAD | wc -l    # expect 28 (8 + 19 + 1 spec)
```

Rationale: `fc09f056` is already a linear history `master -> #2 -> #3 -> spec`, so no rebase is needed for the first two bodies of work.

- [ ] **Step 2: Cherry-pick PR #4's five commits in order**

```bash
git cherry-pick 01da57e7 707e1941 a2edb29f a18dc493 2ebcff7d
```

Expected: stops at the first commit that touches `Connect.tsx` (`01da57e7`) with `CONFLICT (content): Merge conflict in client/src/views/sidebar/assistant/Component/Connect.tsx`.

- [ ] **Step 3: Resolve `Connect.tsx` by taking #4's version and re-applying the two redesign lines**

```bash
git checkout --theirs client/src/views/sidebar/assistant/Component/Connect.tsx
```

Then edit the file:

1. After `import Button from "../../../../components/Button";` add
   `import GradientButton from "./GradientButton";`
2. Change `const ConnectButton = styled(Button)\`` to
   `const ConnectButton = styled(GradientButton)\``.
3. If `Button` is no longer referenced anywhere else in the file
   (`grep -c "Button" Connect.tsx` after removing the two lines), delete
   the `Button` import to avoid an unused-import lint error.

```bash
grep -n "GradientButton\|styled(Button)\|import Button" \
  client/src/views/sidebar/assistant/Component/Connect.tsx
git add client/src/views/sidebar/assistant/Component/Connect.tsx
git cherry-pick --continue
```

Expected: the remaining four commits apply cleanly (if a later one conflicts on the same file, repeat this step: theirs + the two lines).

- [ ] **Step 4: Verify the combined tree**

```bash
git log --oneline origin/master..HEAD | wc -l     # expect 33
# Everything #4 changed is present:
git diff --quiet 2ebcff7d HEAD -- \
  client/src/views/sidebar/assistant/model \
  client/src/views/sidebar/assistant/store.ts \
  client/src/views/sidebar/assistant/bridge && echo "#4 model/store/bridge identical"
# Everything #3 changed outside the two shared files is present:
git diff --quiet fc09f056 HEAD -- client/src/theme && echo "#3 theme identical"
```

Expected: both echo lines print.

- [ ] **Step 5: Type-check the merged client (no install needed if node_modules exists)**

```bash
cd client && npx tsc --noEmit && cd ..
```

Expected: exit 0. If `node_modules` is missing, run `yarn install` first (stubs are already in `wasm/*/pkg` from earlier sessions; if not, `./wasm/stub-packages.sh`).

No commit in this step: cherry-picks already created the commits.

---

### Task 2: Commit the untracked research docs

**Files:**
- Create: `docs/internal/README.md`, `docs/internal/brief/*`
- Create: `docs/research/2026-08-20-model-and-agent-strategy.md`, `docs/research/2026-08-20-model-landscape.md`

- [ ] **Step 1: Inspect for secrets before committing**

```bash
grep -rniE "sk-[a-z0-9]{10,}|api[_-]?key\s*[:=]\s*['\"][A-Za-z0-9]" docs/internal docs/research || echo "no keys"
```

Expected: `no keys`. If anything matches, stop and report it instead of committing.

- [ ] **Step 2: Commit**

```bash
git add docs/internal docs/research
git commit -m "docs: Add model and agent strategy research and internal brief"
git status --short    # expect empty
```

---

### Task 3: Move the fork's client into `client-v2/` and restore upstream `client/`

**Files:**
- Move: `client/` -> `client-v2/` (entire tree)
- Restore: `client/` from `origin/master`
- Modify: `.gitmodules`, `CLAUDE.md`, `docs/codebase-map.yaml`, `docs/codebase-map.html`, `docs/decisions.md`, `docs/superpowers/plans/2026-08-19-solana-redesign.md`, `docs/superpowers/plans/2026-08-20-flow-implementation.md`, `wasm/stub-packages.sh`

**Interfaces:**
- Produces: `client-v2/` buildable standalone; `client/` == upstream.

- [ ] **Step 1: Move the tree**

```bash
git mv client client-v2
git status --short | head -3     # renames R client/... -> client-v2/...
```

Note: `client/public` is a submodule; `git mv` moves the gitlink and updates `.gitmodules` path automatically in modern git. Verify in Step 3.

- [ ] **Step 2: Restore upstream's `client/`**

```bash
git checkout origin/master -- client
git diff --quiet origin/master -- client && echo "client == upstream"
```

Expected: `client == upstream`.

- [ ] **Step 3: Fix the submodule entries so both `client/public` and `client-v2/public` exist**

```bash
cat .gitmodules
```

Expected final content (write it exactly if git produced something else):

```ini
[submodule "client/public"]
	path = client/public
	url = https://github.com/solana-playground/assets.git
	branch = master
[submodule "client-v2/public"]
	path = client-v2/public
	url = https://github.com/solana-playground/assets.git
	branch = master
```

Then make sure both gitlinks are in the index at the same commit:

```bash
git ls-files -s client/public client-v2/public
# expect two lines, mode 160000, both df14c26efb4cd47386afa0429c2b43384133954e
```

If `client/public` gitlink is missing (checkout of a path from a commit can skip gitlinks), add it:

```bash
git update-index --add --cacheinfo 160000,df14c26efb4cd47386afa0429c2b43384133954e,client/public
```

Then `git add .gitmodules`.

- [ ] **Step 4: Make the working copies of both submodules real**

```bash
git submodule sync
git submodule update --init client/public client-v2/public
ls client-v2/public/icons | head -2 && ls client/public/icons | head -2
```

Expected: both list icon files.

- [ ] **Step 5: Update paths in docs and the stub script**

Rule: replace `client/` with `client-v2/` and `cd client` with `cd client-v2` **only in the fork's docs**, never in files that describe upstream CI or compose. Files:

```bash
sed -i '' -e 's#cd client &&#cd client-v2 \&\&#g' \
          -e 's#`client/#`client-v2/#g' \
          -e 's#client/src#client-v2/src#g' \
          -e 's#client/public#client-v2/public#g' \
          -e 's#client/package.json#client-v2/package.json#g' \
  CLAUDE.md docs/codebase-map.yaml docs/codebase-map.html docs/decisions.md \
  docs/superpowers/plans/2026-08-19-solana-redesign.md \
  docs/superpowers/plans/2026-08-20-flow-implementation.md
sed -i '' 's#cd client && yarn install#cd client-v2 \&\& yarn install#' wasm/stub-packages.sh
grep -rn "client/" CLAUDE.md docs/codebase-map.yaml docs/decisions.md wasm/stub-packages.sh | grep -v "client-v2/" 
```

Review the grep output by hand: any remaining `client/` must be an intentional reference to upstream's folder (e.g. in `CLAUDE.md` the sentence explaining that `client/` stays upstream). Also update `CLAUDE.md`'s repository tree block to:

```
client/      upstream frontend, untouched (React 17, CRA 5 + craco)
client-v2/   the fork's frontend: upstream + assistant panel + redesign
server/      build service — Rust/axum; compiles programs, serves the ELF, stores shares
wasm/        8 packages compiled to WASM
vscode/      VS Code extension
compose.yaml one file, profiles: dev | prod | client-standalone (runs client/)
```

and add one sentence under "Hard constraints": "**`client/` is upstream and stays byte-identical to it.** All frontend work happens in `client-v2/`."

- [ ] **Step 6: Check the stub script's path assumptions still hold**

```bash
grep -n "client" wasm/stub-packages.sh
```

Expected: only the final echo line references the client; the script writes under `wasm/*/pkg`, which `client-v2/package.json` reaches via `file:../wasm/...` unchanged. Confirm:

```bash
grep -n '"file:' client-v2/package.json | head -3   # ../wasm/... paths
```

- [ ] **Step 7: Commit the move**

```bash
git add -A
git diff --cached --quiet origin/master -- client && echo "client == upstream (staged)"
git commit -m "Move the fork's client into client-v2 and restore upstream client"
git show --stat HEAD | tail -3
```

---

### Task 4: Build and run `client-v2` end to end

**Files:** none modified (fix-ups only if the build fails; commit them separately).

- [ ] **Step 1: Install and generate**

```bash
cd /Users/viacheslav_koreshkov/git/hoodies/solana-playground/client-v2
nvm use 22 >/dev/null
ls ../wasm/solana-cli/pkg >/dev/null 2>&1 || ../wasm/stub-packages.sh
yarn install --frozen-lockfile
yarn generate-exports && yarn sync-assistant-context
yarn generate-packages && yarn generate-tutorials
```

Expected: all exit 0. `sync-assistant-context` resolves `docs/` via `REPO_ROOT_PATH` from `scripts/utils.mjs`; verify it still finds the repo root:

```bash
grep -n "REPO_ROOT_PATH\s*=" scripts/utils.mjs
test -f src/views/sidebar/assistant/content/assistant-context.md && echo "context synced"
```

If `REPO_ROOT_PATH` is derived as `..` of the client dir it still works (same depth). If it hardcodes `client`, change it to use `CLIENT_PATH`'s parent and commit `Fix repo root resolution for client-v2`.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Boot the dev server and take the two screenshots**

```bash
BROWSER=none PORT=3000 npx craco start > /tmp/client-v2-dev.log 2>&1 &
sleep 60; grep -m1 -E "Compiled|Failed" /tmp/client-v2-dev.log
```

Expected: `Compiled successfully` (one known warning about `src/tutorials/__template` is fine). Then in the browser (Claude in Chrome or manually):

1. Open `http://localhost:3000` - redesigned home renders in the Solana theme.
2. Open the assistant (`Ctrl+Shift+A`), Connect screen shows the provider picker including OpenAI-compatible and Gemini presets.

Save screenshots as `docs/design/screenshots/10-client-v2-home.jpg` and `docs/design/screenshots/11-client-v2-assistant.jpg`, then:

```bash
cd .. && git add docs/design/screenshots/10-client-v2-home.jpg docs/design/screenshots/11-client-v2-assistant.jpg
git commit -m "docs: Add client-v2 verification screenshots"
```

- [ ] **Step 4: Confirm `client/` is untouched and stop the server**

```bash
git diff --quiet origin/master -- client && echo "client == upstream"
kill %1 2>/dev/null
```

---

### Task 5: Push and open PR #5

**Files:**
- Create: `docs/superpowers/pr/2026-08-20-client-v2-pr-body.md` (the PR body, kept in the repo so it is not chat-only)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/client-v2
```

- [ ] **Step 2: Write the PR body**

Create `docs/superpowers/pr/2026-08-20-client-v2-pr-body.md` with these sections, in this order. Image URLs use `raw.githubusercontent.com/hoodieshq/solana-playground/feat/client-v2/...`.

```markdown
# Playground v2: AI assistant, Solana-brand redesign, and a `client-v2/` home for the fork

One PR replacing #2, #3 and #4. `client/` is back to byte-identical upstream; everything the fork adds lives in `client-v2/`.

<img src=".../docs/design/screenshots/10-client-v2-home.jpg" width="900" alt="Redesigned home">

## Why a `client-v2/` folder
- Upstream ships 200+ commits per half-year; keeping `client/` untouched makes syncing a fast-forward.
- `client-v2/` is a complete, standalone copy: `cd client-v2 && npx craco start`. No overlay, no aliases.
- CI and compose still exercise upstream's `client/`; wiring v2 into them is a follow-up.

## What is in it
1. **AI assistant panel** (was #2) - sidebar page, bridge onto the playground, tool loop with an approval gate inside each state-changing tool; Demo backend needs no key. Spec: `docs/superpowers/specs/2026-08-19-assistant-panel-design.md`.
2. **Solana-brand redesign** (was #3) - new default theme, floating panels on an 8px grid, rail and explorer restyle, three design iterations documented in `docs/design/`. Spec: `docs/superpowers/specs/2026-08-19-solana-redesign-design.md`.
3. **Assistant polish and bring-any-endpoint provider** (was #4) - focus/ARIA/progress polish, OpenAI-compatible provider with OpenRouter and Gemini presets, explorer link after deploy.
4. **Docs as shared context** - `CLAUDE.md`, `docs/product-brief.md`, `docs/decisions.md` (D1-D7), `docs/codebase-map.yaml`, research under `docs/research/` and `docs/internal/`.

<img src=".../docs/design/screenshots/11-client-v2-assistant.jpg" width="900" alt="Assistant panel">

## Try it in five minutes
```sh
nvm install 22 && nvm use 22
npm i -g yarn@1.22.22
git submodule update --init client-v2/public
./wasm/stub-packages.sh           # stands in for the 6 unbuilt WASM packages
cd client-v2 && yarn install
yarn generate-exports && yarn sync-assistant-context   # both REQUIRED
yarn generate-packages && yarn generate-tutorials
BROWSER=none npx craco start      # http://localhost:3000
```
Then: settings gear -> **Build server URL** -> `SolPg`. Open the assistant (`Ctrl+Shift+A`), pick **Demo**, break something in `lib.rs`, run `build`, ask *"Why did my build fail?"*.

## What is real and what is mocked
- Real: builds against `api.solpg.io`, compiler stderr capture, tool calls, diffs, Apply writing into the editor, deploy to devnet, explorer link.
- Scripted: the Demo backend's reasoning. Live backends (Anthropic, OpenAI-compatible) need a user-supplied key at runtime; nothing is stored.

## Not in this PR
- Flow (iteration 3) - concept and plan only: `docs/superpowers/specs/2026-08-20-flow-concept-design.md`, `docs/superpowers/plans/2026-08-20-flow-implementation.md`.
- CI / compose for `client-v2`.

## Friction log
(copy the bullets from `docs/friction-log.md` if present, else the "Environment facts" list from CLAUDE.md that blocked the assistant: crate whitelist, Anchor 0.29 pin, no Rust-side tests.)

## Review guide
- Start with `client-v2/src/views/sidebar/assistant/` (new) and `client-v2/src/theme/` (redesign).
- Footprint on pre-existing client files is listed in `docs/decisions.md` D2/D4.
```

Check `docs/friction-log.md` exists before referencing it: `ls docs/friction-log.md`.

- [ ] **Step 3: Commit the body and open the PR**

```bash
git add docs/superpowers/pr/2026-08-20-client-v2-pr-body.md
git commit -m "docs: Add the client-v2 PR description"
git push
gh pr create --base master --head feat/client-v2 \
  --title "Playground v2: AI assistant, Solana-brand redesign, and a client-v2 home for the fork" \
  --body-file docs/superpowers/pr/2026-08-20-client-v2-pr-body.md
gh pr view --web
```

- [ ] **Step 4: Verify the PR renders**

```bash
gh pr view --json number,url,additions,deletions,changedFiles
```

Expected: images render (open the URL), `changedFiles` includes `client-v2/**` and no `client/**` entries:

```bash
gh pr diff --name-only | grep -c "^client/" ; # expect 0
```

Report the PR URL to the user and **stop**. Task 6 requires their review.

---

### Task 6: Close #2, #3 and #4 (gated on user approval of #5)

- [ ] **Step 1: Wait for the user to confirm #5 looks right**

Do not proceed without an explicit "close them".

- [ ] **Step 2: Close with a pointer**

```bash
N=$(gh pr view feat/client-v2 --json number -q .number)
for pr in 2 3 4; do
  gh pr close $pr --comment "Superseded by #$N, which combines #2, #3 and #4 and moves the fork's frontend into client-v2/."
done
gh pr list --state open
```

Expected: only #1 (dependabot) and #$N open.

- [ ] **Step 3: Record the decision**

Append to `docs/decisions.md`:

```markdown
## D8 - The fork's frontend lives in `client-v2/`; `client/` stays upstream

**Chose:** a full copy of the client under `client-v2/`, built standalone.
**Rejected:** an overlay build layering our files over `client/` (fragile
custom webpack config), and a shared-workspace variant (couples the folders).
**Revisit when:** upstream syncs become frequent enough that hand-porting
hurts, or when CI for v2 is wired and a workspace would save install time.
```

```bash
git add docs/decisions.md
git commit -m "docs: Record D8, client-v2 as the fork's frontend"
git push
```
