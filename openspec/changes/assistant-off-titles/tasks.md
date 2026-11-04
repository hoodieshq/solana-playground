# Tasks

## 1. Titled off row and head status (HOO-2577)

- [ ] 1.1 ([plan](plans/1.1-titled-off-row.md)) Titles per reason and Try again on no-key in `BaseAiOffRow`; the head's `#assistant-status` from the shared off-reason hook. Verify: `AssistantComposer.test.tsx` and `BaseAssistantHead.test.tsx` cases for each reason, `yarn test-e2e e2e/assistant-ai-gate.e2e.spec.ts` covers this change's scenarios, `yarn run check` green, before/after screenshots of the three reasons in the PR.
