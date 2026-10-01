# UI Migration Stream B: Decisions and Agent Rules — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the UI migration spec's nine decisions in `docs/decisions.md`, narrow the root rules on upstream to `client/` and `server/`, and put the frontend rules on `master-2.0` as `client-v2/CLAUDE.md`.

**Architecture:** Two deliverables on two branches. The decisions and the root CLAUDE.md rewrite land on `context-archive` (the docs line, invisible from code branches). The rules every agent must see land on `master-2.0` through a small PR, self-contained because `decisions.md` does not exist there.

**Tech Stack:** Markdown, git worktrees, `gh`, prettier (CI's `check-format`), Linear.

**Spec:** `docs/superpowers/specs/2026-10-01-ui-migration-design.md` on `context-archive` (sections "Decisions" and "Rules for contributors and agents"). Streams table: `docs/superpowers/plans/2026-10-01-ui-migration-react-19.md`.

**Tickets:** HOO-1857 (decisions + root rules), HOO-1858 (`client-v2/CLAUDE.md`), both under HOO-1851.

## Global Constraints

- Everything committed is English. No AI attribution in commits, PRs or files.
- Only this stream writes `docs/decisions.md`.
- New entries are D51-D59, one per spec decision, in the newer heading style: `## D51 - <title>`, then `**Date:** 2026-10-01 - **Status:** ...`.
- Old entries are not rewritten ("add a new entry rather than editing the old one"); D8 and D9 get one pointer line each, nothing else.
- `client-v2/CLAUDE.md` cites no D-number and no `context-archive` path as if it resolved: on `master-2.0` neither exists (the root `CLAUDE.md` there says so).
- `client-v2/CLAUDE.md` is short: one screen per section, the change rule verbatim from the spec.
- `client/` is untouched. No code changes in this stream.
- PR: Linear link first; reviewers `rogaldh`, `iamanikeev`; assignee `ocatave`; base `master-2.0`.

## Review Focus

1. **An agent on `master-2.0` reading only `client-v2/` files** must answer "where does a new tutorial launcher go, and may it import the deploy feature" (HOO-1858's DOD) — pinned by Task 4 Step 4, a fresh subagent given only that folder's rule files.
2. **The existing `client-v2/AGENTS.md` rule** (no spreads in test fixtures) must still reach Claude Code once a `CLAUDE.md` sits beside it — Claude Code reads `CLAUDE.md`, not `AGENTS.md`, so the new file imports it (`@AGENTS.md`); checked in Task 4 Step 4.
3. **A reader of D8 or D9 alone** must learn that it is superseded or amended — pinned by Task 1 Step 3's grep.
4. **The root CLAUDE.md's other upstream rules** (the register rule in "Working agreement", the docs table row, "What this repository is") must not still tell an agent to minimise `client-v2` edits after the rewrite — pinned by Task 2 Step 3's grep.
5. **Prettier in CI** formats `*.md` under `client-v2/` — pinned by Task 4 Step 3.

---

### Task 0: Tickets and the sheet

- [ ] **Step 1:** `linear-sheet-sync` skill: check the team sheet for HOO-1857/HOO-1858 before taking them.
- [ ] **Step 2:** Move HOO-1857 and HOO-1858 to In Progress (assignee Slava already set). Sync the sheet.

### Task 1: D51-D59 in `docs/decisions.md` (context-archive)

**Files:** Modify `docs/decisions.md` (append after D50; one line in D8, one in D9).

Each entry: what was chosen, what was rejected and why, what would make us revisit, and the spec as source.

| Entry | Spec decision | Must say | Rejected | Revisit when |
| --- | --- | --- | --- | --- |
| D51 | 1 Stack | Tailwind 4, cva, shadcn on Radix, React 19, vitest. **Supersedes D8**; D8's own trigger (leaving React 17) is this plan's step. **How it sits with D29:** Next stays the long-term shape; CRA stays now because nothing here needs Next, Tailwind runs through craco's PostCSS, and a framework move on top of a React and styling move would block every stream | Keeping D8's native theme registry (the designer shipped a shadcn/Tailwind system and the customer approved it); Tailwind without shadcn (re-implements the 60 stock parts); moving to Next or Vite first | CRA blocks a step (PostCSS order, cssnano on Tailwind 4 output, react-refresh 0.11) — that is when the D29 move gets its own decision; the React 19 gate fails |
| D52 | 2 Upstream | `client-v2` not synced with the upstream frontend; wanted upstream work arrives as a feature with a ticket; `client/` byte-identical; root CLAUDE.md sections rewritten; divergence register frozen for `client-v2` (kept as history) | Keeping `client-v2` syncable (React 19 + new stack + layers make every sync a rewrite, and the register's upkeep buys nothing); dropping `client/` (it is the upstream mirror `master` guards) | The Foundation asks for the redesign upstream; upstream ships something large we want (open question 3: Sergey's LSP work) |
| D53 | 3 Themes | Dark (product default) and light; Playground, Dracula, old Solana and the rest removed; setting stays with two values; a removed choice falls back to dark and says so once. **Amends D9** (its "stay switchable" line) | Keeping every theme (each needs mapping onto the new tokens, and the design system defines two); dark only (the design system ships light, and some users need it) | The designer adds a theme to the design system |
| D54 | 4 Browsers | Safari 16.4, Chrome 111, Firefox 128, Edge 111; `browserslist.production` matches (HOO-1860) | Keeping Safari 14 on Tailwind 3 (forks the design system); polyfilling `@property`/`color-mix()` | Real traffic below the floor shows up |
| D55 | 5 Layers | `app → widgets → features → entities → shared`; no `pages` (widgets play it on a one-screen IDE); feature never imports feature, they meet in a widget; no `@x`; legacy roots outside the layers, importable, ignored by the boundary check (HOO-1859) | Moving all code into layers now; a `pages` layer; `@x` cross-imports | A second screen with its own route tree (add `pages`); two entities needing each other twice (`@x`) |
| D56 | 6 Component pairs | `Base<Name>` from design-system parts, all props; `<Name>` wires data; design-system components keep shadcn names, never prefixed; install, do not rewrite, when the design system has it | One component that fetches its own data (the catalogue and the designer's Studio cannot render it); suffix naming (`*View`/`*Container`) | — the pair costs more than it saves on a class of components (say which) |
| D57 | 7 Design system package | `design-system/` from PR #32 onto `master-2.0` as its own package; catalogue replaces Storybook; registry built from the repo, no outside hosts | Copying components into `client-v2/src` by hand (two sources); Storybook in `client-v2`; installing from `solana-playground-ds.vercel.app` (an outside host in the build path) | The design system is published as a versioned package |
| D58 | 8 Layout waits | Sidebar and resizable panels come from the design system (`react-resizable-panels` v4 needs React 18/19); built once on the new stack, today's panels inside | Building the layout on React 17 with `re-resizable` and rebuilding it later | The upgrade slips past early November (open question 1, the cut line) |
| D59 | 9 Feature folders | References **D46**: D46 says `Component/`, FSD says `ui/`; new slices use `ui/`, `auth` and `persistence` stay; the rename waits on Sergey | Renaming now (D46 came from his review); new slices on `Component/` (more to rename later) | Sergey answers |

- [ ] **Step 1:** Append D51-D59 after D50, separated by `---`, in the newer style (` - ` in headings, `**Date:** 2026-10-01 - **Status:** decided (Slava), from the UI migration spec`).
- [ ] **Step 2:** In D8, under its Status line: `**Superseded by D51** (2026-10-01).` In D9, under its Status line: `**Amended by D53** (2026-10-01): two themes, not five.`
- [ ] **Step 3: Verify**

Run: `grep -c '^## D5[1-9] ' docs/decisions.md; grep -n 'Superseded by D51\|Amended by D53' docs/decisions.md; grep -n 'D29\|D46' docs/decisions.md | awk -F: '$1>2900'`
Expected: `9`; two pointer lines inside D8 and D9; D51 cites D29, D59 cites D46.

- [ ] **Step 4: Commit** `git add docs/decisions.md && git commit -m "Record the UI migration decisions, D51-D59"`

### Task 2: Root CLAUDE.md and the register (context-archive)

**Files:** Modify `CLAUDE.md` ("Hard constraints", "Merge safety", "Working agreement" register bullet, docs table row); `docs/upstream-divergences.md` (freeze note at the top).

- [ ] **Step 1:** Hard constraints: replace the "Touch pre-existing upstream files inside `client-v2/`" bullet with one that applies to `client/` and `server/` (`client/` byte-identical; `server/` not modified) and says `client-v2/` is ours and follows `client-v2/CLAUDE.md` (D52).
- [ ] **Step 2:** "Merge safety": scope it to `client/` and `server/`: upstream syncs land there as fast-forwards; the cold/hot file lists move under a note that they describe upstream's churn, useful when porting an upstream change into `client-v2` as a feature (D52), not a reason to avoid editing `client-v2`. Register bullet in "Working agreement" and the docs-table row: register frozen for `client-v2` on 2026-10-01, kept as history.
- [ ] **Step 3: Verify**

Run: `grep -n 'as little as\|Merge safety\|divergences' CLAUDE.md`
Expected: no instruction left that asks to minimise `client-v2` edits or to add register rows.

- [ ] **Step 4:** Freeze note at the top of `docs/upstream-divergences.md`.
- [ ] **Step 5: Commit** `git commit -am "Narrow the upstream rules to client/ and server/"`, then `git push origin context-archive`.

### Task 3: Russian decoder

- [ ] **Step 1:** Republish the Russian decision decoder (Slava's iPad reference) with D51-D59. Find it with `Artifact list`; read, add the nine rows, republish to the same URL.

### Task 4: `client-v2/CLAUDE.md` on master-2.0 (HOO-1858)

**Files:** Create `client-v2/CLAUDE.md` in worktree `.claude/worktrees/hoo-1858` on branch `slavakoreshkov/hoo-1858-write-the-frontend-rules-every-agent-reads-client-v2claudemd` off `origin/master-2.0`.

Content, in order (spec "What client-v2/CLAUDE.md says"):

1. `@AGENTS.md` import line, so the existing test rule reaches Claude Code.
2. Layers: `app → widgets → features → entities → shared`, import only downward; feature never imports feature; no `pages`; no `@x`; legacy roots listed (`components/`, `views/`, `utils/`, `hooks/`, `providers/`, `commands/`, `effects/`, and the rest) outside the layers, importable from new code, never extended with new UI; today's `app/` holds upstream's panel tree. Feature folders: `ui/` for new slices; `auth` and `persistence` keep `Component/` until decided.
3. Component pair: `Base<Name>` / `<Name>`; install from the design system when it has the component; shadcn names unprefixed.
4. `shared/ui` installed, never edited; change it in `design-system/` and reinstall with the reinstall script (arrives with the design-system package); `gradient-button` is the one hand-written leftover and moves out. Product-named presentational components live in `shared/ui` as a stated exception.
5. Ids, `aria-label`s, test ids, `data-slot` names survive every move; `utils/explorer/explorer.ts` drives the explorer's DOM directly, so keep its element structure.
6. The change rule, verbatim, plus "never moved along the way" and "say so and propose a ticket".
7. Until the React 19 upgrade: Tailwind and tokens only, no design-system components.

- [ ] **Step 1:** `git worktree add -b <branch> .claude/worktrees/hoo-1858 origin/master-2.0`.
- [ ] **Step 2:** Write the file.
- [ ] **Step 3: Verify format** — `npx prettier@$(node -p "require('./client-v2/package.json').devDependencies.prettier") --check client-v2/CLAUDE.md` (or the repo's installed prettier). Expected: clean.
- [ ] **Step 4: Verify with a fresh agent** — a subagent told to read only `client-v2/CLAUDE.md` and `client-v2/AGENTS.md` answers: where a new tutorial launcher goes and whether it may import the deploy feature (expected: a feature slice under `features/`, `ui/` folder; no — features meet in a widget); where a new `Button` comes from (installed into `shared/ui`); whether it may edit `shared/ui/button.tsx` (no); the spread rule for test fixtures (yes, it sees it).
- [ ] **Step 5: Commit** `git add client-v2/CLAUDE.md && git commit -m "Add the frontend rules every agent reads"`.
- [ ] **Step 6: PR** — push, `gh pr create --base master-2.0`, body: Linear link first, what the file is, why (the root rules are off code branches), what is deliberately left out (`openspec/`, enforcement in HOO-1859). Reviewers `rogaldh`, `iamanikeev`; assignee `ocatave`.
- [ ] **Step 7:** HOO-1857 to Done (docs pushed); HOO-1858 to In Review with the PR linked; sync the sheet.

## Out of scope

`openspec/` (in HOO-1858's scope but not in this stream's brief — stays open on the ticket), the layer check (HOO-1859), any code.
