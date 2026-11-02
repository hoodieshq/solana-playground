# Tasks

All in one PR (HOO-2396). 1.2 follows 1.1; 1.3 follows 1.2; 2.1 and 2.2 are
independent of group 1.
Plan: [plans/1-usage-and-key-guard.md](plans/1-usage-and-key-guard.md)

## 1. The usage record

- [x] 1.1 Migration `agent_turn` and regenerated `db/schema.sql`; verify with
      `yarn db-migrate` and `yarn db-status` (HOO-2396)
- [x] 1.2 `settle` writes the turn's row in its statement; `recordCapped`
      counts a capped turn on `agent_spend.capped`; verify with `yarn test-api` cases in
      `ledger.test.mjs` against Postgres (HOO-2396; after 1.1)
- [x] 1.3 `api/agent.mjs` passes tier and outcome to `settle` and calls
      `recordCapped` on a cap refusal; verify with the integration spec's
      outcome, capped and query-count cases (HOO-2396; after 1.2)

## 2. The keys

- [x] 2.1 `redactSecrets` in `features/agent/server/redact.mjs`, applied to
      every upstream text the route relays or logs; verify with unit cases and
      integration cases for a 500, 401 and 402 body, a thrown fetch and a
      broken stream, asserting response and `console` (HOO-2396)
- [x] 2.2 Key rotation procedure in `docs/deploy-client-vercel.md`, and the
      key-protection check posted on HOO-2396 (HOO-2396)
- [x] 2.3 `pipeStream` logs an upstream stream failure server-side, also
      after the caller left, and reports a relay failure (usage reader or
      write) as its own; verify with integration cases for both (HOO-2396,
      from review)
