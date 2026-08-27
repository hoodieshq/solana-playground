# Roadmap and status

Updated: 2026-08-27 (night). One page for the whole effort: what shipped, what
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
| GitHub import through the Trees API | PR #14, merged 2026-08-27 (`dbf9a365`) | One rate-limited request instead of one per directory; readable errors. Decision: D22 |
| Platform RPC endpoints and a header cluster toggle | PR #16, merged 2026-08-27 (`20f71642`) | Build-time RPC per cluster, cluster badge as a settings toggle. Rebased twice, one non-blocking review note (P2) |
| Sign-in survives the GitHub hop | PR #17, merged 2026-08-27 (`423d9119`) | `popup.closed` lies once COOP severs the handle; first-time sign-in now works. Decision: D23 |

## Tonight

#14, #15, #16 and #17 are merged. Signing in on the demo machine now
works from the first click: #17 fixed a failure that hit only the
*first* authorization of a GitHub account, which is precisely what an
audience sees.

**`master-2.0` briefly did not typecheck.** #16 and #17 were
concurrent branches; #16 renamed the component #17's new "Signing
in..." chip depended on, each merged clean on its own, and nothing
re-ran `tsc` after both landed. Found while rebasing #13, fixed as
#18 -- that is now the only thing in the way of a clean build on
`master-2.0` and today's real P0.

One decision is still open: **does the demo run on the Default backend
(`/api/agent`, PR #13)?** If it does, M3 and M4 below stop being
review notes and become demo blockers, and H1 -- an unmetered LLM relay
on a public URL -- becomes a live exposure rather than a future one.

## Open pull requests

Branch protection: PR + **one approval** + signed commits. Nothing
merges on a comment alone. #14, #15, #16, #17 merged 2026-08-27. Two
PRs open, both `MERGEABLE`; #13 is rogaldh's.

| PR | Branch | State | Blocker |
| --- | --- | --- | --- |
| #18 | `fix/status-chip-typecheck` | `MERGEABLE` | One approval. Cannot be self-approved. Fixes `master-2.0`'s current typecheck break -- land first |
| #13 | `feat/default-backend` | `MERGEABLE`, draft | M3, M4 open; draft flag; H1 before any paid key; inherits #18's typecheck break until #18 merges |

Vercel is the only check that reports on a PR, and it is an ignored
build. There is no CI for `client-v2` -- see P1 below.

### PR #18 — Restore the Chip component master-2.0 currently fails to compile without

`tsc --noEmit` fails on `master-2.0` right now:
`StatusChips.tsx(186,10): error TS2304: Cannot find name 'Chip'`.
#16 renamed the cluster/wallet chips to `ChipButton` and deleted the
old non-interactive `Chip`; #17, merged after, added a `Signing in...`
status block that used `<Chip role="status">` -- the branches were
concurrent, so #17 had no reason to know #16 had removed the
component, and nothing re-ran `tsc` after both landed to catch it.
Found 2026-08-27 while rebasing #13.

Restored `Chip` as `styled.span`, matching its pre-#16 definition,
deliberately not `ChipButton`: the status block wraps a live message
and its own `Cancel` button, so the wrapper must not also present as
a control (cursor, hover, focus-visible) the way `ChipButton` does.
tsc, prettier and 111 tests (10 suites) clean.

### PR #13 — Replace the Demo backend with a real default one (draft)

Deletes the scripted `Demo` provider and adds `api/agent.mjs`, a
same-origin chat-completions route whose upstream, key and model come
from the environment only. Also carries four unrelated panel changes
(Ctrl+R toggle, MCP description collapse, BYO-key accordion, drop the
"What we're building" tab).

**Rebased 2026-08-27** (`861876ab` -> `a890f975`), resolving the
`client-v2/.env.example` add/add the same way: master's text kept, the
`AGENT_*` block appended. tsc, prettier and 81 tests clean afterwards.

**Rebased again 2026-08-27** (`a890f975` -> `30463841`) once #14, #16
and #17 merged, resolving the same `.env.example` pattern against
#16's own new block. Introduces nothing new, but inherits `master-2.0`'s
typecheck break (see #18): `tsc` shows the same two errors here as on
master-2.0 itself, harmless and not this branch's doing. Once #18
merges this needs the same routine rebase as always. 111 tests (10
suites) and prettier clean now.

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

1. **Merge #18.** `master-2.0` fails `tsc --noEmit` right now (see
   *Tonight*); cannot be self-approved.
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
- `toggleSettings` in `Flow.tsx` flips `settingsOpen` unconditionally
  regardless of which control called it: open the panel from the gear
  icon, then click the cluster chip meaning to jump to the network
  section, and it closes instead of retargeting. Surprising, not
  broken. (#16 review)

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
- #14, #15, #16, #17 merged to `master-2.0`.

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
1. **Tutorials as a scenario** — **implemented 2026-08-27** on
   `feat/lesson-paths`, not yet a PR. 24 commits, 41 files, +2775/-142.
   Spec `docs/superpowers/specs/2026-08-27-tutorials-as-scenario-design.md`
   (amended during implementation), plan
   `docs/superpowers/plans/2026-08-27-tutorials-as-scenario.md`, research
   `docs/research/2026-08-27-tutorials-as-scenario.md`. Decision: **D24**.
   Cat's prototype (solana-learning-playground.vercel.app) was walked
   through live and is the source of the connected-prompt mechanic.

   The thesis holds in code: a lesson step is finished by the toolchain,
   not by a click. Verification reads `FlowState` and the IDL an Anchor
   build regenerates, and because the seeded program is a single comment,
   step 1 cannot go green without a real compile of the learner's own
   code. Observed working end to end during implementation — a real build
   satisfied step 1's `idl` condition and the ratchet advanced.

   Shipped: the four-step Hello Anchor path, step rail, objective band,
   reader overlay, one project switcher instead of two (the rail's
   Projects tab is deleted), a target ring on the stepper, a lesson-aware
   assistant with a three-rung hint ladder and an unaided-first-attempt
   gate. 157 unit tests in 18 suites, 5 playwright e2e. **D16 fixed** as
   its prerequisite — and needed two guards, not the one it predicted.

   Known follow-ups, all recorded in D24 and the spec's concept section:
   step ids are not path-scoped; `describeLesson` would misreport a path
   ending in a reading step; one `useLesson()` hook would collapse six
   hand-rolled subscriptions; `verify.ts`'s `build-passes` and `account`
   sub-condition are unused surface. Merge note: this branch is based on
   `master-2.0` before #15 landed, so `LeftPanel.tsx` needs a hand merge
   with #15's collapse toggle, and `ProjectsTab.tsx` is a delete/modify
   conflict if #15 touched it.
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
