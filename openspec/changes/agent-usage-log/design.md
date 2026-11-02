# Design

## Context

`api/agent.mjs` reserves a turn's worst case in `agent_spend` before the
upstream call and settles it after the response ends (HOO-1751). The route's
integration spec counts its queries: one `reserve`, one `settle`.

## Decisions

1. **A row per turn, not more columns on `agent_spend`.** A daily row cannot
   answer an hourly window or a request count per window; one row per turn
   answers any. Volume is a handful of rows per active user per day.
2. **Written by `settle`'s statement.** `settle` becomes a CTE: the
   `update agent_spend` and an `insert into agent_turn` in one statement, so
   the round-trip count the spec checks is unchanged and the two never
   disagree. A capped turn has nothing to settle; `recordCapped` inserts its
   row after the 429 is sent, in the route's `finally`, so it delays nothing.
   It is caught and logged like `settle`.
3. **Outcome is the ledger's `TurnEnd.kind`, plus `capped`.** No new
   vocabulary; `charged` is `chargeFor`'s result, so a sum over a day's rows
   equals that day's `spent`.
4. **Redaction by runs, not by exact match.** Upstreams that echo a key
   usually mask part of it (`sk-...abcd`), so removing only the exact key
   would miss a long fragment. `redactSecrets` replaces every run of 8 or more
   characters of each key with `[redacted]`. Shorter runs are left: 8
   characters of a random key are not guessable, and shorter would start to
   hit ordinary words.
5. **No retention yet.** The follow-up that sets the quota's shape decides how
   long rows are kept; until then the table grows, which at this volume is
   harmless for months.

## Risks

- Migration order: the new `settle` fails on a database without `agent_turn`,
  and a failing settle leaves the reservation spent (overcharge, never
  undercharge). The deploy page already says "migrate first, then merge".
