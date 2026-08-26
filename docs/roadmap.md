# Roadmap and status

Updated: 2026-08-26. One page for the whole effort: what shipped, what
is in flight, what is next, and what waits — with pointers to the spec
or decision that carries the detail. Priorities follow D21 (GitHub
identity -> tutorials -> everything else). Update this file whenever a
stream changes state; it lives on `context-archive` with the other
working docs.

Visual version (for syncs): https://claude.ai/code/artifact/d7db5420-2295-4698-b0a1-9d9c03056448
-- regenerated from this file; update both together.

## Shipped

| What | Where | Notes |
| --- | --- | --- |
| AI assistant panel, Solana-brand redesign, `client-v2/` home | PR #5, merged | Iterations 1-2; specs of 2026-08-19/20 |
| Flow: the dev loop as navigation (iteration 3) | PR #8, merged (replaced PR #6) | Stepper, Build/Deploy/Interact surfaces, gallery, `?classic` fallback |
| Flow visual parity with the concept boards (iteration 4) | PR #7, merged | Token-by-token re-skin, a11y audit applied |
| Model-provider fallbacks | in iterations 3-4 | OpenAI-compatible + Gemini presets + OpenRouter free tier; Gemini quirks documented in `model/openai.ts` |
| PR hygiene | PRs #5-#7, `context-archive` | Working docs stripped from PR branches (filter-repo, 2026-08-24); archive branch is their home |
| Flow visual parity + MCP gateway in master | PR #10, merged (rogaldh) | Iteration 4 reached master-2.0 |
| Static assets + docker profile | PR #11, merged (rogaldh) | client-v2 assets tracked, compose profile added |

## In progress

**GitHub OAuth sign-in with a gated airdrop** — built and in review as
PR #9. Spec: `docs/superpowers/specs/2026-08-25-github-oauth-design.md`;
plan: `docs/superpowers/plans/2026-08-25-github-oauth.md`. rogaldh
rebased the PR onto master-2.0 and hardened it (PKCE S256, Web Crypto
state nonce, `.env.example`, store moved to `features/github-oauth/`).
Outstanding: port three final-review fixes onto the rebase
(unconfigured-deployment dead end, automatic-airdrop cache poisoning,
silent wallet-menu failures — the fourth, `no-store`, is covered), set
up commit signing (branch now requires signed commits), run the live
OAuth round trip, then 1 approval to merge (squash).

**Teammate PRs to review:** #12 (one-file deploy-label fix) and
#13 (Default backend replacing the scripted Demo via `api/agent.mjs`,
server-held key — implements the server half of the parked
playground-tokens design; review against that design and retire or
rebase the parked concept).

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
