# Questions for Cat - ahead of the 2026-09-11 call

Written 2026-09-02, **revised 2026-09-04 and 2026-09-07 after the tech-lead call**
(`2026-09-04-call-notes-sergey.md`). Block A is ready to send now, so
the answers - or at least her thinking - exist before the first weekly
call on **2026-09-11**; the date that matters for it is **16 Sep**,
because week-4 content is authored against those answers. Block B is
the call's own agenda.

**What the revision changed.** Two questions left the list because we
answered them ourselves, and the remaining ones changed shape. Sergey's
instruction for the call: **arrive with our answers and have her
validate them, not with a list of open questions.** For every item in
block B, say what we have and what we intend, then ask what would make
it wrong. The aim for the call itself is unchanged - arrive with the
functionality done, so the hour goes to decisions and polish rather
than to demos of unfinished work.

**Removed, and why** (keep this note: an old copy of this file is still
in someone's inbox):

- ~~"Do we operate the backend, hosting and operator?"~~ Answered
  internally: Vercel, ours to operate (D29). We host the client and
  `/api/*`; the build/deploy server is separately deployed on Solana's
  capacity (D30). Nothing left for her to decide, so nothing to ask.
- ~~"An origin allowlist entry at `api.solpg.io`"~~ Retired (D30). We
  are not going to default to that host: a user on Solana's domain
  should be served by infrastructure Solana operates. It stays a
  selectable option, and its allowlist is not our problem.

## Block A - send now (curriculum; message-sized)

Context to include: the lesson machine shipped - steps are marked by
what actually proved them (a build, a deploy, the program's own
interface), a learner can always see what would complete a step, and
skipping is recorded honestly. The one thing code cannot decide is
curriculum wording, which is hers.

**One argument to lead with, because it shapes every answer below.**
A program building is not proof that it is right: a learner can write
anything that compiles, and it need not be what the step asked for.
Build passing is a real criterion only for the step "produce a program
from nothing". Every later step needs something that looks at
behavior - which is why the questions below are about what proves a
step rather than about whether it compiles.

1. **Hello Anchor step 3 ("call the instruction from the TypeScript
   client").** We can now prove a real invocation from the program's
   own devnet logs, on demand. Does the step stay "call the
   instruction" and gain that real criterion, or become "call it and
   see your own log line" (which is literally what the check
   observes)? The band copy and the "verified by" line follow from her
   answer; the mechanism does not change either way.
2. **For each step of the next paths: what counts as proof?** Our
   grader classes, so she can aim the curriculum at what is checkable:
   (a) synchronous and free - the build passed, the program is
   deployed, the built interface has a given instruction/argument/
   account; (b) on-demand - a transaction of the learner's own program
   shows in its devnet logs; (c) authored behavioral test - a small
   test we bundle with the path and run against their deployed program
   (never editable by the learner); (d) attestation - the learner
   marks a reading step done, recorded as their own word, never as
   verification. Which class does she want each step of the next
   tutorials to use?
3. **Which tutorials become paths first?** We have Hello Anchor; the
   candidates and their order are hers. One constraint from our side:
   a path needs per-step objectives that a grader class can actually
   check - we can draft the step splits for her chosen two or three
   and she edits, if that is faster than writing from scratch.

## Block B - the 2026-09-11 call agenda

Each item is written as "what we have -> what we ask".

4. **Deadlines, and what is expected at each.** *What we have:* our
   understanding is that around 30 September there is a conference at
   which you or someone on your side wants to present the project, so
   we treat it as the first checkpoint and the plan is built for it.
   *What we ask:* what happens at the end of September and on which
   dates; what you expect to be able to show by then; what constraints,
   requirements and limits apply; and what deadlines follow. We want
   your vision first - then we reconcile it with what is real on our
   side, and it may already coincide. This leads the call because every
   other answer is sized by it.
5. **Whose model runs the assistant?** *What we have:* a default agent
   backend on our own origin (`/api/agent`), OpenAI-compatible, with a
   model behind it, and the user's own or a local model still
   available as an option. *What we ask:* both Slava and Sergey came
   away from the earlier conversation believing her side would have
   models and would hand us a token - so, concretely: which models
   will you provide, how is the access meant to work, and what has to
   change in our endpoint to serve yours? If it is a token against an
   OpenAI-compatible model, this is a configuration change on our
   side and nothing else. This is the call's main question.
6. **Who pays for inference at launch?** *What we have:* the plan
   builds on bring-your-own-key, which needs no metering but is an
   entry barrier for exactly the newcomers the lessons target. *What
   we ask:* if her side supplies the key, we need metering and rate
   limiting in front of the route before it can hold one - that is
   scheduled work, not a switch. Largely the same question as 5 seen
   from the billing side.
7. **Do projects persist into the learner's own GitHub repository?**
   *What we have:* GitHub sign-in ships; import from a repository
   ships; there is no user cabinet and we are not planning one -
   endpoints stay public and identity stays GitHub OAuth (D31). *What
   we ask:* Sergey's reading of her correspondence is that the
   playground should push the learner's project into their own GitHub
   with their permission, which is why no cabinet is needed. Is that
   right? And is the cross-device case - sign in elsewhere, keep the
   project and the tutorial progress - expected at launch or later?
   Progress, achievements and gamification depend on her picture of
   the end result, and we have not scheduled them.
8. **How does new tutorial content arrive?** *What we have:* content
   comes from the repository today, and we are writing the pipeline
   down as a plan this month - where content lives, how a new tutorial
   is added, who authors it (D33). *What we ask:* does she have an
   authoring flow in mind, and who writes the paths after the first
   two? Content keeps arriving after launch, so this is a flow rather
   than a one-off.
9. **The verifying faucet** (long-standing): the airdrop gate is
   client-side today and says so; a server-verified faucet is the only
   honest upgrade. Not launch-blocking; worth keeping on their list.

## Notes

- A1-A3 gate week-4 content only; nothing else waits on them.
- Q4 sizes everything: it decides what "done by the 30th" means, and
  it is the question the roadmap now carries as D32.
- Q5 and Q6 gate the assistant's launch mode. Meanwhile the route runs
  BYO-key and stays OpenAI-compatible, so either answer is cheap.
- Q7 gates week 3's GitHub-push item. Meanwhile nothing is built
  against it.
- Q8 gates nothing this month; it changes what week 4 aims at.
- The status board to attach:
  https://claude.ai/code/artifact/d7db5420-2295-4698-b0a1-9d9c03056448
