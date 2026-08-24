# Flow Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shipped Flow UI look like the concept boards
(`docs/design/screenshots/concept/b-flow-write.png`,
`b-flow-build-fails.png`) — floating panels, pill stepper, humanized build
card, quiet left panel, console status line, assistant header — with no
behaviour change.

**Architecture:** Presentation-only edits inside `client-v2/src/views/flow/**`
plus one new `views/flow/tokens.ts` for the panel constants. Upstream DOM is
reached only via Flow-side containers with documented selectors. The gradient
uses the same literal as `GradientButton` (existing precedent).

**Tech Stack:** React 17, styled-components, Solana V2 theme tokens
(`theme.colors.default.{bgPrimary=#000 base, bgSecondary=surface, textPrimary,
textSecondary, border, primary}`, `theme.colors.state.{success,error}.color`,
raised surface via `theme.components.tooltip.bg`, `theme.font.code/other`).

**Spec:** `docs/superpowers/specs/2026-08-21-flow-visual-parity-design.md`

## Global Constraints

- Branch `feat/flow-ui-visual`; only `client-v2/src/views/flow/**` and
  `client-v2/src/views/sidebar/assistant/Component/Assistant.tsx` (header
  eyebrow only) may change. No upstream edits.
- Behaviour unchanged: no new state, tools, events; every existing handler
  keeps working. `cd client-v2 && yarn test-types` and `yarn test-unit`
  (30 tests) stay green after every task.
- Tokens only (see Tech Stack); gradient = logomark + stepper active dot +
  the one decisive CTA per view. `prefers-reduced-motion` on every transition.
- 80 cols, prettier, no `any`/`@ts-ignore`, `import type`, ASCII only.
- Commits: present tense, no prefix, no co-author trailers.
- Skills: invoke `frontend-design` before each task's JSX; `ui-ux-pro-max`
  before Task 1 (layout) and Task 3 (build card); `web-design-guidelines`
  in Task 5.
- Reference images: the implementer MUST view the two board PNGs before
  coding and match spacing/weights by eye.

## File structure

```
views/flow/tokens.ts          GAP (8px), PANEL_RADIUS (12px), GRADIENT literal
views/flow/Flow.tsx           canvas: black ground, floating panels
views/flow/header/*           logomark, pills, chips, gear
views/flow/left/LeftPanel.tsx FILES eyebrow, hidden upstream chrome, footer
views/flow/console/ConsoleDrawer.tsx  status line
views/flow/stages/Build.tsx   humanized card + meta + Rebuild
views/flow/stages/humanize.ts error-code -> title/explanation map (+ test)
```

---

### Task 1: Canvas, header chrome, stepper pills

**Files:** Create `views/flow/tokens.ts`; Modify `Flow.tsx`,
`header/Header.tsx`, `header/Stepper.tsx`, `header/StatusChips.tsx`,
`header/ProjectSwitcher.tsx`.

- [ ] View `b-flow-write.png` and `b-flow-build-fails.png`.
- [ ] `tokens.ts`: `export const GAP = "8px"; export const PANEL_RADIUS = "12px"; export const GRADIENT = "linear-gradient(135deg, #9945ff 10%, #14f195 90%)";` (same literal as GradientButton — note the precedent in a comment).
- [ ] `Flow.tsx`: page `background: theme.colors.default.bgPrimary`; `Columns` gets `gap: GAP; padding: 0 GAP GAP;`; `LeftPanel`, `Center`, `Right` become floating panels: `background: bgSecondary; border: 1px solid border; border-radius: PANEL_RADIUS; overflow: hidden` (Center wraps Stage + ConsoleDrawer inside one panel, the drawer's status line sits at the panel bottom like the board). Remove the old column `border-left/right`.
- [ ] Header: 56px, transparent on the black ground, no bottom border (the panels below carry the edges). Logomark: 20px square, 6px radius, `background: GRADIENT`, followed by the project name (bold) and a caret. Gear: circular 28px button with a 1px border. Wallet chip: `addr  balance` where the balance span is `state.success.color`; cluster chip: dot + name.
- [ ] Stepper pills: `padding: 6px 14px; border-radius: 999px`; active: raised bg (`theme.components.tooltip.bg`), bold label, dot `background: GRADIENT`; done: check glyph + label, regular weight; failed: `border: 1px solid state.error.color`, red dot, label + ` N error(s)` in `state.error.color`; upcoming: hollow dot + `textSecondary`. Connectors: 1px, 24px wide, `state.success.color` after a done stage else `border`.
- [ ] `yarn test-types`; live check against the board; commit: "Float the Flow panels and match the header and stepper to the boards".

### Task 2: Left panel and console status line

**Files:** Modify `left/LeftPanel.tsx`, `left/ProjectsTab.tsx` (eyebrow only), `console/ConsoleDrawer.tsx`.

- [ ] Files tab: an eyebrow "FILES" (small caps, `textSecondary`, letter-spacing 0.08em, 12px) above the tree; hide from the Flow container: the upstream workspace select row and the icon toolbar (`ExplorerButtons`) and the Program/Client section header buttons (Build/Deploy already hidden; now also Run/Test since the board shows a bare tree — keep "+" add-program). Inspect `views/sidebar/explorer/Component/{Explorer,Workspaces,Folders,ExplorerButtons}.tsx` for stable anchors (`#root-dir`, `PgView.ids`), document each selector's failure mode in the JSDoc.
- [ ] Footer: a full-width quiet button "+ New file" that triggers the upstream create-item flow — find how `ExplorerButtons`' `NewItemButton` does it (likely `PgView.setModal(CreateItem, ...)` or `PgExplorer`'s new-item state) and call the same; if it needs the hidden button, programmatically `click()` it (documented) — never edit upstream.
- [ ] Console: the collapsed handle becomes a status line: chevron + "CONSOLE" (small caps, code font) + last result text (`last build · 3.4s · ok` / `build failed · E0308` / `deploy failed`) from `PgFlow.state` (+ the first diagnostic code via `parseBuildReport` when failed) + `⌘J` right-aligned; the open state keeps the terminal. Keep aria attributes.
- [ ] Projects tab: eyebrow "PROJECTS" for symmetry.
- [ ] Types, unit tests, live check; commit: "Quiet the Flow left panel and turn the console handle into a status line".

### Task 3: Humanized Build card

**Files:** Create `stages/humanize.ts` + `humanize.test.ts`; Modify `stages/Build.tsx`.

- [ ] `humanize.ts`: `export const humanize = (code: string | null, rustcTitle: string): { title: string; explanation: string }` with a map for E0308 ("A text value is assigned to a number" when the rustc label mentions `&str`/`u64`-like types — otherwise "A value has the wrong type"), E0425 ("A name is used that is not defined"), E0433 ("A path or crate cannot be found"), E0599 ("A method does not exist on this type"), E0382 ("A value is used after it was moved"), E0277 ("A trait the code needs is not implemented"), fallback `{ title: rustcTitle, explanation: "" }`. Explanations are one plain sentence each. Test: the six codes + fallback.
- [ ] `Build.tsx` failed state per the board: headline "Build failed" + meta `N error(s) · 2.9s · api.solpg.io` (host from `PgSettings.build.serverUrl` or equivalent — grep `settings/build`) + right-aligned "Rebuild" button (`PgCommand.build.execute()`); card: `E0308` badge + human title; explanation line (`textSecondary`) composed from humanize + the rustc label; excerpt rendered from the real file via `PgExplorer.getFileContent(path)`-equivalent (find the read API in `utils/explorer`) as numbered lines line-1..line+1 in code font, failing line tinted with `state.error.color` at low alpha (use `color-mix` or an rgba of the token is NOT allowed — use a 1px left border + `background: tooltip.bg` instead) and the rustc label appended inline after an arrow `<-`; actions row: gradient "Fix with assistant" (first card only), "Open in editor", right-aligned "Show compiler output >" toggle; below the cards: "Warnings (N) >" when rustc output contains `warning:` lines (count them; toggle shows the raw block).
- [ ] Keep the fallback card for unparseable failures; keep all existing handlers.
- [ ] Types, tests, live check with the E0308 fixture; commit: "Humanize the Build report card".

### Task 4: Assistant header eyebrow and card-language alignment

**Files:** Modify `views/sidebar/assistant/Component/Assistant.tsx` (header only), `stages/Deploy.tsx`, `stages/Interact.tsx`, `stages/Build.tsx` (ok state).

- [ ] Assistant panel header: eyebrow "ASSISTANT" left, right side small chips with the current context (`lib.rs · build error` / `devnet`) derived from the existing context-strip data (reuse whatever `Chat.tsx`'s CONTEXT row computes — import the same source, do not duplicate logic); keep the existing tabs below, visually demoted (smaller, `textSecondary`).
- [ ] Deploy/Interact/Build-ok surfaces: same card language as the failed card (raised bg, 12px radius, eyebrow labels), headline + meta row pattern.
- [ ] Types, unit tests; commit: "Align the assistant header and stage cards with the board language".

### Task 5: Audit, screenshots, PR

- [ ] `web-design-guidelines` pass over `views/flow/**`; fix Importants.
- [ ] Screenshots into `docs/design/screenshots/flow-visual/`: `01-write.png`, `02-build-failed.png` (E0308 fixture), plus the two boards copied beside them as `board-write.png`, `board-build-fails.png`; README with one line each.
- [ ] D18 in `docs/decisions.md`: "Flow visual parity — boards become the source of truth for Flow chrome; what was matched, what was left (editor tab strip, assistant internals)".
- [ ] `yarn test-types`, `yarn test-unit`, demo path once; push; `gh pr create --base feat/flow-ui --head feat/flow-ui-visual` with description + side-by-side images (raw URLs on the branch).
