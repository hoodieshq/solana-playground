# Roadmap and status

Updated: 2026-08-28. One page for the whole effort: what shipped, what
is in flight, what is next, and what waits — with pointers to the spec
or decision that carries the detail. Priorities follow D21 (GitHub
identity -> tutorials -> everything else). Update this file whenever a
stream changes state; it lives on `context-archive` with the other
working docs.

Visual version (for syncs): https://claude.ai/code/artifact/d7db5420-2295-4698-b0a1-9d9c03056448
-- regenerated from this file; update both together.
Lesson-paths retrospective (research -> prototype -> result -> next):
https://claude.ai/code/artifact/3857c497-58b3-4f06-8647-96e3fd9b05ed
Tutorials-as-scenario study, 2026-08-27 (the evidence and the three
anatomies the design was chosen from; republished 2026-08-28 from a local
export after the original artifact was deleted -- content unchanged, so it
still describes a five-step path where four shipped):
https://claude.ai/code/artifact/4c4d6654-3eec-4297-b072-8d74ff68378f

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

**Everything declared for the week is merged, and nothing is open.**
#19 landed 2026-08-28 and was the last of twelve PRs; the queue is
empty. `master-2.0` is a clean linear branch on the current upstream
tip, and `client/` is still byte-identical to upstream, so the next
upstream sync stays a fast-forward.

Checked on the merged tree today rather than assumed: `tsc --noEmit`
clean, **242 unit tests in 27 suites** green, one prettier miss
(`Chat.tsx:287-291`, an `onSkipStep` ternary that wants one line).

**CI stays as it is, deliberately.** The 2.0 line ships nothing --
no deploys, and the demos are screencasts recorded from a local
machine -- so wiring `client-v2` into a workflow would gate work that
never leaves the laptop. Decided 2026-08-28. What replaces it: run
`tsc --noEmit`, `prettier --check` and `craco test` by hand on the
merged tree, which is what produced the numbers above. Revisit when the
fork starts deploying; the `__template` case pair below is the first
thing to fix on that day.

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

None. Branch protection stays as it was: PR + **one approval** +
signed commits, and nothing merges on a comment alone. #13 through #19
all merged over 2026-08-27/28.

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
   above, and task 2 of `lesson-paths-todo.md`. Every `LessonStep`
   already carries `target: Stage`, read today only for a tooltip
   (`StepRail.tsx:42`); promote it to the affordance the band offers, so
   a step that a build proves shows Build, and a `deploy` step explains
   its preconditions -- a funded wallet and a cluster -- instead of
   failing on click. Until this exists, every skip taken for want of a
   signpost is a step the toolchain never got to prove.
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

4. **Two ratchet edges, found 2026-08-28.** Both reproduced against
   `progress.ts` directly; the 242-test suite does not cover either.
   - `advance()` promises in a comment that "a build landing while they
     are back reviewing must not move them", but its guard is
     `stayPut = wasAt && !completed.includes(wasAt.id)` -- and a step
     you can step back onto is by definition already behind you.
     `{completed:["s1","s2"], current:"s1"}` plus a successful deploy
     yields `currentStepId: null`: the reader is thrown to the end of
     the lesson. The guard only ever fires for *skipped* steps.
   - `continueRead()` does not check whether the step is already
     complete, and `ObjectiveBand` renders **Continue** for any `read`
     step including one reached by going back. Same input yields
     `completedStepIds: ["s1","s2","s1"]` -- a duplicate id per click,
     persisted to the lesson's workspace record.
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
- `CI=true yarn build` fails on **every** branch, `master-2.0`
  included: `src/tutorials/__template/` holds both `Template.tsx` and
  `template.ts`, and webpack's lazy tutorial context resolves both on a
  case-insensitive filesystem, which `CI=true` promotes from warning to
  error. Found 2026-08-27 while verifying #16. Upstream file -- keep any
  fix to a rename. This is the first thing to clear if the fork ever
  does start deploying.
- `check-format` globs `src/` only, so `api/*.mjs` never sees prettier,
  and `yarn test` does not run it at all. Run prettier over `api/` by
  hand along with `src/`. (#9)
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
- "Wire `client-v2` into CI" -- **retired, not done.** See *Where we
  are*: the 2.0 line deploys nothing, so the checks would gate work that
  never leaves the laptop. The facts it collected are kept under P2.

## Next

D21 set the order (GitHub identity -> tutorials -> everything else).
Both have now landed, so the order below is what comes after them. Step
1 is not new scope: it is finishing the feature that just shipped, on
the terms its own review set.

1. **Make the lesson honest and legible** — the successor to "tutorials
   as a scenario", which merged on 2026-08-28 (#19, `1d908844`,
   D24, spec + plan + research of 2026-08-27; Cat's prototype at
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
   - The signposting fix (P0 item 1) — the direct answer to the review.
   - The two ratchet edges (P1 item 4).
   - Settle the verification criteria with Cat. This is the
     conversation that decides whether monotonicity can come back, and
     it is also where `hello-anchor` step 3 gets an answer: it is a
     `read` step today because nothing free proves a client call
     happened, and `lesson-paths-todo.md` task 1 lays out the three
     candidates (a `logs` kind, a snippet `match` kind, agent judgement
     as a last resort).
   - Then, and only then, more paths.

   *The larger design underneath*, recorded as task 3 of
   `lesson-paths-todo.md` and worth its own spec before any code: one
   `StateMachine` over an explicit transition table, replacing three
   hand-rolled reducers whose guards live at call sites. It keeps the
   event log rather than only the fold, which makes "back" a replay to
   an earlier index instead of a mutation, and lets the agent drive a
   lesson by emitting the same events a human does — with provenance,
   so the record can finally say *who* advanced a step. Both bugs in P1
   item 4 are instances of the problem it removes.

   Known follow-ups from D24 and the spec's concept section, unchanged:
   step ids are not path-scoped; `describeLesson` would misreport a path
   ending in a reading step; one `useLesson()` hook would collapse six
   hand-rolled subscriptions; `verify.ts`'s `build-passes` and `account`
   sub-condition are unused surface.
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
