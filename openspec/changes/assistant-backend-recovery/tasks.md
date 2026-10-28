# Tasks

All tasks are HOO-1719 and land in one PR into `scope/ai-rail`. Order matters
where stated; 1.1 and 1.2 may run at the same time.

## 1. The backend a thread and a browser remember

- [x] 1.1 `threadBackend(items)` in `views/sidebar/assistant/model`;
  `ConnectPreset` gains `baseUrl` and `effort`, so a `BackendParams` is a
  preset as it stands, and Connect a model fills them from a preset with the
  key field empty. Verify: in-source tests for `threadBackend` (an unknown
  provider reads as absent) and `Connect.test.tsx` cases for a preset base URL
  and effort.
- [x] 1.2 `rememberBackend` writes `paramsOf(connection)` as JSON;
  `rememberedChoice()` reads it and the old bare id;
  `isDefaultBackendRemembered` reads both. Verify: in-source tests in
  `remembered-backend.ts`, including that `localStorage` never contains the
  key and that a bare `"openai"` reads as `{ provider: "openai" }`.

## 2. A send with nothing connected (depends on 1.1, 1.2)

- [x] 2.1 `resolveSendBackend()` in `use-turn.ts`, used by `start` and by
  `onDidRequestPrompt`; `assistant_connect_opened.via` gains `"thread"`.
  Verify: failing-first cases in `use-turn.test.tsx` for a keyed thread in a
  new tab (no default request, Connect opens preset, prompt kept), a
  default-answered thread (connects the default), and a new thread with a
  remembered key-based choice; the `via` value asserted through the memory
  provider; e2e `assistant-own-key: A new tab does not continue a keyed thread
  on the default` and `assistant-own-key: Entering the key continues the same
  thread`.

## 3. Switching keeps the conversation

- [x] 3.1 `PgAssistant.connect` no longer calls `clear()`; the switching
  note leaves `Connect.tsx`; the JSDoc of `connect` and `clear` and the
  composer's pick comment say what happens now; `docs/assistant-context.md`
  checked for the same claim and synced with `yarn sync-assistant-context` if
  it changes. Verify: the store test that asserted the clear is rewritten to
  fail first against the old code; e2e `assistant-own-key: Switching backends
  keeps the thread` and `assistant-own-key: No warning about a new
  conversation`.

## 4. A rejected key (depends on 1.1)

- [x] 4.1 The error item's optional `recover`, set by `useTurn` on an
  `AiTurnError` with status 401 or 403; `assistant_key_rejected` declared in
  `widgets/assistant/model/telemetry.ts` and emitted; the **Enter key** button
  (`#assistant-enter-key`) on the last such error opens Connect with
  `via: "key-rejected"`. Verify: `use-turn.test.tsx` cases for 401, 403 and
  500 (no button, no event) with events asserted through the memory provider;
  e2e `assistant-own-key: A 401 offers Enter key`; the button's look sent to
  Design alignment as a visible gap.
