# Solana-Brand Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy visual language with a modern Solana-brand design, implemented in the client as the fork's default theme plus targeted component restyling.

**Architecture:** A new theme (`solana-v2`) carries the token layer through the app's native theme registry (colors, both font tracks, radii, shadows, per-component overrides). Component-level work is layered on top in impact order: icon rail, chrome (topbar/tabs/status bar), assistant panel, Home, right panel. No new styling system (D8: Tailwind/shadcn deferred — Radix needs React 18, this client is React 17).

**Tech Stack:** styled-components v5, the `PgTheme` registry (`client-v2/src/themes/`), Google Fonts via CSS `@import`, Playwright screenshot loop for verification.

**Spec:** `docs/superpowers/specs/2026-08-19-solana-redesign-design.md`

## Global Constraints

- React 17 / CRA 5 + craco — no new styling dependency, no Radix, no Tailwind.
- `client-v2/public/` is the assets submodule — **never** add or edit files there. Fonts load via `@import` in `client-v2/src/index.css`.
- No AI attribution in any commit; Slava is sole author. Client commits take **no** prefix (CONTRIBUTING.md).
- Hot-file edits are allowed but surgical, and every hot-file commit says so in its body. Hot: `Right.tsx` (17/yr). Warm: `Left.tsx` (5/yr). Cold: page defs, Topbar, Tabs, Bottom, Main.
- Gate for every task: `./node_modules/.bin/tsc --noEmit` clean → dev server compiles → screenshot of affected surface actually looked at. Never leave HEAD broken; a failed task is reverted, logged in the friction log, and skipped.
- Commit and push per task. Dev server: restart via `lsof -ti :3000 | xargs -r kill -9` then `BROWSER=none npx craco start` (background, Node 22 via nvm). Clear `node_modules/.cache` only if craco config changes.
- Out of scope: responsive/tablet, light theme, wallet-flow redesign beyond theming, tutorials content, vscode.

---

### Task 1: Brand research

**Files:**
- Create: `docs/design/brand-research.md`

**Interfaces:**
- Produces: the confirmed token sheet (colors, font choice, radii, gradient policy) that Task 2 encodes. Format: a `## Chosen tokens` section with a name→value table.

- [ ] **Step 1: Fetch the official brand page**

WebFetch `https://solana.com/branding` (fall back to WebSearch "solana brand guidelines" if moved). Record: official hexes, logo rules, any downloadable guide, stated typefaces.

- [ ] **Step 2: Inspect what solana.com actually ships**

WebFetch `https://solana.com` and read the served CSS/font-family declarations (search the HTML for `font-family`, `--` custom properties, gradient definitions). Record real values, not brand-page claims.

- [ ] **Step 3: Pick the display font substitute**

Solana's faces are proprietary. Compare against Google Fonts grotesques — candidate order: Space Grotesk, Archivo, Instrument Sans. Pick by closeness to what Step 2 found. Record the choice and the rejected options with one line each.

- [ ] **Step 4: Write `docs/design/brand-research.md`**

Sections: `## What the brand is` (findings + sources), `## Chosen tokens` (table), `## Substitutions` (font + reasoning), `## Gradient policy` (where the purple→green gradient may appear: primary CTA, progress, active-page indicator — nowhere else). Starting candidates the research confirms or overrides:

| Token | Candidate |
| --- | --- |
| bgBase (chrome) | `#000000` |
| bgSurface (editor/panels) | `#0C0D12` |
| bgRaised (cards, inputs) | `#14161E` |
| border | `rgba(255,255,255,0.08)` |
| purple / green / cyan | `#9945FF` / `#14F195` / `#80ECFF` |
| textPrimary / textSecondary | `#E6E6EB` / `#9A9AA5` |
| error / warning | `#FF4D6A` / `#FFD666` (tuned to palette) |
| radius default / buttons | `12px` / `999px` (pill) |
| font.other | Space Grotesk (candidate) |
| font.code | JetBrains Mono (kept) |

- [ ] **Step 5: Commit**

```bash
git add docs/design/brand-research.md
git commit -m "Add Solana brand research for the redesign"
git push origin feat/client-2-ai-assistant
```

---

### Task 2: Theme `solana-v2`, made default, with the display font wired

**Files:**
- Create: `client-v2/src/themes/solana-v2/index.ts`, `client-v2/src/themes/solana-v2/solana-v2.ts`, `client-v2/src/themes/solana-v2/theme.ts`
- Modify: `client-v2/src/themes/playground/playground.ts` (drop `isDefault`), `client-v2/src/index.css` (font `@import`)

**Interfaces:**
- Consumes: token table from Task 1.
- Produces: theme name `"Solana V2"` (dir `solana-v2` per `createTheme`'s kebab-case convention), default theme for the app. All later tasks read tokens via `theme.colors.*`, `theme.font.other`, `theme.default.borderRadius`.

- [ ] **Step 1: Read the theme surface before writing**

Read `client-v2/src/themes/solana/theme.ts` (the old color-swap — the structural template) and skim the defaults section of `client-v2/src/utils/theme/theme.ts` (from `_theme_fonts` onward) to see every overridable key: `components.{button,editor,input,menu,skeleton,tabs,terminal,toast,tooltip,wallet,modal,markdown,topbar,progressbar}`, `views.{bottom,main,sidebar}`, `highlight`, `font.{code,other}`.

- [ ] **Step 2: Create the theme**

`solana-v2/solana-v2.ts`:
```ts
import { createTheme } from "../create";

export const solanaV2 = createTheme({
  name: "Solana V2",
  isDark: true,
  isDefault: true,
});
```
`solana-v2/index.ts`: `export * from "./solana-v2";`
`solana-v2/theme.ts`: default-export a `ThemeParam` carrying the Task 1 tokens. Structure mirrors `themes/solana/theme.ts` but goes further — set `font.other` to the chosen display font with a real fallback stack, `default.borderRadius: "12px"`, pill buttons via `components.button.overrides` per kind, layered `bgPrimary`/`bgSecondary`, terminal/editor/tooltip/menu/wallet surfaces on the three-level background scale, and a refined `highlight` block starting from the old solana theme's.

- [ ] **Step 3: Remove the old default and regenerate the barrel**

In `themes/playground/playground.ts` delete the `isDefault: true` line. Run `yarn generate-exports` (regenerates `themes/generated.ts`; `PgTheme` throws unless exactly one default exists).

- [ ] **Step 4: Wire the font**

Top of `client-v2/src/index.css`:
```css
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap");
```
(family per Task 1's choice).

- [ ] **Step 5: Gate**

`tsc --noEmit` clean; dev server compiles; screenshot localhost:3000 — the app opens in the new theme with the display font visible in non-code text (sidebar titles, buttons, Home). If the font did not load, check the network tab fallback and the `font.other` family string.

- [ ] **Step 6: Commit**

```bash
git add client-v2/src/themes client-v2/src/index.css
git commit -m "Add Solana V2 theme and make it the default"
git push origin feat/client-2-ai-assistant
```

---

### Task 3: Icon rail — SVG set + active indicator

**Files:**
- Create: `client-v2/src/views/sidebar/icons/{explorer,build,test,tutorials,programs}.svg` (assistant already has one)
- Modify: each `client-v2/src/views/sidebar/<page>/<page>.ts` (cold, 0–1 commits/yr) to import its SVG; `client-v2/src/app/Panels/Side/Left/Left.tsx` and `SidebarButton.tsx` (warm, 5/yr) for the indicator and hover treatment.

**Interfaces:**
- Consumes: `createSidebarPage`'s icon guard (already accepts resolved URLs/imports) and the `*.svg` module declaration (`src/types/svg.d.ts`, exists).
- Produces: rail icons render via `currentColor` so the theme colors them; the `filter: invert()` hacks in `SidebarButton` become unnecessary for SVG icons.

- [ ] **Step 1: Draw the icon set**

Contract: 24px viewBox, stroke-based, `stroke="currentColor"`, `stroke-width="1.7"`, round caps/joins, no fills. Example (explorer — folder):
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H3z"/>
</svg>
```
Build (wrench+hammer motif), test (checklist), tutorials (book), programs (grid/anchor motif) drawn to the same contract. Reuse the assistant panel's existing speech-bubble SVG unchanged.

- [ ] **Step 2: Point the page definitions at them**

In each page def, e.g. `explorer.ts`:
```ts
import explorerIcon from "../icons/explorer.svg";
// ...
icon: explorerIcon,
```

- [ ] **Step 3: Restyle the rail button**

In `SidebarButton.tsx`/`Left.tsx`: SVG icons rendered as masked/img elements can't take `currentColor` via `<img>` — check how `Img` renders; if `<img src>`, keep the invert-filter path for PNGs but for our SVGs use CSS `filter` tuned to the theme, or inline them via a small `SvgIcon` component reading the URL — decide by what renders correctly, verify by screenshot. Active page: 2px gradient left-bar `linear-gradient(180deg, #9945FF, #14F195)` (exact hexes from Task 1), subtle raised background.

- [ ] **Step 4: Gate + commit**

tsc → compile → screenshot the rail (default and active states).
```bash
git add client-v2/src/views/sidebar client-v2/src/app/Panels/Side/Left
git commit -m "Replace sidebar rail PNG icons with a themed SVG set"
git push origin feat/client-2-ai-assistant
```

---

### Task 4: Chrome — topbar, editor tabs, bottom status bar

**Files:**
- Modify: `client-v2/src/components/Topbar/Topbar.tsx` (+ its children, 2/yr), `client-v2/src/components/Tabs/` (2/yr), `client-v2/src/app/Panels/Bottom/Bottom.tsx` (3/yr)

**Interfaces:**
- Consumes: theme tokens only; no new exports.

- [ ] **Step 1: Topbar** — flatten the gradient background to `bgBase`, bottom border `theme.colors.default.border`, nav/actions as quiet buttons, wallet balance as a pill.
- [ ] **Step 2: Editor tabs** — active tab: no boxed border; `bgSurface` + 2px top accent in brand purple; inactive tabs transparent with secondary text; close button appears on hover.
- [ ] **Step 3: Status bar** — `bgBase`, connection state as a pill (`● devnet` with green/red dot), text secondary, remove noisy borders.
- [ ] **Step 4: Gate + commit**

tsc → compile → full-window screenshot compared against the Task 2 baseline.
```bash
git add client-v2/src/components/Topbar client-v2/src/components/Tabs client-v2/src/app/Panels/Bottom
git commit -m "Restyle topbar, editor tabs and status bar for the Solana V2 theme"
git push origin feat/client-2-ai-assistant
```

---

### Task 5: Assistant panel polish (screen #1)

**Files:**
- Modify: `client-v2/src/views/sidebar/assistant/Component/{Assistant,Chat,ChatItem,Connect,Plan}.tsx` (ours — zero merge risk)

**Interfaces:**
- Consumes: theme tokens. No interface changes; `PgAssistant` API untouched.

- [ ] **Step 1: Sweep the panel to tokens** — all hardcoded values inherited from the mockup phase must read from the theme; tab strip matches Task 4's tab anatomy; suggestion cards and provider options on `bgRaised` with 12px radii; primary actions (Send/Apply/Allow/Connect) pill-shaped, brand-gradient on the *single* primary per view (gradient policy from Task 1); approval card pending border in brand purple; diff add/remove tints derived from brand green/red.
- [ ] **Step 2: Connect screen** — the number-one morning surface: display font on the title, capability tags in purple, Demo option visually first-class.
- [ ] **Step 3: Gate + commit**

Drive the scripted-demo flow end to end (break line 17, `build`, ask, Apply) and screenshot each state.
```bash
git add client-v2/src/views/sidebar/assistant
git commit -m "Align the assistant panel with the Solana V2 design"
git push origin feat/client-2-ai-assistant
```

---

### Task 6: Home screen

**Files:**
- Modify: theme keys first (`views.main.primary.home.*` in `solana-v2/theme.ts`); structural touch-ups in `client-v2/src/components/Editor/Home/` only where the theme cannot reach.

- [ ] **Step 1: Restyle via theme** — resource/tutorial cards on `bgRaised`, 16px radii, border on hover with subtle purple glow, display font for headings.
- [ ] **Step 2: Structural touch-ups** — only if a value proves unreachable through theme keys; every such case is also a friction-log entry.
- [ ] **Step 3: Gate + commit**

Screenshot Home (close all editor tabs or open a fresh workspace view to reach it).
```bash
git add client-v2/src/themes/solana-v2 client-v2/src/components/Editor/Home
git commit -m "Restyle the Home screen for the Solana V2 theme"
git push origin feat/client-2-ai-assistant
```

---

### Task 7: Right panel + leftover component polish

**Files:**
- Modify: `client-v2/src/app/Panels/Side/Right/Right.tsx` (**hot — 17/yr; minimal diff, flagged in commit body**); remaining rough edges in modals/menus/inputs via `solana-v2/theme.ts` overrides.

- [ ] **Step 1: Right panel title** — replace the centered all-caps title treatment with a left-aligned header row in the display font, tighter height; padding harmonized with the assistant panel. Touch nothing else in the file.
- [ ] **Step 2: Theme-level pass** — modals, menus, selects, inputs, toasts, tooltips on the raised surface + border tokens; skeletons on the new scale.
- [ ] **Step 3: Gate + commit**

```bash
git add client-v2/src/app/Panels/Side/Right client-v2/src/themes/solana-v2
git commit -m "Restyle the right panel header and remaining chrome

Includes a surgical edit to Right.tsx, which is a hot file upstream
(17 commits in the last year) - kept to the title row only."
git push origin feat/client-2-ai-assistant
```

---

### Task 8: Full sweep, reference check, fallout fixes

**Files:**
- Create: `docs/design/screenshots/redesign/*.png`

- [ ] **Step 1: Screenshot sweep** — IDE+assistant (chat mid-conversation), connect screen, roadmap tab, Home, wallet window open, terminal with a build error, settings/theme menu open. Save all to `docs/design/screenshots/redesign/`.
- [ ] **Step 2: Side-by-side reference check** — each screenshot eyeballed against solana.com; list mismatches, fix the cheap ones, friction-log the expensive ones.
- [ ] **Step 3: Theme-switch sanity** — switch to Playground and Dracula themes and back; confirm nothing crashes and old themes still render (we changed component structure, and old themes must still look coherent on it).
- [ ] **Step 4: Commit**

```bash
git add docs/design/screenshots/redesign
git commit -m "Add redesign screenshot sweep"
git push origin feat/client-2-ai-assistant
```

---

### Task 9: Canvas doc, decisions, friction log, morning summary

**Files:**
- Create: `docs/design/redesign/{Main,Tokens}.dc.html`, `docs/design/redesign/canvas.json`, seeded `docs/design/redesign/solana-redesign.html`
- Modify: `docs/decisions.md` (D8, D9), `docs/design/README.md` (link the new canvas), `CLAUDE.md` only if setup steps changed (they should not)

- [ ] **Step 1: Canvas** — `Tokens.dc.html`: the token sheet (colors, type ramp, radii, gradient policy) rendered as a spec board. `Main.dc.html`: before/after using the real screenshots (downsample to ≤70KB each with `sips -Z 1200`). Seed with the design-skill helper, publish as a **new** artifact, record the URL in `docs/design/README.md`.
- [ ] **Step 2: Decisions** — append to `docs/decisions.md`: **D8** Tailwind/shadcn deferred (React 17 blocks Radix; second styling system vs theme registry; revisit on React 18 or a D5 split), **D9** redesign approach (new default theme + component layer, hot files allowed by explicit choice, responsive deferred to step two).
- [ ] **Step 3: Friction log** — everything the theme system could not express, from the notes accumulated in Tasks 2–8.
- [ ] **Step 4: Commit + push + morning summary**

```bash
git add docs
git commit -m "Add redesign canvas, token sheet and decision records"
git push origin feat/client-2-ai-assistant
```
Final chat message structured for the morning: what changed, what to look at first, what was reverted or skipped and why, open questions.

---

## Self-review

- **Spec coverage:** Stage 0 → Task 1; Stage 1 → Task 2; Stage 2 items 1–6 → Tasks 3,4,5,6,7; guardrails → per-task gates; morning deliverables 1–6 → Tasks 2,1,9,9,9, per-task pushes. Responsive/light-theme correctly absent.
- **Placeholders:** icon set gives the contract + a complete example rather than five inline SVGs — deliberate: the remaining four follow the identical contract and are drawn at execution with a screenshot gate. Token values are real candidates with Task 1 as the confirm/override step.
- **Type consistency:** theme name "Solana V2" ↔ dir `solana-v2` matches `createTheme`'s kebab convention (verified against `themes/create.ts`); `font.other`/`font.code` keys match `_theme_fonts` in `utils/theme/theme.ts`.
