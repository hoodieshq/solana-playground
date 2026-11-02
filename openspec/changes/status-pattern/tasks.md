# Tasks

One PR (HOO-2483); the groups are its commits, in order.

## 1. One status pattern

- [ ] 1.1 Rust analyzer state: `rust-analyzer/status.ts` (state + event), set
      by `initRustAnalyzer`; verified by its in-source tests (HOO-2483;
      plan: [plans/1-status-pattern.md](plans/1-status-pattern.md))
- [ ] 1.2 `widgets/status` model: three indicators from raw inputs, `worst`,
      offline, the 60 s mark; telemetry `status_indicator_picked` and
      `status_sheet_opened` registered under prefix `status`; in-source tests
      (HOO-2483; depends on 1.1)
- [ ] 1.3 `widgets/status` UI: `BaseStatusRow`, `BaseStatusRail`,
      `BaseStatusChip` (chip + sheet) and the analyzer's panel, with their
      connected versions; render tests assert names, words and events through
      the memory provider (HOO-2483; depends on 1.2)
- [ ] 1.4 Wire it: the session footer's and the rail's cluster row give way to
      a status slot, `BasePhonePager` gets a status slot in the work page's
      bar, `Flow` fills them; existing footer tests updated; e2e
      `e2e/client-v2-status.e2e.spec.ts` covers the spec's scenarios
      (HOO-2483; depends on 1.3)
