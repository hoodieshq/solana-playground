# Iteration 3 concept — "Flow" canvas sources

Published canvas (view + edit):
<https://claude.ai/code/artifact/7a144a9b-5a0f-4ac4-a2ff-d4b99782ca20>

Each `*.dc.html` is one artboard; `canvas.json` lays them out;
`playground-flow-concept.html` is the seeded, self-contained canvas — it
opens straight from a checkout in any browser (read-only + PNG/PDF export).
Static renders of every board live in
`docs/design/screenshots/concept/`.

| Board | What it argues |
| --- | --- |
| `Critique.dc.html` | Why re-plan the anatomy: five problems vs. the newcomer's loop |
| `Main.dc.html` | **B — Flow**, Write stage: stepper header, assistant column, console drawer |
| `FlowBuild.dc.html` | **B**, the build-failure moment: humanized error card + diff proposal |
| `FlowDeploy.dc.html` | **B**, deployed + Interact: the IDL panel as the loop's reward |
| `MissionControl.dc.html` | A — the evolutionary alternative (rejected, see D10) |
| `ConversationFirst.dc.html` | C — the radical horizon (rejected for this milestone, see D10) |
| `Motion.dc.html` | Motion tokens and the five movements, with live previews |

Decision record: `docs/decisions.md` → D10. Concept spec:
`docs/superpowers/specs/2026-08-20-flow-concept-design.md`.

Do not edit `playground-flow-concept.html` by hand — edit the `*.dc.html`
sources and re-seed (the canvas tooling lives in the design skill; ask the
session that produced this, or treat the published canvas as the editable
copy).
