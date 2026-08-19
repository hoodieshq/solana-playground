# Assistant panel — design source

Live canvas: **https://claude.ai/code/artifact/95f6b66b-3387-42ba-a134-f187a6162b8b**

Five artboards, clickable — apply or reject the patch, allow or deny the build,
connect a key, switch tabs, expand a roadmap item.

| Artboard | What it shows |
| --- | --- |
| `Main.dc.html` | The panel at its 420px default, inside the full playground — rail, editor, terminal, status bar |
| `FirstRun.dc.html` | Key entry, and the connected-but-empty state |
| `Streaming.dc.html` | Streaming output, and the approval gate before a state-changing tool runs |
| `Proposal.dc.html` | The core demo moment: a proposed patch, applied or rejected |
| `Roadmap.dc.html` | The "What we're building" tab |

Everything visual is lifted from `client/src/themes/playground/theme.ts` — the
default theme. Nothing was invented: `#151721` / `#0e1019` / `#212431`
backgrounds, `#5288f2` accent, `#293244` borders, `#f2f2f7` / `#c0c1ce` text,
`#29cd7d` and `#c63453` for build outcomes, the `#d57bee` / `#38ccff` / `#ffd174`
/ `#2ef0b1` syntax colours, 8px radii with 12px on buttons, the 13/14/16/20px
type ramp, and JetBrains Mono throughout.

The code in the artboards is the real demo fixture: the `E0308` mismatched-types
error captured from an actual build against `api.solpg.io`.

## Editing it

The `.dc.html` files and `canvas.json` here are the source. The published canvas
is generated from them, so edit these — not the page.

Changes made in the canvas GUI and saved live only on the artifact until someone
reads them back; if you have edited it there, say so before re-seeding from these
files or your changes will be overwritten.

The seeded output (`solana-playground-assistant-panel.html`, ~2 MB) is generated
and gitignored — ask Claude Code to re-seed and republish after editing.

## Where the design decisions live

`docs/decisions.md` → D7. The spec that implements it is
`docs/superpowers/specs/2026-08-19-assistant-panel-design.md`.
