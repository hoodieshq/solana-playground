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
  set, the assistant's GradientButton, and
  `views/sidebar/explorer/Component/Folders.tsx` and
  `views/sidebar/explorer/Component/Workspaces.tsx` (explorer rows and
  section labels restyle).

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

---

## D11 — Provider presets pin a concrete model id, and we bump it when a vendor retires one

**Date:** 2026-08-20 · **Status:** chosen

`gemini-2.5-flash` stopped answering for new keys — Google returns 404 naming
`gemini-3.6-flash` as the migration target — so the Gemini preset in
`model/types.ts` now points at 3.6. The model field stays editable on the
connect screen, which is what keeps a stale default a nuisance rather than a
wall.

**Rejected — a floating alias** (`gemini-flash-latest` and friends): the model
under the alias changes without notice, and with it the price, the tool
behaviour and the thinking parameters. A demo that silently switches models is
worse than one that fails loudly on a dead id.

**Rejected — probing `GET /models` on connect to pick automatically:** an extra
round-trip plus a key-scoped call before the user has committed to anything, to
solve a problem that is one string edit. Revisit if presets rot more than once
per milestone.

**Revisit when:** a second preset dies inside one milestone — at that point the
id list wants a dated table and a liveness check, not four literals.

---

## D12 — Ecosystem grounding: MCP through Anthropic's connector, skills loaded by a tool

**Date:** 2026-08-20 · **Status:** chosen

Two sources, wired two different ways.

**MCP goes through the Anthropic connector.** The request carries
`mcp_servers` plus one `{type: "mcp_toolset", mcp_server_name}` per server and
the beta `mcp-client-2025-11-20`; Anthropic opens the connection to the remote
server itself. Verified against SDK 0.117.1 that this composes with the Tool
Runner — `BetaMCPToolset` is a member of `BetaToolUnion`, and
`BetaToolRunnerParams` is `Omit<MessageCreateParams, 'tools'>` plus a tools
array of `BetaToolUnion | BetaRunnableTool`, so MCP toolsets and our own tools
sit in one runner. That was the open question in
`research/2026-08-20-model-and-agent-strategy.md` §5.

**Why not a browser MCP client.** `mcp.solana.com` sends no CORS headers — its
preflight returns 405 — so the browser cannot call it at all. The connector
sidesteps that entirely because the browser is never a party to the
connection.

**Skills are loaded by a tool, not injected.** `list_skills`, `load_skill`,
`read_skill_reference`, backed by a registry in
`views/sidebar/assistant/grounding/registry.ts`. Only names and descriptions
reach the system prompt; bodies come back as tool results, which keeps the
cached prompt prefix byte-stable. The official Solana skill is fetched live
from `raw.githubusercontent.com` (which does send
`access-control-allow-origin: *`), so it cannot rot into a stale vendored
copy; our own playground-environment skill is bundled so something always
loads offline.

**What this costs us.**

- **MCP is Anthropic-only.** Gemini and the other OpenAI-compatible endpoints
  have no server-side remote MCP, so they get skills and no MCP. The Sources
  tab says this rather than showing a toggle that does nothing.
- **No custom headers.** `BetaRequestMCPServerURLDefinition` accepts `name`,
  `type`, `url` and `authorization_token` — there is no header map. The
  registry entry keeps an optional `headers` field so the shape is ready for
  the proxy, but nothing sends it today.
- **The query string is the escape hatch, and it works.** A credential a server
  wants outside the `Authorization` header can ride in the URL, so an entry's
  `queryParams` is folded into it before the request goes out. **Verified
  2026-08-20:** a POST to `explorer.solana.com/mcp` carrying a real
  `x-vercel-protection-bypass` query param returns `200` with no
  `x-vercel-mitigated` header, where the same request with a wrong value
  returns the `429` challenge. So the bypass documented for deployment
  protection does also satisfy challenge mode, and Explorer is reachable
  through the connector without a proxy.
- **The Explorer MCP ships disabled, with the bypass key spelled out and its
  value blank.** The secret is the user's, so it is filled in at runtime in the
  Sources tab and lives in memory only, like the API key (D3). Note it travels
  to Anthropic inside the request URL and will appear in their logs much as an
  auth token would.

**Configured as JSON, not a form.** The server list is edited as one JSON
document in the panel's Sources tab. A per-field form cannot express
`queryParams` and `headers` without becoming a nested key-value editor in a
sidebar, and MCP configuration is already JSON everywhere else in the
ecosystem. The parser rejects what would otherwise fail confusingly later:
duplicate ids (the API rejects repeated `mcp_server_name`s mid-turn), non-https
URLs (the connector reaches public https servers only), and a blank credential
on an enabled server (which reads as "MCP is broken" rather than "you left a
field empty").

**Rejected: a same-origin proxy** (a `vercel.json` rewrite plus a craco dev
proxy, fronting a small browser MCP client). It would give every provider MCP
*and* allow arbitrary headers, but it is our own infrastructure to run and
debug — including SSE passthrough and `Mcp-Session-Id` handling — for a
milestone whose point is that no backend of ours is required.

**Revisit when** any of these becomes true:

- The demo has to run MCP on a non-Anthropic backend — then the proxy above,
  or D1-B's service, is the answer.
- A server needs a credential that genuinely cannot ride in the query string,
  which is the same trigger.
- Putting a secret in the URL stops being acceptable — a proxy is also the
  answer to keeping it out of the request line.

---

## D13 — The Anthropic backend picks its model and effort, and Haiku is not offered

**Date:** 2026-08-20 · **Status:** chosen

`model/anthropic.ts` hardcoded `claude-opus-5` at `effort: "high"`. Both are now
picked on the connect screen, the way the OpenAI-compatible backends already
pick a base URL and model. The default is unchanged, so nothing about D1
changes — Opus 5 is still what you get without touching anything.

**Why.** MCP only works on the Anthropic backend, and the Anthropic API has no
free tier, so every MCP demo costs real money. Effort and model are the two
levers; by the estimates in `research/2026-08-20-model-and-agent-strategy.md`
§3, a build-error turn is roughly $0.12–0.20 on Opus 5 and $0.05–0.08 on
Sonnet 5. A demo should not sit on the most expensive setting by default with
no way down.

**Why Haiku 4.5 is not in the list.** It would 400. The provider sends
`thinking: {type: "adaptive"}` and `output_config: {effort}`; Haiku 4.5
supports neither, and would need the older `budget_tokens` shape and no effort
at all. Offering it would mean branching the request per model, which is more
than the saving is worth — Sonnet 5 at `effort: "low"` is already cheap. If
someone wants Haiku later, the request builder is where the work is, not the
model list.

**Revisit when** a model we want to offer needs a different request shape —
that is the point to branch the builder rather than keep the list to models
that happen to share one.

---

## D14 — The user stays in control of a turn: leave, stop, and propose

**Date:** 2026-08-20 · **Status:** chosen

Four affordances the panel was missing, all in the same spirit as "propose
automatically, apply explicitly":

- **A way back to the backend picker.** `PgAssistant.disconnect()` existed but
  nothing called it, so picking a backend was a one-way door for the tab. The
  chat now carries a bar naming the live backend with a **Change** button;
  the picker gets **Back to chat**. Re-picking the same backend keeps the
  conversation, switching to a different one clears it.
- **Stop.** `Provider.send` takes an `AbortSignal`, threaded to `fetch`, to the
  Anthropic tool runner's request options, and to the scripted provider's
  typing loop. Send becomes **Stop** while a turn is in flight.
- **"Make this change".** Models often describe an edit in prose instead of
  calling `write_file`. The newest reply carries a button that asks for the
  same edit as a patch, which arrives in the usual approval card.
- **A context row that matches the payload.** It read as one attached file
  while `describeProject()` was sending the whole tree; it now reports
  `N files · N open · <name> active` from the same bridge call the prompt uses.

**Why the switch clears the chat.** History lives inside the provider object,
not the store. Carrying the transcript across a switch would show a
conversation the new backend cannot see, and re-sending it is not free.

**Why Stop also denies pending approvals.** Aborting the request is not enough:
a state-changing tool `await`s `requestApproval` and holds the agent loop open
until the user clicks. Stop aborts *and* denies, and every provider re-checks
the signal after a tool returns so a stopped turn cannot start the next
request.

**Rejected: parsing the prose and applying it directly.** It would mean
guessing the file and the edit from prose — exactly the class of silent wrong
write the approval gate exists to prevent. Two clicks (ask for the patch, then
apply the diff) keep the model responsible for the edit and the user
responsible for accepting it.

**Rejected: skipping the diff because the user already clicked.** The click
approves *asking*; only the diff shows what the model actually decided to do.

**Revisit when** a provider streams patches structurally (a diff part rather
than prose), which would let the button apply a known edit instead of asking
for one.

---

## D15 — The assistant is the page the app opens on, and the first icon in the rail

**Date:** 2026-08-20 · **Status:** chosen

`routes/common.tsx` defaulted the sidebar to `Explorer`; it now defaults to
`Assistant`, and `assistant` moved to the front of `SIDEBAR` so the rail's top
icon matches the panel that opens.

**Why.** The fork exists for the assistant. Landing on the file tree buries the
thing we are asking people to try, and the tree is one click away.

**How.** The literal `"Explorer"` in `routes/common.tsx` became
`DEFAULT_SIDEBAR_PAGE`, exported from `views/sidebar/sidebar.ts` — the fork's
own file — so flipping the landing page is a one-word edit and the two
`Explorer` fallbacks cannot drift apart. That file is byte-identical to
upstream otherwise, which is why the change is a constant rather than a second
literal.

**Not changed:** `routes/tutorials/tutorials.tsx` still falls back to
`Explorer` inside a tutorial, where the file tree is the point and each
tutorial step sets its own page anyway.

**Revisit when** the panel stops being the fork's headline, or the rail grows
enough that its order needs a rule rather than a judgement.

---

## D16 — Friction log: opening an unstarted tutorial from an active project
can crash and bounce back to `/`

**Date:** 2026-08-21 · **Status:** logged, not fixed (out of scope for the
gallery)

**What happens.** The New Workspace gallery's Tutorials tab calls
`PgTutorial.open(name)` — the same call `TutorialCard.tsx` already makes. For
a tutorial that has **not** been started yet, clicked while a real project
(e.g. `flow-demo`) is the active workspace, the app briefly navigates to
`/tutorials/<name>`, then either throws `Current tutorial has not been set`
(shown by the generic `ErrorBoundary`) or silently lands back on `/` with no
visible error. An **already-started** tutorial opens correctly from the same
starting state — the failure is specific to the first-time transition.

**Root cause.** `routes/tutorials/tutorials.tsx`'s `handleTutorial` calls
`PgExplorer.init({ name: tutorial.name })` for an unstarted tutorial, which
has no persisted workspace to switch to and falls back to keeping the
previously-active one. That still fires `PgExplorer.onDidSwitchWorkspace`,
and `handleTutorial`'s own listener for that event
(`if (name !== tutorial.name) { ... else PgRouter.navigate(); }`) reads
"switched to `flow-demo`, which isn't a tutorial" and navigates to `/`
(`utils/router.ts`'s `PgRouter.init()` does the same on any thrown
`route.handle()` rejection) — racing against `<Tutorial>`'s own render, which
is why the symptom alternates between a clean bounce and a caught crash.

**Why not fixed here.** `routes/tutorials/tutorials.tsx` is shared with the
classic layout and not on the touch-list for this branch (`CLAUDE.md`'s merge
safety table doesn't list it, and D15 explicitly treats it as untouched). The
classic UI never hit this path because its only route to a tutorial goes
through the Tutorials list page first, which has no active workspace to
switch away from — the gallery is the first place in the app that lets you
jump directly from a live project into an unstarted tutorial in one click.

**Confirmed scope.** Reproduced with two different unstarted tutorials
(`Hello Anchor`, `Hello Solana`) from an active `flow-demo` project, in the
Flow layout. Opening an **already-started** tutorial — from the same active,
unrelated project — works cleanly with no crash. A hard page load straight to
`/tutorials/<name>` also works, since nothing is active to switch away from.

**Revisit when** someone picks up the gallery's follow-ups: likely fix is
either guarding `handleTutorial`'s `onDidSwitchWorkspace` listener against the
"explorer fell back to the previous workspace" case, or having
`PgExplorer.init` distinguish "switched" from "stayed put" so the listener
doesn't fire on a no-op.
