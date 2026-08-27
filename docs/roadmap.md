# Roadmap and status

Updated: 2026-08-27. One page for the whole effort: what shipped, what
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
| Deploy Explorer label fix | PR #12, merged 2026-08-26 | Trivial `no-useless-concat`; also unblocked `CI=true yarn build` |
| GitHub OAuth sign-in with a gated airdrop | PR #9, merged 2026-08-26 (`0bfce60b`, approved by rogaldh) | Spec `2026-08-25-github-oauth-design.md`; PKCE S256, BroadcastChannel transport, profile popover, 3 playwright e2e |

## Open pull requests

Branch protection: PR + **one approval** + signed commits. Nothing
merges on a comment alone.

| PR | Branch | State | Blocker |
| --- | --- | --- | --- |
| #14 | `fix/github-import` | Ready | Needs one approval. No conflicts, no review yet |
| #15 | `feat/flow-left-panel-toggle` | Ready after a rebase | rogaldh said "could be merged" in a comment but never submitted an approval; branch still shows #9's 39 commits |
| #16 | `feat/platform-rpc-endpoints` | Conflicts | `.env.example` and `StatusChips.tsx` conflict with merged #9; no review yet |
| #13 | `feat/default-backend` | Draft | `.env.example` conflicts; two review items still open (M3, M4) |

Vercel is the only check that reports on a PR, and it is an ignored
build. There is no CI for `client-v2` — see the engineering-hygiene
follow-ups below.

### PR #14 — GitHub import through the Trees API

The gallery's Open button did nothing on ecosystem program cards. Root
cause: `PgGithub` walked the repo with one `contents` request per
directory, blew through GitHub's 60-requests-per-hour unauthenticated
limit (reproduced live: 403 from request #63 on), and
`PgCommon.fetchJSON` parsed the 403 body as a directory listing, so the
import silently produced zero files. Now one `git/trees?recursive=1`
request, parallel `raw.githubusercontent.com` downloads, and readable
errors on the card. Four follow-ups landed in the same PR after manual
testing: 24 downloads in flight instead of 8 (9 s -> 0.5 s on a cold
CDN), noise paths skipped, per-file progress on the card, and the
"which program?" question moved ahead of the download so a monorepo
downloads one program instead of twelve. One upstream file changed by
two lines: Anchor's framework check treated any `.py` as Seahorse,
which made marginfi unimportable. 75 tests, verified live on seven
repositories. Decision: D22.

### PR #15 — Toggle the Flow left panel with cmd+b

`⌘B` for the left project panel, matching `⌘J` for the console; a
collapsed rail that keeps the panel edge, the keybind hint and the `+`
action; nested editor chrome removed; the two `PANEL_RADIUS` constants
reconciled on the theme's 12px (closing a follow-up from #7 and #10).
81 unit tests, 6 e2e including a new `seededPage` fixture.

**Needs a rebase before it can be read.** #9 was squash-merged, so its
commits are not ancestors of `master-2.0` and this branch's merge base
is still `dc2cb20c`. GitHub therefore displays 39 commits and 32 files
(+2333/-84) when the real delta against `master-2.0` is 10 files
(+343/-78). The rebase is conflict-free.

### PR #16 — Platform RPC endpoints and a header cluster toggle

Build-time `REACT_APP_{DEVNET,TESTNET,MAINNET}_RPC_URL` entries added
to both network lists, a dedupe rule that keeps the URL the unique
identity of an option, `getCluster()` short-circuited so a platform
endpoint costs no genesis-hash round trip, and the header cluster badge
turned into a settings toggle (with the `mousedown`/`click` wiggle
fixed via `useOnClickOutside`'s new `ignoreSelector`). 67 unit tests,
12 of them new.

**Conflicts with merged #9** on `client-v2/.env.example` (add/add,
resolution is "keep both sections", as the PR body predicts) and on
`client-v2/src/views/flow/header/StatusChips.tsx`, which #9 also
rewrote for the GitHub identity chip. `yarn build` was never run on
this branch — the worktree cannot install its `file:` wasm deps — and
CI does not cover `client-v2`, so nothing has built it.

### PR #13 — Replace the Demo backend with a real default one (draft)

Deletes the scripted `Demo` provider and adds `api/agent.mjs`, a
same-origin chat-completions route whose upstream, key and model come
from the environment only. Also carries four unrelated panel changes
(Ctrl+R toggle, MCP description collapse, BYO-key accordion, drop the
"What we're building" tab).

Review posted 2026-08-26 (approve-with-comments). Since then:
- **M2 fixed** — `isUnavailable` now tests `defaultBackend !== true`,
  so Default is not connectable while the probe is outstanding.
- **M3 still open** — a JSON body of literal `null` reaches
  `Array.isArray(body.messages)` outside any try, so a 400-class input
  becomes a 500. `client-v2/api/agent.mjs:131`.
- **M4 still open** — `client-v2/vercel.json` has no
  `functions`/`maxDuration`, so a streaming turn will be cut at the
  default function timeout.
- **H1 still open** (blocks configuring a real key) — no body-size cap,
  no messages/tools count cap, no same-origin check, no rate limit.
- Product note unanswered: deleting Demo removes the only zero-network
  backend, so every fork without `AGENT_*` set opens on a dead
  preselected option.

#13 implements the transport half of the parked playground-tokens
design; what remains of that design is metering, now a blocking
dependency for pointing `/api/agent` at a paid key.

## Open follow-ups carried by merged PRs

Collected from the merged PR descriptions so they stop living only
there. Verified against `master-2.0` on 2026-08-27.

**Engineering hygiene**
- No CI for `client-v2`. `.github/workflows/reusable-checks.yml` covers
  `client/`, `server/` and `wasm/` only; every type-check, prettier run
  and build on this fork's frontend is run by hand. (#5, #9)
- `check-format` globs `src/` only, so `api/*.mjs` never sees prettier;
  `yarn test` does not run it at all. (#9)

**Assistant panel** (all still true in `master-2.0`)
- `requestApproval` returns a bare boolean, so parallel tool calls
  cannot label the right card; it should return `{ id, allowed }`. (#5)
- The project snapshot goes to the model in the `system` role with no
  untrusted-data delimiters, and shared projects are attacker-controlled
  text. (#5)
- No UI calls `disconnect()`; a stuck approval still needs a reload. (#5)
- `Chat.tsx` reads `PgBuildOutput.latest` but does not subscribe to its
  change event. (#5)
- Space Grotesk is still a runtime Google Fonts `@import` in
  `src/index.css:1` rather than self-hosted. (#5)

**Flow surfaces**
- Build state is memory-only: Deploy stays disabled after a reload
  until a rebuild. (#8)
- The Deploy button is not disabled while a chunked deploy is paused;
  `useDeployHistory` was never extracted. (#8)
- Roving tabindex on tab/radiogroup widgets — done for `GearSidebar`'s
  network list in #16, still open elsewhere. (#8)
- The dead `useDbServer` branch in `utils/server.ts` and the `Share`
  modal it serves are still there, with sharing disabled in this
  fork. (#9, #10)
- Interact's populated `Test.tsx` account/instruction cards have never
  been checked against the board — needs a funded devnet wallet. (#7, #10)
- Editor tab strip, excerpt syntax highlighting and the assistant's
  internals below the header were deferred by iteration 4. (#7, #10)
- `PANEL_RADIUS` reconcile — **done in #15**, unmerged. (#7, #10)
- The classic layout still carries one-off radii (`10px`, `16px`) that
  no constant owns. (#15)
- `PgKeybind` does not assert a modifier is absent, so `Ctrl+Shift+B`
  also matches `"Ctrl+B"`. Harmless today; a collision waiting for the
  next `Ctrl+Shift+<key>` binding in Flow. (#15)

**Named owners**
- Replace the hand-rolled OAuth flow with Better Auth —
  `FIXME(@rogaldh)` at the top of `api/github-oauth.mjs`. Stateless
  mode needs no database; the security tests must be re-pointed, not
  deleted. (#9)
- Server-side enforcement of the airdrop gate, if it is ever meant to
  be a control rather than a deterrent. (#9)

**Housekeeping**
- The orphaned `.git/modules/client-v2/public` directory survives on
  existing clones; `git submodule deinit -f client-v2/public` clears
  it. (#11)

**Proposed in #14 and #16, not filed anywhere else**
- Route platform endpoints through a same-origin `/api/rpc` proxy so a
  keyed provider URL never ships in the bundle. (#16)
- Only one platform endpoint per cluster is expressible today. (#16)

## Next (in D21 order)

1. **Tutorials as a scenario** — connected tutorials, learning curves,
   connected prompts for agents. Not designed yet. Input to collect
   before the brainstorm: Cat's tutorials demo (currently broken, the
   intent reads).
2. **Per-user program storage** — Cat's condition for sign-in to pay
   off. Concept only until designed (candidate D23): a separate
   service, never `server/`. Feeds back into the OAuth stream.

## Designed, parked

**Playground-tokens model mode + compact Connect screen.** Design
agreed in chat (2026-08-24): operator-only hidden credentials panel
(Alt+click, in-memory), 500k-token imitation balance debited by real
usage, Connect screen reshaped around a "Playground" hero card with
byo-model providers collapsed. Parked by the D21 reprioritization
before the spec was written; the chat design is the source when it
resumes. Its metering half is now the blocking dependency for pointing
#13's `/api/agent` at a paid key. Ties into GitHub identity later
(quota per user).

## Backlog (not ordered)

- **Error-UX scenarios** - interface behavior when things fail.
  The first known case is fixed (PR #14); collect the remaining
  cases, then fix them as one polish pass.
- **Wallet-adapter integration** — demoted by D21: cuts through the
  hottest upstream files (`commands/deploy/deploy.ts`,
  `utils/wallet/wallet.ts`) for little visible value now. Revisit when
  mainnet-facing work makes the local keypair a blocker.
- **Focus 4 remainder** — responsive/tablet layouts, light-theme
  variant, assistant-as-permanent-column follow-through.

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
