# Iteration 4 - Flow visual parity with the concept boards

**Date:** 2026-08-21 · **Status:** approved in chat; autonomous build
(1-2 h) · **Branch:** `feat/flow-ui-visual` on top of `feat/flow-ui`
(PR #6) · **Concept boards:** `docs/design/screenshots/concept/b-flow-*.png`
and the sources in `docs/design/concept/`.

## Why

PR #6 implemented the Flow *anatomy* (D10/D17) in the existing Solana V2
clothes; the spec of the day said "tokens only, no new aesthetic" so the
structure could ship in one day. The concept boards define the *visual
language* of that anatomy. This iteration closes the gap, board by board,
without changing behaviour.

## Gap table (board -> current -> target)

| Surface | Board | Current | Target (this iteration) |
| --- | --- | --- | --- |
| Canvas | Black ground (#000-ish), three floating panels with 8px gutters, 12px radius, 1px border | Full-bleed columns separated by 1px borders | Floating panels: `gap: 8px`, `border-radius: 12px`, panel bg = surface token, page bg = base token; header bar outside the panels |
| Header | Gradient square logomark + project name with caret; stepper centred; right: cluster chip with dot, wallet chip "addr  balance" (balance in accent green), round gear | Mark is an icon; chips plain | Gradient logomark square (20px, 6px radius); wallet chip with balance coloured `state.success`; gear as a circular 28px button |
| Stepper | Active = dark raised pill with accent dot + bold label; done = check + label; failed = red outline pill "Build 1 error" with red dot; upcoming = hollow dot; connectors 1px, green after done | Similar but flatter; failed count via suffix; no raised pill | Match pill treatment exactly: padding 6px 14px, radius 999px, raised bg for active, `state.error` border for failed; connector colours |
| Left panel | Title "FILES" small caps; tree only (src/lib.rs, client, tests); modified-file dot; bottom "+ New file" row | Upstream explorer incl. Workspaces select, Program/Client toolbars, icon row | Hide the upstream chrome from Flow-side CSS (workspace row, icon toolbar, section headers' buttons stay hidden), keep the tree; add an eyebrow "FILES" and a "+ New file" footer button calling the upstream create-item flow; the Projects tab keeps its list |
| Write | Editor panel with file tabs in a 40px strip, tab underline in accent | Upstream tabs | Restyle tabs via theme-level overrides only if cheap; otherwise leave (out of scope) |
| Build (failed) | "Build failed  1 error · 2.9s · api.solpg.io" + Rebuild button right; card: `E0308` badge + human title ("A text value is assigned to a number"), explanation line, 3-line source excerpt with the failing line tinted red and inline "<- expected u64, found &str"; actions row: gradient "Fix with assistant", "Open in editor", right-aligned "Show compiler output >"; "Warnings (2) >" below | Headline + code title + gutter excerpt from rustc; toggle below | Add the server host to the headline (from build server setting); Rebuild button; humanized title map for the top error codes (E0308, E0425, E0433, E0599, E0382, E0277; fallback = rustc title) plus a one-line plain explanation; render the excerpt as numbered source lines from the real file (line-1..line+1) with the failing line tinted and the rustc label inline; move the raw toggle to the actions row right; warnings count line when rustc reports warnings |
| Build (ok) | Stage just turns green, stays on Write (board note) | Green summary surface with CTAs | Keep the surface (it carries Generate IDL/Export) but restyle to the card language |
| Console | One status line inside the centre panel bottom: "CONSOLE  build failed · E0308   ⌘J" | Handle "Console ^  Cmd+J" | Status line shows last build/deploy result text and the error code; chevron left; ⌘J right |
| Assistant column | Header "ASSISTANT  lib.rs · build error"; plain turns (YOU / ASSISTANT small caps); proposal card with "src/lib.rs +1 -1  PROPOSED" and a compact diff; composer "Waiting on your decision..." + round Send | Upstream assistant tabs (Chat/Sources/What we're building) with the backend picker visible | Panel header eyebrow with the context chips (file · status); keep the tabs but demote them visually; no changes to Chat internals beyond tokens already there |
| Motion | 80/140/220/320 ms tokens, rise-in, stage crossfade | Crossfade present | No new motion; verify reduced-motion |

## Rules

- Behaviour unchanged; only presentation. No new state, no new tools.
- Tokens only: colours from the Solana V2 theme (`theme.colors.*`), add
  nothing new except the panel radius/gutter constants already defined
  for iteration 2 (`GAP_8`, `PANEL_RADIUS` in the theme if present; else
  local constants in `views/flow/tokens.ts`).
- Upstream untouched; CSS reaches into upstream DOM are allowed from
  Flow-side containers only, each documented with its failure mode.
- Gradient: one decisive CTA per view + the logomark + the stepper's active dot.
- Every change keeps `yarn test-types` and the 30 unit tests green.

## Order (cut from the tail)

1. Canvas: floating panels + header bar + logomark + chips + gear.
2. Stepper pills.
3. Build failed card (human title, explanation, numbered excerpt, actions row, headline meta, Rebuild).
4. Left panel: FILES eyebrow, hide upstream chrome, "+ New file" footer.
5. Console status line.
6. Assistant header eyebrow with context chips.
7. Build ok restyle; Deploy/Interact card language alignment.

## Verification

Side-by-side screenshots (board vs app) for Write and Build-fails into
`docs/design/screenshots/flow-visual/`; tsc + unit tests; demo path
re-run once.
