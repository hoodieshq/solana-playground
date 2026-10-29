# Security and privacy review call, 2026-10-29

Source: Zoom call, Slava, Sergey Prokhorov (@sergo), Alexander Anikeev, Sergey Ponomarev (@sponomarev, CTO of the foundation). Passed on by Slava. Raw digest: intake id `2026-10-29-zoom-security-review-call`. Read before drafting: nothing else named in the input.

## Decided
- Neon is not used on the foundation's Vercel (Cat: use GCP Cloud SQL). Preview database goes on Cloud SQL, set up by Alexander in his current PR; Sergey asks Cat for his console access on the work account. (Sergey, Alexander)
- Agent loop stays on the frontend. The default model goes through a backend proxy: auth, rate limits, model key. (Sergey, Ponomarev)
- Bring-your-own-key moves into an iframe on a separate domain, reached by postMessage (save key, delete key, proxy request). Fallback: memory storage, or a disclaimer plus a "delete my key" button. (Ponomarev, Sergey)
- Agent context = files in open tabs plus explicit add via "+", like Cursor. (Slava, Ponomarev)
- Build server stays public on appspot; an optional API-key check is added in the server, the key lives in our backend proxy, redeploy before launch. (Sergey, Ponomarev)
- Ticket pick rule: default board, To Do / High, no assignee, top one wins. (Sergey)
- Tutorials: Slava does not touch them yet; Natalia first takes the events-course task. (Sergey)
- In Review is the review queue for Sergey; one PR may hold 5-6 tickets if the scope is described. (Sergey, Slava)

## Requirements changed
- Agent context: all project files (e.g. 273) -> open tabs plus explicit add.
- Build server: open to anyone without a key -> only through our proxy with GitHub sign-in.
- Own model key: sessionStorage of the main page -> iframe on another domain.

## Facts learned
- Database holds conversations (personal data) and the GitHub account used for limits.
- Auth is GitHub OAuth, session in the database and cookies, a ready-made library.
- Threads on the backend hold only message, request, response; no thinking chains (encrypted, not portable); tool calls stored without input.
- Alexander added a byte limit on gateway request/response; a file-size limit is unconfirmed.
- Alexander proposes Vercel AI Gateway (budgets per key/user, token reservation, two keys: lower limit for new GitHub accounts); if the foundation refuses, the same on Nous.
- The GitHub program list is the upstream one and includes programs that cannot compile on the backend (e.g. Raydium).
- Build server is bounded by a global semaphore only; open to a curl flood.
- Production code lives in `master` of the solana-foundation repo.
- Ponomarev will run further security audits and report.
- Customer understands this is a beta with assumptions; Ponomarev asked Slava and Grigory to get an aloud agreement that the current Playground is vibe-coded and not final because the deadline is tight.

## Open questions
- Does the foundation accept Vercel AI Gateway, or stay on Nous?
- Is there a file-size limit today?
- Drop the hoodies branch and its builds and work on the foundation origin (Alexander's suggestion, no answer)?
- Number of the events-course task for Natalia was heard as "23..85"; not confirmed.

## Actions
1. Planner: ticket, per-file limit plus total limit on size, file count and project count - sent to planner.
2. Planner: ticket, agent context from open tabs plus "+" - sent to planner.
3. Planner: ticket, trim the GitHub program list - sent to planner.
4. Planner: ticket, own-key iframe on a separate domain - sent to planner.
5. Planner: ticket, proxy in front of the build server with GitHub sign-in and optional API-key check - sent to planner.
6. Planner: ticket, keep tool calls in agent history - sent to planner.
7. Planner: ticket, preview database on GCP Cloud SQL (Alexander; Cat for console access) - sent to planner.
8. Planner: ticket, decision on Vercel AI Gateway vs Nous - sent to planner.
9. Planner: ticket, findings of Ponomarev's audits as they come - sent to planner.
10. Planner: ask where Natalia goes after the events-course task - sent to planner.
11. Lead: In Review rule, scope described in the PR, 5-6 tickets per PR allowed - sent to lead.
12. Lead: check the pick rule (top of To Do / High, unassigned) against launch ownership rules - sent to lead.
13. Lead: Alexander's suggestion to drop the hoodies branch and builds - sent to lead.
