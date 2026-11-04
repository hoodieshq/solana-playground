# Settings, Network per Spec 07 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, chosen in the launch prompt). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One network control in Settings, and a 5 s health check before a custom RPC is saved, with "This URL is not responding." / "Use anyway" (HOO-2591).

**Success metric (from the ticket):** every "Done when" line of [HOO-2591](https://linear.app/solana-fndn/issue/HOO-2591) holds: no Endpoint row in Connection; one `getHealth` request with a 5 s timeout before a new URL is saved; no answer shows the error and "Use anyway", which saves; an answer saves without a prompt; offline sends no request and offers Use anyway; unit tests cover timeout, answer, offline and Use anyway; before/after screenshots in the PR.

**Architecture:** The entity gains a write-free pre-check and the health request. A widget model function runs pre-check → offline → health → save and answers the form; the form awaits it and draws the checking, no-answer and offline states. The page filters `connection.endpoint` out of the generic rows.

**Names as shipped** (the review of 4 Nov aligned the code; where a line below differs, the code wins): `fetchRpcHealth`/`fetchRpcHealthWithin(ms)(url)`, `saveCheckedWith(fetchHealth)(input, replacing)` → `CheckedSave` (`saved` | `refused` | `unreachable`), `answerFor(onSaved)(mode)(checked)` → `CustomRpcSaveAnswer` (`saved` | `refused` | `unreachable` with `useAnyway`), `NETWORK_SECTION_SETTINGS` (not exported). Cancel and the list's other buttons are disabled while a URL is checked.

**Tech Stack:** React 19, vitest (in-source and `*.test.tsx`), Testing Library, the DS `Field`/`FieldError`/`Spinner`/`InputGroupButton`.

**Spec:** `openspec/changes/rpc-health-check/` (proposal, design, `specs/client-v2-custom-rpcs/spec.md`), Spec 07 in `.claude/lead/intake/designers-spec/07-settings.md`.

## Global Constraints

- Timeout: 5000 ms, one request per save, JSON-RPC `{"jsonrpc":"2.0","id":1,"method":"getHealth"}` POST, `Content-Type: application/json`.
- Copy, verbatim: `This URL is not responding.` · `Use anyway` · `You're offline, so this URL can't be checked.`
- Telemetry: `settings_custom_rpc_saved { mode, check: "passed" | "used_anyway" | "none" }`, `settings_custom_rpc_refused { reason: "format" | "duplicate" | "storage" | "no_answer" | "offline" }`. Never a URL, host or name.
- A refused value (format, duplicate) sends no request. A rename (same normalised URL) sends no request.

## Review Focus

- Another control of the list used while a URL is checked → disabled, so no form is closed by a late answer. Test in Task 3.
- The URL edited after "No answer" → error and "Use anyway" clear. Test in Task 3.
- Another tab saves the same URL during the 5 s → the final `put` still refuses it as a duplicate. Test in Task 2 (`checkThenSave` with a list changed between check and save).
- Enter pressed twice while checking → one request. Test in Task 3 (Save disabled while checking).
- A non-2xx HTTP answer (401) → counts as an answer. Test in Task 2.

---

### Task 1: Hide the Endpoint row (tasks.md 1.1)

**Files:** Modify `client-v2/src/widgets/settings-page/model/sections.ts` (export `NETWORK_SETTING_IDS = new Set(["connection.endpoint"])` and drop them in `groupSettings`), test in its in-source block.

- [ ] Test: `groupSettings([setting("connection.endpoint","Endpoint",["d"]), setting("connection.commitment","Commitment",["c"])])` → the `connection` group holds only `connection.commitment`.
- [ ] Run `yarn vitest run src/widgets/settings-page/model/sections.ts` → FAIL, implement, → PASS.
- [ ] Update the stale comment in `NetworkSection.tsx` that names the Connection select. Commit `feat(client-v2): one network control in Settings (HOO-2591)`.

### Task 2: Pre-check, health request, check-then-save (tasks.md 1.2)

**Files:** Create `client-v2/src/entities/custom-rpc/model/health.ts`; modify `custom-rpcs.ts`, `entities/custom-rpc/index.ts`; create `client-v2/src/widgets/settings-page/model/save-custom-rpc.ts`.

**Interfaces (produced):**
- `PgCustomRpcs.check(input: CustomRpc, replacing?: string): { ok: true; url: string } | { ok: false; reason: "format" } | { ok: false; reason: "duplicate"; name: string }` — `put` reuses it.
- `RPC_CHECK_TIMEOUT_MS = 5000`; `checkRpcHealth(url: string, timeoutMs = RPC_CHECK_TIMEOUT_MS): Promise<"answered" | "no_answer" | "offline">` — `navigator.onLine === false` → `"offline"` without fetching; resolved fetch → `"answered"`; rejection/abort → `"no_answer"`.
- `checkThenSave(input: CustomRpc, replacing: string | undefined, health = checkRpcHealth): Promise<Checked>` with `Checked = { kind: "saved"; result: SaveResult; check: "passed" | "none" } | { kind: "refused"; result: Exclude<SaveResult, {ok:true}> } | { kind: "unreachable"; reason: "no_answer" | "offline"; useAnyway: () => SaveResult }`. `replacing` set and same normalised URL → no health call, `check: "none"`.

- [ ] Tests (in-source, `fetch` stubbed with `vi.stubGlobal`): answered on 200 and on 401; `no_answer` on rejection; `no_answer` after 5000 ms with fake timers and a never-resolving fetch that honours the signal; `offline` sends nothing; the request body is `getHealth`. `check` refuses format/duplicate without writing. `checkThenSave`: format refused → health not called; rename → health not called, `check: "none"`; no answer → nothing saved until `useAnyway()`; duplicate saved by another "tab" during the check → `refused`.
- [ ] Run each file with `yarn vitest run <file>` → FAIL, implement, → PASS. Commit `feat(client-v2): check a custom RPC answers before saving it (HOO-2591)`.

### Task 3: Form states and NetworkSection (tasks.md 1.3)

**Files:** Modify `BaseCustomRpcs.tsx`, `BaseCustomRpcs.test.tsx`, `NetworkSection.tsx`, `model/telemetry.ts`.

**Interfaces:** `CustomRpcSaveAnswer = { ok: true } | { ok: false; error: string; useAnyway?: () => CustomRpcSaveAnswer }`; `onAdd`/`onEdit` return `Promise<CustomRpcSaveAnswer>`.

- [ ] Tests in `BaseCustomRpcs.test.tsx`: while `onAdd` is pending, Save holds a `status` spinner and is disabled, both inputs are `readOnly`; an answer `{ ok:false, error:"This URL is not responding.", useAnyway }` shows the text and a "Use anyway" button, pressing it calls `useAnyway` and closes the form on `{ ok:true }`; typing in the URL clears both; Cancel during a pending save then resolve → no error, no warning; existing sync tests move to async answers.
- [ ] `NetworkSection` maps `Checked` to answers: refused → `refusal()` copy; `unreachable` → `This URL is not responding.` with `useAnyway`, or `You're offline, so this URL can't be checked.`, both with `useAnyway`; tracks `settings_custom_rpc_refused` with `no_answer`/`offline` and `settings_custom_rpc_saved` with `check`. Test the mapping + events through `memoryProvider` by exporting the pure mapper `answerFor(mode, checked, onSaved)` from `model/save-custom-rpc.ts`.
- [ ] `yarn vitest run src/widgets/settings-page src/entities/custom-rpc` → PASS. Commit `feat(client-v2): No answer from this URL, Use anyway (HOO-2591)`.

### Task 4: Screenshots and gate (tasks.md 1.4)

- [ ] Dev server on the first free slot port ≥ 6 (docs/testing.md section 8), Playwright: Settings before (base, `origin/scope/users-work`) and after — Connection section, Checking state (route `**/*` for the typed URL held open), No answer state (`https://example.invalid`). Save under the scratchpad, attach to the PR.
- [ ] `yarn run check` green; tick 1.1–1.4 in `tasks.md`.
