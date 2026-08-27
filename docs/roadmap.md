# Roadmap and status

Updated: 2026-08-27 (evening prep). One page for the whole effort: what shipped, what
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
| Toggle the Flow left panel with cmd+b | PR #15, merged 2026-08-27 (`2c87079e`) | `⌘B` to match `⌘J`, collapsed rail, `PANEL_RADIUS` reconciled |

## Tonight

The demo has to show a working prototype plus the next step. #15 is
merged; three more PRs are ready and blocked only on an approval, and
getting them into `master-2.0` is the whole of today's P0.
Wallet-adapter work is deliberately out -- it runs in parallel at the
last moment.

Signing in on the demo machine now works from the first click: #17
fixes a failure that hit only the *first* authorization of a GitHub
account, which is precisely what an audience sees.

One decision is still open: **does the demo run on the Default backend
(`/api/agent`, PR #13)?** If it does, M3 and M4 below stop being
review notes and become demo blockers, and H1 -- an unmetered LLM relay
on a public URL -- becomes a live exposure rather than a future one.

## Open pull requests

Branch protection: PR + **one approval** + signed commits. Nothing
merges on a comment alone. #15 merged 2026-08-27; #13, #16 and #17 are
`MERGEABLE`. #13 and #16 are rogaldh's, so he needs to reset his local
copy of #16 -- rebased twice now, the second time to absorb #15.

| PR | Branch | State | Blocker |
| --- | --- | --- | --- |
| #14 | `fix/github-import` | `MERGEABLE` | One approval. Cannot be self-approved |
| #16 | `feat/platform-rpc-endpoints` | `MERGEABLE` | One approval. Verified after both rebases: tsc, prettier, 91 tests, build. One non-blocking review note left |
| #17 | `fix/oauth-popup-coop` | `MERGEABLE` | One approval. Cannot be self-approved. Land after #16 -- both touch `StatusChips.tsx` |
| #13 | `feat/default-backend` | `MERGEABLE`, draft | M3, M4 open; draft flag; H1 before any paid key |

Vercel is the only check that reports on a PR, and it is an ignored
build. There is no CI for `client-v2` -- see P1 below.

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

### PR #16 — Platform RPC endpoints and a header cluster toggle

Build-time `REACT_APP_{DEVNET,TESTNET,MAINNET}_RPC_URL` entries added
to both network lists, a dedupe rule that keeps the URL the unique
identity of an option, `getCluster()` short-circuited so a platform
endpoint costs no genesis-hash round trip, and the header cluster badge
turned into a settings toggle (with the `mousedown`/`click` wiggle
fixed via `useOnClickOutside`'s new `ignoreSelector`). 67 unit tests,
12 of them new.

**Rebased 2026-08-27** (`81fe47dc` -> `d1f7da0e`), resolving two
conflicts with merged #9:
- `client-v2/.env.example` (add/add) — master's text kept, the
  Platform RPC block appended.
- `client-v2/src/views/flow/header/StatusChips.tsx` — #9 rewrote this
  file for the GitHub identity chip while #16 collapsed `Chip` and
  `WalletChip` into one `ChipButton`. Kept #9's whole GitHub block,
  renamed its closing tag, took #16's toggle `IconButton`, and
  repointed `GithubChip` at `ChipButton` since `WalletChip` no longer
  exists.

Verified after the rebase, which nobody had ever done for this branch:
`tsc --noEmit` clean, prettier clean, 91 tests in 9 suites, and
`yarn build` compiles. `CI=true yarn build` fails, but on every branch
including `master-2.0` — see the CI item in P1.

**Rebased again 2026-08-27** (`d1f7da0e` -> `94c92984`) once #15
merged: both touch `Flow.tsx`, #15 adding the left-panel toggle props
and this PR adding the settings-toggle props on the same
`<Header>`/`<Columns>`/`<LeftPanel>` call. Merged both sets of props
in; conflict-free elsewhere. Re-verified: tsc, prettier, 91 tests in 9
suites, build.

**Reviewed 2026-08-27, comment (non-blocking).** `toggleSettings` in
`Flow.tsx` flips `settingsOpen` unconditionally regardless of which
control called it: opening the panel from the gear icon and then
clicking the cluster chip closes the panel instead of retargeting it
to the network section, since the chip's own click also toggles.
Surprising, not broken -- flagged for whenever it's convenient, not a
merge blocker.

### PR #17 — Keep the GitHub sign-in alive when COOP severs the popup

Sign-in failed on the first attempt and worked on the second, reporting
`Sign-in could not be verified.` while the GitHub window was still open.
`popup-channel.ts` ended the wait on `popup.closed`, which stops being
an answer once GitHub commits a page of its own: COOP disowns the
handle and `closed` reports true with the window still on screen, so
the 500 ms poll declared the flow over about a second after the click.
The reply -- a valid token, on the broadcast -- arrived minutes later
with nothing listening. Only the **first** authorization is affected:
afterwards GitHub answers with a bare redirect, no document is
committed, and the handle survives. Every new user would have hit it.

Evidence before any change: no `github-oauth` line in the server log
for the failing attempt (so neither a state mismatch nor a failed token
exchange), and a probe on the broadcast bus recording the reply arriving
intact long after the app had given up.

Two smaller faults sat behind it. Any same-origin `postMessage` set
`sawRejected` -- and the page has plenty, the project iframe among them
-- so a wait that merely ran out was reported as a forgery, which sent
the diagnosis after a security problem that did not exist. And a second
click started a second flow through the same named window, leaving the
first wait listening for a nonce the handler had already replaced.

The wait now ends on an answer, on `cancel()`, or on a timeout tied to
the handler's cookie lifetime, which both sides read from `config.mjs`
instead of the client not knowing it at all. While it waits the chip
reads `Signing in...` and offers `Cancel`, because nothing can tell the
app that the user closed the popup. 83 tests in 8 suites; the new one
was written first and failed with the exact production symptom.
Verified live by revoking the grant to restore the first-auth path.
Decision: D23.

### PR #13 — Replace the Demo backend with a real default one (draft)

Deletes the scripted `Demo` provider and adds `api/agent.mjs`, a
same-origin chat-completions route whose upstream, key and model come
from the environment only. Also carries four unrelated panel changes
(Ctrl+R toggle, MCP description collapse, BYO-key accordion, drop the
"What we're building" tab).

**Rebased 2026-08-27** (`861876ab` -> `a890f975`), resolving the
`client-v2/.env.example` add/add the same way: master's text kept, the
`AGENT_*` block appended. tsc, prettier and 81 tests clean afterwards.

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

## Follow-ups, prioritized

Every item below was collected from a merged PR description or a
review and then **checked against `master-2.0` on 2026-08-27** -- these
are the ones still true in the code, not the ones still written down.
Each carries where it came from and where it now belongs.

### P0 -- in the way of tonight

1. **Merge #14, #16, #17.** All three are `MERGEABLE` and blocked
   only on an approval; #15 is already in. #14 and #17 cannot be
   self-approved. Order matters once: #16 before #17, both touch
   `StatusChips.tsx`.
2. **Decide whether the demo runs the Default backend.** If yes, #13's
   M3 (`null` body -> 500) and M4 (no `maxDuration`, streams cut) are
   demo blockers, both small; and H1 is live, not future.

### P1 -- important, next in line

3. **Verification you can trust** -- a new step, see *Next*. Nothing
   automated checks this fork today.
   - No CI for `client-v2`: `.github/workflows/reusable-checks.yml`
     covers `client/`, `server/` and `wasm/` only. (#5, #9)
   - `check-format` globs `src/` only, so `api/*.mjs` never sees
     prettier, and `yarn test` does not run it at all. (#9)
   - `CI=true yarn build` fails on **every** branch, `master-2.0`
     included: `src/tutorials/__template/` holds both `Template.tsx`
     and `template.ts`, and webpack's lazy tutorial context resolves
     both on a case-insensitive filesystem, which `CI=true` promotes
     from warning to error. Found 2026-08-27 while verifying #16. Fix
     the case pair before wiring the build into CI, or the first green
     run is impossible. Upstream file -- keep the change to a rename.
4. **Harden `/api/agent` before it ever holds a paid key** -- part of
   the metering step, see *Designed, parked*. Body-size cap,
   messages/tools count caps, `Origin`/`sec-fetch-site` same-origin
   check, per-IP token bucket. Without these the route is an
   unauthenticated general-purpose LLM relay. (#13 review, H1)
5. **Wrap the project snapshot in untrusted-data delimiters** and move
   it out of the `system` role. Shared projects are attacker-controlled
   text and go to the model unmarked today. (#5)
6. **`requestApproval` should return `{ id, allowed }`.** It returns a
   bare boolean, so two tool calls in flight cannot label the right
   approval card -- visible the moment a demo runs parallel tools. (#5)

### P2 -- real, and cheap to defer

Part of the **Error-UX pass** already in the backlog:
- No UI calls `disconnect()`; a stuck approval still needs a
  reload. (#5)
- Build state is memory-only, so Deploy is dead after a reload until a
  rebuild. (#8)
- Deploy is not disabled while a chunked deploy is paused;
  `useDeployHistory` was never extracted. (#8)
- `Chat.tsx` reads `PgBuildOutput.latest` but never subscribes to its
  change event. (#5)

Loose ends with no home yet:
- Space Grotesk is still a runtime Google Fonts `@import`
  (`src/index.css:1`) rather than self-hosted. (#5)
- The dead `useDbServer` branch in `utils/server.ts` and the `Share`
  modal it serves survive, with sharing disabled in this fork. (#9, #10)
- Roving tabindex: done for `GearSidebar`'s network list in #16, open
  everywhere else. (#8)
- The classic layout carries one-off radii (`10px`, `16px`) that no
  constant owns. (#15)
- `PgKeybind` never asserts a modifier is *absent*, so `Ctrl+Shift+B`
  also matches `"Ctrl+B"`. Harmless today; a trap for the next
  `Ctrl+Shift+<key>` binding in Flow. (#15)
- Interact's populated `Test.tsx` cards have never been checked against
  the boards -- needs a funded devnet wallet. (#7, #10)
- Editor tab strip, excerpt syntax highlighting and the assistant's
  internals below the header, all deferred by iteration 4. (#7, #10)
- The orphaned `.git/modules/client-v2/public` directory survives on
  existing clones; `git submodule deinit -f client-v2/public` clears
  it. (#11)
- A reload signs the user out of GitHub: the token lives in module
  memory only, by D3's reasoning about the same-origin project iframe.
  Deliberate, not a defect -- but it re-prompts on every refresh, and
  the fix belongs with per-user storage in *Next* step 2, not in
  browser storage. (#9, #17)
- Route platform endpoints through a same-origin `/api/rpc` proxy so a
  keyed provider URL never ships in the bundle. Only one platform
  endpoint per cluster is expressible today. (#16)

### Blocked, or not ours to do

- **Replace the hand-rolled OAuth flow with Better Auth** --
  `FIXME(@rogaldh)` at the top of `api/github-oauth.mjs`. Stateless
  mode needs no database; the security tests must be re-pointed, not
  deleted. rogaldh's call. (#9)
- **Server-side enforcement of the airdrop gate** -- waits on the
  Foundation's verifying faucet, which does not exist. Until then the
  gate is a deterrent by design, and that is written down. (#9)

### Closed since the last pass

- `PANEL_RADIUS` reconcile (#7, #10) -- done and merged in #15.
- `.env.example` missing the `AGENT_*` vars (#13 review) -- done.
- Default offered while the `/api/agent` probe is outstanding (#13
  review, M2) -- done.
- The pre-existing `no-useless-concat` in `Deploy.tsx` (#13 checklist)
  -- done by #12.

## Next

D21 set the order (GitHub identity -> tutorials -> everything else).
Identity has landed, so tutorials is next in that order; the
verification step below is new, cuts across everything, and is the one
thing that is cheaper the earlier it happens.

0. **Verification you can trust** (new, 2026-08-27). Wire `client-v2`
   into CI: types, prettier over `src/` **and** `api/`, unit tests,
   build. Blocked first by the `__template` case pair described in P1.
   Filed as a step rather than a chore because right now the only
   thing standing between a broken `master-2.0` and a demo is somebody
   remembering to run four commands by hand -- which is exactly how
   #16 reached "ready to merge" without ever having been built.
1. **Tutorials as a scenario** — **designed 2026-08-27**, spec awaiting
   review: `docs/superpowers/specs/2026-08-27-tutorials-as-scenario-design.md`.
   Research in `docs/research/2026-08-27-tutorials-as-scenario.md`;
   concept canvas
   <https://claude.ai/code/artifact/c1b8b3f5-80e2-4bc5-88f1-0540723038d9>.
   Cat's prototype (solana-learning-playground.vercel.app) was walked
   through live and is the source of the connected-prompt mechanic.
   The thesis: a lesson step is finished by the toolchain, not by a
   click — verification reads `FlowState` and the regenerated IDL, so we
   author objectives and prompts and never an answer key. Carries a
   navigation consolidation (one project switcher instead of two) and
   makes D16 a blocking prerequisite. Candidate D24.
2. **Per-user program storage** — Cat's condition for sign-in to pay
   off. Concept only until designed (candidate D24): a separate
   service, never `server/`. Feeds back into the OAuth stream.
   Carries the session question with it: the GitHub token is held in
   module memory only, so a reload signs the user out (D3's reasoning,
   applied to the token). That is deliberate and correct while project
   code shares the origin, but a durable session is exactly what this
   step has to answer -- a server-side session against per-user
   storage, rather than putting the token in browser storage.
3. **Metering in front of `/api/agent`** — the surviving half of the
   parked playground-tokens design, and the gate on pointing the
   Default backend at a paid account. Carries P1 item 4.

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
- **Wallet-adapter integration** — demoted by D21 and deliberately out
  of tonight's demo: it runs in parallel at the last moment. Cuts
  through the hottest upstream files (`commands/deploy/deploy.ts`,
  `utils/wallet/wallet.ts`) for little visible value now.
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
