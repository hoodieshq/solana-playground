-- The backend a thread was created with, and the index that makes it a
-- question you can ask.
--
-- Its own migration rather than an edit to `20260916032901`, despite what
-- `db/README.md` says about squashing while the schema is unshipped. Two pull
-- requests stack on that file at once, so editing it in place makes every
-- rebase a conflict in SQL and costs anyone holding a preview database a
-- rollback and re-apply. Alexander's call on PR #30; the README now says the
-- same thing.

-- migrate:up

-- Written once, at insert: these answer "what is this thread", not "what is it
-- doing now". A thread whose backend changed half way through is read off its
-- messages, each of which carries the backend that produced it in
-- `payload.origin`.
--
-- Nullable, and staying that way: a thread can reach the server before the
-- panel has connected to anything -- a prompt typed and sent while the picker
-- is open, or an older client -- and recording a guess as a fact is worse than
-- recording nothing.
alter table conversations
  add column provider text,
  add column model    text,
  -- Only the OpenAI-compatible providers have one
  add column base_url text,
  -- Anthropic's reasoning ladder; null everywhere else
  add column effort   text;

-- Spelled out rather than free text, so a typo in a client is a rejected write
-- instead of a thread that no filter will ever match.
alter table conversations
  add constraint conversations_provider_check
    check (provider is null or provider in
      ('default', 'anthropic', 'openai', 'openrouter', 'gemini'));

-- "Which of my threads ran on this model" -- the question the parameters are
-- stored to answer. Partial, like `conversations_project_idx`: a tombstoned
-- thread is never a search result.
create index conversations_params_idx
  on conversations (user_id, provider, model)
  where deleted_at is null;

-- migrate:down

drop index conversations_params_idx;

alter table conversations
  drop constraint conversations_provider_check;

alter table conversations
  drop column effort,
  drop column base_url,
  drop column model,
  drop column provider;
