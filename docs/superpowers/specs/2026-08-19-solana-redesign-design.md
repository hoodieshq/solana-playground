# Solana-brand redesign — design

**Date:** 2026-08-19 · **Status:** approved, execution overnight
**Implements:** Focus 3 of `docs/product-brief.md` ("Modern, responsive interface" — the visual-language half; responsive is explicitly step two)
**Decisions:** adds D8 (Tailwind/shadcn deferred) and D9 (redesign approach) to `docs/decisions.md`

The current UI is a legacy visual language. The existing "Solana" theme in the
registry is a color swap — brand hexes on the old anatomy — which is exactly why
it still reads as legacy. This redesign changes what the color swap could not:
typography, density, component anatomy, iconography, and polish, aligned with
solana.com's visual language.

## Approved parameters

Settled with Slava before the overnight run:

1. **One committed direction, implemented in the client.** No multi-direction
   exploration; the brand largely dictates the direction. Morning evaluation
   happens on localhost:3000, not on mockups.
2. **The new design becomes the fork's default theme.** Old themes (Playground,
   Dracula, Light, the old Solana) stay in the switcher as fallback.
3. **Hot files may be touched** — including `Right.tsx` (17 commits/12mo).
   Edits there stay surgical and are flagged per-commit, because upstream merge
   cost is real and ours to pay.
4. **No Tailwind, no shadcn** (D8). shadcn is blocked outright — Radix
   primitives require React 18, this client is React 17. Tailwind would create a
   second styling system beside the theme registry that every component already
   reads through styled-components. The native theme system reaches colors,
   both font tracks, radii, shadows, and per-component styles — consistency
   without a new dependency. Revisit when: the client moves to React 18, or D5
   resolves to a separate client-2 codebase.
5. **Out of scope:** responsive/tablet (step two, by explicit choice), a light
   theme, wallet-flow redesign beyond theming, tutorial content, the vscode
   extension.

## Stage 0 — Brand research (first, timeboxed ~1h)

Before touching pixels:

- `solana.com/branding` — the public brand assets page: official colors, logo
  usage, any downloadable guide.
- solana.com's own CSS — what fonts, weights, radii, surface colors, and
  gradient treatments the site actually ships, as opposed to what the brand
  page claims.
- A short search for any other public Solana design resources.

Output: `docs/design/brand-research.md` — findings, and the chosen token
mapping with reasoning.

**Known constraint going in:** Solana's fonts are proprietary. Pick the closest
open grotesque on Google Fonts (candidate: Space Grotesk; decide from research,
not from memory). Code stays JetBrains Mono — it works, it ships with the app,
and the IDE's monospace identity is worth keeping.

**Font loading:** `client/public/index.html` lives in the assets submodule and
cannot be edited. The display font loads via `@import` in `client/src/index.css`.
The `FONTS` list in `themes/fonts.ts` is the *code* font picker; the display
font rides `theme.font.other` and needs no entry there.

## Stage 1 — Token layer: theme `solana-v2`, made default

A **new** theme directory (`client/src/themes/solana-v2/`), not an edit of the
existing `solana` theme — the old one stays for comparison and the merge risk
of a new directory is zero. `isDefault` moves from `playground` to it (two
one-line flag changes).

Direction, to be refined by Stage 0:

- **Surfaces:** layered dark neutrals over a black base. Not pure #000-on-#FFF
  everywhere — an IDE is stared at for hours; two-three surface levels with
  slightly lifted blacks and ~90% white text, contrast-checked.
- **Accents:** official `#9945FF` purple and `#14F195` green. The brand
  gradient is used *sparingly*: primary CTA, progress indicator, active-page
  marker. Everywhere else, flat accent color. Semantic mapping: success =
  brand green, info = purple-side, error/warning tuned to sit in the palette.
- **Shape:** pill buttons, 12–16px card radii, 1px rgba-white borders,
  restrained glow on primary actions only.
- **Type:** display font from Stage 0 on `font.other` (larger sizes, more
  generous line-height than the current defaults); JetBrains Mono on
  `font.code`.
- **Syntax highlight + terminal:** new palette through the same theme layer —
  the old solana theme's `highlight` block is the starting point, refined.

## Stage 2 — Component layer

Ordered by visual impact; each numbered item is a commit gate (see Guardrails).

1. **Icon rail** — replace the PNG icons with a single inline-SVG set
   (stroke-based, one grid, currentColor so the theme colors them), active page
   marked with a gradient indicator bar. Files: the cold sidebar page
   definitions (`explorer.ts` etc. — 0–1 commits/yr) get `icon:` imports; the
   `create.ts` guard added for the assistant icon already supports this;
   `Left.tsx` (5/yr) for the indicator and hover states.
2. **Topbar, editor tabs, bottom status bar** (2–3 commits/yr each) — modern
   anatomy: no boxed-border active tab (underline/pill instead), cleaner close
   affordance, cluster + wallet state as pills in the status bar, flattened
   topbar treatment.
3. **Assistant panel** (ours, zero merge risk) — align to the new tokens and
   polish: approval cards, diff rendering, connect screen, roadmap tab. This is
   the number-one screen for the morning review.
4. **Home screen** — resource/tutorial cards restyled (mostly reachable through
   `views.main.primary.home` theme keys; light structural touch-ups allowed).
5. **Right panel** (`Right.tsx`, 17/yr — approved) — panel title treatment and
   paddings. Only what the theme cannot reach; every line flagged in the
   commit message as a hot-file edit.
6. **Buttons, modals, menus, inputs, toasts** — theme component-overrides
   first; structural edits only where the theme cannot express the design.

## Guardrails for the unattended run

- **A commit per stage, pushed** — whatever the morning finds, the branch holds
  the last completed stage, not a broken middle. No AI attribution anywhere.
- **Gate per stage:** `tsc --noEmit` clean → dev-server compiles → Playwright
  screenshot of the affected surfaces, actually looked at. The screenshot loop
  caught three real bugs today; it is the regression net for the night.
- **Reference check:** key screenshots compared against solana.com side by side
  before calling a stage done.
- **Rollback stance:** if a stage cannot pass its gate, revert that stage,
  record why in the friction log, move to the next stage. Never leave HEAD
  red overnight.
- **Final sweep:** screenshots of IDE+assistant, Home, connect screen, roadmap
  tab, wallet window, terminal — saved to `docs/design/screenshots/redesign/`.

## Morning deliverables

1. localhost:3000 opens in the new design by default (old themes switchable).
2. `docs/design/brand-research.md` — what the brand actually is, what was
   chosen, what was substituted and why.
3. A compact canvas doc: token sheet + before/after from real screenshots.
4. `docs/decisions.md` — D8 (Tailwind/shadcn deferred, with triggers) and D9
   (redesign approach and its constraints).
5. Friction log entries for anything the theme system could not express.
6. Everything committed and pushed to `feat/client-2-ai-assistant`.

## Risks

- **Monaco/terminal theming depth** — the mapping from theme tokens into Monaco
  and xterm exists (the old solana theme proves it) but its limits are unknown;
  if a value cannot be reached through the theme, it is a friction-log entry,
  not a hack.
- **Hot-file conflicts later** — accepted explicitly (parameter 3); mitigated by
  surgical diffs and per-commit flags.
- **Google Fonts availability at runtime** — fallback stacks on every face, so
  offline degrades to system fonts, not to broken text.
- **Night-length scope** — stages are ordered by impact precisely so that
  running out of night leaves the most valuable work done.

---

# Iteration 2 — layout, spacing, navigation (2026-08-20)

Approved by Slava after reviewing iteration 1: tokens landed, but the anatomy
still reads legacy. References for this pass: Cursor, Warp, Linear, v0 — what
they share is air and soft geometry, not color.

**A. Floating panels.** The workspace becomes a black canvas with inset,
rounded panels (side panel, editor, terminal) separated by 8px gutters —
replacing edge-to-edge panels divided by 1px borders. The defining move of the
iteration.

**B. Spacing rhythm.** One 8px grid: taller explorer rows, 40px panel headers,
breathing room between sections instead of hard dividers, 44px minimum hit
targets where feasible.

**C. Rail.** Wider (3.5rem), icons in rounded hover squares, the active page
marked by a pill background rather than a border-left.

**D. Explorer.** Quiet small-caps section labels, quiet icon buttons, aligned
chevrons, taller rows.

Tools for this pass: the frontend-design skill during implementation,
web-design-guidelines as the closing audit. Same per-stage gates as
iteration 1 (tsc → compile → screenshot, commit per stage).

## Iteration 2 — outcome

All four stages landed as theme tokens plus two style-only explorer edits
(`Folders.tsx`, `Workspaces.tsx` — 4 upstream commits in 12 months, all
logic). One deviation from the letter of B: rail buttons are 40px squares,
not 44px — this is a desktop-first pass (responsive is deferred), and 44px
squares in a 56px rail read oversized. Revisit with the responsive step.

The closing audit (web-design-guidelines) added `color-scheme` syncing to
`PgTheme.set` — native scrollbars and form controls now follow the active
theme — and confirmed `<meta name="theme-color">` already matches the black
canvas. Two pre-existing upstream gaps noted for the friction log, not fixed
here: the rail buttons are divs without keyboard focus support, and explorer
rows don't truncate long filenames.

Full screenshot sweep refreshed in `docs/design/screenshots/redesign/`,
including the complete demo flow (build error → explanation → diff →
Apply → editor changed) and sanity shots of Dracula and Playground on the
changed explorer components.
