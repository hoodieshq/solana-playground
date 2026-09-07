# Call with the tech lead, 2026-09-04 - what it changed

Source record for the decisions and roadmap edits made after it. The
call was transcribed live (Wispr, announced mid-call), so the wording
below is close to what was said rather than reconstructed. Present:
Slava and Sergey; a third invitee did not join. Neither side had
prepared - the call ran off the roadmap's open-questions block, which
Slava shared on screen.

Each item says what was said, what it answers or contradicts, and
where it now lives. Nothing here is the authority: the decisions are.

## Who Sergey is, for anyone reading the decisions

**Sergey is `rogaldh`** - the tech lead, the reviewer, and the author
of D24's amendment. He restated that amendment almost verbatim on this
call ("the hard step transition was removed, because it gets in the
way"), and the roadmap already attributes the 23 review commits on
#19 to `rogaldh`. This matters in three places: the board's standing
ask "name who reviews" is answered by him; the item recorded as
`waiting: team` on the frame revision is his call, made below; and
`waiting: rogaldh` on PR #20 is the same person and the same queue.

## Answered

**Hosting: Vercel.** "I am 100% sure it will be Vercel, there are no
other questions here." Today's shape is mixed - the static bundle
deployed there plus a Node endpoint running on a server - and he
treats that as transitional. Longer term, and new to our documents:
the client should be **rewritten as an ordinary Next application
instead of Create React App**. A direction, not a scheduled task.
-> D29.

**The default build/deploy backend is Solana's, not `api.solpg.io`.**
His reasoning, which is a product argument rather than a technical
one: the original project's premise - every service public, no auth -
was right for Acheron's own deployment, but the moment Solana deploys
the playground on its own domain with its own users, those users must
be served by infrastructure Solana operates, because Solana
guarantees the quality and carries the impression the product leaves.
From a product standpoint Acheron is an outside party; we cannot lean
on his capacity while answering for Solana's reputation. So the
default host is our build/deploy server on Solana's capacity (Google
App Engine today, an AppSpot domain that will later be pinned - the
target shape is something like `api.playground.solana.com`).
`api.solpg.io` stays as a **selectable alternative** in the server
setting, alongside the existing custom-host field; a user who picks
it takes the risk knowingly. Two operational notes he added: the
first deploy of a program on the Solana-hosted server takes about two
minutes, accepted as a known cost of running it ourselves; and
`api.solpg.io` is "spread across the project, in places literally
hardcoded" - that has to go. The Rust server's origin allowlist is a
deploy-time environment variable, so it stays as it is. -> D30.

**The application frame is settled; the lesson frame is not.** The
general composition - file panel on the left, assistant on the right,
console at the bottom - is the experience every developer already has
from every IDE, and reusing it is the point, not a shortfall. Minor
improvements are possible, nothing major, and he would not spend the
autumn on reworking it or on further research. What does deserve work
is the **learning flow's legibility**: today you open a tutorial and
land in the code, and although the document is visibly a clickable
tab, nothing tells the learner to read the lesson first. "Maybe when I
click a tutorial I should land on the tutorial." Where you go after
closing something is the same class of gap. He also suggested looking
at how existing IDEs organize material and layering that on top. The
approach Slava proposed on the call - branch, try layouts, bring Cat
the current state plus alternatives rather than a question - he
endorsed. -> D34.

**Who reviews.** He does, and he committed to PR #23 first, that day,
with a promise to write by end of day if he could not. Worth naming
as a risk rather than a fact: the only review capacity is spending
itself on the one PR outside the launch scope while #20 has been open
since 1 Sep.

## Changed priorities

**The deadline is a checkpoint, not a cliff.** "Our first milestone is
the breakpoint, probably in November." Earlier in the call: "we are not
being pressed for time, I see nothing catastrophic here." The autumn
date is Cat wanting to present the product. **Clarified by Slava on
2026-09-07:** our understanding is that around 30 September there is a
conference at which her side presents the project - that is the first
checkpoint and something has to be done by it; after it there is time
to keep working. What exactly is expected at it is not known and goes
to Cat as the first question on 11 Sep, with the dates, constraints and
later deadlines. D27's "public launch" is one reading among others until
she answers. The November figure was Sergey's, with "probably"
attached, and is folded into that question rather than carried as a
plan. -> D32, amending D27.

**No user cabinet, and per-user storage probably is not ours to
build.** Having a backend does not imply having authentication: the
endpoints are public, identity is the GitHub OAuth that already
exists, and "a cabinet, a user profile - we are not talking about that
yet." Against Slava's cross-device case (sign in elsewhere, continue
the project, keep tutorial progress) he offered what Cat wrote in
their correspondence: she wants us to use the **GitHub API to push the
project into the user's own GitHub** - the learner signs in, grants
permission, and the playground writes to their repository, so no
shared cabinet is needed. He expects the validation to come back "no,
we do not build that", and would only revisit if the playground ever
gained paid tiers or hidden per-profile features. Progress,
achievements and gamification depend on Cat's picture of the end
result, and against a November milestone there may be no time for
them anyway. -> D31, which parks week 3's storage service.

**Tutorials move up.** Next week goes to tutorials and stays there.
Week 1 is effectively closed - mostly configuration work - and a large
part of week 2's tutorial work was already done ahead of its week.

**Assistant-side optimisation leaves the roadmap altogether.** Slava
dropped the code-analysis work and the memory wiring he had started for
it - "we build the product first, then optimize all the AI tricks." On
2026-09-07 he went further: this is developer experience, not a product
feature, so it is not a roadmap item to deprioritise - it is struck
from the roadmap by the same rule that keeps dev tooling off it
(internal kitchen, D27). Recorded here only so nobody re-adds it.

**The wallet adapter is not a candidate but a commitment** (Slava,
2026-09-07): "a very important part, and it has to be done." Scheduled
in week 3; see below for the problem as Sergey dictated it.

**Frame rework and layout research become a bonus bucket** (Slava,
2026-09-07): polish sized at the end by what time is left - possibly a
short polish of a working interface, possibly a deep rework - decided
only once the priority list is done. Lesson-entry legibility is not in
that bucket; it stays a week-2 priority.

## New - none of this was in our documents

**The tutorial content pipeline is a block of the product.** The
playground is really two repositories: `solana-playground` and an
**Assets** repository holding the fixed material (images, some data) -
and he believes, without being certain, that the tutorials live there.
He asked for 30-60 minutes of research into how we should handle them.
The friction he has already hit: the submodule gets in the way of
working on the project at all, and in particular **git worktrees do
not work with submodules** - they can, badly - so they cost more than
they give. He worked around it with two scripts in the client that
copy the files into `public/` instead of keeping a submodule checked
out. What is open: where tutorials should live (copied into
`client-v2`; a neighbouring repository we can download from; a
separate repository, which he first called bad and then partly
reconsidered), how new ones get added, and how a backend - if there is
one - learns to read them. One dependency worth stating plainly,
because it forces the answer: **if a backend ever grades tutorials,
the tutorials have to live inside the project.** He wants this written
as a section of the plan - how we work with tutorials today and how we
see it working - because "this is part of the product, not just code",
and Cat may well have her own idea about how new material arrives.
-> D33.

**"It builds" is not proof that it is right.** The sharpest argument
of the call, and the best justification D25/D26 have: a program
building cannot be the criterion for a lesson step, because a learner
can write anything that compiles and it need not match the lesson's
plan. Build works as a criterion only for the case of writing a new
program from nothing. -> amendment beside D25/D26.

**Kora is the wallet adapter's dependency.** He dictated the wallet
problem deliberately, knowing it was being recorded. The built-in
wallet exists because deploying a program means a series of
transactions, each needing a signature. Two problems with it: it is
not really a local convenience but a wallet you must specially fund,
which needs its own flow, while everyone actually working on-chain
uses browser extensions or hardware wallets - nobody uses the built-in
one; and so we should be making it easy to work with the wallet the
user already has, which means the standard adapter. But the same
multi-transaction deploy is what makes signing with an external
browser wallet painful. The grant context: **Jonas / Acheron are
supposed to be working on free deploys via Kora**, a Solana product he
describes as making program deployment easy and near-free. If that
lands, the problem dissolves and we can simply connect the standard
Solana wallet adapter and drop the built-in deploy wallet; if it does
not, the built-in one may survive as an internal mechanism. Open:
whether Acheron actually does it, and when. Our own note: verify what
Kora does before repeating the "free deploys" characterization as
fact - it reached us second-hand on a call. -> amendment beside D21.

**The Cat call changes shape: present, then ask.** His instruction was
not to arrive with questions but with our answers and have her
validate them. For the AI backend that means saying: we have a default
agent backend, a model under the hood, we talk to it over an API, and
we keep the option of the user's own or a local model - and then
asking three things: which models will you provide, how is it meant to
work, and what must change in our endpoint to serve the model you
want. Both of them read Cat the same way in the earlier conversation -
that her side would have models and would simply hand us a token - and
both noted there is no actual information behind that impression, which
is why it is the call's main question. If it turns out to be a token
against an OpenAI-compatible model, we swap the token and we are done.
That is exactly the shape `/api/agent` already has, and it should be
said out loud rather than left implicit.

**One corroboration, not a new decision:** Grisha asked for the lesson
material to be moved into the right column so it stops covering the
code - which is what the frame revision of 2026-08-31 already records
as the guide column (walkthrough ch. 07).

**He wants the open questions to exist as an artifact** so none are
forgotten. They already do; Slava showed him the board on screen, and
that is the page he will read.

## Contradictions, and how each was resolved

| What our documents said | What the call said | Resolution |
| --- | --- | --- |
| D27: public launch on 30 Sep, 19 working days, no slack | first milestone probably November; no time pressure | D32: date and weeks kept, the cliff framing dropped |
| Week 3: a per-user storage service behind our `/api`, ~5 days | no cabinet, public endpoints, storage into the user's own GitHub | D31: week 3's service parked, GitHub push to validate |
| Open question 5 / D28: ask the Foundation to allowlist our origin at `api.solpg.io` | `api.solpg.io` should not be the default at all | D30: the ask is retired and inverted |
| D25/D26: the grading mechanism is settled - authored test in the client's sandbox; backend grading and agent judgement rejected | lists asking the agent and a per-tutorial backend validator as still open | Amendment beside D25/D26: mechanism unchanged, the reopening answered in place |
| Open question 4: the frame revision is a decision for the team | the general frame is settled and minor; the lesson flow is what needs work | D34 |

On the fourth row: his own preferred option - "synthetic tests that
run right in the playground" - is D26 exactly. We agree on the
mechanism; he simply had not read D26. The amendment records that
rather than reopening anything.

## Deliberately not carried over

Personal matters (relocation plans, residency, observations about
language) are out of the repository. His characterization of Acheron
is kept as its substance - an outside party whose capacity we cannot
answer for - and not in the words he used. The mutual apologies for
the week are not content.
