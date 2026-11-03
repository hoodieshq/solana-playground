# Tasks

All tasks are HOO-2523 and land in one PR.

## 1. Show full log (Spec 08 ANY-00)

- [x] 1.1 `widgets/layout-shell` exports `requestConsole()`; the shell opens the console on it as it does for a deploy (phone sheet, nothing under Home or a page). Verify: `LayoutShell.test.tsx` case that a request opens the console on wide and phone.
- [x] 1.2 The Build stage's ANY-00 surface offers "Show full log" (secondary, outline) calling `requestConsole()`; BUILD-04 keeps "Show details". Verify: `BaseBuild.test.tsx` cases for both surfaces. Depends on 1.1.

## 2. Offline (Spec 08 NET-01)

- [x] 2.1 `OFFLINE_LINE` takes Spec 08's words; `chipOf` reads "Offline" while offline. Verify: `indicators.ts` in-source tests.
- [x] 2.2 `BaseStageNotice`/`StageNotice` in `widgets/status` draw the offline line over every stage; Flow mounts it; `status_notice_shown` once per onset. Verify: `StageNotice.test.tsx`, events through the memory provider; `notice.ts` in-source tests.
- [x] 2.3 The Build stage's Build buttons are disabled while offline. Verify: `BaseBuild.test.tsx` case.

## 3. Network not answering (Spec 08 NET-02)

- [x] 3.1 `PgConnection.recheck()` asks the cluster again now. Verify: `utils/ask-again.ts` in-source test (the trigger `isConnected` and `isClusterDown` listen to).
- [x] 3.2 The notice draws the cluster line on Deploy and Interact with Try again (AsyncButton, `recheck`) and Change network (settings, network focused); `status_notice_action`. Verify: `StageNotice.test.tsx` and the e2e cases in `client-v2-status.e2e.spec.ts` (offline, Deploy, Change network, phone chip) and `client-v2-failure-states.e2e.spec.ts`. Depends on 2.2, 3.1.
