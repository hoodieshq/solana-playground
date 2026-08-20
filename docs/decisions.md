# Decisions

Why the assistant is built the way it is. One entry per decision: what we chose,
what we rejected, and the trigger that would make us revisit.

Keep entries short. If a decision changes, add a new entry rather than editing
the old one — the history is the point.

---

## D1 — Agent runtime: Anthropic SDK + Tool Runner, in the browser

**Date:** 2026-08-19 · **Status:** chosen for the prototype

The assistant runs entirely in the browser using
[`@anthropic-ai/sdk`](https://www.npmjs.com/package/@anthropic-ai/sdk) (which
ships a `browser` build) and its Tool Runner
(`client.beta.messages.toolRunner()`). The agent loop, the tool definitions and
the human approval gate all live in the client. No backend of ours.

Tools are ours, mapped onto what the playground already has:

| Tool | Backed by |
| --- | --- |
| `read_file`, `list_files` | `PgExplorer.getFileContent`, `PgExplorer.files` |
| `write_file` | `PgExplorer.createItem(path, content, { override: true })` |
| `get_build_error` | raw `stderr` captured from the build command |
| `build`, `deploy` | `PgCommand.build.execute()`, `PgCommand.deploy.execute()` |

Model: `claude-opus-5`, adaptive thinking, streaming, `effort` as the cost lever.

**Why this and not the alternatives**

- The Tool Runner exposes a per-turn hook that lets us inspect a pending tool
  call *before* it executes. That is exactly the product principle "propose
  automatically, apply explicitly" — the gate is part of the loop rather than
  something wrapped around it.
- It needs no service, no deployment, and no change to the existing client.

**Rejected: Vercel AI SDK** (see D1-B). Blocked twice on this codebase:
`@ai-sdk/react` requires React `^18 || ~19`, and the client is React 17;
`ai` core declares `engines.node >= 22`, i.e. it is a server-side package.
Adopting it means upgrading React across the existing client, which conflicts
with "do not modify the existing client beyond what is strictly necessary".

**Rejected: Claude Agent SDK** (see D1-C). `@anthropic-ai/claude-agent-sdk`
declares `engines.node >= 18` — it is Claude Code as a library, and its value is
built-in `Read`/`Write`/`Edit`/`Bash`/`Glob`/`Grep` against a real filesystem
with real subprocesses. The playground's files live in IndexedDB in the user's
browser. We would run a service and then disable everything the service is for.

**Revisit when** any of these becomes true:

- We need a demo quota for anonymous users (no key of their own) → D1-B.
- The Foundation names a preferred provider or agent framework → D1-B, since
  provider-agnosticism becomes worth its cost.
- The key-in-browser exposure (D3) has to be closed properly rather than
  mitigated → D1-B.
- We want subagents, permissions and context management we would otherwise
  build ourselves → D1-C.

**Integration note (found while building).** The SDK statically imports its
on-disk credential resolution, which reaches `node:fs` and `node:path`. Webpack
treats `node:` as a URI scheme and rejects it before `resolve.fallback` or
aliases apply, so `craco.config.js` rewrites the scheme away and the existing
`fs: false` / `path: false` fallbacks stub them out. Harmless here because the
key is always passed explicitly, so that code never runs.

### D1-B — Parked: model calls through a small proxy service

Same client architecture; requests go to a minimal open-source service we run
instead of straight to Anthropic. Removes the key from the browser entirely and
is the shape the "limited demo mode with a request quota" in the product brief
will need anyway. Parked because it costs a service and a deploy, and the
current milestone is a demo.

### D1-C — Parked: Claude Agent SDK in a separate Node service

Full Claude Code harness — subagents, permissions, context management, hooks —
on our own infrastructure. Parked because its built-in tools do not apply to an
in-browser virtual filesystem, so we would supply custom tools anyway and RPC
them back to the client.

---

## D2 — Panel placement: a new sidebar page

**Date:** 2026-08-19 · **Status:** chosen

The assistant is a new sidebar page: one entry appended to `SIDEBAR` in
`client-v2/src/views/sidebar/sidebar.ts`, plus a new folder of new files under
`client-v2/src/views/sidebar/assistant/`.

**Why.** It renders in `Side/Right`, which is already resizable to 75% of the
window and sits beside the editor rather than over it — the task's requirement
that the panel be visible without hiding the code, satisfied by the existing
layout. `views/sidebar/test/` is a close precedent: a non-trivial, IDL-driven
panel built exactly this way.

**Merge cost.** `sidebar.ts` has had zero commits in twelve months (last touched
2023-12-25) and `views/sidebar/create.ts` one. A conflict here is a one-line
resolution. See `codebase-map.yaml` → `upstream_sync.hot_files` for the files to
stay away from.

**Known wrinkle.** `createSidebarPage` prefixes every icon with
`/icons/sidebar/`, and that directory lives in `client-v2/public`, which is the
`solana-playground/assets` git submodule — we cannot add an icon there. Fix is a
one-line guard in `views/sidebar/create.ts` so an already-resolved URL or
imported asset skips the prefix.

**Revisit when** the team settles what "client-2" concretely means (see D5). If
it becomes a genuinely separate application, this decision is re-taken there —
but nothing about the panel is entangled with the host, so it ports.

---

## D3 — API key: bring your own, and do not put it in `localStorage` yet

**Date:** 2026-08-19 · **Status:** chosen, with a caveat we must clear

The user supplies their own Anthropic key. For the prototype it is held **in
memory only** — re-entered per session.

**Why not `localStorage`, which is the obvious choice.** The playground executes
project code — including code from a *shared* project — in a same-origin iframe
(`client-v2/src/utils/js-runtime/js-runtime.ts`). The sandbox is a string blacklist
of `window`, `globalThis`, `document`, `location`, `top`, `chrome`, plus `eval`
and `Function` set to `undefined`. `localStorage`, `sessionStorage` and
`indexedDB` appear nowhere in that file. Share links are a headline feature, so
the chain "open someone's shared project → click Run → their code runs in the
same origin as your key" is plausible and has not been tested.

**Why not an env var either.** CRA inlines every `REACT_APP_*` variable into the
bundle at build time. A key supplied that way is readable by anyone who loads
the page. Fine for a local demo, not a secret.

**Revisit when** either: someone verifies whether storage globals are actually
reachable from that iframe and, if so, adds them to the blacklist
(`js-runtime.ts` is quiet — 3 commits in 12 months) — after which `PgSettings`
is a good home, since it persists to `localStorage` separately from the
workspace and therefore does not leak into share links; or we move to D1-B and
the browser stops holding a long-lived key at all.

---

## D4 — Build errors: capture the raw `stderr` at the source

**Date:** 2026-08-19 · **Status:** chosen

`client-v2/src/commands/build/build.ts` gains one import and one line that stores
the raw `stderr` into a new module the assistant reads.

**Why it is needed at all.** `result.stderr` appears in exactly two places in
the whole client: a boolean check for `"error: could not compile"`, and
`PgTerminal.println(improveOutput(result.stderr))`. It is never stored. The only
trace that survives a build is `PgProgramInfo.lastBuildFailed`, a boolean. An
assistant that explains a compiler error needs the compiler's actual words.

**Why not the terminal.** `PgTerminal` has no scrollback-reading API, and what
is in the buffer has already been through `improveOutput`, which strips absolute
paths, the session uuid and the `rustc --explain` footer, and truncates to three
errors.

**Why not re-build.** A second compile costs ~3.5s and diverges from what the
user actually saw if files changed in between.

**Cost.** `build/build.ts` has 7 commits in 12 months — the highest merge risk of
anything we touch. Keep the edit to a couple of lines that delegate to a new
module so a conflict resolves in seconds.

**Note for whoever writes this:** send the model the *raw* stderr, not
`improveOutput`'s — but strip the two leading `switchboard` "Stack offset
exceeded" errors first. They appear on every single build, they are not the
user's fault, and an assistant that explains them is actively harmful.

---

## D5 — Resolved: what "client-2" concretely means

**Date:** 2026-08-19 · **Status:** resolved

`CLAUDE.md` describes a second client developed in parallel and says not to
modify the existing `client/`. `task-01` describes a dockable panel inside the
existing editor layout. Those are different codebases.

We are proceeding on the reading that the prototype is a panel inside the
existing client (D2), because the panel is all new files plus a one-line
registry entry, which qualifies as "strictly necessary" and ports cleanly if the
answer turns out to be a separate app.

**Resolve by:** asking the team. Not answerable by reading the repo.

**Resolved 2026-08-20:** "client-2" is a literal `client-v2/` directory in this
repo, a full copy of upstream's client with the fork's changes; `client/` stays
byte-identical to upstream. Rationale in
`docs/superpowers/specs/2026-08-20-client-v2-consolidation-design.md`.

---

## D6 — Documentation is the synchronisation layer

**Date:** 2026-08-19 · **Status:** chosen

Two people and two Claude Code sessions work on one branch. The shared context
is this `docs/` directory plus the root `CLAUDE.md`, and it serves three
audiences from one source:

1. **Both Claude Codes** — `CLAUDE.md` is read before anything else.
2. **The customer** — `product-brief.md` is the roadmap as we would present it.
3. **The in-app assistant** — `assistant-context.md` is what it knows about
   itself, so "what is this and what's planned?" is answered from maintained
   documents rather than invented.

**Revisit when** the assistant panel exists — `assistant-context.md` then needs
a sync step into `client-v2/src`, because CRA's `ModuleScopePlugin` blocks
`client-v2/src` from importing across the repo root. `client-v2/scripts/sync-readme.mjs`
is the precedent.

---

## D7 — Panel visual design: inherit the IDE, don't decorate it

**Date:** 2026-08-19 · **Status:** approved as a design; not yet implemented

Design canvas: <https://claude.ai/code/artifact/95f6b66b-3387-42ba-a134-f187a6162b8b>
Source: `docs/design/` · see its README for how to change it.

Every value is lifted from `client-v2/src/themes/playground/theme.ts` rather than
chosen — colours, 8px/12px radii, the 13/14/16/20px type ramp, and JetBrains
Mono. The panel should read as part of the IDE, not as a chat widget someone
embedded in one.

Four things the design decides:

**Monospace, no bubbles.** The whole playground is monospace, so the assistant
is too. Turns are labelled `YOU` / `ASSISTANT` in small caps and run full-width
rather than sitting in alternating rounded bubbles — the latter is the visual
grammar of a support widget and would look foreign here.

**The gate is visible.** Read-only tools (`read`, `list`) render as quiet
completed lines. Anything that changes state — `write_file`, `build`, `deploy` —
stops and renders an approval card with the exact command and what it will do.
That makes "propose automatically, apply explicitly" something you can see
rather than a claim in a README.

**A context strip above the composer.** A row of chips naming what the assistant
can currently see: `lib.rs`, `build error`, `no idl yet`. The product's whole
argument is that this assistant shares context with the project; that should be
legible without asking it.

**A proposal is a card, not prose.** File name, change count, a unified diff in
the editor's own syntax colours, and one primary Apply against a bordered
Reject. After applying it collapses to a confirmation line, so the transcript
records what happened.

**Revisit when** the panel is built and real content stresses it — long
proposals, multi-file patches, errors with many diagnostics. Wide panels
(it resizes to 75% of the window) are also unexercised: the artboards show 420px.

---

## D8 — Styling system: the native theme registry, not Tailwind or shadcn

**Date:** 2026-08-19 · **Status:** chosen (deferral, as agreed before the overnight run)

The redesign is carried by the app's own theme system. No Tailwind, no shadcn.

**Why.** shadcn is blocked outright: its components are built on Radix
primitives, which require React 18 — this client is React 17 (the same wall as
`@ai-sdk/react` in D1). Tailwind is possible but would create a **second**
styling system beside the theme registry that every component already reads
through styled-components: two sources of truth for color and spacing,
consistency down, and a huge upstream-merge surface if components migrate.
Meanwhile the native theme layer proved deeper than expected — colors, both
font tracks, radii, per-component styles down to `home.*` cards and the
sidebar rail — enough to carry the whole redesign with almost no component
edits.

**Revisit when:** the client moves to React 18, or D5 resolves to a separate
client-2 codebase (a fresh codebase changes the calculus entirely).

---

## D9 — Redesign approach: a new default theme plus a thin component layer

**Date:** 2026-08-19 · **Status:** implemented overnight

Canvas: <https://claude.ai/code/artifact/621475c8-0f47-405d-b6b9-d4351c4ca60a>
Research: `docs/design/brand-research.md` · Spec:
`docs/superpowers/specs/2026-08-19-solana-redesign-design.md`

**What was decided and holds:**

- **Tokens are sourced, not invented** — pulled from solana.com's served CSS:
  the violet-black surface family, lavender-white low-alpha borders, the
  canonical `135deg` gradient, and Space Grotesk, which solana.com itself
  ships in font stacks (their Diatype is proprietary).
- **`Solana V2` is a new theme and the fork's default**; Playground, Dracula,
  Light and the old Solana stay switchable and were sanity-checked after the
  component changes.
- **Gradient policy:** the brand gradient appears only on the single decisive
  CTA of a view, the progress indicator, and the rail's active marker.
- **The IDE stays monospace where it is an IDE** (editor, terminal, explorer,
  assistant conversation — per D7); Space Grotesk takes chrome, titles,
  buttons, Home and content surfaces.
- **Hot files were approved but barely needed.** The planned surgical edit to
  `Right.tsx` (17 commits/yr) was avoided entirely — theme declarations
  override the wrapper's hardcoded centering. Component edits shipped:
  `Monaco.tsx` (theme-name kebab, 2 lines), `utils/theme/theme.ts` (one-time
  default migration), `utils/theme/interface.ts` (font typing), the rail SVG
  set, and the assistant's GradientButton.

**Deferred, by explicit choice:** responsive/tablet (step two), a light-theme
variant, wallet-flow redesign beyond theming.

## D10 — Iteration 3 direction: the dev loop as navigation ("Flow")

**Date:** 2026-08-20 · **Status:** concept approved, not yet implemented

Canvas: <https://claude.ai/code/artifact/7a144a9b-5a0f-4ac4-a2ff-d4b99782ca20>
Sources: `docs/design/concept/` (artboards + seeded canvas) ·
`docs/design/screenshots/concept/` (board renders) · Spec:
`docs/superpowers/specs/2026-08-20-flow-concept-design.md`

**Decided:** the next redesign pass re-plans the anatomy around the
newcomer's actual loop — **Write → Build → Deploy → Interact** — instead of
the tool taxonomy the rail encodes today.

- The header carries a live stepper: each stage shows its state (done /
  active / failed / upcoming), and clicking a stage opens its surface.
- The assistant is a **permanent right column**, not one sidebar page among
  six — it is the brief's Focus 1 and reads as such.
- Build results become a first-class surface (humanized error card, source
  excerpt, "Fix with assistant"); the raw compiler output stays one click
  away. The terminal demotes to a console drawer.
- Cluster, wallet and balance live as header chips — the status model the
  current UI lacks.
- Motion language: four duration tokens, five movements, motion-as-status
  only; all CSS, no animation library (board on the canvas).

**Why B:** every stepper stage maps 1:1 onto a capability the backend
already has (server build, devnet deploy, the IDL-generated interact
panel). It is a re-composition of working surfaces, not new machinery —
and the UI itself teaches the loop, which is what the onboarding-funnel
positioning demands.

**Rejected — A "Mission Control"** (toolbar + slim rail, console drawer):
the smallest delta, but still tool-first; it never answers "what do I do
next?". Revive if the stepper tests badly with real newcomers — B's header
degrades gracefully into exactly this toolbar.

**Rejected — C "Conversation-first"** (assistant as the primary surface):
matches how the audience already uses AI tools, but hides the code — the
opposite of teaching — and is unusable without a paid model behind it (the
scripted demo cannot carry it). Kept as a horizon: B's assistant column can
grow C's plan-card language later without a re-architecture.
