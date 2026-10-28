# Tasks

## 1. Account copy and sync markers (HOO-2389)

Plan: [plans/1-account-copy-and-markers.md](plans/1-account-copy-and-markers.md)

- [ ] 1.1 Account row, menu and sign-in failure copy per Spec 02, and
      "Offline · saving here" from a `useOnline` hook (design.md, decisions
      3 and 4). Verify: in-source tests in
      `widgets/session-footer/model/account.ts`, the session-footer
      component tests updated, the auth session tests on the new strings.
- [ ] 1.2 Sign-out asked in the menu with the leftovers line, replacing
      `BaseSignOutDialog`, and `session_sign_out_ended` declared, described
      and emitted (design.md, decision 5; after 1.1). Verify:
      `BaseAccountMenu` tests for ask, cancel (focus, menu returns), confirm
      and leftovers; `useAccount` tests asserting the event through the
      memory provider.
- [ ] 1.3 `syncMarkerOf` and `onDidChangeSyncMarkers` in
      `features/persistence`, and the marker on each row of the navigation's
      project list (design.md, decisions 1, 2 and 6; after nothing). Verify:
      in-source tests of the marker rule over a stubbed mark, conflict and
      availability; `BaseProjectList` tests for both markers and none;
      before/after screenshots, desktop and phone, in the PR. No telemetry
      events added or changed.
