# Iteration 3 — "Flow": the dev loop as navigation

**Date:** 2026-08-20 · **Status:** concept approved (D10); implementation not
started · **Canvas:**
<https://claude.ai/code/artifact/7a144a9b-5a0f-4ac4-a2ff-d4b99782ca20>

Iterations 1–2 changed what the pixels are and where they sit. This pass
re-plans the anatomy itself. The frame comes from `docs/product-brief.md`:
Playground is the top of the official onboarding funnel — a newcomer's first
contact with Solana development. The concept's one sentence: **the UI should
teach the loop it executes.**

## The critique this answers

Five problems with the current anatomy for that user (full board:
`docs/design/screenshots/concept/critique.png`):

1. Navigation is a tool taxonomy (Explorer / Build / Test / …), not a task.
2. Build and Deploy — the product's most important actions — are
   micro-buttons in an explorer section header.
3. Raw compiler output in a terminal is the primary feedback channel.
4. No status model: built?, deployed where?, which cluster?, balance?
5. The assistant — the brief's Focus 1 — is one sidebar tab among six.

## The design

### Header (new component)

56px black bar, three zones:

- **Left:** logomark + project switcher.
- **Center — the stepper:** `Write → Build → Deploy → Interact`. Each stage
  renders one of four states: *done* (green check), *active* (pill with
  gradient dot), *failed* (red pill + count, e.g. "Build · 1 error"),
  *upcoming* (dimmed). Connectors between stages take the color of the
  completed path. Clicking a stage opens its surface. The stepper IS the
  status model and the navigation at once.
- **Right — status chips:** cluster (`devnet`), wallet address + balance,
  settings. Replaces the bottom status bar's "Not connected" whisper.

### Stage surfaces (center panel)

- **Write** — the editor, as today (floating-panel composition from
  iteration 2 stays).
- **Build** — a build report surface: headline ("Build failed · 1 error ·
  2.9s"), a humanized error card (plain-language title, the source excerpt
  with the offending line marked, "Fix with assistant" gradient CTA, "Open
  in editor"), raw compiler output behind one click. On success the stage
  just turns green — no surface interrupts the flow.
- **Deploy** — summary card: program id, Explorer link, slot, cost,
  authority, size; Redeploy / Share actions.
- **Interact** — the IDL-generated panel, promoted from sidebar test page to
  the loop's reward: instruction list, resolved accounts, "Send
  transaction", tx results with Explorer links.

### Persistent columns

- **Left:** files only (232px). Build/Run/Test buttons leave the explorer —
  the stepper owns them now.
- **Right:** the assistant, always present (348px, collapsible): context
  chips, conversation, proposal cards with the approval gate exactly as
  built in the assistant branch.
- **Bottom of the center panel:** the console as a drawer (Cmd+J), one
  status line when collapsed. Never the primary feedback channel.

### Motion language

Board: `docs/design/screenshots/concept/motion-language.png`. Tokens:
instant 80ms (hover/focus), fast 140ms (tabs/chips), base 220ms (stage
crossfade, cards), slow 320ms (drawer, collapse) with two easing curves.
Five movements: gradient sweep = "working" (the only loop), results rise in
(fade + 8px), drawer height, stage crossfade with a one-shot dot pulse,
reduced-motion collapses everything to opacity. Extends
`theme.default.transition`; `transform`/`opacity` only; no library.

## Honesty map (what a demo build of this would be)

Real behind every surface: server build, devnet deploy, the IDL panel, the
assistant's tools and approval gate. New code is composition: the header
component, the Build report surface (fed by the D4 stderr capture), stage
routing. The stepper state machine derives from events the client already
emits (build start/success/fail, deploy result). Nothing here needs backend
changes — consistent with the hard constraints.

## Explicitly out of scope for the concept

- Implementation plan and file-level design — next step, after concept
  review (this document is the concept spec, not the build spec).
- Responsive/tablet (still deferred from iteration 2).
- C-direction plan cards in the assistant column (horizon, per D10).
- Onboarding/empty states of each stage (first-run Write surface, Deploy
  before first build) — to be designed with the implementation plan.

## Alternatives considered

See D10 in `docs/decisions.md`: A "Mission Control" (rejected — still
tool-first; revive if the stepper tests badly) and C "Conversation-first"
(rejected for this milestone — hides the code, needs a paid model; kept as
horizon). Boards for both are on the canvas.
