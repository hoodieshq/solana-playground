# Flow build — implementing the dev-loop UI in client-v2

**Date:** 2026-08-21 · **Status:** design approved in chat; this is the build
spec for the one-day implementation · **Concept:** D10 +
`2026-08-20-flow-concept-design.md` · **Deadline:** an assembled, running
client-v2 by tonight — a prototype, honest about what is real.

## What changed against the concept spec

Corrections from the 2026-08-21 session, studied against
<https://solana-learning-playground.vercel.app/> (the prototype we were asked
to learn from — its New Workspace modal, gated Build/Deploy/Interact actions,
permanent assistant column and console-to-assistant "Explain" links are the
reference):

1. **Project gallery** ("What do you want to build?") — new-workspace modal
   with Start-from-scratch, Tutorials and Programs tabs.
2. **Gear → overlay settings sidebar** on the right: network switching,
   endpoint, commitment, theme, font, project export/import.
3. **IDL block**: "Generate IDL" on Build (post-success), "Upload IDL" on
   Deploy and Interact. Mechanics already exist upstream
   (`ProgramSettings/IDL.tsx`, `PgProgramInfo.update({ idl })`).
4. **Deploy history** per workspace + a deployment/version switcher on
   Interact.
5. **Left column has two tabs**: Projects | Files.
6. Reference for IDL viewing UX:
   <https://explorer.solana.com/address/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA/idl>.
   More references (the Explorer settings panel, a colleague's playground
   prototype) arrive later today and refine the gear sidebar only.

## Real / mocked boundary (the honesty map for tonight)

**Real:** build and deploy against `api.solpg.io` / devnet; the D4 stderr
capture feeding the Build report; IDL generate/import/export; project export
as zip (`PgFramework.exportWorkspace`); cluster/endpoint switching
(`PgSettings`); tutorials and framework templates (upstream registries); the
assistant column with all four providers; deploy history (new, but real —
records real deploys).

**Mocked / view-only:** ecosystem program cards (drift-v2, mango-v4 class) —
they cannot compile on the fixed crate whitelist (anchor-lang 0.29), so they
render with a "view only" badge and open read-only; motion is the minimal
token set from the concept; responsive stays deferred.

## Architecture

New composition, old bricks. Everything lives in new files under
`client-v2/src/views/flow/`; the existing layout stays reachable behind a
`?classic` query flag so the demo always has a fallback. One routing entry
point is the only pre-existing file touched (recorded in decisions.md when
made).

```
views/flow/
  Flow.tsx            layout: header / left / stage / assistant / console
  header/             Header, Stepper, StatusChips, ProjectSwitcher
  stages/             Write.tsx Build.tsx Deploy.tsx Interact.tsx
  gallery/            NewWorkspaceModal, ProgramCard, TutorialCard
  settings/           GearSidebar (overlay)
  left/               LeftPanel (Projects | Files tabs)
  console/            ConsoleDrawer (wraps the terminal)
  state/              stepper state machine + stage routing
utils/deploy-history.ts   new store, localStorage keyed by workspace
```

### Header (56px)

Logomark · project switcher (opens the gallery modal) · **stepper**
`Write → Build → Deploy → Interact` — states *done / active / failed /
upcoming* derived from real events (build start/success/fail via the D4
module and `PgCommand` hooks; deploy result via `PgProgramInfo` /
`PgGlobal`); clicking a stage routes the center surface · status chips
(cluster, wallet address + balance) · gear.

### Stage surfaces

- **Write** — the existing editor-with-tabs component, unchanged.
- **Build** — headline ("Build failed · 1 error · 2.9s"), humanized error
  card (plain-language title, source excerpt, offending line marked), "Fix
  with assistant" (pre-fills the assistant composer), "Open in editor"; raw
  compiler output behind one click. Success: green summary + **Generate
  IDL** (reveals/downloads the idl.json the build produced) + Export
  project.
- **Deploy** — result card (program id, Explorer link, slot, cost) ·
  **Deploy history** list (cluster, program id, time, signature; from the
  new store; every real deploy appends) · **Upload IDL**.
- **Interact** — the upstream IDL-driven test panel, promoted; a
  **deployment switcher** above it (entries from deploy history, default =
  latest; switching sets the cluster + program id the panel targets) ·
  **Upload IDL** for foreign programs.

### New Workspace modal

Follows the studied prototype's anatomy: title "What do you want to build?",
Start-from-scratch row (framework choice: Anchor / Native / Seahorse — the
real upstream create flow), tabs **Tutorials** (upstream tutorial registry:
level, framework, parts, Open) and **Programs** (upstream programs gallery +
3–4 view-only ecosystem cards), search. Openable from the project switcher,
the Projects tab's New button, and shown on first run with no workspace.

### Gear sidebar

Right-side overlay (does not reflow the layout): Network (devnet / testnet /
localhost / custom endpoint — real switch), commitment, theme, font,
**Export project**, Import, Explorer links for the current wallet/program.

### Left panel (232px)

Tabs **Projects** (workspace list + in-progress tutorial cards + New) |
**Files** (the existing explorer tree component).

### Console drawer

The terminal wrapped in a bottom drawer (Cmd+J), one status line when
collapsed. Never the primary feedback channel.

## Skills plan (how this gets built well)

The UX bar is explicit: modern, consistent with the design system, no
decoration drift. Skills used at set points:

| Phase | Skill | Why |
| --- | --- | --- |
| Component build (header, gallery, gear) | `frontend-design` | Execution quality for the new surfaces — constrained to the existing Solana V2 tokens (D8/D9: inherit the IDE, don't decorate; gradient policy holds) |
| Gallery + stepper UX | `ui-ux-pro-max` | Navigation/state/interaction checklists for the two flows newcomers hit first |
| Pre-handoff review | `web-design-guidelines` | Accessibility and interaction-guideline audit of everything shipped today |
| Process | `superpowers:writing-plans` → `executing-plans` | The implementation plan and its execution discipline |

Explicitly not used: the Vercel React skills (React 18/Next-oriented; this is
CRA + React 17).

## Build order (cut from the tail if time runs out)

1. Frame: header + stepper + stage routing + columns (everything else mounts
   inside it).
2. Build surface — the heart of the demo.
3. Deploy + history store + Interact switcher.
4. New Workspace modal.
5. Gear sidebar.
6. IDL buttons placement polish + motion tokens.

The stepper and the Build surface are never cut.

## Verification

`tsc` clean; manual demo path before handoff: create from template → build →
error → fix with assistant → build green → Generate IDL → deploy → history
entry → Interact against it → switch deployment. Screenshots of each stage
into `docs/design/screenshots/flow-build/`.

## Out of scope today

Responsive/tablet · C-direction plan cards · compiling ecosystem programs ·
Surfpool/local validator (the prototype uses it; our target stays devnet) ·
persistent identity.
