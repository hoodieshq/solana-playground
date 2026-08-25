# Roadmap and status

Updated: 2026-08-25. One page for the whole effort: what shipped, what
is in flight, what is next, and what waits — with pointers to the spec
or decision that carries the detail. Priorities follow D21 (GitHub
identity -> tutorials -> everything else). Update this file whenever a
stream changes state; it lives on `context-archive` with the other
working docs.

## Shipped

| What | Where | Notes |
| --- | --- | --- |
| AI assistant panel, Solana-brand redesign, `client-v2/` home | PR #5, merged | Iterations 1-2; specs of 2026-08-19/20 |
| Flow: the dev loop as navigation (iteration 3) | PR #8, merged (replaced PR #6) | Stepper, Build/Deploy/Interact surfaces, gallery, `?classic` fallback |
| Flow visual parity with the concept boards (iteration 4) | PR #7, merged | Token-by-token re-skin, a11y audit applied |
| Model-provider fallbacks | in iterations 3-4 | OpenAI-compatible + Gemini presets + OpenRouter free tier; Gemini quirks documented in `model/openai.ts` |
| PR hygiene | PRs #5-#7, `context-archive` | Working docs stripped from PR branches (filter-repo, 2026-08-24); archive branch is their home |

## In progress

**GitHub OAuth sign-in with a gated airdrop** — the first cut of D21's
stream 1. Spec approved and committed:
`docs/superpowers/specs/2026-08-25-github-oauth-design.md`
(`context-archive`). Real OAuth identity + client-side gate on the
existing devnet faucet; storage stays local. Next step: implementation
plan, then build on `feat/flow-ui-follow-ups`.
Waiting on Slava: two GitHub OAuth Apps (dev/prod) and their
`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` in `.env.local` and Vercel.

## Next (in D21 order)

1. **Tutorials as a scenario** — connected tutorials, learning curves,
   connected prompts for agents. Not designed yet. Input to collect
   before the brainstorm: Cat's tutorials demo (currently broken, the
   intent reads).
2. **Per-user program storage** — Cat's condition for sign-in to pay
   off. Concept only until designed (candidate D22): a separate
   service, never `server/`. Feeds back into the OAuth stream.

## Designed, parked

**Playground-tokens model mode + compact Connect screen.** Design
agreed in chat (2026-08-24): operator-only hidden credentials panel
(Alt+click, in-memory), 500k-token imitation balance debited by real
usage, Connect screen reshaped around a "Playground" hero card with
byo-model providers collapsed. Parked by the D21 reprioritization
before the spec was written; the chat design is the source when it
resumes. Ties into GitHub identity later (quota per user).

## Backlog (not ordered)

- **Error-UX scenarios** — interface behavior when things fail.
  First known case: template gallery dialog's Open button does nothing
  (reported 2026-08-24, not yet reproduced). Collect cases, then fix
  as one polish pass.
- **Wallet-adapter integration** — demoted by D21: cuts through the
  hottest upstream files (`commands/deploy/deploy.ts`,
  `utils/wallet/wallet.ts`) for little visible value now. Revisit when
  OAuth lands or mainnet-facing work makes the local keypair a
  blocker.
- **Focus 4 remainder** — responsive/tablet layouts, light-theme
  variant, assistant-as-permanent-column follow-through.
- **Engineering hygiene** — wire `client-v2` into CI (types, prettier,
  build); per-PR follow-up lists live in the merged PR descriptions
  (#5, #7, #8): approval-card `requestApproval` ids, untrusted-data
  delimiters around the project snapshot, self-hosted fonts, roving
  tabindex, build state surviving reload, `PANEL_RADIUS` reconcile.

## Blocked on others / external

- **Modern Anchor version; better builds with Kora** — team calls
  them uncertain; partially blocked by Acheron's grant. Not scheduled
  (D21).
- **Foundation's verifying faucet** — does not exist yet; our airdrop
  gate imitates the experience it would enforce. Its appearance is the
  revisit trigger recorded in the OAuth spec.
- **Cat's tutorials demo** — broken; needed as input for the
  tutorials brainstorm.

## Concepts on paper (deliberately not built)

Per the "concept on paper, simplified in code" principle
(`product-brief.md`): verifying faucet endpoint, per-user program
storage service, cookie-based session persistence, per-identity token
accounting. Each is written where it belongs — the OAuth spec's
concept section — and ships only when its stream is scheduled.
