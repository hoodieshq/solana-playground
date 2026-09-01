# Handoff: the September launch scope (brainstorm in progress)

Date: 2026-09-02. Written by the session Slava opened on 2026-08-31 to
re-plan the effort against a real deadline. Hand-off target: the
docs/design session on `context-archive` that holds the D25/D26 lesson
work, so the two scopes can be merged into one `docs/roadmap.md`.

**Status of everything below: proposed, not approved.** The month shape
in section 5 was presented to Slava and he has not yet answered the
three questions that close it (section 9). Nothing here is a decision
yet, and none of it is recorded in `docs/decisions.md`.

**No code was written in this session.** No branch was cut, no commit
made, nothing staged. The only artefacts are this file and the
verification runs in section 3.

---

## 1. The news that changes the frame

Reported by Slava on 2026-08-31, in his words:

- **The project has been handed to us.** He implements it over the
  coming months, rather than it being a speculative prototype.
- **The deadline is the end of September 2026.** Initially stated as
  end of October, then corrected to September in the same
  conversation.
- **What happens at the deadline: a public launch.** Chosen from four
  options offered (live conference demo / internal handover to the
  owner / public launch / both). The conference presentation exists as
  an intent -- the owner wants to present Playground to an audience --
  but its date was not given and is not the deadline.
- **Regular sessions with the owner** are now part of the process.
- Slava wants dev-process infrastructure ("step zero") in the plan
  alongside features: agent predictability, onboarding for teammates
  who join the implementation periodically, reliability.

The previous phase was, in his framing, hackathon mode. This is not.

## 2. Why the hackathon frame no longer holds

Three things recorded as deliberate choices rest on the premise that
the 2.0 line ships nothing. A public launch removes that premise, so
each needs revisiting rather than carrying forward:

- **"CI stays as it is, deliberately"** (decided 2026-08-28, in
  `docs/roadmap.md` under *Where we are*). The stated reason is that
  the 2.0 line deploys nothing and the demos are local screencasts.
  From the moment there is a public URL that reason is gone.
- **`CI=true yarn build` fails on every branch** (`src/tutorials/
  __template/` holds both `Template.tsx` and `template.ts`; webpack's
  lazy tutorial context resolves both on a case-insensitive
  filesystem). Filed under P2 and named "out of scope" in the
  2026-09-01 lesson-ledger brief. It is a **launch blocker**: today we
  cannot produce a production bundle at all. The fix is a rename in an
  upstream file.
- **The airdrop gate is client-side only**, and per-user storage does
  not exist, so programs live in browser storage. Acceptable to state
  out loud in a demo; a different matter for a public product where a
  visitor loses their work.

## 3. State verified on 2026-08-31, not assumed

Run against `master-2.0` at `1d908844`, which was and still is the tip
and is level with `origin/master-2.0` (0/0):

| Claim in `docs/roadmap.md` | Verified |
| --- | --- |
| `tsc --noEmit` clean | yes, clean |
| 242 unit tests in 27 suites | yes, 242/27, exit 0 |
| one prettier miss in `Chat.tsx` | yes, and it is the only one |

**The documentation was accurate.** No drift found between the roadmap
of 2026-08-28 and the code.

Also checked: no open pull requests; `context-archive` present both
locally and on `origin`; `feat/lesson-paths` is 37 ahead / 40 behind
`master-2.0` and is #19's pre-squash history, i.e. stale after the
merge (the 2026-09-01 brief already says not to reuse it, which
agrees).

**These numbers are two days old.** Re-run them before relying on them;
the lesson-ledger round may have moved the baseline.

## 4. A new finding, not previously recorded anywhere

**`api.solpg.io` filters by an origin allowlist, so our production
domain will be refused.** Measured 2026-08-31 with `OPTIONS
https://api.solpg.io/build`:

| `Origin` sent | `access-control-allow-origin` returned |
| --- | --- |
| `http://localhost:3000` | echoed back -- allowed |
| `https://beta.solpg.io` | echoed back -- allowed |
| `https://solpg.io` | absent -- denied |

The build server is not open to arbitrary origins. Every build the fork
has ever done went through an allowlisted origin (`localhost:3000`),
which is why this never surfaced. On a public domain the browser call
fails at the preflight, and the failure only appears at deploy time.

Three ways out, cheapest last:

1. Ask the Foundation to add our origin. External dependency, on their
   schedule, in the critical path.
2. Run our own build server. `compose.yaml` exists, but every service
   is pinned `linux/amd64` because Solana ships no Linux ARM64
   binaries; needs the Solana toolchain, real hosting and money.
3. **Proxy builds through a same-origin `/api/build`.** A server-to-
   server request is not subject to CORS at all, and `client-v2/api/
   *.mjs` already hosts this kind of thin handler (D20). The cost: our
   origin becomes the traffic source in front of their build server, so
   rate limiting becomes our obligation -- which is the same work as H1
   on `/api/agent`, widened.

This wants a decision and probably a D-number.

## 5. The proposed shape of the month

### The options put to Slava

- **A -- hard launch of the current surface.** Freeze features, spend
  the month on production readiness. **Rejected by Slava**, correctly:
  Playground already works upstream, so forking it and launching the
  same surface is not a product. His words, translated: "this adds no
  value as a month's product".
- **B -- launch plus durable identity.** Server-side session and
  per-user program storage. Answers Cat's condition that sign-in only
  pays off if programs are saved per user.
- **C -- launch plus the learning path.** D25/D26 in full, plus more
  lesson paths.

Slava's position: **B and C are both required**, prioritized, in
parallel or in sequence, and made to fit. He considers the
AI-agent-with-learning story the flagship and wants infrastructure
built to serve it.

### The floor, which is not optional but is small

Roughly 6-8 days, almost all of it known and mechanical: the
`__template` rename so a production bundle can be built at all; a CI
workflow for `client-v2` (tsc, prettier including `api/`, tests, `CI=true`
build); the hosting decision and a first deploy; a production GitHub
OAuth app and callback (the live app `Ov23liY2vTyFJ72M2yLZ` is
localhost-only); the build path from section 4; H1 hardening on
`/api/agent` and any `/api/build` (body-size cap, message/tool count
caps, `Origin`/`sec-fetch-site` check, per-IP token bucket); M3 and M4
from #13; the three upstream commits on the demo path.

The floor is not the content of September -- it is the condition for
the content arriving.

### The argument that fixes the order: C before B

Not a preference. A dependency.

D25 turns lesson state into an append-only event log with provenance on
every event. Per-user storage means persisting a user's progress and
projects on a server.

- **B before C persists a record that lies.** `continueRead()` writes a
  click into `completedStepIds`, the field D24's amendment reserves for
  toolchain proof, and `progress.test.ts:325` asserts that as correct
  behavior. Syncing that to a server means syncing false verifications,
  then repairing both the code and the accumulated data.
- **C before B hands storage the cheapest possible sync format.** An
  append-only log needs no conflict resolution: an event either is or
  is not present, and order is recovered by folding. That falls out of
  D25 as a by-product rather than being separate work.

The cheap half of B is independent and belongs in week 1: a durable
session is an httpOnly cookie issued by our `/api` after the OAuth
exchange. It fixes "a reload signs the user out" with no storage
service at all, costs 2-3 days, and unblocks everything
identity-shaped.

### The week table

| Week | Track | What lands |
| --- | --- | --- |
| 1 | Floor plus the cheap half of B | production bundle, CI, hosting, production OAuth, the build path, H1, M3/M4, durable session |
| 2 | C core | D25/D26: one machine, two folds over the log. Carries the signposting fix and all three ratchet edges |
| 3 | B expensive half | per-user storage: the progress log and project files through our `/api`, never `server/` |
| 4 | Content, polish, launch rehearsal | new paths, the Error-UX pass, upstream sync, one full rehearsal of the launch |

Weeks 1 and 2 parallelize across two people with no shared files: the
floor lives in `api/*.mjs`, configs and CI; D25 lives in
`views/flow/lessons/`. With two people weeks 1-2 compress into one.

### The arithmetic, which is uncomfortable

Floor ~7 days, D25 ~6, storage ~8, content and polish ~4: about **25
working days inside 30 calendar days**, and as of 2026-09-02 it is 28
calendar days. Solo that is full utilization with no slack -- a plan
with no room for one bad week. With two people it fits.

So the roadmap needs an explicit **cut list if solo**, and the first
candidate is not D25 and not the floor but the **expensive half of B**:
storage degrades to project export/import as a single file plus an
honest banner that programs live in the browser. That keeps an identity
story and a learning story in the launch while removing an entire
service from the critical path.

## 6. The question for Cat, reframed

Slava's instinct was to ask Cat which of the three should work first.
The recommendation is not to ask that: the order is forced by the
dependency above, so putting it to her gives away a decision that is
already determined, and invites an answer we would then have to argue
with.

What only she can settle, and what genuinely gates week 4, is **what
counts as proof of a step in new lessons** -- already open in
`docs/lesson-paths-todo.md` (task 1) and now partly answered by D26.
Her answer is needed by the start of week 3, and blocks nothing before
that.

## 7. Undecided, and the decisions are the owner's

Three of the four axes came back undecided. The plan above is therefore
built against the cheap fallback in each case, and each wants a date by
which an answer is needed or the fallback is taken:

| Axis | Slava's answer | Consequence |
| --- | --- | --- |
| Where it is hosted and who operates it | not decided yet | gates CI/CD target, the production OAuth callback, and the build path in section 4 |
| Who pays for inference at launch | the owner decides | gates whether metering is in scope; the cheap fallback is BYO-key, which removes H1 and metering as blockers but raises the entry barrier for exactly the newcomers the product is for |
| Who writes code in September | not clear yet | decides whether the arithmetic in section 5 fits; plan for two, build step zero so a third can join without rework |
| Deadline | end of September, public launch | settled |

## 8. Step zero is unspecified, on purpose

Slava researched a collection of tools and plugins over the weekend --
described as improving AI-assisted development, agent predictability,
teamwork and reliability, including keeping an architecture overview of
the codebase current. He said he would supply the list. **It was
requested three times in the session and not supplied**, so step zero
is deliberately left as a budget rather than invented on his behalf:
a slot in week 1, sized in days, with the concrete tools filled in when
the list arrives.

## 9. What is still open in this session

The three questions put to Slava, unanswered when he asked for this
handoff:

1. Does he accept C before B on the append-only-log argument?
2. Does he accept the expensive half of B as the first thing cut if the
   work is solo?
3. Does he accept reframing Cat's question from "which is the priority"
   to "what counts as proof of a step"?

## 10. For the receiving session: where the two scopes touch

- **`docs/roadmap.md` is currently written in the hackathon frame.**
  Its *Where we are* section states the CI decision with the reasoning
  that the line ships nothing. That paragraph is the single most
  important thing to revisit.
- **The 2026-09-01 lesson-ledger brief calls the `CI=true yarn build`
  failure known and out of scope.** True for PR 1 as a code-review
  boundary; false as a project statement, since it blocks the launch.
  Worth a line in the brief pointing at the floor rather than changing
  PR 1's scope.
- **D25/D26 and PR 1 keep their priority under the new frame** -- they
  are week 2, and the dependency argument in section 5 makes them a
  prerequisite for per-user storage rather than a parallel nicety. The
  lesson-ledger round does not need to slow down or change shape for
  any of this.
- **Section 4 (the CORS allowlist) is new information** and belongs in
  the roadmap regardless of which month shape is chosen.
- Priorities in the roadmap's header still say they follow D21 (GitHub
  identity -> tutorials -> everything else). Both have shipped, so that
  line needs replacing with whatever September's order becomes.
