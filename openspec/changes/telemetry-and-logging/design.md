# Design

## Context

State lives in `PgX` singletons in `utils/`, and much of what is worth
tracking (build, deploy, transactions) runs outside React. Many of the
`console.*` calls in `src/` print the user's own program output and are not
application logging.

Reused from the Solana Explorer:
[`FitsIn` and `GA4EventName`](https://github.com/solana-foundation/explorer/blob/a5c434a3f8d26790672d2ef283c2fca55aaefb52/app/shared/lib/analytics/types.ts),
and the level set and error handling of its
[`Logger`](https://github.com/solana-foundation/explorer/blob/a5c434a3f8d26790672d2ef283c2fca55aaefb52/app/shared/lib/logger.ts).

## Decisions

1. **Two modules in `shared/lib`, one shape.** `shared/lib/telemetry` and
   `shared/lib/logger`, each sending to a list of providers. Telemetry waits
   for consent and carries primitives; error reports carry stack traces and do
   not wait. Their React parts live inside the module, because `shared/ui` is
   overwritten by the design system. _Rejected:_ one module (it blocks errors
   on consent or leaks analytics to Sentry); `shared/telemetry` beside the
   segments.

2. **A slice owns its events as a type.**

   ```ts
   type DeployEvents = {
     /** The deploy transaction was sent to the cluster. */
     dply_started: { cluster: ClusterName };
     /** The deploy ended without the program on chain. */
     dply_failed: { cluster: ClusterName; reason: DeployFailure };
   };

   export const deployTelemetry = createTracker<DeployEvents>();
   ```

   `shared` stays generic and imports no slice. The prefix is part of the key,
   so a name seen in GA4 is found by text search. _Rejected:_ a central event
   list (`shared` would import slices); a runtime prefix argument (partial
   generic inference forces a curried call).

3. **The Explorer's length guard, checked once per tracker.** `FitsIn` and
   `GA4EventName` are copied verbatim. `createTracker` adds two checks: keys
   are literals (the guard accepts a wide `string`) and start with a
   registered prefix. A bad map fails at `createTracker<E>()` through a
   conditional rest parameter. The guard counts UTF-16 units and accepts
   template patterns such as `` `x_${number}` ``; plain ASCII literal names
   make both harmless. _Rejected:_ the Explorer's `_assertGA4Length` constant
   per file (forgettable, needs an eslint-disable each time).

4. **Prefixes are registered in `prefixes.ts`.** A slice-to-prefix map, so a
   test can prove no prefix repeats. _Rejected:_ convention only (a clash
   shows up in the dashboard, not in CI).

5. **Attribution through React context, not DOM events.**
   `<TelemetryScope name>` plus `useTracker`; code outside React passes a
   scope or none. _Rejected:_ bubbling `CustomEvent`s to a collector. Radix
   portals leave the widget's DOM subtree, an unmounted element's event never
   reaches `document`, `model/` and `utils/` code has no element, and
   `detail` is untyped.

6. **Sentry is a logger provider.** `providers/sentry.ts` is the only file
   that imports `@sentry/react`; it initialises Sentry and is a no-op without
   a DSN. _Rejected:_ a separate `shared/lib/sentry` beside the logger.

7. **Namespace: a default, an option, a bound logger.**

   ```ts
   Logger.warn("clipboard unavailable");                         // [app:common]
   Logger.error(error, { ns: "wallet:connect", report: true });  // [wallet:connect]
   const log = createLogger("persistence:sync");                 // [persistence:sync]
   ```

   Sentry gets it as the tag `ns`: an exception is titled by the error's own
   message, so a text prefix alone separates nothing. _Rejected:_ a positional
   namespace argument (a message with a colon reads as a namespace; the string
   repeats at every call).

8. **Providers are read at call time.** `createLogger` runs at import, before
   `initLogger`; a copied list would keep the console-only default forever.

9. **One path for errors.** Sentry's `globalHandlersIntegration` is off; the
   logger's own `error` and `unhandledrejection` listeners and the root
   `LoggerErrorBoundary` call `Logger.panic`, and the Sentry provider marks
   those `mechanism: { handled: false }`. _Rejected:_ Sentry's handlers (two
   paths; console and tests never see unhandled errors).

10. **Events are described for two readers.** TSDoc on each key for the
    developer, checked by the slice-structure test through the TypeScript
    compiler API; a spec requirement for the reviewer, before code exists.
    _Rejected:_ a hand-written catalogue (drifts); TSDoc alone (a change's
    analytics impact is invisible until coded).

## Risks / Trade-offs

- `shared` gains a list of slice names in `prefixes.ts`.
- `@sentry/react` loads eagerly; its size is unmeasured until task 2.2.
- Production sends no analytics until a consent mechanism exists.
- `handled: false` is taken from Sentry's own integrations; task 2.2 confirms
  the public type accepts it.

## Open Questions

- GA4 or another analytics product?
- Where does consent come from, and who owns it?
- Does a Sentry organisation and project exist?
