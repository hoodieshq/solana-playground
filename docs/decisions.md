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
`client/src/views/sidebar/sidebar.ts`, plus a new folder of new files under
`client/src/views/sidebar/assistant/`.

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
`/icons/sidebar/`, and that directory lives in `client/public`, which is the
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
(`client/src/utils/js-runtime/js-runtime.ts`). The sandbox is a string blacklist
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

`client/src/commands/build/build.ts` gains one import and one line that stores
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

## D5 — Open: what "client-2" concretely means

**Date:** 2026-08-19 · **Status:** open — needs a team decision

`CLAUDE.md` describes a second client developed in parallel and says not to
modify the existing `client/`. `task-01` describes a dockable panel inside the
existing editor layout. Those are different codebases.

We are proceeding on the reading that the prototype is a panel inside the
existing client (D2), because the panel is all new files plus a one-line
registry entry, which qualifies as "strictly necessary" and ports cleanly if the
answer turns out to be a separate app.

**Resolve by:** asking the team. Not answerable by reading the repo.

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
a sync step into `client/src`, because CRA's `ModuleScopePlugin` blocks
`client/src` from importing across the repo root. `client/scripts/sync-readme.mjs`
is the precedent.
