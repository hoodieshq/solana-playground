# Roadmap and status

Updated: 2026-09-04 (evening). One page for the whole effort, in the
shape the board uses: **initiative -> tracks -> items**, every item with
a status and, where it applies, whose move it is. The prose sections
below the board carry the detail and the history; update this file
whenever a stream changes state. It lives on `context-archive` with the
other working docs.

Visual version (for syncs), regenerated from this file 2026-09-04:
https://claude.ai/code/artifact/d7db5420-2295-4698-b0a1-9d9c03056448
-- update both together.
Companion pages: the lesson-ratchet walkthrough (D25/D26)
https://claude.ai/code/artifact/5fcd0491-04f4-4b8e-87e5-c79e751686f3 ·
tutorials-as-scenario study (2026-08-27)
https://claude.ai/code/artifact/4c4d6654-3eec-4297-b072-8d74ff68378f ·
lesson-paths retrospective
https://claude.ai/code/artifact/3857c497-58b3-4f06-8647-96e3fd9b05ed

## Status board (2026-09-04)

Statuses: **done** · **review** (PR open, awaiting one approval) ·
**active** (being built now) · **next** (not started, in order) ·
**waiting: <who>** (the next move is someone else's) · **parked**.

**Initiative: Playground v2 -- public launch, 30 Sep 2026 (D27).**
Day 3 of 28; **19 working days left**, and the estimates below add up
to about 17 of them -- so the month has no slack, exactly as D27 said.
Order fixed by dependency: floor -> learning core -> identity/storage
-> content. Team 1.5. Cut list decided in advance (storage ->
export/import + banner if solo). Dev tooling deliberately off this
list.

**Where we are now.** The hackathon phase is closed (14 PRs merged,
#5-#19). Three streams have run in parallel since 2 Sep: the floor
(week 1), the lesson-ledger corrections (week 2's track, built ahead of
its week), and -- outside the launch scope -- an upstream feature the
maintainer asked for (server-side rust-analyzer; see *In parallel*
below). In review: **#20** (lesson ledger, 265 tests / 29 suites),
**#21** (production bundle + `client-v2` CI, green in 4m04s), **#22**
(builds on a production domain through `/api/build`, D28).

**The binding constraint right now is review, not build capacity.**
All three PRs are `MERGEABLE` and carry zero reviews: #20 has been open
since 1 Sep, #21 and #22 since 2 Sep. Nothing in the floor is
*blocked* by that -- the next items start in order anyway -- but the
week-1 count cannot move to done, and #21 has to land before #22
rebases onto the workflow. **The one ask for the team sync: name who
reviews, or agree that we self-merge the two PRs that are ours.**

Next, in order: M3/M4 on `/api/agent` (~2 h); the three upstream
demo-path commits (~0.5 d); H1 (~1 d); the durable session (~1 d).
Waiting on the owner: hosting + first deploy, the production OAuth app.

**Week 1 (2-8 Sep) -- The launch floor** · 0/8 done, 2 in review
- [x] review · Production bundle builds; `client-v2` CI -- **PR #21**
      (`__template` rename, `yarn build-fast`, workflow: tsc, prettier
      over `src/`+`api/`, 242 tests, `CI=true` bundle)
- [x] review · Build works on a production domain: same-origin
      `/api/build` proxy (D28) -- **PR #22**; covers the deploy round
      trip too (the allowlist gates every route); cheap H1 rides along
- [ ] next · M3 + M4 on `/api/agent` (null body -> 500; no
      `maxDuration`) -- **est ~2 h**
- [ ] next · Three upstream demo-path commits (`packages`->`bundle`,
      `MINIMUM_EXTEND_PROGRAM_BYTES`, sandboxed non-prod routes) --
      **est ~0.5 d**
- [ ] next · H1: rate limit and caps on `/api/agent` + `/api/build` --
      **est ~1 d**
- [ ] next · Durable session (httpOnly cookie via our `/api`) --
      **est ~1 d**
- [ ] waiting: owner · Hosting + first deploy -- **est ~0.5 d** of our
      work once the answer exists
- [ ] waiting: owner · Production GitHub OAuth app (live app is
      localhost-only)

**Week 2 (9-15 Sep) -- Learning core: the lesson ledger** · 1/6 done, 1 in review
- [x] done · Design: lesson state as a ledger and a cursor (D25, D26)
- [x] review · Implement the ledger (events, folds, migration, band,
      rail) -- **PR #20**; trivial `Chat.tsx` conflict with #21, take
      #20's side
- [ ] next · Round-close docs pass: two spec amendments from the
      friction log (`attempt` payload; the cursor's multi-step `graded`
      fixpoint), the one-way-rollback note beside D25, one walkthrough
      refresh -- **est ~3 h**
- [ ] next · Readiness explainer (`needs-build` / wallet / cluster /
      sol) -- consciously out of #20; **est ~1.5 d**, and it is the
      cheapest visible thing available to start today (stacked on #20)
- [ ] waiting: team · The frame revision as a decision beside D24
- [ ] waiting: Cat · Step 3 wording / proof criteria for new lessons
      (needed by 16 Sep)

**Week 3 (16-22 Sep) -- Identity, expensive half** · 0/3 · C before B
by dependency: storage only after the ledger, because the pre-ledger
record lies
- [ ] next · Per-user storage service behind our `/api`, never
      `server/` -- **est ~3 d**
- [ ] next · Progress log + project files synced per user (answers the
      reload-signs-you-out case properly) -- **est ~2 d**
- [ ] parked · Fallback if solo: export/import + honest banner (the cut
      list's first cut) -- **est ~1 d** if it replaces the two above

**Week 4 (23-30 Sep) -- Content, polish, rehearsal** · 0/5
- [ ] next · New lesson paths (needs Cat's answer above) -- **est ~3 d**
      for two paths, once the wording exists
- [ ] next · Error-UX pass -- **est ~1.5 d**
- [ ] next · Upstream sync, the remaining ~21 commits -- **est ~2 d**
- [ ] waiting: owner · Metering in front of `/api/agent` -- only if
      inference is operator-paid; **est ~2 d** if it happens
- [ ] next · Full launch rehearsal on the production origin --
      **est ~1 d**

**In parallel -- outside the launch scope: server-side rust-analyzer
(upstream)** · 3/5 done · asked for by the upstream maintainer
(acheron) on 2026-09-04 and taken because it touches none of the v2
files: the work is in upstream's `client/` and `server/`, on
`feat/rust-analyzer-lsp` off `upstream/master`, and it reaches v2 later
through the normal upstream sync. Spec:
`docs/superpowers/specs/2026-09-04-rust-analyzer-lsp-design.md`; the
plain-language version for the call:
`docs/internal/2026-09-04-call-notes-rust-analyzer-lsp.md`.
- [x] done · Editor side: a WebSocket LSP client and a setting that
      picks the backend (WASM stays the default) -- ~1100 lines,
      23 tests
- [x] done · Server side: `GET /unstable/lsp`, one container per
      session, limits from config (4 sessions, 10 min idle, 4 GiB,
      1 CPU); `rust-analyzer` + a warm `cargo check` in the template
      image
- [x] done · Verified against real Docker (2026-09-04): image built
      under amd64 emulation in 17 min; session start 1.65 s,
      `initialize` 0.2 s, a saved type error surfaced as `rustc E0308`
      in ~9 s. 21 review findings folded in
- [ ] next · Finish and open the upstream PR -- **est ~1-2 h**
      (`rust-src` sysroot in the image, README paragraph for the
      `PG_LSP_*` env vars, PR text). Nothing is pushed without the
      owner's word
- [ ] waiting: upstream · Whether they enable it on their server (it
      sits behind their `--features unstable` either way)

Effort so far: **~4.5 h** in one day. What it buys, in user terms: Rust
hints in the editor that match the *current* toolchain (Anchor 1.1.2 on
Solana 3.x) instead of the frozen 0.29 set -- real hover docs, account
completion after `ctx.accounts.`, and compiler errors before the learner
presses Build. What it costs us later: this backend speaks WebSocket,
and our v2 Vercel proxy cannot carry one, so offering it in v2 needs a
direct server URL (friction log #11) -- not a launch item.

**Estimates.** The `est` figures are our own engineering estimates, not
measurements, in days of one person's work with agents. The ~17-day
total counts the `next` items only: it excludes the parked storage
fallback, the owner-side items, metering (which exists only if
inference is operator-paid), and this parallel upstream stream.

**Before the frame -- shipped 19-28 Aug** (15 items, all merged; the
table under *Shipped* has the hashes): assistant panel + Solana
redesign + `client-v2` home (#5), Flow (#8), Flow visual parity (#7),
MCP gateway (#10), static assets + docker (#11), Explorer label (#12),
GitHub sign-in with gated airdrop (#9), Default backend (#13), Trees
API import (#14), cmd+B (#15), platform RPC + cluster toggle (#16),
COOP fix (#17), Chip restore (#18), tutorials as a scenario (#19).

**The agent is a launch surface of its own.** `/api/agent` ships on the
same origin, so the hosting decision is the agent's hosting decision;
launch mode is BYO-key (fallback) or operator-paid (needs metering +
H1); H1 is in the floor either way because D28 widens it.

**Open questions — the discussion block.** This board is what Slava
takes to his tech lead and manager, so each question carries its
context, what it gates, the options, and what we do meanwhile — none
of them blocks a feature stream (features-first: uncertainty resolves
in parallel). **First weekly call with Cat: 2026-09-11.** The aim is
to arrive with the functionality done, so the call spends itself on
technical questions and polish, not on demos of unfinished work. The
questions for Cat are written out and ready to send ahead of it:
`docs/internal/2026-09-02-questions-for-cat.md`.

0. **The responsibility boundary: do we operate the backend at all?**
   Everything below assumes we run `/api/*` on our origin — the agent
   relay, the build proxy (D28), later per-user storage. That
   assumption is unvalidated: the alternative is that the customer's
   side provides a backend and hands us endpoints. This one question
   gates four others: hosting, the OAuth callback, H1's scope, and the
   storage service's shape. *Who:* customer side, at the 2026-09-11
   call. *Meanwhile:* we build same-origin `/api/*` — it runs on any
   host and survives either answer: the build proxy's upstream is one
   env var (`BUILD_SERVER_URL`) away from any backend they hand us.
   (Measured 2026-09-02, corrected same day: both hosts build the same
   program in ~4-5 s with an empty queue; builds serialize behind a
   file lock and a client timeout never cancels one server-side — so
   the H1-relevant abuse on any upstream is *enqueueing*, and the
   upstream choice is about operation, not raw speed.)
1. **Hosting and operator** (if the answer to 0 is "us"): the
   production target, the domain, who holds the keys and answers
   pages. Whoever operates the site operates an LLM relay — that is
   the weight of this choice. *Who:* owner. *Meanwhile:* Vercel
   previews keep every PR clickable; nothing waits.
2. **Who pays for inference at launch:** BYO-key (no metering needed,
   but an entry barrier for exactly the newcomers the lessons target)
   vs operator-paid (needs metering + H1 first). *Who:* owner.
   *Meanwhile:* the plan builds on BYO-key; metering stays a week-4
   item that only exists if the answer is operator-paid.
3. **What counts as proof of a step in new lessons** — the mechanism
   is settled (D25/D26: synchronous conditions, on-demand log checks,
   authored behavioral tests), what is left is curriculum: does step 3
   stay "call the instruction" or become "call it and see your own log
   line", and what proves each step of the next paths. *Who:* Cat, by
   16 Sep — questions sent ahead of the 11 Sep call. *Meanwhile:*
   week-4 content is the only thing gated; everything else proceeds.
4. **The frame revision as a decision** (files-only left column,
   band-as-navigation, guide column — walkthrough ch. 07). *Who:* the
   team, beside D24. *Meanwhile:* no code until recorded; PR #20
   deliberately excluded it.
5. **An origin allowlist entry at `api.solpg.io`** for our production
   domain. *Who:* Foundation, asked in parallel with D28. *Meanwhile:*
   the proxy covers build and deploy either way; if granted, it thins
   or disappears.

**Deferred by decision:** wallet-adapter (D21); modern Anchor / Kora
(Acheron's grant); Better Auth (rogaldh); verifying faucet
(Foundation); playground-tokens mode (parked, its metering half gates
a paid key).

## The September frame (D27)

Reported by Slava 2026-08-31, decided 2026-09-02; the full context is
`docs/internal/2026-09-02-september-launch-scope-handoff.md`. The
project is handed to us for real implementation; the deadline is the
**end of September 2026** and what ships at it is a **public launch**.
Regular owner sessions are part of the process. Launching the current
surface unchanged was rejected — both durable identity and the
learning path are in; the order (ledger before storage) is a
dependency, not a taste, and D27 records why.

| Week | Track | What lands |
| --- | --- | --- |
| 1 | The floor + the cheap half of identity | production bundle + CI (**PR #21**, 2026-09-02, CI green), hosting + first deploy, production OAuth app, `/api/build` proxy (D28), H1 hardening, M3/M4, the three upstream demo-path commits, durable session (httpOnly cookie via our `/api`) |
| 2 | Learning core | D25/D26 — the lesson-ledger round: **implemented 2026-09-02, PR #20 in review** (brief: `docs/internal/2026-09-01-lesson-implementation-brief.md`; friction log committed) |
| 3 | Identity, expensive half | per-user storage: the progress log and project files through our `/api`, never `server/` |
| 4 | Content, polish, rehearsal | new lesson paths (needs Cat's proof-criteria answer by the start of week 3), Error-UX pass, upstream sync, one full launch rehearsal |

**The floor is not the month's content — it is the condition for the
content arriving.** ~6–8 days, almost all known and mechanical. Two
people parallelize weeks 1–2 with no shared files (the floor lives in
`api/*.mjs`, configs and CI; D25 lives in `views/flow/lessons/`).

**The arithmetic and the cut list.** ~25 working days in 28 calendar
days: solo means no slack. Decided in D27: if the month is solo, the
first cut is the storage service — it degrades to project
export/import as a single file plus an honest banner that programs
live in the browser. Identity and learning both survive the cut.

**The AI agent is a launch surface of its own, not a footnote.** The
assistant is the flagship story, and it ships as `/api/agent` on the
same origin — so the week-1 hosting decision *is* the agent's hosting
decision, and whoever operates the site operates an LLM relay. Its
launch mode is the inference-payer axis: **BYO-key** (the cheap
fallback — no metering needed, but an entry barrier for exactly the
newcomers the lessons target) or an **operator-paid key** (requires
metering — Next step 3 — and H1 before it can exist; H1 is in the
floor either way, because D28's `/api/build` widens the same work).
The agent surface at launch = hosting + this choice + the hardened
routes; it has no separate week because it rides the floor and step 3.

**Owner-side answers still pending** (the plan builds on the cheap
fallback of each): hosting and operator; who pays for inference at
launch (fallback BYO-key). **Team size is answered (2026-09-02): 1.5**
— Slava full-time working with AI agents, a second person joinable at
need. The solo arithmetic still applies to human review bandwidth, so
the cut list stays in force as insurance rather than as the plan.
**Dev-process tooling ("step zero") is deliberately not on this
roadmap** (Slava, 2026-09-02): it is internal kitchen — how the
product is built, not what ships — and the setup story is told after
the result, when someone asks how it was done.

**New launch blockers surfaced by the frame change:**
- `CI=true yarn build` fails on every branch (`__template` case pair)
  — under the old frame a P2 fact, under this one **we cannot produce a
  production bundle at all**. **Fixed in PR #21** (2026-09-02): the
  rename, a `build-fast` script, and the `client-v2` Actions workflow
  (tsc, prettier over `src/`+`api/`, unit suite, `CI=true` bundle) on
  every PR to `master-2.0`. The clash was macOS-only — see friction log
  `2026-09-03-launch-floor-friction.md` #1.
- `api.solpg.io` allowlists origins, so a production domain is refused
  at preflight — found 2026-08-31, decided as D28: same-origin
  `/api/build` proxy, Foundation allowlist ask in parallel.
- The live GitHub OAuth app is localhost-only; production needs its
  own app and callback.

## The week's brief, item by item

The list agreed at the meeting of Friday 2026-08-22, laid against what
exists on 2026-08-28. Six items were declared; four are ours to do. Of
those four: two shipped and merged, one is deferred by an explicit
decision, one is the next stream. Two are external and unchanged. Keep
this table current -- it is what the presentation reads from.

| # | Declared | State | Evidence | Next |
| --- | --- | --- | --- | --- |
| 1 | Wallet-adapter instead of the local wallet (Phantom et al.) | **Deferred by decision** | D21; backlog entry below | Runs in parallel when scheduled, with its own spec |
| 2 | Sign in with GitHub; airdrop behind it | **Shipped** | #9 merged (`7a559c0a`), #17 merged (`dd871c5c`); D23; spec `2026-08-25-github-oauth-design.md` | Durable session, answered with item 6 |
| 3 | Improve the tutorials scenario -- connected tutorials, learning curves, connected prompts for agents | **Shipped, thesis amended in review** | #19 merged 2026-08-28 (`1d908844`); D24; spec + plan + research of 2026-08-27 | Make the step criterion legible before more paths -- see *The ratchet, after review* |
| 4 | Modern Anchor version | **External, unchanged** | D21; Acheron's grant | Revisit when the grant resolves |
| 5 | Better builds with Kora | **External, unchanged** | D21; Acheron's grant | Revisit when the grant resolves |
| 6 | Programs saved per user, not locally (Cat, after the meeting) | **Next stream, concept only** | Step 2 in Next below | Design it now that #19 has landed |

Item 1's cost is the reason it waits: wallet-adapter cuts through
`commands/deploy/deploy.ts` (29 commits in six months) and
`utils/wallet/wallet.ts` (9), the two hottest files upstream keeps
changing, for little the demo can show -- and the fork's merge strategy
is to stay a fast-forward.

Item 2's honest boundary, to be said out loud in any demo: the gate is
client-side, and nothing server-side verifies sign-in, because the
Foundation's verifying faucet does not exist. Written down in the spec
rather than implied.

Items 4 and 5 rest on an environment fact worth carrying into the
conversation: the supported-crate list is a fixed whitelist,
`anchor-lang` is pinned at 0.29 and `solana-program` at 1.16, and there
is no Pinocchio template. Upstream intends to address that; we do not
fork it.

**Not on the list, delivered anyway** -- review follow-ups and
demo-readiness, not scope creep: #14 (GitHub import through the Trees
API, D22), #15 (`cmd+B` panel toggle), #16 (platform RPC endpoints and
the cluster toggle), #13 (a real Default backend behind `/api/agent`),
#12, #17, #18. Step 0 below came out of #18.

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
| Deploy Explorer label fix | PR #12, merged 2026-08-26 (`4ec87d0c`) | Trivial `no-useless-concat`; also unblocked `CI=true yarn build` |
| GitHub OAuth sign-in with a gated airdrop | PR #9, merged 2026-08-26 (`7a559c0a`, approved by rogaldh) | Spec `2026-08-25-github-oauth-design.md`; PKCE S256, BroadcastChannel transport, profile popover, 3 playwright e2e |
| Toggle the Flow left panel with cmd+b | PR #15, merged 2026-08-27 (`7e9fe677`) | `⌘B` to match `⌘J`, collapsed rail, `PANEL_RADIUS` reconciled |
| GitHub import through the Trees API | PR #14, merged 2026-08-27 (`a6586b9d`) | One rate-limited request instead of one per directory; readable errors. Decision: D22 |
| Platform RPC endpoints and a header cluster toggle | PR #16, merged 2026-08-27 (`eb17fed9`) | Build-time RPC per cluster, cluster badge as a settings toggle. Rebased twice, one non-blocking review note (P2) |
| Sign-in survives the GitHub hop | PR #17, merged 2026-08-27 (`dd871c5c`) | `popup.closed` lies once COOP severs the handle; first-time sign-in now works. Decision: D23 |
| Chip status wrapper restored | PR #18, merged 2026-08-27 (`01e726e8`) | Cleared the typecheck break #16 and #17 created between them |
| A real Default backend | PR #13, merged 2026-08-27 (`18a2b531`, rogaldh) | Same-origin `/api/agent`; the scripted Demo provider is gone. H1 (no metering) still stands before any paid key |
| Tutorials as a scenario | PR #19, merged 2026-08-28 (`1d908844`, approved by rogaldh) | Four-step Hello Anchor path, step rail, objective band, reader, lesson-aware assistant. rogaldh added 23 commits before merging, including the escape valve that amends D24 -- see below. Decision: D24 |

**Every hash above changed on 2026-08-27**: `master-2.0` was rebased onto
upstream `master` (`57479351`) and force-pushed, so the old ids in earlier
versions of this file no longer resolve. The fork is now 13 linear commits
on top of the current upstream tip, and `client/` is still byte-identical
to it.

## Where we are

**Everything declared for the hackathon week is merged; two PRs of
the September plan are open** (#20, #21 -- see *Open pull requests*).
#19 landed 2026-08-28 and was the last of the hackathon PRs. `master-2.0` is a clean linear branch on the current upstream
tip, and `client/` is still byte-identical to upstream, so the next
upstream sync stays a fast-forward.

Checked on the merged tree rather than assumed: `tsc --noEmit`
clean, **242 unit tests in 27 suites** green, one prettier miss
(`Chat.tsx:290-292`, an `onSkipStep` ternary that wants one line --
fixed in #21).

**The CI decision of 2026-08-28 is revisited, as its own text said it
would be.** It rested on "the 2.0 line ships nothing"; D27's public
launch removes that premise, so a `client-v2` CI workflow (tsc,
prettier including `api/`, tests, `CI=true` build) is now part of the
week-1 floor. **Landed as PR #21 (2026-09-02)**: the workflow runs on
every PR to `master-2.0`; the `__template` clash turned out to be a
case-insensitive-filesystem defect a Linux runner alone would never
have caught (friction log `2026-09-03-launch-floor-friction.md` #1).

The one demo question left open by #13 is unchanged: not whether to
adopt the Default backend, but whether the demo *points it at a paid
key*. H1 -- an unmetered LLM relay on a public URL -- is the gate, and
metering is step 3 below.

## The ratchet, after review

D24's thesis was that a lesson step is finished by the toolchain, not
by a click, and that the path is monotonic. rogaldh reviewed the
running feature and amended it before merging (23 commits on top of the
handoff). The objection, in his words: the flow "only lets you through
once you have completed a step, and the criterion for a completed step
is itself unclear" -- so in hackathon conditions the strictness costs
more than it buys. Recorded in `docs/lesson-paths-todo.md`, which he
added to the project on purpose so the next reader finds it beside the
code.

**What actually changed, precisely.** The learner can now move past a
step without proof, and can walk back to any earlier step. What did
*not* change is the part that carries the claim: the record is still
append-only, and only the toolchain can mark a step *proved*. A
pass-without-proof is written to a separate `skippedStepIds` field, and
a later build that does satisfy the condition upgrades it to a real
completion. So the honest statement is no longer "the path never runs
backwards" -- it is **the ledger never runs backwards; the learner
may**. Anything that still says otherwise is stale, including the
visual version of this file.

**Where it goes next.** The strictness is not the problem; the
illegible criterion is. A learner who is one unlabelled click from
finishing a step is not stuck, and rogaldh observed exactly that: after
the assistant wrote the file, nothing told the learner a build was the
move, so they reached for the escape valve. Fixing the signposting is
what makes it reasonable to consider restoring monotonicity -- with
the verification criteria themselves to be settled with Cat. Two of
the three tasks in `lesson-paths-todo.md` are that work; see *Next*.

**Two edges the reviews did not catch**, found 2026-08-28 by probing
`progress.ts` directly. Both are in P1 below with reproductions, and
both are the class of bug the StateMachine task predicts: guards that
live at call sites rather than in a transition table.

## Upstream drift in `client-v2`

New as of the 2026-08-27 rebase, and the most expensive thing on this
page. `client-v2` is a fork copy of `client/`, and `client/` just moved
**24 commits** -- none of which are in `client-v2`. Three land on the
demo path:

- `3e72bea6` replaced the `packages` route with `bundle`, so
  `server/src/routes/` no longer has `packages.rs` or `types.rs` at
  all. `client-v2/src/utils/server.ts:82,107` still calls
  `/unstable/packages/:name` and `/unstable/types/:name`. Against
  `api.solpg.io` this still works -- that deployment is older -- so it
  is a scheduled break, not a visible one.
- `4e7a933b`, `ef8ba918` and `dd1bafd6` cover program upgrades:
  upstream added `MINIMUM_EXTEND_PROGRAM_BYTES` and uses it in
  `deploy.ts:398`. The symbol does not exist in `client-v2`, so
  redeploying after a patch -- the demo's own scenario -- hits
  SIMD-0431 once the feature gate activates.
- `57479351` routes non-prod `/build` and `/deploy` through sandboxed
  unstable routes; `client-v2` lost that option in the copy.

Worth reading for a different reason: `82766e9b` ("Suggest solutions
for common build errors") is upstream starting on the thing the
assistant sells. Input for the next Foundation conversation, not a
merge task.

## Open pull requests

- **#20** `feat/lesson-ledger` -- the lesson ledger (D25), in review
  since 2026-09-01; corrections continue in its own session.
- **#21** `fix/ci-production-bundle` -- production bundle + `client-v2`
  CI, opened 2026-09-02, the workflow green on its first run (4m04s).
  Formats `Chat.tsx:290-292`, which #20 rewrites: whichever lands
  second takes #20's side of a one-line conflict.

Branch protection stays as it was: PR + **one approval** + signed
commits, and nothing merges on a comment alone.

### What #13's merge left behind

#13 shipped the transport half of the parked playground-tokens design.
Three items from its review were still open when it merged, so they are
live on `master-2.0` now rather than branch notes: **M3** and **M4** are
P0 below, **H1** is P1 item 6 and the gate on any paid key. One product
question is still unanswered: deleting Demo removed the only
zero-network backend, so a fork without `AGENT_*` set opens on a dead
preselected option.

### Historical: PR #18 — the Chip master-2.0 could not compile without

Merged (`01e726e8`). Kept because it is the clearest case for running
the checks by hand after two concurrent branches land.
`tsc --noEmit` failed on `master-2.0`:
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

### Historical: PR #13 — the Demo backend replaced by a real default

Merged (`18a2b531`, rogaldh). Deletes the scripted `Demo` provider and adds `api/agent.mjs`, a
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

### P0 -- in the way of the demo and of more lesson paths

1. **Make the step criterion legible.** The direct answer to the review
   above, and task 2 of `lesson-paths-todo.md`. **Designed 2026-08-28**
   -- `docs/superpowers/specs/2026-08-28-lesson-state-machine-design.md`,
   D25 -- and **implemented 2026-09-02 (PR #20, in review)**; what is
   left here is the review and the round-close docs pass (spec
   amendments from the friction log). The design derives the
   verifying action from the condition rather than promoting the
   authored `target: Stage`, which has already drifted (`hello-anchor`
   step 3 declares `target: "interact"` for a step no stage can prove),
   and makes preconditions explain rather than fail. Until it ships,
   every skip taken for want of a signpost is a step the toolchain never
   got to prove. **Amended by D26 (2026-09-01)** after the team call:
   the on-demand grader class gains an authored `test` condition for
   steps whose objective is behavior; backend grading endpoints were
   rejected. **Implementation round brief:
   `docs/internal/2026-09-01-lesson-implementation-brief.md`** - branch
   `feat/lesson-ledger` off `master-2.0`; the frame revision is
   explicitly out of that PR's scope until recorded as a decision.
2. **Sync the three upstream changes that touch the demo path** -- the
   `packages`/`bundle` route swap, `MINIMUM_EXTEND_PROGRAM_BYTES`, and
   the sandboxed non-prod routes. See *Upstream drift* above. The first
   is a break already scheduled against any server built from this tree;
   the second bites the demo's own redeploy step.
3. **M3 and M4, live on master.** #13 merged with both open: a `null`
   JSON body returns 500 (`api/agent.mjs:131`, the check sits outside
   the try that wraps parsing), and no `maxDuration` in `vercel.json`
   means a streaming answer is cut at the default function timeout.
   Re-verified in the code 2026-08-28. Both small.

### P1 -- important, next in line

4. **Three ratchet edges, found 2026-08-28.** All reproduced against
   `progress.ts` directly. **All three are answered by D25's model** as
   cases it makes unrepresentable, so they are fixed by that
   implementation rather than separately.
   - `advance()` promises in a comment that "a build landing while they
     are back reviewing must not move them", but its guard is
     `stayPut = wasAt && !completed.includes(wasAt.id)` -- and a step
     you can step back onto is by definition already behind you.
     `{completed:["s1","s2"], current:"s1"}` plus a successful deploy
     yields `currentStepId: null`: the reader is thrown to the end of
     the lesson. The guard only ever fires for *skipped* steps.
     Uncovered by the 242-test suite.
   - `continueRead()` does not check whether the step is already
     complete, and `ObjectiveBand` renders **Continue** for any `read`
     step including one reached by going back. Same input yields
     `completedStepIds: ["s1","s2","s1"]` -- a duplicate id per click,
     persisted to the lesson's workspace record. Uncovered.
   - **`continueRead()` writes a click into `completedStepIds`** -- the
     field D24's amendment reserves for toolchain proof, so the shipped
     record already claims verifications that never happened. Not
     uncovered but *asserted*: `progress.test.ts:325` expects it. The
     worst of the three, and the reason D25 is not only bug prevention.
5. **Run the OAuth e2e on port 3000.** Demoted from P0 on 2026-08-28:
   sign-in itself works from the first click (#17), so this is a
   question about the test, not the feature. The wrong-nonce case
   stalls at "Signing in..." on `master-2.0`; every run so far was on
   another port while the GitHub app's callback is pinned to 3000, so
   one run there says whether it is a real gap in the failure path or a
   test-environment artifact.
6. **Harden `/api/agent` before it ever holds a paid key** -- part of
   the metering step, see *Designed, parked*. Body-size cap,
   messages/tools count caps, `Origin`/`sec-fetch-site` same-origin
   check, per-IP token bucket. Without these the route is an
   unauthenticated general-purpose LLM relay. (#13 review, H1)
7. **Wrap the project snapshot in untrusted-data delimiters** and move
   it out of the `system` role. Shared projects are attacker-controlled
   text and go to the model unmarked today. (#5)
8. **`requestApproval` should return `{ id, allowed }`.** It returns a
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

Kept from the retired "verification you can trust" step, because the
facts outlive the step (see *Where we are* for why it is retired):
- ~~`CI=true yarn build` fails on every branch~~ -- **fixed in #21**
  (`__template/template.ts` -> `__template.ts`); the clash was
  macOS-only. New P2 from the same round: Rust Analyzer's crate data
  has never been in any production bundle this fork produced
  (`generate-crates` finds an empty registry locally and no rustc on
  Vercel) -- friction log #3.
- ~~`check-format` globs `src/` only~~ -- **fixed in #21**: `format` and
  `check-format` cover `api/`, and CI runs `check-format`.
- `docs/lesson-paths-todo.md` lives on `master-2.0`, against the
  convention that working docs stay on `context-archive`. Deliberate on
  its author's part -- the point was that the next reader finds it beside
  the code it describes. Worth one decision either way rather than
  drifting.

Loose ends with no home yet:
- Space Grotesk is still a runtime Google Fonts `@import`
  (`src/index.css:1`) rather than self-hosted. (#5)
- The dead `useDbServer` branch in `utils/server.ts` and the `Share`
  modal it serves survive, with sharing disabled in this fork. (#9, #10)
- Roving tabindex: done for `GearSidebar`'s network list in #16, open
  everywhere else. (#8)
- The classic layout carries one-off radii (`10px`, `16px`) that no
  constant owns. (#15)
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
- #14, #15, #16, #17, #18 and #13 all merged to `master-2.0`.
- `master-2.0`'s typecheck break -- closed by #18 (`01e726e8`).
- #19 merged (`1d908844`). The queue is empty.
- `PgKeybind` never asserting a modifier is *absent*, so `Ctrl+Shift+B`
  also matched `"Ctrl+B"` (#15) -- fixed inside #19 by rogaldh, with
  `keybind.test.ts` as the guard.
- The `Button` component restoring its state after a click handler had
  already unmounted it -- fixed inside #19 by rogaldh.
- "Wire `client-v2` into CI" -- retired 2026-08-28 under the
  hackathon frame, **reopened by D27 and done in #21** (2026-09-02).

## Next

D27 sets the order now (floor -> ledger -> storage -> content); the
week table above is the calendar. The steps below carry the detail
each week draws on. Step 1 is not new scope: it is finishing the
feature that shipped, on the terms its own review set — and it is
week 2.

1. **Make the lesson honest and legible** — **designed 2026-08-28;
   implemented 2026-09-02 on `feat/lesson-ledger` (PR #20, in
   review).** Round brief:
   `docs/internal/2026-08-28-lesson-architecture-brief.md`. Result:
   `docs/superpowers/specs/2026-08-28-lesson-state-machine-design.md`
   and D25. The successor
   to "tutorials as a scenario", which merged on 2026-08-28 (#19,
   `1d908844`, D24, spec + plan + research of 2026-08-27; Cat's prototype at
   solana-learning-playground.vercel.app was the source of the
   connected-prompt mechanic).

   *What shipped:* the four-step Hello Anchor path, step rail, objective
   band, reader overlay, one project switcher instead of two, a target
   ring on the stepper, a lesson-aware assistant with a three-rung hint
   ladder and an unaided-first-attempt gate — plus, from rogaldh's 23
   review commits, a resizable panel, delete-from-switcher, a stepper
   that collapses to initials with `Ctrl/Cmd+1-4`, and the escape valve.
   242 unit tests in 27 suites, 5 playwright e2e. **D16 fixed** as its
   prerequisite, with two guards rather than the one it predicted.

   *What is left, in order:*
   - ~~Implement D25~~ **Done 2026-09-02 — PR #20 (draft, awaiting
     rogaldh), five commits on `feat/lesson-ledger`.** One machine, two
     folds over an event log; the three defects are impossible-case
     tests (D-c's old assertion at `progress.test.ts:325` is inverted,
     which is the point of the diff); the band's primary is the
     criterion, the rail navigates the legal set, both skip valves
     share the frontier-only `pass` edge, `target: Stage` is deleted,
     v1 records migrate per kind with `actor: "unknown"`. 265 tests /
     29 suites from the 242/27 baseline; dev-server smoke on Hello
     Anchor passed. The stress-test findings live in
     `docs/internal/2026-09-01-lesson-implementation-friction.md` —
     two spec amendments to record at round close (the `attempt`
     payload; the cursor's multi-step `graded` fixpoint), plus the
     deferred `readiness` explainer, which needs its own slot.
   - Record the frame revision (2026-08-31; walkthrough chapter 07:
     files-only left column, band-as-navigation with a step-map
     dropdown, guide column of page-over-chat on the right) as a
     decision — an amendment beside D24 — once the team agrees. Not
     started as code until then.
   - Cat settles `hello-anchor` step 3's *wording*. The mechanism is no
     longer open: D25 chose the transaction's own logs, read on demand,
     and rejected the snippet `match` (an answer key) and agent
     judgement (contradicts `prompt.ts`, non-deterministic); D26
     (2026-09-01) added the escalation for behavior steps — an authored
     `test` bundled with the path and run by the client's own sandboxed
     TS runtime, backend endpoints rejected. What is
     left is a curriculum question — does the step stay "call the
     instruction" or become "call it and see your own log line". Either
     grader switch is its own release: the v1 migration must never land
     together with a grader-class change.
   - Then, and only then, more paths.

   *The larger design underneath* — task 3 of `lesson-paths-todo.md` —
   **is D25.** It is narrower than the task's wording in one deliberate
   way: `PgFlow` stays its own reducer and becomes an event source, and
   `PgAssistant` is untouched, because rewriting the store that drives
   the stepper, the stages and the chips buys the lesson nothing. It
   also declines the task's "back as a replay to an earlier log index":
   a fold replayed to index `i` drops proofs earned after `i`, which
   contradicts the monotonic ledger, so back appends a `move` and
   truncates nothing. What it keeps is the point — an explicit table, an
   event log, and provenance on every event, so the record can finally
   say *who* advanced a step.

   Known follow-ups from D24 and the spec's concept section, unchanged:
   step ids are not path-scoped; `describeLesson` would misreport a path
   ending in a reading step; one `useLesson()` hook would collapse six
   hand-rolled subscriptions; `verify.ts`'s `build-passes` and `account`
   sub-condition are unused surface.
2. **Per-user program storage** — Cat's condition for sign-in to pay
   off, and week 3 under D27, deliberately *after* the ledger: an
   append-only log is the cheapest sync format, and storing the
   pre-ledger record would persist false verifications. The durable
   session (httpOnly cookie via our `/api`) is split off into week 1;
   if the month is solo, this service is the first cut (D27) —
   export/import as a single file plus an honest banner. A separate
   service, never `server/`. Feeds back into the OAuth stream.
   Carries the session question with it: the GitHub token is held in
   module memory only, so a reload signs the user out (D3's reasoning,
   applied to the token). That is deliberate and correct while project
   code shares the origin, but a durable session is exactly what this
   step has to answer -- a server-side session against per-user
   storage, rather than putting the token in browser storage.
3. **Metering in front of `/api/agent`** — the surviving half of the
   parked playground-tokens design, and the gate on pointing the
   Default backend at a paid account. Carries P1 item 6.
4. **Keep `client-v2` in step with upstream** — a standing chore, newly
   real: 24 upstream commits are already ahead of the copy. Cheapest as
   a small sync PR after each upstream rebase, most expensive as one
   large catch-up later. The three demo-path items are P0 item 2; the
   rest (the `Error` route replacing `NotFound`, the removed `Approve`
   modal, `PgPackage` renamed to `PgWasmPackage`, `PgCompression`) can
   travel together.

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
- **Cat, on the verification criteria** — the open half of Next step 1.
  Her prototype was already walked through live and fed the
  connected-prompt mechanic; what is needed now is agreement on what
  counts as proof for a step that no free artefact can grade.

## Concepts on paper (deliberately not built)

Per the "concept on paper, simplified in code" principle
(`product-brief.md`): verifying faucet endpoint, per-user program
storage service, cookie-based session persistence, per-identity token
accounting. Each is written where it belongs — the OAuth spec's
concept section — and ships only when its stream is scheduled.
