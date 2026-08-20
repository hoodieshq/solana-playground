# Assistant context

This is what the in-product assistant knows about **itself and this project**.
It is loaded into the assistant's context so that questions like "what is this?",
"how does it work?", "what's the status?" and "what did you decide and why?" are
answered from maintained documents rather than invented.

It is also the content behind the panel's **"What we're building"** tab.

> **Maintained by hand, for now.** Keep it short and keep it true. When it
> disagrees with `decisions.md`, `product-brief.md` or `codebase-map.yaml`,
> those win and this file is wrong. See `decisions.md` → D6.

---

## What this is

Solana Playground is a browser IDE for Solana programs: write Rust, build,
deploy and test without installing anything. It sits at the top of the official
Solana onboarding funnel — the quickstart on solana.com sends newcomers straight
into it.

We are adding an **AI assistant inside that environment**. Not a chatbot bolted
on the side: an assistant that shares context with the open project and can act
on it — read your files, explain the actual compiler error against your actual
code, propose a patch you apply with one click, then build and deploy.

The distinction that matters: the expensive parts already exist here.
Server-side compilation, deploy to devnet, a test panel generated from the
program's IDL. An assistant in this environment can *act*, not merely advise.

## Why it exists

Today, AI help in the Solana ecosystem arrives **after** the local setup barrier.
The quickstart recommends installing the Solana MCP server or the official coding
agent skill — both useful, both requiring a local environment. The people
Playground exists for are exactly the ones that tooling cannot reach.

There is no AI assistance inside Playground at all: no explanation of errors, no
guidance, no connection to the ecosystem's own documentation tooling.

## The plan

Three focus areas, in priority order:

1. **AI assistant inside the environment** — a chat module beside the editor that
   shares project context and can act on it. *Shipped; see Status below.*
2. **Real wallet support** — standard wallet adapters (Phantom, Solflare,
   Backpack) alongside the existing in-browser keypair.
3. **Modern, responsive interface** — current visual language, works on tablet.

Later candidates: aggregating existing learning material into the environment;
integrating with Blueshift rather than duplicating it; gist import/export; a
faster path for running snippets.

The assistant should eventually be grounded in the ecosystem's own sources — the
Solana Developer MCP for documentation, the official Solana skill, the Explorer
MCP for on-chain lookups — with a channel for plugging in new MCP servers, so the
environment inherits ecosystem knowledge without waiting for a release.

## Principles we hold ourselves to

- **Propose automatically, apply explicitly.** Anything that changes state —
  files, builds, transactions — requires a human action.
- **Bring your own key, plus a limited demo mode.** A small quota for first-time
  users; never an open unlimited endpoint.
- **Traceability.** A record of what the assistant did and on what basis.
- **Open by default.** The client and any service integrated into it stay public.
- **No backend changes.** The build server, crate list, deploy mechanics and
  sharing infrastructure are out of scope.

## How it works, technically

The assistant runs **entirely in the browser**. No backend of ours.

- Four providers share one vendor-neutral tool set (`createTools()`): the
  Demo backend (a scripted walkthrough, no key, no network), Anthropic
  (`claude-opus-5` via `@anthropic-ai/sdk`'s Tool Runner), and an
  OpenAI-compatible chat-completions provider with ready-made presets for
  OpenRouter and Gemini. The Anthropic provider is implemented but has not
  yet been exercised against a live key.
- The tools map onto the playground: read and list files, read the last build
  error, write a file, build, deploy. The gate lives inside each
  state-changing tool's own `run` — `write_file`, `build` and `deploy` each
  `await PgAssistant.requestApproval(...)` and do not return until the user
  clicks, which holds the agent loop open. That is how "propose automatically,
  apply explicitly" is enforced in the loop itself, identically for every
  provider, rather than by the Tool Runner inspecting a call before it runs.
- Project context comes from what the client already holds: `PgExplorer` for
  files and the open tab, `PgProgramInfo` for the IDL and program ID,
  `PgGlobal` for build and deploy state.
- The panel is a new sidebar page, so it sits beside the editor without covering
  it.

**One gap we had to close.** The client did not keep the compiler's output
anywhere — the raw `stderr` was printed to the terminal and discarded, leaving
only a `lastBuildFailed` boolean. Explaining a real error needs the compiler's
real words, so the build command now stores it. See `decisions.md` → D4.

## Status

**The assistant panel is shipped.** Hit build, get an error, the assistant
explains it against the actual code, proposes a fix, you apply it with one
click, build succeeds, deploy to devnet, result linked in Explorer — the
milestone demo works end to end.

Done:

- Repository mapped and verified — `codebase-map.yaml` records how the client
  actually works, with file paths, and was checked by running it, not by reading
  alone.
- Local development unblocked: the client would not install until six Rust→WASM
  packages were compiled (~1 hour). They are behind lazy imports and none are on
  the UI boot path, so `wasm/stub-packages.sh` stands them in and setup is now
  about three minutes.
- Verified the client runs standalone against the public build server
  (`https://api.solpg.io`) — CORS allows `http://localhost:3000` and a real build
  returned in 3.5 seconds. No Docker, no Rust toolchain needed.
- Runtime and architecture decided and written down (`decisions.md`).
- The assistant panel: the Demo backend needs no key; Anthropic, and
  OpenAI-compatible with ready-made OpenRouter and Gemini presets, are
  selectable. The Anthropic provider has not yet been exercised against a
  live key.
- Two redesign iterations shipped: the Solana-brand theme (tokens sourced
  from solana.com, `Solana V2` as the fork's default), then the
  floating-panel layout (anatomy and navigation built on top of it).

In progress: iteration 3, "Flow" — re-anatomizing the UI around the
Write → Build → Deploy → Interact loop. Concept and plan are approved
(`decisions.md` → D10); implementation has not started.

Not started: real wallet adapters; responsive/tablet layout; MCP grounding.

## What is real and what is mocked

Honesty rule for the demo — never present a mocked step as working.

- **Real:** the editor, file explorer, terminal, build against the build
  server, compiler stderr capture, deploy to devnet, the IDL-driven test
  panel, the wallet. All of it is the existing playground.
- **Real:** the build server. It is the production one at `api.solpg.io`.
- **Real:** the assistant's tool calls, the diff it proposes, Apply, and the
  Explorer link after a deploy.
- **Scripted:** the Demo backend's reasoning — it walks a fixed script rather
  than calling a model, so it works with no key and no network.
- **Mocked / stubbed:** Rust intellisense and the `solana`, `anchor`,
  `spl-token`, `sugar` terminal commands — stubbed out to skip the hour-long
  WASM build. They throw a clear message pointing at `wasm/build.sh`.
- **Prototype-grade:** the assistant's key handling — kept in memory only,
  re-entered per session, never written to storage — and the absence of a
  demo quota.

## Answering questions about this project

When someone asks what this is, what is planned, how it works, or why it was
built this way, answer from this file and from `decisions.md` — those are the
maintained sources.

Lead with the outcome, then the supporting detail. Be concrete: name the actual
mechanism rather than gesturing at it. If something is not built yet, say so
plainly — the credibility of the whole demo rests on not overclaiming.

If you do not know, say you do not know and point at the document that would
have the answer.
