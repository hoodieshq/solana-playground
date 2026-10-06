# Tasks

Each task is its own stream: its own worktree, ticket and small PRs. Tick a
task in the PR that lands it. Sections 1 and 2 are independent and may run at
the same time; section 3 follows both.

## 1. Telemetry

- [x] 1.1 `shared/lib/telemetry`: event-map types, the GA4 name guard copied
      from the Explorer, `createTracker`, `prefixes.ts`, `TelemetryScope` and
      `useTracker`, `initTelemetry` with the bounded buffer, console and
      memory providers (ticket to file)
- [x] 1.2 Type tests for the guard (40 accepted, 41 rejected, wide key
      rejected, unregistered prefix rejected) and the prefix uniqueness test
      (ticket to file; after 1.1)
- [x] 1.3 Slice-structure test: every `features/*` and `widgets/*` with an
      `index.ts` has `model/telemetry.ts`, and every key of its event map has
      a TSDoc comment (ticket to file; after 1.1)
- [x] 1.4 GA4 provider, which queues events for gtag.js from its creation,
      and the `GoogleAnalytics` component that loads gtag.js, both wired by
      `widgets/observability`; both do nothing without
      `REACT_APP_GA_MEASUREMENT_ID`. A person sets the id in Vercel (ticket
      to file; after 1.1)
- [x] 1.5 `features/auth` and `widgets/observability`, the slices with an
      `index.ts`, declare, describe and emit their first events, so 1.3
      passes; their events are described in spec deltas as the config rule
      requires (`features/persistence` has no `index.ts`) (ticket to file;
      after 1.3)

## 2. Logging

- [x] 2.1 `shared/lib/logger`: levels, namespaces (`Logger`, `ns` option,
      `createLogger`), providers read at call time, error normalisation with
      `cause`, console and memory providers, `initLogger` (ticket to file)
- [x] 2.2 Sentry provider: `@sentry/react` initialised by the provider, DSN,
      release and environment, tag `ns`, `globalHandlersIntegration` off,
      the logger's global listeners with `handled: false`,
      `LoggerErrorBoundary` at the app root, initialised by the
      `widgets/observability` widget; bundle-size change recorded in the PR
      (ticket to file; after 2.1)
- [ ] 2.3 Source maps: upload with `sentry-cli` in `client-v2.yml`, remove
      `.map` files before deploy. A person creates the Sentry project and sets
      `REACT_APP_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and
      `SENTRY_PROJECT` in Vercel and CI (ticket to file; after 2.2)
- [x] 2.4 `features/persistence/model/diagnostics.ts` reports through
      `createLogger("persistence:diagnostics")` with `report: true`; the
      in-memory failure list and `__pgSyncDiagnostics` stay (ticket to file;
      after 2.1)
- [ ] 2.5 ESLint inside the layers: `no-console` except the console provider,
      `no-restricted-imports` for `@sentry/*` except the Sentry provider
      (HOO-1897; after 2.2)

## 3. Rules

- [x] 3.1 `client-v2/CLAUDE.md`: slices gain `model/telemetry.ts`; the rule "A
      `catch` is never empty" names the logger; the root `CLAUDE.md` gotcha on
      persistence failures mentions Sentry (ticket to file; after 1.3 and
      2.4)
