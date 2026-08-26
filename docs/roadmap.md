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

**GitHub OAuth sign-in with a gated airdrop** — feature-complete on
PR #9, awaiting one approval (rogaldh) to squash-merge. Spec:
`docs/superpowers/specs/2026-08-25-github-oauth-design.md`; plan:
`docs/superpowers/plans/2026-08-25-github-oauth.md`. State as of
2026-08-26 evening:
- rogaldh's hardening (PKCE S256, Web Crypto nonce, `.env.example`,
  store moved to `features/github-oauth/`) is in.
- The three final-review fixes are ported onto that structure and
  pushed (signed commits; signing key registered 2026-08-26).
- Live e2e uncovered a real transport bug — `window.opener.postMessage`
  does not survive the GitHub navigation — fixed by making a
  same-origin BroadcastChannel the primary delivery path (opener as
  fallback), +1 unit test.
- Manual-testing feedback (chip click signed the user out) fixed with
  a profile popover: avatar/name/@login card, Open GitHub profile
  link, Sign out behind an inline confirmation; focus management and
  ARIA reviewed and fixed.
- Full OAuth round trip verified live on localhost (instant re-auth
  after the one-time consent). 66 unit tests green.

**GitHub import fixed (PR #14)** - the gallery's Open button did
nothing on ecosystem program cards. Root cause: `PgGithub` walked the
repo with one `contents` request per directory, blew through GitHub's
60-requests-per-hour unauthenticated limit (reproduced live: 403 from
request #63 on), and `PgCommon.fetchJSON` parsed the 403 body as a
directory listing, so the import silently produced zero files. Now one
`git/trees?recursive=1` request, parallel `raw.githubusercontent.com`
downloads, and readable errors on the card. Four follow-ups landed in
the same PR after manual testing: 24 downloads in flight instead of 8
(9 s -> 0.5 s on a cold CDN), noise paths skipped, per-file progress on
the card, and the "which program?" question moved ahead of the download
so a monorepo downloads one program instead of twelve. One upstream
file changed by two lines: Anchor's framework check treated any `.py`
as Seahorse, which made marginfi unimportable. Branched from
master-2.0, 75 tests, verified live on seven repositories, awaiting
review.

**Teammate PRs reviewed (findings posted to GitHub):**
#12 — APPROVE (trivial, correct). #13 — APPROVE-WITH-COMMENTS:
fix before merge M2 (Default offered while the `/api/agent` probe is
outstanding) and M3 (JSON `null` body crashes the handler to 500);
fix before configuring a real key H1 (no body/If cap, origin check or
rate limit — an open LLM relay otherwise) and M4 (no `maxDuration`
for a streaming function). Product note: deleting Demo kills the only
offline demo path — suggest keeping it last and unselected. #13
implements the transport half of the parked playground-tokens design;
what remains of that design is metering, now a blocking dependency
for pointing `/api/agent` at a paid key.

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

- **Error-UX scenarios** - interface behavior when things fail.
  The first known case is fixed (PR #14, below); collect the remaining
  cases, then fix them as one polish pass.
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
