# Design

## Context

`PgAssistant` (`views/sidebar/assistant/store.ts`) holds the connection in
memory. `model/remembered-backend.ts` writes one value, `assistant.backend`, to
`localStorage`, and only the keyless default backend is ever "remembered"
there; `Connect.tsx` reconnects to it once the probe of `/api/agent` confirms
the deployment serves one. Every other backend is lost on reload.

The key already travels the way the ticket asks: the Anthropic SDK sends it as
`x-api-key` (`dangerouslyAllowBrowser`), `openai.ts` as
`Authorization: Bearer`, both straight to the provider. `/api/agent` runs on the
server's own key and takes none from the client. `paramsOf` already strips the
key from what a thread records.

## Goals / Non-Goals

**Goals:**

- A reload of the tab reconnects a key-based backend with no typing.
- The decision, its reason and its residual risk are recorded here, with the
  change.

**Non-Goals:**

- Protecting the key from code running in the same origin (see Risks).
- Any change to how requests carry the key.

## Decisions

### Decision: `sessionStorage`, not `localStorage` (Slava, 2026-10-13)

Project code, including code from a project someone shared, runs in the same
origin behind a string blacklist, so anything the page stores is within its
reach. `localStorage` would keep the key there indefinitely, across tabs and
restarts. `sessionStorage` keeps it for the life of one tab: the window in which
a shared project could read it is the window in which the user is already
working with that key. The cost is typing the key again in a new tab.

Alternatives: memory only (today; safest, re-entered on every reload, the
problem this ticket exists for); `localStorage` (most convenient, longest
exposure; rejected); encrypting at rest (the page must hold the decryption key,
so code that can read storage can decrypt; adds nothing).

### Decision: extend `remembered-backend`, one module for "what to reconnect"

`rememberBackend` takes the whole `Connection` instead of an id. The default
backend still writes its id to `localStorage` as now; a key-based backend writes
the connection as JSON to `sessionStorage` under `assistant.connection` and
clears the `localStorage` id. `forgetBackend` clears both. A new
`rememberedConnection()` returns the stored connection only if it parses and has
a known provider id and a string key; anything else is dropped and treated as
absent. Keeping both in one module keeps the rule "which backend comes back on
reload" in one place, and `store.ts` keeps calling the same two functions.

Alternative: a separate `remembered-key` module. Rejected: two modules would
each have to know about the other's key to clear it on a switch.

### Decision: reconnect before the probe

`Connect.tsx` reconnects a stored key-based connection on mount, without waiting
for the `/api/agent` probe, which only matters for the default backend. The same
guards as today apply: nothing already connected, the picker not open on
purpose.

### Decision: storage failures are logged, never fatal

Every storage access stays in `try/catch`, as today, but the `catch` logs through
`shared/lib/logger` with a message that names the operation and never the value.
Not `report: true`: a private window refusing storage is expected, not a fault
the team must hear about.

## Risks / Trade-offs

- [Same-origin code can read the key while the tab is open] → accepted by the
  decision above; the built-in wallet has the same exposure and is tracked
  separately. The docs say so plainly.
- [A stored connection names a provider removed in a later release] →
  `rememberedConnection` drops an unknown id; the user sees the picker.
- [A logger or error report captures the key by accident] → no code path logs a
  `Connection`; a unit test asserts the logged arguments of a failing write do
  not contain the key.
- [A duplicated tab copies `sessionStorage`, so it keeps the key] → accepted:
  the user duplicated the tab they are working in.

## Migration Plan

None. Existing users have no stored key; the `assistant.backend` value keeps its
meaning. Rollback is a revert; a stored `assistant.connection` is then ignored
and dies with the tab.
