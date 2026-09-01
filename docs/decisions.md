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

**Root cause (revised in fix round 1 — the original diagnosis below was
wrong).** The original write-up blamed `PgExplorer.onDidSwitchWorkspace`, on
the theory that `PgExplorer.init({ name: tutorial.name })` falls back to the
previously-active workspace and still fires that event. Verified against
`explorer.ts` and that is not what happens: `init()`'s workspace branch
(`explorer.ts:137-145`) is `if (workspaceName && allWorkspaceNames.includes
(workspaceName)) { switchWorkspace(...) } else if (allWorkspaceNames.length
=== 0) { ...reset... }`. For an unstarted tutorial opened from an active
project, `workspaceName` (the tutorial's name) is truthy but not in
`allWorkspaceNames`, and `allWorkspaceNames.length` is not `0` (the active
project is still there) — so neither branch runs, `switchWorkspace()` is
never called, and `ON_DID_SWITCH_WORKSPACE` never dispatches (it is only
ever dispatched from `switchWorkspace()`, `explorer.ts:526`, and
`deleteWorkspace()`, `explorer.ts:576`). The `onDidSwitchWorkspace` listener
inside `handleTutorial` cannot be the trigger here.

A more direct match is `routes/tutorials/tutorials.tsx`'s own
`onDidChangeCurrentSidebarPage` listener (`tutorials.tsx:105-124`), which has
an explicit unstarted-tutorial branch:
`else if (!PgTutorial.isStarted(tutorial.name)) PgRouter.navigate();`. When
`PgTutorial.open(name)` navigates to `/tutorials/<name>` with no page number,
`handleTutorial` sets `PgView.sidebar.name = "Tutorials"` for the no-page
case (`tutorials.tsx:152`), which changes the derived `currentSidebarPage`
and fires this same listener with `p.name === "Tutorials"`, taking the
`PgTutorial.openAboutPage()` branch instead — and that throws because
`PgTutorial.current` is not set yet (`PgTutorial.refresh()` in the async
`setMainPrimary` callback hasn't resolved), which matches the observed
crash. The `!isStarted` branch quoted above is the one that produces the
silent bounce-to-`/` symptom on a subsequent sidebar-page change during the
same race. In short: two branches of the same listener, both reachable
because of the timing race between `setMainPrimary`'s async body and the
synchronous sidebar-name assignment right after it — not confirmed which
exact interleaving produces which of the two observed symptoms on a given
run.

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

**Revisit when** someone picks up the gallery's follow-ups: likely fix is in
`handleTutorial`'s `onDidChangeCurrentSidebarPage` listener
(`tutorials.tsx:105-124`) — either sequencing it after
`PgTutorial.refresh()` has resolved so `PgTutorial.current` is set before
`openAboutPage()` can run, or guarding both branches against a sidebar-name
change that happens before the tutorial's own explorer/workspace state has
settled.

---

## D17 — Flow shipped as the default layout, classic behind a flag

**Date:** 2026-08-21 · **Status:** implemented (prototype)

`views/flow/` composes the existing bricks into the D10 anatomy and is
mounted by `app/Panels/Panels.tsx` unless `?classic` is present — the only
pre-existing file this iteration edits. Stepper state is derived, not
stored: build start/finish from `PgCommand.build` and the D4
`PgBuildOutput`, deploy from `PgCommand.deploy`. Deploy history is a new
client-side store in `localStorage` keyed by workspace.

**Rejected — editing `Panels/Main` and `Side` in place:** it would spread
the change over three upstream files for no gain over a sibling layout.

**Rejected — compiling ecosystem programs:** the crate whitelist and
anchor-lang 0.29 make it impossible; they open as normal, editable projects
through the same `PgGithub.import` mechanism upstream already uses, and the
gallery says so rather than claiming they will build.

**Learned during the build:**

- The header stepper (`STAGES` in `state/stage.ts` — write, build, deploy,
  interact, four stages) and the Build surface's diagnostic list share one
  parsing convention rather than two independent ones. `state/stage.ts`'s
  `countErrors` and `stages/build-report.ts`'s `parseBuildReport` both match
  rustc's `error(?:\[E\d+\])?:` header and both exclude the same
  `could not compile` / `aborting due to` summary lines through a `SUMMARY`
  regex, cross-referenced by comment between the two files, so the
  stepper's "N errors" badge and the report's own diagnostic count share
  one parsing convention; the surface falls back to the header count when
  no diagnostic parses, so the two numbers never visibly disagree even on
  output the regex can't split into diagnostics.
- `Write` (which hosts upstream's `Primary`) stays mounted at all times in
  `StageRouter` and is only ever hidden with CSS, never unmounted on a stage
  switch — `Primary`'s content is handed to it once through a one-shot
  custom event, so unmounting Write would leave it permanently blank the
  next time it becomes visible again.

**Friction:**

- Devnet airdrop returned 429 (rate limited) during live deploy
  verification; the demo wallet has to be pre-funded ahead of time rather
  than airdropped on demand.
- Importing `spl-token-2022` in a program fails with "Could not identify
  framework".
- The build server URL has to be set to SolPg (gear → Build server URL) for
  local builds against `localhost:3000` to succeed at all.
- Upstream's `CreateWorkspace` modal logs a pre-existing unmounted-setState
  warning, unrelated to anything this branch touches.

**Revisit when:** the stepper is tested with newcomers (D10's trigger), or
when the classic layout has had no use for a milestone — then delete it.

## D18 — Flow visual parity — the concept boards are the source of truth for Flow chrome

**Date:** 2026-08-21 · **Status:** implemented (prototype)

D17 shipped Flow's anatomy (panels, stepper, stages) in the pre-existing
component styling — upstream chip/card/button looks, not the language the
concept boards (`docs/design/screenshots/concept/b-flow-*.png`) actually
draw. This iteration re-skins the same anatomy against those boards, token
by token, with no behavior change: `views/flow/**` and the assistant
header only.

**Matched** (see `docs/design/screenshots/flow-visual/README.md` for the
side-by-side screenshots): the floating-panel language (gutters, 1px
border, corner radius, raised background) across the left/center/right
columns and the console drawer sitting inside the center panel; the header
(gradient logomark, project switcher, centered pill stepper with
shape-coded status, right-aligned cluster/wallet/gear chips); the bare
`FILES` tree with a plain `+ New file` footer, workspace picker and
per-section action buttons hidden; the console collapsed to a one-line
status handle; the humanized Build card with a real-source excerpt around
the failing line, not just rustc's own gutter snippet; the assistant
header's eyebrow + live chips above the tab strip; and card language
("Latest deployment" / "History", a header meta line) on Deploy and
Interact.

**Deliberately left:** the editor's own tab strip (upstream
`EditorWithTabs` chrome, untouched); syntax highlighting inside the Build
excerpt (plain monospace, not the editor's tokenizer); the assistant's
internals below the header (chat bubbles, composer, backend picker —
unchanged from the prior iteration); `Test.tsx`'s account/instruction
cards on Interact, unverified against the board this pass because the
session's wallet held 0 SOL and the devnet faucet returned 429 (D17
already logged this same friction) — the header and toolbar match, the
populated panel does not.

**The CSS reaches into upstream DOM, on three call sites, each with a
documented failure mode:**

- `left/LeftPanel.tsx`'s `ExplorerContainer` hides Explorer's workspace
  picker, icon toolbar and per-section Build/Deploy/Run/Test buttons via
  structural (`nth-child`) selectors anchored on `#root-dir` and this
  wrapper's own DOM position — none of the hidden elements carry a stable
  `id`/`class`. Guarded with `:has(> button)` so a selector only ever
  matches a section-header row, never a folder/file row. Failure mode: a
  project with *no* workspaces renders Explorer's single-branch "create a
  project" empty state instead of Workspaces + Folders — the same
  first-two-children rule would hide that state's intro line and "Create a
  new project" button too, but Flow only mounts once a project is open, so
  this should not occur in practice. Fixed this iteration:
  `024e836d` guards the Program-section rule so a project without `src`
  (no Build/Deploy buttons rendered at all) does not have the guard
  misfire.
- `settings/GearSidebar.tsx`'s `SettingsFrame` strips upstream
  `Settings`'s own popover chrome (background, border, shadow, sizing) by
  overriding its single root `<div>` through a `> div` descendant
  selector, so it reads as a continuation of the panel instead of a nested
  card. Failure mode: if upstream `Settings` ever wraps its root in an
  additional element, the selector stops matching and the popover chrome
  reappears nested inside the panel — a visual regression, not a broken
  one, and one `craco start` would show immediately.
- `gallery/NewWorkspaceModal.tsx`'s `ModalWidthOverride` widens
  `components/Modal`'s hardcoded `max-width` via a global `:has(> * > *
  > [data-gallery-modal])` selector three direct-child hops above a
  `data-gallery-modal` marker this component itself renders — chosen so no
  other modal in the app can match the same shape. Failure mode: if
  `components/Modal`'s own wrapper depth ever changes, the hop count goes
  stale and either stops widening this modal or (if the count coincides)
  widens the wrong one; the marker attribute makes the second case
  vanishingly unlikely.

**Two `PANEL_RADIUS` constants, to reconcile:** `views/flow/tokens.ts`
defines its own `PANEL_RADIUS = "12px"` for the three floating panels,
separate from the Solana V2 theme's `PANEL_RADIUS = "14px"`
(`themes/solana-v2/theme.ts`, used by the editor/terminal/sidebar page
chrome elsewhere). They were tuned independently against the boards and
happen to read close enough not to clash, but two names for the same
concept in one theme is an accident waiting to surprise the next person
who greps for one and finds the other.

**Revisit when:** upstream changes the Explorer DOM shape enough to break
the `#root-dir` selectors above (watch `views/sidebar/explorer/**` diffs),
or when the concept boards themselves change and Flow's chrome needs a
second pass to follow.

---

## D19 — Corrects D12: MCP is per-server, not per-provider, and we run the gateway

**Date:** 2026-08-21 · **Status:** chosen · **Corrects:** D12

D12 recorded that MCP is Anthropic-only and that custom headers cannot be
delivered. **Both are wrong**, and the framing was the real error: it described
a symptom as a rule.

MCP tools are ordinary tools. Any backend that calls tools can use them — our
`ToolDefinition` layer is already vendor-neutral, which is why skills work
everywhere. The only thing that varies is **who executes the call**, and that
is a property of the server, not of the connected agent:

| Server | CORS | Executor | Reachable from |
| --- | --- | --- | --- |
| `explorer.solana.com/mcp` | `*`, session id exposed | `browser`, via our gateway | every backend, and the keyless console |
| `mcp.solana.com/mcp` | none (preflight 405) | `browser`, via our gateway | every backend |

Explorer's headers are read from `solana-explorer/app/mcp/route.ts`;
`mcp.solana.com`'s absence of them was measured twice, by curl and from a real
browser. So `McpServerEntry` carries `executor: "browser" | "server"`, the
Anthropic connector declares only `server` entries, and the browser client
handles the rest. Nothing is declared twice, so the model never sees one tool
from two sources.

**The gateway.** `client-v2/api/mcp.mjs` speaks MCP in and MCP out — the
JSON-RPC envelope is forwarded verbatim — so the browser client needs a
different URL and no second code path. `?server[]=solana&server[]=explorer`
selects upstreams and omitting it selects all; with several, `tools/list` is
merged with `<id>__` prefixes and `tools/call` routes on that prefix. Being
transparent rather than a bespoke JSON API is what lets the same client, and
the same local dev story, serve both paths.

**Upstreams are configured in the function and never taken from the request.**
A gateway that dials a caller-supplied host is an SSRF and an open relay;
defending it properly needs DNS-resolution checks, private-range blocks,
per-caller keys and rate limits, plus an encrypted blob to carry credentials
past Anthropic's connector, which can only pass a URL and a bearer token.
Refusing the input removes the class. Adding an upstream is a deploy.

**Explorer moved onto the gateway too (2026-08-21), reversing what this entry
first recorded.** Browser-direct was the plan while the bypass was thought of
as the user's own, pasted into the panel. It is not: the secret we have is one
for everybody, and a value the browser sends is a value in the bundle, which
`CLAUDE.md` forbids and which publishing would leak to every visitor. So the
gateway holds it, `MCP_EXPLORER_URL` moves the endpoint to a preview
deployment, and the panel entry is a gateway URL like Solana's.

What that costs is exactly the objection that kept Explorer off: fronting bot
protection the Foundation deliberately switched on hands anyone who finds our
endpoint a way around it. What keeps it narrow is that the upstream exists only
when `MCP_EXPLORER_BYPASS` is set, so a default deployment and every outside
checkout have no such hole. The variable is therefore for previews only:
**setting it on a public production deployment makes per-caller access keys a
prerequisite, not an option**, and is not a decision to take without talking to
whoever switched the protection on.

The bypass travels as an `x-vercel-protection-bypass` header rather than a
query param. Explorer's `Access-Control-Allow-Headers` omits it, so a browser
would fail preflight — irrelevant server-side, where there is no preflight,
and the form the Foundation's own MCP config uses.

**Consequence for D1 and the product claim.** "The assistant runs entirely in
the browser. No backend of ours" is no longer true. This is a narrow, scoped
version of D1-B: MCP transport only, no model calls, no quota, no key. D1-B
itself stays parked.

**Revisit when** the Explorer bypass is wanted on a production deployment, or
when a second shared credential appears — both point at the same place,
per-caller keys on the gateway.

---

## D20 — Local API routes are served by the dev server, not by `vercel dev`

**Date:** 2026-08-21 · **Status:** chosen, explicitly a stopgap

`api/*.mjs` is served in development by a middleware in `craco.config.js`.
`yarn dev` is craco and nothing else; `yarn dev-vercel` remains for exercising
the real runtime before a deploy.

**Why not `vercel dev`, which was the first attempt.** It calls the Vercel API
to retrieve the project before serving anything, so it needs `vercel login`
*and* membership of this team. For a project whose principle is "everything
stays open source", that would make the API-serving dev command unavailable to
any outside contributor — they would be stuck on `craco start`, which serves no
`/api` path, and so could not develop the gateway at all. Next.js would have
given us a local route runner for free; CRA has none, so we supply the missing
piece ourselves.

**Shape.** Handlers are plain ESM on raw Node `req`/`res`: `api/` sits outside
the TypeScript build (`tsconfig.json` includes `src` only, so TS there would be
unchecked anyway), and `VercelResponse` extends Node's `ServerResponse`, so one
file runs unchanged under the dev server, `vercel dev`, and a deployment. The
middleware wraps CRA's `onBeforeSetupMiddleware` rather than using
`setupMiddlewares`, because webpack-dev-server 4 throws if both are set and CRA
sets the deprecated one.

**An unknown `/api` route 404s** instead of falling through. Falling through
hands it to the history fallback, which answers `200 text/html` with
`index.html` and surfaces in a client as `Unexpected token '<'`. The same trap
already bites elsewhere: `/crates/*.toml` is missing unless `generate-crates`
has run, so rust-analyzer parses `index.html` as TOML and panics — visible in
the console on every dev boot.

**Route names are constrained to `^[a-z0-9-]+$`** rather than sanitised, since
the path selects which module is imported. Encoded traversal, suffixed
traversal, nesting and casing were all checked.

**Revisit when** this app moves to a framework that owns its own API routes.
These handlers belong there, and this adapter should be deleted rather than
maintained.

---

## D21 — Reprioritized: GitHub identity first, tutorials second, wallet later

**Date:** 2026-08-24 · **Status:** chosen, after team-lead feedback

The team meeting produced three candidate work streams. We ordered them:

1. **Sign in with GitHub ID.** Enables airdrop and the future features the
   Solana Foundation would build around models/agents. Feedback from Cat:
   signing in only pays off if programs are saved per user instead of in
   local storage — so this stream implicitly includes persistent project
   storage, which by our own constraint cannot live in `server/` and needs
   a separate service.
2. **Tutorials as a scenario.** Suggestions for tutorials — connected
   tutorials, learning curves, connected prompts for agents. Cat has a demo
   of how tutorials would work (currently broken, but the intent reads).
3. **Wallet-adapter integration — deprioritized.** It was Focus 2 in the
   product brief.

**Why wallet moved down.** It cuts through the deploy process and the whole
wallet flow — exactly the hottest upstream files (`commands/deploy/deploy.ts`
at 29 commits in six months, `utils/wallet/wallet.ts` at 9), so it is the
riskiest stream for merge safety, and it earns little visible value right
now compared to identity and tutorials.

**Left uncertain by the team, not scheduled:** updating Anchor to a modern
version, and better builds with Kora. Both partially blocked by Acheron's
grant.

**Revisit when** the GitHub OAuth stream lands, or when mainnet-facing work
makes the local-keypair wallet an actual blocker rather than a mismatch.

---

## D22 - GitHub imports read the repository layout from the Trees API

**Date:** 2026-08-26 - **Status:** implemented (PR #14)

Upstream's `PgGithub` walked a repository with one `api.github.com/.../
contents` request per directory, with a `TODO` acknowledging the cost. The
unauthenticated API budget is 60 requests per hour per IP, so a single
import of a repository with more than a handful of folders exhausted it -
reproduced live, request #63 onward returned `403`. Because
`PgCommon.fetchJSON` never checks `response.ok`, the `403` body was parsed
as a directory listing: the walk found nothing, the import produced zero
files, and nothing threw. The gallery's Open button appeared dead.

**Chosen:** one `GET /repos/{owner}/{repo}/git/trees/{ref}?recursive=1`
request for the whole layout, file contents from
`raw.githubusercontent.com` (outside the API rate limit) eight at a time
with order preserved, and explicit status handling that turns a rate limit,
a missing repository, a truncated tree or an empty match into a message the
UI shows. One API request per import instead of one per directory.

**Rejected - fixing `PgCommon.fetchJSON` to throw on `!response.ok`.** It
would surface the failure but not prevent it, and `common.ts` is one of the
hottest upstream files (15 commits in six months). Every caller would
inherit new throwing behavior in the same change. The fix belongs in
`github.ts`, which the fork can own.

**Rejected - authenticating the requests with the OAuth token from D19.**
It raises the limit to 5,000/hour but makes importing a public example
require sign-in, and the token would have to reach a module that runs
before identity exists. The Trees API removes the pressure without it. If
imports ever need private repositories, the token becomes the reason to
revisit - not the rate limit.

**Rejected - importing a truncated tree anyway.** GitHub truncates trees
above ~100k entries. A partial import that silently drops files is the same
class of failure this decision exists to remove, so a truncated tree is
refused with an explanation instead.

**Revisit when** imports need private repositories, or when a legitimately
huge monorepo makes the truncated-tree refusal a real obstacle - a
subtree-scoped Trees request on the parent tree would be the answer.

**Follow-ups inside the same PR (2026-08-26 evening).** Manual testing
turned the fix into four more: 24 parallel downloads instead of 8
(`raw.githubusercontent.com` is HTTP/2, so they multiplex on one
connection - 190 files went from ~8.9 s to ~0.5 s on a cold CDN);
skipping paths that match a supported language but never hold program
source (`node_modules`, `target`, `dist`, `build`, `coverage`, `.git`,
`.github`, `package-lock.json`); a progress callback so the card says
"Downloading 84/195 files..." rather than spinning; and moving the
"which program?" question ahead of the download, which is the part that
matters - a monorepo card used to download all twelve programs to keep
one. The picker lives in `frameworks/` and is reached with a dynamic
import, the same way frameworks lazy-load their conversion modules.

**One upstream file changed:** `frameworks/anchor/anchor.ts`. Its
framework check bowed out on any `.py` file, on the grounds that every
Seahorse workspace is a valid Anchor workspace; marginfi keeps
`fuzz/generate_corpus.py` next to the program, so it was unimportable
("Could not identify framework"). The check now matches Seahorse's own -
a Python file importing `seahorse.prelude` - which is what the upstream
TODO above it asks for.

---

## D23 - `popup.closed` is not a cancellation signal for an OAuth popup

**Date:** 2026-08-27 - **Status:** implemented (PR #17)

`popup-channel.ts` waited for the sign-in reply and, in parallel, polled
`popup.closed` every 500 ms to notice a user who dismissed the window. That
poll is the reason sign-in failed on the first attempt and worked on the
second.

Once a popup commits a cross-origin document that sets COOP - which every
GitHub login and consent page does - the browser swaps the browsing context
group and disowns the handle the opener holds. `closed` then answers `true`
while the window is still on screen and the user is still typing in it. The
poll declared the flow over about a second after the click; the real reply
arrived minutes later on the same-origin `BroadcastChannel` with nothing
listening. Only the *first* authorization is affected: once the grant
exists GitHub answers `/login/oauth/authorize` with a bare redirect, no
document is committed, and the handle survives - which is why this looked
like flakiness rather than a defect, and why every new user would meet it.

**Chosen:** the wait ends on an accepted reply, on an explicit `cancel()`,
or on a timeout tied to the handler's cookie lifetime. `popup.closed` is
not consulted at all. The lifetime moved to `config.mjs` as
`FLOW_MAX_AGE_SECONDS`, so the browser's wait and the server's cookies read
one value - a wait outliving the cookies would strand the user on a flow
the server has already forgotten. Because nothing can now tell the app that
a user dismissed the window, the header grows a visible `Signing in...`
state with a `Cancel` beside it; without that the only exit would be the
ten-minute timeout.

**Rejected - a grace period after `closed` turns true.** The obvious
patch: on the first `closed` reading, wait a few seconds for a reply before
giving up. It does not work, because severance happens when GitHub's login
page loads, and the user still has a password, possibly 2FA, and a consent
screen ahead of them. The grace would have to span the whole flow, which is
the timeout above with extra machinery and a worse name.

**Rejected - detecting severance to keep close-detection in the good
case.** A severed handle and a genuinely closed window are indistinguishable
from the opener: both report `closed === true`, and any attempt to read the
popup's `location` throws either way. Heuristics on timing ("closed within
two seconds of opening means severance") would trade a real bug for an
unpredictable one.

**Rejected - keeping `sawRejected` on every same-origin message.** Any
same-origin `postMessage` used to mark the flow as having seen a forgery,
and the page has plenty - the project iframe among them. So a wait that
merely ran out was reported as "could not be verified", which is what sent
the diagnosis after a security problem that did not exist. Only our own
message shape may count as a claim now; the window-binding check that
guards against a genuine forgery is untouched.

**Revisit when** the Better Auth swap in `api/github-oauth.mjs`
(`FIXME(@rogaldh)`) happens - it owns the same transport and should inherit
this constraint rather than rediscover it - or if a browser ever offers a
way to distinguish a disowned handle from a closed window.

---

## D24 - A lesson step is finished by the toolchain, not by a click

**Date:** 2026-08-27 - **Status:** merged 2026-08-28 (#19, `1d908844`),
**amended in review - see the amendment at the end of this entry**

Spec: `docs/superpowers/specs/2026-08-27-tutorials-as-scenario-design.md`
Plan: `docs/superpowers/plans/2026-08-27-tutorials-as-scenario.md`
Research: `docs/research/2026-08-27-tutorials-as-scenario.md`

Upstream ships twenty tutorials whose only completion signal is that the
user reached the last page. That cannot tell whether anyone learned
anything, and cannot tell its maintainers when a tutorial has rotted.

**Chosen:** a lesson path is an ordered list of steps over an unmodified
upstream tutorial, and a step is satisfied by state the client already
holds - `FlowState`'s build and deploy status, and the IDL an Anchor build
regenerates. Authored content is limited to the objective, the
verification condition in the learner's words, and three hint prompts.
The compiler supplies the answer key.

The `idl` condition is what makes this worth building: after a successful
build the regenerated IDL is a real artifact of the learner's own code, so
"`hello` now takes a `name`" is checkable for free, with no RPC and no
hand-written checker. The seeded program is a single comment, so the first
step cannot be satisfied by anything but a real compile.

**Rejected - hand-written per-step checkers.** The authoring cost that
kills these products, and unnecessary when the toolchain already answers.
The research note covers TutorialKit, Epic React and Killercoda: high
quality, low scalability, and the reason content rots once the authors move
on.

**Rejected - our own verification service or credential.** Blueshift
already does verified builds and on-chain credentials. Teaching and
credentialing stay separate concerns owned by separate products.

**Rejected - a fourth column for lesson prose.** Textbook simultaneous
visibility, but on a 1440px screen it leaves the editor about 560px, where
Rust with Anchor types begins wrapping, and it puts two reading columns
either side of the code.

**Rejected - merging the lesson into the assistant column** (what Cat's
prototype does): cheapest and it demos well, but one scroll serves two jobs
and the objective is gone three turns into a conversation. It also blurs
authored curriculum and generated answers into one voice.

**Two guardrails are load-bearing, not decoration.** A three-rung hint
ladder whose rung is named inside the prompt, and an unaided-first-attempt
gate. *The Effortless Trap* (2026) found unguarded AI access left students
17% worse on unaided exams than a no-tool control, and that the same model
redesigned to withhold answers erased the harm. The lesson rules therefore
carry an explicit override saying they supersede the assistant's general
"lead with the answer" instruction - a policy stated *below* its own
contradiction is the failure mode, not a mitigation.

**Honesty constraint that shaped the content.** This cut verifies a build,
a deploy and the IDL. It cannot see a transaction or a client run, so a
step that is not machine-checked says so: its band line reads "Not
machine-checked" rather than "Verified when". A guard test asserts a
reading step's copy never claims program behaviour was observed. The first
version shipped a `read` step advertising "Verified when you have run the
client and read its output", which the final review caught - the mechanism
was honest and one word of copy undid it.

**Revisit when** a second lesson path exists - step ids are not
path-scoped today, and both the hint counter and the reader's key use a
bare id - or when the Interact stage can hand us a transaction signature,
which is what a `log-contains` condition needs.

**Amended 2026-08-28, by rogaldh, before merging.** The monotonic half of
this decision did not survive contact with a learner. The objection: the
flow only lets you through once a step is complete, and *the criterion for
a complete step is itself unclear* - so in hackathon conditions the
strictness costs more than it buys. The learner can now move past a step
without proof, and walk back to any earlier step.

**What the amendment deliberately did not touch**, and why it is an
amendment rather than a reversal: only the toolchain can still mark a step
*proved*. A pass-without-proof is recorded in a separate `skippedStepIds`
field, never in `completedStepIds`, so the record cannot claim a
verification that did not happen; and a later build that does satisfy the
condition upgrades the skip into a real completion. `stepBack` is pure
navigation and leaves every mark alone in both directions. The accurate
statement is therefore no longer "the path is monotonic" but **the ledger
is monotonic; the learner's position is not**. The spec's "Monotonic by
construction" section is superseded on the second half only.

**What this leaves open**, all three recorded in
`docs/lesson-paths-todo.md` on `master-2.0`, deliberately placed beside
the code rather than here:
- The criterion is illegible, which is the actual complaint. `LessonStep`
  already carries `target: Stage`, used today only for a tooltip; promoting
  it to the action the objective band offers is what tells a learner that
  Build is the thing that proves this step. Observed failure: after the
  assistant wrote the file, nothing signposted the build, and the learner
  reached for the escape valve instead.
- Whether monotonicity comes back at all is Cat's conversation, because it
  depends on what counts as proof for a step no free artefact can grade -
  `hello-anchor` step 3 being the live example.
- The guards now live at call sites rather than in a transition table,
  which is how both of the bugs found on 2026-08-28 got in. A real
  `StateMachine` with an event log is the structural answer, and it is
  also what would let the agent drive a lesson by emitting the same events
  a human does, with provenance recording who advanced each step.

---

## D16 - Resolved 2026-08-27: two races, not one

The friction logged in D16 is fixed on `feat/lesson-paths`, and the
original diagnosis was incomplete in a way worth recording.

The guard D16 predicted - `PgTutorial.current` being read before the async
`refresh()` inside `setMainPrimary` resolves - is real and necessary, but
**it does not fix the crash on its own.** A second race sits behind it:
`currentSidebarPage` is a derivable whose recompute is dispatched through a
debounced batch, so when `sidebar.name` changes twice in quick succession
the earlier change's callback can still fire after the later one,
delivering a stale value that no longer matches the live sidebar page. Both
guards are needed; verified with instrumented traces, and the e2e
reproduced the failure before the fix and passed after.

Note for whoever touches this next: `app/Panels/Side/Side.tsx` and
`Right.tsx` subscribe to the same derivable and may carry the same latent
staleness. Unverified.

The codebase already had a different remedy for this symptom class -
`await PgCommon.sleep(0)` before subscribing, at `routes/common.tsx:75-77`.
We used a listener-level guard instead because it is targeted rather than
reordering the whole `disposables` block, at the cost of two idioms for one
framework quirk.

---

## D25 - Lesson state is a ledger and a cursor, folded from an event log

**Date:** 2026-08-28 - **Status:** designed, not implemented

Spec: `docs/superpowers/specs/2026-08-28-lesson-state-machine-design.md`
Round brief: `docs/internal/2026-08-28-lesson-architecture-brief.md`
Answers the three tasks in `docs/lesson-paths-todo.md` on `master-2.0`.

D24's amendment left three things open: the criterion is illegible, the
guards live at call sites rather than in a table, and nobody had decided
what proves a step no free artefact can grade. They are one problem -
no chain worked through to the end, at either the UX or the logic level.

**Chosen:** the lesson's record becomes an append-only event log, read by
two independent folds. A per-step **ledger** over
`open | proved | attested | passed`, monotonic, where which edges a step
has is a function of its condition's grader class. A single **cursor**,
free to move anywhere `legal`, where `legal(i)` is `mark(i) != open` or
`i = frontier`. `completedStepIds`, `skippedStepIds`, `currentStepId`,
`attempted` and `attemptBaseline` all stop being fields and become
queries.

**The load-bearing rule: every guard reads the event, not the fold.**
That is the difference the two known bugs turn on. `advance` asks "is the
step under the cursor anywhere in the completed set" - true of every step
you can step back onto, so its documented promise to leave a reviewing
learner alone never held. The edge asks "did the step under the cursor
just become proved by *this* grade", which only an event can answer.

**A third defect, found while designing and worse than either.**
`continueRead` appends a click to `completedStepIds` - the exact field
this decision's parent reserves for toolchain proof. Reproduced by
compiling the merged `progress.ts` and running it, and the suite does not
merely miss it - `progress.test.ts:325` asserts it. So D24's central
sentence is false in the shipped code, and the model is not only bug
prevention: `attest` reaches `attested` and `proved` has exactly one
guard, so no click can reach it. `passed` and `attested` stay separate
marks because they are different facts - a criterion that went unmet
versus no machine criterion at all.

**Monotonicity, settled.** It never left the ledger, which is where D24
claimed it; what was missing was the claim's truth. Position stays free
permanently, because marks only grow and therefore `legal` only grows -
a position once reachable is reachable forever, which is the formal
reason the arrows need no escape hatch. `pass` stays available even when
every step is machine-graded, because no grader is provably right; once
the criterion is legible, the rate of passes becomes the signal that one
is wrong.

**The criterion becomes the interface.** `target: Stage` is deleted as an
authored field - it has already drifted, `hello-anchor` step 3 declaring
`target: "interact"` for a step no stage can prove - and the band's
primary action is derived from the condition instead. Preconditions
explain rather than fail: a deploy missing SOL says so, including that
the airdrop is behind GitHub sign-in since #9. Promoting the criterion
demotes **I'm stuck** to a secondary, which is guardrail 4 of D24 bought
by layout rather than by a disabled control.

**Rejected - a flat status enum plus an edge table.** The literal reading
of the todo and the smallest diff, but mark and position stay on one
axis, and one axis is what forces a guard to ask the ledger a question
about position. It also cannot answer provenance or the hint ladder at
all.

**Rejected - a machine library (XState or similar).** A dependency for a
three-state ledger, against a codebase whose convention is pure reducers
over named event unions - and it would not help, because the guards would
still need the event-versus-fold distinction that is the actual content
of the round.

**Rejected - unifying `PgFlow` and `PgAssistant` into the machine.** The
todo's "existing reducers as first citizens" reads that way, but `PgFlow`
drives the stepper, the stages and the chips, and rewriting it buys the
lesson nothing while putting the demo path at risk. It becomes an event
source. The chat's streaming and tool lifecycle has nothing to do with
lesson position.

**Rejected - back as replay to an earlier log index.** The todo proposes
it as the honest version of the arrows. A fold replayed to index `i`
would also drop proofs earned after `i`, which contradicts the monotonic
ledger. Replay is right for what the learner *sees* and wrong for what
the record *says*, so back appends a `move` event and truncates nothing.

**What proves `hello-anchor` step 3:** the transaction's own logs -
`getSignaturesForAddress(programId)` then `getTransaction`, reading
`meta.logMessages`. No captured signature, no Interact change, no answer
key, no relaxed prompt rule. **Rejected - snippet `match`:** an answer
key, which research finding 03 rules out, against tutorial code blocks
that are illustrative fragments rather than per-step solutions.
**Rejected for now - agent judgement:** contradicts `prompt.ts` and is
non-deterministic; it stays the last resort. The chosen grader is async
and can fail, so it cannot run on every state change - hence a third
grader class (synchronous / on-demand / attestation) in the table from
the start. Designing it in now means step 3 later changes only its
condition.

**The agent emits no ledger event.** It gets the same entry point and the
same event shapes a human uses - the todo's ask - but marking a step
changes state, so it proposes through the existing approval card and the
event lands as `{ actor: "learner", via: "agent" }`. That is what lets
the record say who advanced a step honestly, and it keeps the escape
valve something a learner takes rather than something an agent can
automate.

**Revisit when** Cat settles step 3's wording, which the mechanism now
allows but does not decide; or when a second lesson path lands, since
step ids are still not path-scoped.

---

## D26 - Business logic is graded by an authored test the client runs

**Date:** 2026-09-01 - **Status:** designed, not implemented

Raised by the team on the lesson walkthrough: deploy alone cannot grade
an advanced step - "it deployed" says nothing about what the program
does. The remedy the comment proposed was backend endpoints that would
go and test the deployed program.

**Chosen:** a `test` condition kind in D25's on-demand grader class. An
authored behavioral check in TypeScript, shipped with the lesson path
in the client bundle - never written into the learner's workspace,
where it would be editable and the grader forgeable - and run by the
same sandboxed runtime the product already uses for TypeScript tests,
against the learner's deployed program on devnet. It sits behind an
explicit button like every on-demand check. Pass emits `graded` and
the mark becomes proved; failure emits `checked: false` carrying the
test output, which goes to the assistant as context - "expected the
log to greet by name, the transaction logged Hello, World" is ready
fuel for the hint ladder.

Nothing changes in the machine: no new class, no new state, no new
edge. The conditions inventory grows by one. `logs` stays the cheap
declarative option of the same class; `test` is the escalation for
steps whose objective is behavior.

**Not an answer key.** Research finding 03 forbids authoring reference
solutions; a behavioral test is not one - any correct implementation
passes. What stays forbidden is matching the learner's source text.

**Not a reversal of D24's checker rejection.** D24 rejected
hand-written per-step checkers as the base mechanism, on authoring
cost. The base stays free (build, IDL, deploy); an authored test is an
opt-in escalation for the steps the free artifacts cannot see -
one test per advanced step, only where it is necessary.

**Rejected - grading endpoints on a backend.** (1) The fork has no
backend by hard constraint; server capacity for lessons would mean a
separate service with auth and rate limiting. (2) A backend buys no
secrecy: the client is open source, the test ships in the repo either
way. (3) D24 already rejected our own verification service - teaching
and credentialing are separate products, and credentialing is
Blueshift's. The client-side grader is honest-by-default, not
tamper-proof, and that is a deliberate stance: progress is local and
the stake is learning, not a credential. (4) The browser already has
everything the check needs - devnet RPC plus a TypeScript runtime.

**Also settled in the same discussion:** a path with no on-chain step
is legal by construction - deploy is one grader among several, not a
stage of every lesson. An on-chain step is the most expensive kind
(SOL, GitHub sign-in since #9, devnet rate limits), so including one
is a path-authoring decision, not a default.

**Revisit when** anti-cheat or credentialing becomes a goal - and the
answer then is the Blueshift integration, not our endpoint.

## D27 - September is a public launch: the floor, then ledger, then storage

**Date:** 2026-09-02 - **Status:** decided (Slava, closing the three
open questions of the 2026-09-02 scope handoff)

The frame changed on 2026-08-31: the project is handed to us for real
implementation, the deadline is the **end of September 2026**, and what
happens at the deadline is a **public launch** (chosen over a
conference demo; the owner's conference intent exists but has no date).
The hackathon premise - "the 2.0 line ships nothing" - is gone, and
every decision that rested on it is reopened, starting with "CI stays
as it is" from 2026-08-28.

**Chosen - the shape of the month.** Launching the current surface
unchanged was rejected by Slava ("this adds no value as a month's
product"); both durable identity (B) and the learning path (C) are
required. The order is C before B, and it is a dependency, not a
preference: D25 makes lesson state an append-only event log, while the
shipped record still lies (`continueRead()` writes a click into
`completedStepIds`, asserted by `progress.test.ts:325`) - storage
before the ledger would persist false verifications and then require
repairing both code and accumulated data; storage after the ledger
inherits an append-only log, the cheapest sync format there is. The
cheap half of B - a durable session as an httpOnly cookie issued by
our `/api` after the OAuth exchange - is independent and lands in
week 1.

Week 1: the production floor plus the durable session. Week 2: D25/D26
(the lesson-ledger round, unchanged in shape). Week 3: per-user
storage through our `/api`, never `server/`. Week 4: content, polish,
upstream sync, one full launch rehearsal.

**The cut list, if the month is solo.** ~25 working days in 28
calendar days leaves no slack. The first cut is the expensive half of
B: the storage service degrades to project export/import as a single
file plus an honest banner that programs live in the browser. Identity
and learning both survive the cut; an entire service leaves the
critical path. Decided now so the cut is a plan, not a panic.

**Cat's question, reframed.** Not "which track has priority" - the
order is forced by the dependency above and putting it to her would
give away a determined decision. What only she can settle, needed by
the start of week 3: **what counts as proof of a step in new lessons**
(the open half of `lesson-paths-todo.md` task 1, partly answered by
D26).

**Still undecided, owner-side, with fallbacks the plan builds on:**
hosting and operator (gates CI/CD target, the production OAuth
callback, the build path of D28 - and it is also the *agent's*
hosting: `/api/agent` ships on the same origin, so the site operator
operates an LLM relay); who pays for inference at launch (fallback
BYO-key, which removes metering as a blocker but raises the entry
barrier).

**Team size, answered 2026-09-02: 1.5.** Slava full-time working with
AI agents; a second person can join at need. The 25-in-28 arithmetic
still binds human review bandwidth, so the cut list stays in force as
insurance rather than as the plan.

**Step zero, removed 2026-09-02 (Slava, the same day it entered):**
dev-process tooling does not belong on the product roadmap at all -
it is internal kitchen, part of how the product is built rather than
what ships. The setup story is told after the result, when someone
asks how it was done. Tooling work happens as needed, unbudgeted and
unlisted; do not reintroduce it as a roadmap item.

**Revisit when** any of the three owner-side answers arrives, or when
the team size changes mid-month.

## D28 - Production builds go through a same-origin /api/build proxy

**Date:** 2026-09-02 - **Status:** decided, not implemented

Found 2026-08-31, recorded in the scope handoff: `api.solpg.io`
filters by an origin allowlist. Measured with `OPTIONS
https://api.solpg.io/build` - `localhost:3000` and `beta.solpg.io` get
`access-control-allow-origin` echoed back; `https://solpg.io` gets no
header. Every build this fork ever ran went through an allowlisted
origin, which is why it never surfaced; on a production domain the
browser call dies at the preflight, and it would have surfaced at
deploy time.

**Chosen:** proxy builds through a same-origin `/api/build`, and ask
the Foundation for an allowlist entry **in parallel**. Server-to-server
requests are not subject to CORS, and `client-v2/api/*.mjs` already
hosts exactly this kind of thin handler (D20 supplies the local
runtime for it). The cost is owned honestly: our origin becomes the
traffic source in front of the Foundation's build server, so rate
limiting becomes our obligation - the same work as H1 on
`/api/agent`, widened to `/api/build`. If the Foundation grants the
allowlist entry, the proxy thins out or disappears; the ask costs
nothing and removes our infrastructure from their traffic path.

**Rejected - waiting on the Foundation alone:** an external dependency
on their schedule, sitting in the critical path of the launch.
**Rejected - running our own build server:** `compose.yaml` exists but
every service is pinned `linux/amd64`, and it needs the Solana
toolchain, real hosting and money - the most expensive path, kept as
the fallback of last resort.

**Revisit when** the Foundation answers the allowlist ask, or when
build volume makes proxying their server impolite.
