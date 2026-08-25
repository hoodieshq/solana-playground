# Handoff — team-lead priorities feedback (2026-08-24/25)

For the session picking up the GitHub OAuth stream. Everything below is
already recorded in the repo where noted; this note is the short version
plus the discussion that had not landed anywhere yet.

## The feedback (Slack, meeting notes by Sergey Prokhorov)

1. Replace the local wallet with wallet-adapter (Phantom etc.).
2. Sign in with GitHub ID — enables airdrop and future features the
   Solana Foundation would build around models/agents.
3. Improve the tutorials scenario — suggestions, connected tutorials,
   learning curves, connected prompts for agents.
4. Uncertain, partially blocked by Acheron's grant: modern Anchor
   version; better builds with Kora.

Cat Mcgee: GitHub sign-in only pays off if programs are saved per user
instead of locally. She also has a demo of how tutorials would work —
currently broken, but the intent reads.

## What Slava decided (recorded as D21)

Order: **GitHub OAuth -> tutorials -> everything else.** Wallet-adapter
moved down: it cuts through the deploy process and the whole wallet
flow — the hottest upstream files (`commands/deploy/deploy.ts` 29
commits/6mo, `utils/wallet/wallet.ts` 9) — and earns few points now.
Slava plans to start on the OAuth stream this week.

## Already committed on `context-archive`

- `docs/decisions.md` **D21** — the reprioritization, rationale, and
  revisit triggers (commit `26c72d79`).
- `docs/product-brief.md` — Direction reordered: Focus 2 = GitHub
  identity, Focus 3 = tutorials, Focus 4 = interface; wallet demoted
  with a pointer to D21. Open question on persistent identity updated:
  it is on the roadmap now, the open part is where the storage service
  lives and who operates it.
- `docs/product-brief.md` Principles — new principle (commit
  `7238438c`): **"Concept on paper, simplified in code."** MVP
  prototype: complex architecture is written down as a concept in the
  docs; each iteration ships a deliberately simplified cut. Agreed
  explicitly with Slava.

## Discussed but NOT landed anywhere — carry into the OAuth design

- **Scope split for the first cut:** OAuth sign-in + airdrop only.
  Per-user program storage stays local this iteration and gets written
  up as a concept (a future D22), because Cat's point quietly turns
  "OAuth" into a stream with its own backend — and by our constraints
  that storage cannot live in `server/`; it needs a separate service.
- **Where the token exchange lives:** `client-v2/api/*.mjs` already
  exists (health, MCP gateway) — thin serverless handlers, secrets in
  `.env.local`, same file runs under `yarn dev` and Vercel (D20). A
  GitHub OAuth web-flow exchange endpoint fits there without touching
  `server/`. GitHub's device flow would avoid the secret but has
  clunky UX.
- **Token storage constraint:** project code (including shared
  projects) runs in a same-origin iframe guarded only by a string
  blacklist, and D3 already keeps the Anthropic key out of
  localStorage for that reason. The GitHub token must not go to
  localStorage either — in-memory/session-only for the MVP.
- **Airdrop reality check:** the `airdrop` command works today with no
  sign-in (straight devnet RPC faucet). The Foundation's gated faucet
  does not exist yet. The open design question (asked, not answered —
  Slava stopped the session before choosing): what the demo shows —
  (a) gate the existing airdrop behind sign-in (recommended), (b)
  identity only, (c) build our own verifying faucet endpoint.
- The brainstorm classified the stream as **architectural** (no
  existing auth flow in the repo); it stopped at the first clarifying
  question. No design, spec, or code exists for it yet.
