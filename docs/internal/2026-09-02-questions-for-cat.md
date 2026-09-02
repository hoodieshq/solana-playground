# Questions for Cat — sent ahead of the 2026-09-11 call

Written 2026-09-02. Block A is ready to send to Cat now, so the
answers (or at least her thinking) exist before the first weekly call
on **2026-09-11**; the deadline that matters is **16 Sep** — week-4
content (new lesson paths) is authored against her answers. Block B is
the call's own agenda: the responsibility-boundary questions that need
her side's engineers or the Foundation rather than a message thread.

The aim for the call itself: arrive with the functionality done (the
lesson ledger, the production build, the build proxy), so the hour is
spent on technical decisions and polish, not on demos of unfinished
work.

## Block A — send now (curriculum; message-sized)

Context to include: the lesson machine shipped — steps are marked by
what actually proved them (a build, a deploy, the program's own
interface), a learner can always see what would complete a step, and
skipping is recorded honestly. The one thing code cannot decide is
curriculum wording, which is hers.

1. **Hello Anchor step 3 ("call the instruction from the TypeScript
   client").** We can now prove a real invocation from the program's
   own devnet logs, on demand. Does the step stay "call the
   instruction" and gain that real criterion, or become "call it and
   see your own log line" (which is literally what the check
   observes)? The band copy and the "verified by" line follow from
   her answer; the mechanism does not change either way.
2. **For each step of the next paths: what counts as proof?** Our
   grader classes, so she can aim the curriculum at what is checkable:
   (a) synchronous and free — the build passed, the program is
   deployed, the built interface has a given instruction/argument/
   account; (b) on-demand — a transaction of the learner's own program
   shows in its devnet logs; (c) authored behavioral test — a small
   test we bundle with the path and run against their deployed program
   (never editable by the learner); (d) attestation — the learner
   marks a reading step done, recorded as their own word, never as
   verification. Which class does she want each step of the next
   tutorials to use?
3. **Which tutorials become paths first?** We have Hello Anchor; the
   candidates and their order are hers. One constraint from our side:
   a path needs per-step objectives that a grader class can actually
   check — we can draft the step splits for her chosen two or three
   and she edits, if that is faster than writing from scratch.

## Block B — the 2026-09-11 call agenda (responsibility boundary)

4. **Do we operate the backend, or does your side hand us endpoints?**
   Today everything server-side we need lives as `/api/*` on our own
   origin: the agent relay, the build proxy, later per-user storage.
   Is that the intended shape for launch, or is there (or will there
   be) a backend on the customer/Foundation side that provides these
   — in which case we consume endpoints and the hosting question
   below mostly dissolves? Our build proxy's upstream is a single
   env var away from pointing at anything they provide.
5. **If it is ours: hosting and operator.** Production target and
   domain; who holds the keys and answers when it breaks. Honest
   framing: whoever operates the site operates an LLM relay (the
   assistant) — that is the real weight of the choice, not the static
   hosting.
6. **Who pays for inference at launch:** users bring their own API key
   (cheap for everyone, but an entry barrier for exactly the newcomers
   the lessons target) or an operator-paid key (needs metering and
   hardening first). We build on BYO-key until told otherwise.
7. **An origin allowlist entry at `api.solpg.io`** for the production
   domain (already asked in parallel — this is the nudge): with it,
   our build proxy thins or disappears; without it, browser calls from
   any production domain are refused at preflight and the proxy stays.
8. **The verifying faucet** (long-standing): the airdrop gate is
   client-side today and says so; a server-verified faucet is the only
   honest upgrade. Not launch-blocking; worth keeping on their list.

## Notes

- 1–3 gate week-4 content only; nothing else waits on them.
- 4–7 gate the hosting/operator decision (our open questions 0–2 on
  the status board); the plan currently builds on the cheap fallback
  of each (same-origin `/api/*`, Vercel-style hosting, BYO-key).
- The status board to attach:
  https://claude.ai/code/artifact/d7db5420-2295-4698-b0a1-9d9c03056448
