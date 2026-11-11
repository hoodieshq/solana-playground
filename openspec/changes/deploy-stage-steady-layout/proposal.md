# Proposal

## Why

Starting a first deploy from the Deploy stage moves the stage under the user's pointer: the who-pays line goes
and the progress region appears above the held deploy button, a net 51 px. The centred column then overflows its
frame, the title rises 24 px and the buttons move by up to 27 px (measured 10 Nov, HOO-2796). The spec asks for
that order, so removing the jump changes two requirements, not only the code.

## What Changes

- Before the first deploy on the network picked, the progress region takes the who-pays line's place in the facts
  card instead of sitting above the held deploy action.
- That row of the card keeps the height of the longest list of steps (four, with "Funding wallet") whether it
  holds the who-pays line or the steps, so starting or ending a deploy moves nothing above or below it. The
  card is that much taller before a deploy.
- After a deploy on the network picked, the progress region stays above the held deploy action, as today.
- This is the proposal for the design review (Slava); the placement is open until it is confirmed.
- Telemetry: none added, renamed or removed. The Deploy funnel step's `deploy_started` and `deploy_succeeded`
  keep firing from `features/deploy/model/stage-deploy.ts`; this change does not touch that code.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `client-v2-deploy`: "The stage shows the run as steps" places the progress region in the facts card before a
  first deploy; "The facts of a first deploy sit in one card" makes the who-pays row hold the steps while a deploy
  runs, at a fixed height.

## Impact

- Code: `client-v2/src/views/flow/stages/BaseDeploy.tsx`; `BaseDeployProgress` is drawn unchanged.
- Tests: `BaseDeploy.test.tsx`, and two browser scenarios in `e2e/client-v2-deploy.e2e.spec.ts` on the fake devnet
  (`e2e/fake-devnet.ts` gains `fund`).
- Out of scope: the progress region after a deploy (a redeploy), which still sits over the pill; the sideways shift
  from the stage's scrollbar and the held button's width (HOO-2795, `STAGE_FRAME` and `AsyncButton`); the
  tutorial's deploy cards.
