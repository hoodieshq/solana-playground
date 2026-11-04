# Tasks

## 1. Settings, Network per Spec 07 (HOO-2591)

- [ ] 1.1 ([plan](plans/1-settings-network-spec-07.md)) Hide the Connection section's Endpoint row on the settings page; verify with a `SettingsPage`/sections unit test that no row is named "Endpoint" under Connection and the Network chips still pick (HOO-2591)
- [ ] 1.2 `PgCustomRpcs.check` (format and duplicate refusals without a write) and `fetchRpcHealth(url)` (one `getHealth` POST, 5 s timeout, `answered | no_answer | offline`); verify with in-source vitest cases: answer, non-2xx answer, rejection, timeout via fake timers, offline sends nothing (HOO-2591; after none)
- [ ] 1.3 Async save in `BaseCustomRpcs` (spinner in Save, read-only fields, "This URL is not responding." with "Use anyway", "You're offline, so this URL can't be checked." with "Use anyway") and `NetworkSection`'s check-then-save path; the `check` and new `reason` telemetry parameters asserted through the memory provider in `model/save-custom-rpc.ts`; the section's pick after a check or Use anyway in `NetworkSection.test.tsx` (HOO-2591; after 1.2)
- [ ] 1.4 Before/after screenshots of Connection, the Checking state and the No answer state through Playwright, in the PR (HOO-2591; after 1.1, 1.3)
