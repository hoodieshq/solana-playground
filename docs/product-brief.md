# Product brief — Playground v2

Short version of the research and the agreed direction. Doubles as the source content for the in-product "What we're building" panel.

---

## Why this work exists

Playground sits at the top of the official Solana onboarding funnel: the quickstart on solana.com sends newcomers straight into the browser environment, and the same page suggests installing the Solana MCP server or the official coding-agent skill. Both are recommended side by side — but nothing connects them, and inside Playground there is no AI assistance at all.

The consequence: AI help in this ecosystem currently arrives **after** the local setup barrier. The people Playground exists for are exactly the ones today's AI tooling cannot reach.

## What we found

- **Onboarding position.** Playground is the first place a newcomer lands, and the only place where help can arrive before any local setup.
- **No assistance inside.** No explanation of errors, no guidance, no connection to the ecosystem's own documentation tooling.
- **Dependency lag.** Supported crates are a fixed list (anchor-lang 0.29, solana-program 1.16), extended manually; no Pinocchio template. Upstream intends to address this.
- **Wallet mismatch.** An in-browser keypair in local storage, no wallet adapters. Convenient for a first deploy, disconnected from how real Solana development works, and a bad pattern to carry towards mainnet.
- **Dated, desktop-only interface**, not aligned with current Solana surfaces.
- **Scattered learning material.** learn.solana.com, Solana Developers articles, Blueshift, video and social content — all outside the environment where beginners actually sit.
- **The expensive part already exists.** Server-side compilation, deploy, a generated test panel from the IDL, import/export. An assistant here can act, not merely advise — which is what separates it from a chatbot.
- **Execution ceiling.** What the environment can teach is bounded by what it can execute: it builds programs, tests are TypeScript against devnet, there is no Rust-side testing or generated-client workflow. This becomes more visible once an assistant is present, since the assistant will naturally suggest patterns the environment cannot run.

## Direction

A second client, developed in parallel inside the fork, running against the existing backend without modifying it. Upstream changes keep flowing in; the new client matures alongside the current one.

**Focus 1 — AI assistant inside the environment.** A chat module next to the editor that shares context with the open project and can act on it: explain a build error against the actual code, propose a patch the user applies with one click, then build and deploy. Grounded in the ecosystem's own sources — Solana Developer MCP for documentation, the official Solana skill, the Explorer MCP for on-chain lookups — with a channel for plugging in new MCP servers and skills, so the environment inherits ecosystem knowledge without waiting for a release.

**Focus 2 — GitHub identity.** Sign in with GitHub ID to enable airdrop and the future features the Solana Foundation would build around models and agents. Signing in only pays off if programs are saved per user instead of in browser storage, so this focus carries persistent project storage with it — as a separate service, not a change to the existing backend.

**Focus 3 — Tutorials as a scenario.** Suggestions for tutorials: connected tutorials, learning curves, connected prompts for agents — so the scattered learning material starts to have a path through the environment.

**Focus 4 — Modern, responsive interface.** Current visual language, layouts that work on tablet, room for the assistant and wallet flows that the present UI does not have.

Real wallet support (standard wallet adapters alongside the in-browser key) was Focus 2 and is deprioritized for now: it cuts through the deploy process and the whole wallet flow — the hottest upstream files — and earns little visible value until mainnet-facing work makes the local keypair an actual blocker. See `decisions.md` D21.

## Principles

- **Propose automatically, apply explicitly.** Anything that changes state — files, builds, transactions — requires a human action.
- **Bring your own key, plus a limited demo mode.** A small quota for first-time users; never an open unlimited endpoint.
- **Traceability.** A record of what the assistant did and on what basis.
- **Open by default.** The client and any service integrated into it stay public, consistent with how the project has always been maintained.
- **No backend changes.** The build server, crate list, deploy mechanics and sharing infrastructure are out of scope.

## Later candidates

Aggregating existing learning material into the environment · integrating with Blueshift rather than duplicating it · selected ideas from Remix such as gist import and export · a faster path for running snippets.

## Open questions for the Foundation

- Preferred agent framework or provider — is there an existing choice we should validate rather than introduce another vendor?
- Who covers inference in production, and what quota is acceptable for anonymous first-time users?
- How the execution layer is expected to evolve — testing, generated clients, current framework versions — since it sets the ceiling on what the environment can teach.
- Persistent user identity (saved projects, progress, history) is now on the roadmap via GitHub sign-in — the open part is where the per-user storage service should live and who operates it.
- If content aggregation is worth doing, which sources should be treated as canonical.
