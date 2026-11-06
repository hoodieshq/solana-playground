# Tasks

Ticket: HOO-2677. One PR into `scope/tutorial-flow`. Telemetry is the existing
`tutorial_action_run`, gaining `action: "airdrop"`, asserted through the
memory provider.

## 1. Airdrop step

- [x] 1.1 Definition: `airdrop` in the act union, the schema, and `check.ts`
      (no `call`; an airdrop must come before the first deploy act), with
      tests (HOO-2677; after nothing; plan:
      [plans/1-airdrop-step.md](plans/1-airdrop-step.md))
- [x] 1.2 The runner: an airdrop runner over the deploy port, built on
      `fundForDeploy` and a shared cost helper. The deploy runner drops the
      airdrop and the funding stage and returns `no_funds` when short. Tests
      in `deploy.ts` and the new runner (HOO-2677; after 1.1)
- [x] 1.3 The engine and UI: auto-press a funded airdrop card, the result
      records, the retry lines per act, the icon and done line, and
      `tutorial_action_run` `action: "airdrop"`, with view, store and
      telemetry tests (HOO-2677; after 1.2)
- [x] 1.4 Content: airdrop acts in Hello Anchor and Zero Copy, rewording the
      say beats that promise an automatic airdrop, and the rule in
      `AUTHORING.md`. Update the e2e `passStepTwo` and the
      `tutorial-flow-v2` spec paragraphs (HOO-2677; after 1.1)
