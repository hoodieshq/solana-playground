# Proposal

## Why

`client-v2` cannot answer two questions about itself:

- **What do people use?** There is no product analytics. Nobody can say how
  many lessons are started, how many deploys fail, or whether a new panel is
  opened at all, so a change to a screen cannot be judged by its effect.
- **What broke for whom?** There is no error reporting. A failure in a user's
  browser is seen only if that user reports it. The one structured place,
  `features/persistence/model/diagnostics.ts`, writes to the browser console
  and keeps the last 20 failures in memory; neither reaches the team.

New slices are being built now, in the layers `ui-migration` introduces. The
cheapest moment to give every slice its events and its logger is before
those slices exist, not after.

## What Changes

- Every slice under `features/` and `widgets/` with browser code declares its
  telemetry events in `model/telemetry.ts` and emits them. A test fails when a
  slice has no such file, or when an event has no doc comment.
- Every future change that adds or renames an event describes it in its spec
  delta: the name, when it fires, and its parameters. `openspec/config.yaml`
  states this as a rule for proposals and specs.
- A telemetry module in `shared/lib/telemetry`: typed per-slice event maps,
  the GA4 event-name length guard reused from the Solana Explorer, a scope
  that attributes events to a widget without props, and providers (GA4,
  console, memory) behind one interface. Nothing is sent before consent.
- A logger in `shared/lib/logger`: levels, a namespace on every entry
  (`[slice:module]`), and providers behind one interface. Console is the
  default provider; Sentry is a second provider and the only code that
  imports the Sentry SDK.
- Sentry for the browser bundle: errors with readable stack traces (source
  maps uploaded in CI and not served publicly), tagged by namespace, release,
  and environment. Unhandled errors and render errors go through the logger.
- `features/persistence` reports its failures through the logger, so they
  reach Sentry.

## Capabilities

### New Capabilities

- `client-v2-telemetry`: how a slice declares and emits product events, which
  names and parameters are allowed, and when events leave the browser.
- `client-v2-logging`: how code logs, how entries are namespaced, which
  providers receive them, and which entries reach Sentry.

### Modified Capabilities

None. `client-v2-layers` is still a delta in `ui-migration`; the slice file
this change adds is specified in `client-v2-telemetry` instead, so the two
changes archive independently.

## Impact

- `client-v2/package.json`: `@sentry/react`, and `@sentry/cli` as a
  development dependency.
- `client-v2/src/shared/lib/telemetry/`, `client-v2/src/shared/lib/logger/`:
  new.
- `client-v2/src/app/` and `client-v2/src/index.tsx`: `initLogger`,
  `initTelemetry`, and the root error boundary.
- `client-v2/src/features/persistence/model/diagnostics.ts`: reports through
  the logger.
- `openspec/config.yaml`: two rules on describing events.
- `client-v2/CLAUDE.md`: the slice layout gains `model/telemetry.ts`; the rule
  "A `catch` is never empty" names the logger.
- CI (`client-v2.yml`): source-map upload to Sentry and removal of the maps
  before deploy.
- Vercel and CI configuration: `REACT_APP_SENTRY_DSN`, `REACT_APP_LOG_LEVEL`,
  `REACT_APP_GA_MEASUREMENT_ID`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`,
  `SENTRY_PROJECT`. A person with access sets them; no agent handles them.
- Users: an error in their browser reaches the team with a stack trace. No
  analytics event leaves the browser until they consent. The bundle grows by
  the Sentry SDK; the size is measured in task 2.2.
- Out of scope:
  - Logging and Sentry for `client-v2/api/*.mjs`. Those routes cannot import
    `src/`, so they need their own module (ticket to file).
  - The consent banner and where consent is stored. This change reads consent
    through one function and treats "unknown" as "no".
  - Session replay and performance tracing in Sentry.
  - A provider that writes telemetry events as Sentry breadcrumbs.
  - Moving `console.*` calls in the legacy roots to the logger; they move with
    their code, by the change rule in `client-v2/CLAUDE.md`.
  - A generated catalogue of events.
