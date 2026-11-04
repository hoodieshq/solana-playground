# Design

## Context

`PgCustomRpcs.save`/`replace` (`entities/custom-rpc`) check the URL rule and duplicates and write in one synchronous call. `NetworkSection` calls them from `BaseCustomRpcs`' form, whose `onSave` returns an answer synchronously. The settings page draws every entry of `PgSettings.all` grouped by id prefix, which is how `connection.endpoint` shows up as "Endpoint" in Connection. `SETTINGS` also feeds the generated defaults, so the setting cannot be deleted.

## Goals / Non-Goals

**Goals:** check before save without a second write path; keep the form a dumb view that renders states the section hands it.

**Non-Goals:** checking a network that is already picked; retrying; caching results.

## Decisions

- **The request is JSON-RPC `getHealth`, POST, with `AbortSignal.timeout(5000)`.** Every Solana RPC serves it and it costs nothing. Any `fetch` that resolves counts as an answer, whatever its status: a 401 from a provider or "node unhealthy" is still an RPC that answered, and the person's own key problem shows on first use. A rejection (DNS, TLS, CORS, abort) is no answer; the browser hides which. Alternative: require `result === "ok"`, rejected because an RPC that is behind still works for a playground and the spec asks only about an answer.
- **Pre-check without writing.** `PgCustomRpcs.check(input, replacing?)` answers the same format/duplicate refusals `put` would, so no request goes out for a value that would be refused anyway. `put` keeps its own checks: the list can change during the 5 s wait (another tab).
- **`onSave` becomes async.** The form awaits it, holds a `checking` state (spinner in Save, `readOnly` fields), and shows the answer's error. An answer can carry `useAnyway`, a callback the form renders as a link-style button on the error line; pressing it saves without the request.
- **Offline is `navigator.onLine === false`.** Cheap, and it covers the airplane case Spec 07 names. Offline also offers "Use anyway" (Design alignment, 4 Nov): the check could not run, the URL may be fine. Copy follows the app's "not responding" wording (Design alignment, 4 Nov) over Spec 07's "No answer from this URL.". A false "online" just falls through to the request and its no-answer path.
- **Hide, don't delete, the Endpoint row.** The page filters `connection.endpoint` out of `PgSettings.all` by id (a set of ids the Network section owns), so the stored setting, its defaults and the terminal keep working.
- **The health request lives in the entity** (`entities/custom-rpc/model/health.ts`), injected into `NetworkSection` through a module function so tests stub `fetch` only.

## Risks / Trade-offs

- [A CORS-blocked RPC that works from the server reads as no answer] → "Use anyway" exists for exactly that.
- [The form is unmounted mid-check, Cancel pressed] → the answer is ignored after unmount; the request is not cancelled, only its result dropped. Cancel stays enabled.
- [A gap: no source draws "Use anyway"] → link-style ghost button after the error text, recorded in the PR's Design gaps and sent to the designers' batch.
