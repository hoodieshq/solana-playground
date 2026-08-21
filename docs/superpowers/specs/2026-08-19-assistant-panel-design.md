# Assistant panel — design

**Date:** 2026-08-19 · **Status:** approved, not yet implemented
**Implements:** `task-01` (assistant panel prototype)
**Decisions:** `docs/decisions.md` D1–D4

The one path that must work flawlessly: build → error → the assistant explains it
against the actual code → proposes a fix as a diff → user clicks Apply → build
succeeds → deploy to devnet → program ID and transaction linked in Explorer.

Everything else can be rough. That path cannot.

---

## 1. Where it lives

A new sidebar page.

```
client-v2/src/views/sidebar/assistant/
  assistant.ts          createSidebarPage(...)
  Component/            the React tree
  bridge/               playgroundBridge.ts — the one seam
  model/                provider adapter (scripted | real)
  content/              synced from docs/, see §6
```

Registered by appending one element to `SIDEBAR` in
`client-v2/src/views/sidebar/sidebar.ts` — zero commits in twelve months, so the
merge cost is a one-line resolution.

It renders in `Side/Right`: already resizable to 75% of the window, already
beside the editor rather than over it. `views/sidebar/test/` is the closest
precedent for a non-trivial panel.

**Icon gotcha.** `createSidebarPage` does `page.icon = "/icons/sidebar/" + page.icon`
unconditionally, and `client/public` is the `solana-playground/assets` submodule
— we cannot add a file there. Fix: a one-line guard in
`client-v2/src/views/sidebar/create.ts` so an icon that is already a URL or an
imported asset skips the prefix. That file has one commit in twelve months.

## 2. The bridge

One module, `bridge/playgroundBridge.ts`, with a real implementation and a mock
behind the same interface. The mock exists for offline demoing; **the real one is
the default**, because three of the four methods are real today:

| Method | Status | Implementation |
| --- | --- | --- |
| `getProjectContext()` | real | `PgExplorer.files` / `currentFilePath`, `PgProgramInfo.idl` + program ID, `PgGlobal.deployState`, cluster |
| `applyPatch(patch)` | real | `await PgExplorer.createItem(path, content, { override: true })` |
| `build()` | real | `PgCommand.build.execute()` — verified against `api.solpg.io` |
| `deploy()` | real | `PgCommand.deploy.execute()` |

This is a smaller mock surface than `task-01` assumed, and it makes the demo more
honest: the playground half is not simulated at all.

## 3. Build errors

`client-v2/src/commands/build/build.ts` gains one import and one line storing the
raw `stderr` into a new module the bridge reads. Rationale and rejected
alternatives: `decisions.md` → D4.

Two rules for whoever writes it:

- Send the model the **raw** stderr, not `improveOutput`'s — that transform
  strips absolute paths, the session uuid and the `rustc --explain` footer, and
  truncates to three errors.
- Strip the two leading `switchboard` "Stack offset exceeded" errors first. They
  are on every build, are not the user's fault, and an assistant that explains
  them is worse than one that stays quiet.

## 4. Agent loop and tools

`@anthropic-ai/sdk` browser build, `client.beta.messages.toolRunner()`,
`claude-opus-5`, adaptive thinking, streaming, `max_iterations` capped.

Tools: `read_file`, `list_files`, `write_file`, `get_build_error`, `build`,
`deploy` — each delegating to the bridge.

**The approval gate is the Tool Runner's per-turn hook.** A pending tool call is
inspected before it executes; mutating tools (`write_file`, `build`, `deploy`)
surface in the UI and wait for the user. Read-only tools run freely. This is
"propose automatically, apply explicitly" implemented inside the loop rather than
around it.

**Key handling.** In memory only for the prototype, re-entered per session — not
`localStorage`, not `REACT_APP_*`. See `decisions.md` → D3 for why; it is a real
exposure, not caution for its own sake.

**Model adapter.** `model/` exports one provider interface with a `scripted`
implementation (canned responses for the demo path) and a real one. Which is
active is a single exported constant plus a visible badge in the panel header
when scripted — nobody should demo a canned response believing it is live.

## 5. The panel

Message list, input, streaming output, and **actionable messages**: a proposed
change renders as a diff with Apply / Reject. Nothing is written without the
click.

Build from what exists — `components/Markdown`, `components/CodeBlock`,
`components/Button`, Monaco for the diff. No chat-UI library: `@ai-sdk/react`
needs React 18 and this client is React 17, and the remaining surface is small
enough that a library would fight styled-components harder than it helps.

## 6. The "What we're building" tab

Second tab in the same panel, rendering `docs/assistant-context.md` as content,
not markup.

CRA's `ModuleScopePlugin` is active (`react-scripts/config/webpack.config.js:337`)
and craco does not remove it, so `client-v2/src` cannot import across the repo root.
A small script syncs `docs/assistant-context.md` into
`views/sidebar/assistant/content/`, following the `client/scripts/sync-readme.mjs`
precedent. Craco already has a raw-import rule for `.md`.

The same content goes into the assistant's system prompt with `cache_control`, so
it can answer "what is this and what's planned?" itself. Full documents
(`product-brief.md`, `decisions.md`, `codebase-map.yaml`) are exposed through a
`read_project_doc` tool rather than loaded up front — progressive disclosure, so
depth costs tokens only when a question needs it.

## 7. Verification

Drive the demo path in a real browser and screenshot it; do not assert it works.
Then write the "what is real, what is mocked" note (§ `assistant-context.md`) and
start the friction log — every time the environment prevents the assistant from
suggesting the right thing, one line: what it should have said, and why the
environment could not support it.

## Open

- **D5 — what "client-2" means.** Proceeding as a panel in the existing client;
  ports cleanly if the answer is a separate app.
- **Deploy leg.** Needs a funded devnet wallet; may need an airdrop and can be
  flaky on devnet regardless of our code. `processDeploy` has not been read line
  by line, so its failure modes are not yet mapped.
