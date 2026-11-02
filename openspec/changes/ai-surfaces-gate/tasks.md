# Tasks

## 1. The panel gates on the status route

- [ ] 1.1 Point `probeDefaultBackend` at `GET /api/ai/status` with the
      mapping in design.md, add `retryDefaultBackend` and make
      `useDefaultBackend` follow later answers; declare `"session"` in
      `assistant_default_probe_failed`. Move every e2e stub of the probe from
      `**/api/agent` to a `stubAiStatus` fixture. Verify with the module's
      unit tests (each mapping, a `reason: "unavailable"` answer asked again)
      and `yarn test-types` (HOO-1747; no dependencies)
- [ ] 1.2 Add the `#assistant-ai-off` row and its Send reasons to the
      composer, fold the "prompt is waiting" notice into it, and emit
      `assistant_ai_off_shown`, `assistant_default_probe_retried` and
      `assistant_connect_opened` `via: "ai-off"`. Verify with render tests in
      `AssistantComposer.test.tsx` asserting the events through the memory
      provider, and `e2e/assistant-ai-gate.e2e.spec.ts` titled by the spec's
      non-manual scenarios (HOO-1747; after 1.1)
- [ ] 1.3 Before/after screenshots of the three off states at desktop width,
      in the PR and on HOO-1747 (HOO-1747; after 1.2)
