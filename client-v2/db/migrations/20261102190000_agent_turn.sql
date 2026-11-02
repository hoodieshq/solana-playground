-- One row per `/api/agent` turn that reached the spend ledger, for reading
-- usage per account in any window (HOO-2396). `agent_spend` keeps only a
-- day's sum; the quota's real shape is to be set from this table. See
-- `features/agent/server/ledger.mjs` for the statements that write it.

-- migrate:up

-- `outcome` is the ledger's `TurnEnd` kind for an admitted turn, or `capped`
-- for one the daily cap refused. Tokens are what the upstream reported for a
-- `completed` turn, null otherwise. `charged` is micro-USD, so a day's rows
-- sum to that day's `agent_spend.spent`.
create table agent_turn (
  id                bigserial primary key,
  user_id           text not null references "user" ("id") on delete cascade,
  at                timestamptz not null default now(),
  tier              text not null,
  outcome           text not null,
  prompt_tokens     integer,
  completion_tokens integer,
  charged           bigint not null default 0,
  constraint agent_turn_outcome_check check (
    outcome in ('completed', 'unfinished', 'refused', 'abandoned', 'capped')
  ),
  constraint agent_turn_tier_check check (tier in ('newcomer', 'established')),
  constraint agent_turn_charged_check check (charged >= 0)
);

create index agent_turn_user_at on agent_turn (user_id, at);

-- migrate:down

drop table if exists agent_turn;
