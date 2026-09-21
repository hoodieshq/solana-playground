# Conversations are threads, and a thread remembers what produced it (D39)

**Date:** 2026-09-21 · **Status:** implemented on
`feat/conversation-threads` off `saving-chats-history` (stacked on PR
#29), with the two amendments marked below · **Ticket:** HOO-1633 ·
**Decision:** D39

## The problem, in the ticket's words

"Save the history of communication with the default agent integration.
Introduce a `thread_id` abstraction to distinguish one conversation
thread from another. Also persist communication with models accessed
using an API token. Identify each stored thread using the parameters
with which it was created or used. Use a database for persistence,
preferably managed PostgreSQL."

Checked against `saving-chats-history` (PR #29) on 2026-09-21, two of
the four asks already hold and two do not:

| Ask | State on PR #29 |
| --- | --- |
| History of the default agent is saved | **Holds.** The panel writes every item to IndexedDB and pushes the thread to Postgres (`POST /api/conversations`) |
| Managed PostgreSQL | **Holds.** Neon, two migrations under `client-v2/db/migrations` |
| A `thread_id` abstraction | **Half.** `conversations` has an `id` of its own, but nothing outside the database ever sees it: the route is keyed by `projectId`, the client calls the workspace id "threadId", `title` is always null, and there is no way to hold a second thread |
| Threads identified by the parameters they were created or used with | **Missing.** Neither the row nor the message records provider, model, base URL or effort. Given a stored reply there is no way to say which backend wrote it |

Communication over a user's own API token is in fact already stored --
the client pushes its transcript whatever backend produced it -- but
only for a signed-in user on a deployment that has a database. That
limit is PR #29's design and this round does not change it.

## The design in one rule

**A conversation is a thread with an id of its own; the thread records
the backend that created it, and each reply records the backend that
wrote it.**

Everything below follows from that sentence plus "the API key is not a
parameter we store, in any form".

### 1. The schema learns four columns

**Amended while implementing (2026-09-21).** The columns went into
`20260916032901_projects_and_conversations.sql`'s `create table`, not
into a third migration. `client-v2/db/README.md` says so in as many
words while the schema is unshipped -- "a new column goes into the
`create table` that defines it, not into an `ALTER TABLE` bolted on
afterwards. Roll back, edit, re-apply" -- and the repo's own rule beats
this document's reasoning. The cost is a manual rollback on any preview
database that already has the old shape. The shape below is unchanged;
only where it is declared moved.

```sql
create table conversations (
  ...
  provider   text,
  model      text,
  base_url   text,  -- only the OpenAI-compatible providers have one
  effort     text,  -- Anthropic's reasoning ladder; null elsewhere
  constraint conversations_provider_check
    check (provider is null or provider in
      ('default', 'anthropic', 'openai', 'openrouter', 'gemini'))
);

create index conversations_params_idx
  on conversations (user_id, provider, model)
  where deleted_at is null;
```

Every column is nullable, and stays nullable: a thread can reach the
server before the panel has connected to anything -- a prompt sent
while the picker is open, or an older client -- and inventing
`'default'` for it would be a guess recorded as a fact.

The columns are written **once**, when the row is inserted. They are
"the parameters this thread was created with". What it was *used* with
is a different question and lives one level down, on each assistant
message's `payload.origin`:

```ts
/** Which backend produced this reply. Absent on items the panel wrote. */
origin?: { provider: ProviderId; model: string; effort?: Effort };
```

No column for it. `messages.payload` is already `jsonb`, the field is
provenance rather than something a query filters on, and a thread whose
backend changed mid-way is answered by reading its replies.

`base_url` is stored only for the OpenAI-compatible providers, which
are the only ones that have one.

### 2. The wire

`client-v2/api/conversations.mjs` gains a thread id and a list:

```
GET  /api/conversations?threadId=<uuid>
     -> { thread: { id, projectId, title, provider, model, baseUrl,
                    effort, updatedAt }, items }

GET  /api/conversations?projectId=<id>
     -> { threads: [ { id, title, provider, model, baseUrl, effort,
                       updatedAt } ] }

POST /api/conversations
     { threadId, projectId, title?, params, items }
     -> { written }
```

The list carries no messages. It exists so a browser that has never
seen an account can find which thread to open without downloading every
transcript on it.

`threadId` is **minted by the client**, with the same `uuid()` that
mints message ids, and `POST` upserts the row with
`on conflict (id) do nothing`. That is what keeps a repeated push a
no-op instead of a second thread, and it is the same property PR #29
already relies on for messages. Two devices that are both offline can
still mint two threads for one project; the migration's own comment
already accepts that race, and the newest thread wins the default.

`params` never contains a key. The route rejects a body that carries
one rather than silently dropping it -- a client that sends a key is a
bug, and a 400 is how it gets found.

### 3. The client is keyed by thread, not by workspace

Three files change shape:

**`features/persistence/model/chat-storage.ts`.** A thread file is named
by its thread uuid, and a new `/.config/chats/index.json` maps workspace
id to the active thread:

```
/.config/chats/<thread-uuid>.json
/.config/chats/index.json     { "<workspace-id>": "<thread-uuid>" }
```

Migration happens on read and is idempotent: a legacy
`<workspace-id>.json` is renamed to a freshly minted uuid and recorded
in the index. `threadIds()` reads the index rather than the directory,
so a half-finished migration cannot present a file twice.

**`effects/chat-thread/chat-thread.tsx`.** Resolves the current
workspace to a thread id through the index, minting one if the
workspace has never had a conversation, and then does exactly what it
does today -- `loadThread`, `pull`, re-read -- with that id.

**`features/persistence/model/chat-sync.ts`.** Pulls and pushes by
thread id, carrying `projectId` and `params` alongside. `pushAll` walks
the index.

`views/sidebar/assistant/store.ts` stamps `origin` on an assistant item
from the live `Connection` as the item is appended, which is the only
moment the panel knows what answered.

The parameters come from `Connection` and nowhere else:

```ts
{ provider: connection.id,
  model:    connection.endpoint?.model ?? connection.settings?.model,
  baseUrl:  connection.endpoint?.baseUrl,
  effort:   connection.settings?.effort }
```

### 4. What is never stored

**The API key, in any form -- not the value, not a hash, not the last
four characters.** D3 keeps the key in memory for a reason that has not
changed: the playground runs shared project code in a same-origin
iframe. Writing a fingerprint of the key into Postgres would not put the
key at risk, but it would quietly answer "which key was this" as a
product question, and that is a decision to take deliberately rather
than as a side effect of a persistence ticket.

"Identify each stored thread using the parameters with which it was
created" therefore means provider, model, base URL and effort. If the
ticket's author meant per-key identity, that is a separate decision and
this design does not foreclose it -- the columns are additive.

### 5. Testing

- `api/conversations.test.mjs` and
  `features/persistence/server/conversations.test.mjs`, against the real
  Postgres `yarn test-api` already starts: a thread is created with its
  parameters; a second push of the same thread writes no second row; the
  project listing returns threads without messages; a body carrying a
  key is a 400; a thread created before this migration reads back with
  null parameters.
- `chat-storage.test.ts`: the legacy-name migration, including that
  running it twice leaves one file and one index entry.
- `chat-sync.test.ts`: the wire shape, and that `params` never contains
  `apiKey`.
- `store.test.ts`: `origin` is stamped on assistant items and absent on
  notices.

No Playwright: this round changes no UI.

## Out of scope

- **A thread picker.** The ticket asks for the abstraction, not the
  surface. The schema and the wire are shaped so the picker is a
  component, not a migration -- which is the whole reason to do this now
  rather than alongside the UI.
- **Persisting threads for a signed-out user with their own token.**
  That needs an anonymous server-side identity and its own privacy
  decision.
- **Recording the transcript inside `/api/agent`.** The client's push
  already stores the default backend's history, identically to every
  other provider. Making the rail write it as well would mean the server
  logging conversations it currently only relays, which is a privacy
  decision and not a persistence one. Confirmed with Slava, 2026-09-21.

## Amended while implementing: opening a thread must be synchronous

The design said nothing about *when* a thread opens, and the first
implementation paid for it. Resolving the workspace's thread through
IndexedDB put an await in front of `loadThread`, and a message sent in
that window had nowhere to be written: it lived in memory until the
thread opened, and a reload inside the window lost it. The assistant
effect also mounts a little after the workspace exists, so the window
is an ordinary sequence rather than a rare one.

Three changes close it, and each is a rule worth keeping:

1. **The index is read into memory once at startup** (`warm`), and
   `ensureSync` answers from it. A workspace switch opens its thread in
   the same tick, minting an id on the spot and writing the map behind
   it.
2. **`closeThread` does nothing when no thread is open.** There is
   nothing to close, and clearing threw away exactly the messages that
   were waiting for one.
3. **`loadThread` adopts messages that belong to no thread.** Messages
   that arrived while the panel had no thread become the opening
   thread's; a switch away from a real thread still leaves that
   thread's messages behind, which is the distinction that makes
   adoption safe.

## Documents this round owes

- **D39** in `docs/decisions.md`: why the thread id is client-minted,
  why the key is not a stored parameter, why created-parameters sit on
  the row and used-parameters on the message.
- **`docs/upstream-divergences.md`**: a `B14` row for account
  persistence in Postgres. PR #29 introduced the divergence and has not
  registered it; this round writes the row covering both.

Both written, 2026-09-21.

## Found on the way: four e2e specs already failing on PR #29

Measured against `saving-chats-history` with this round's changes
reverted, so they are the base's, not ours: `chat-threads` (both
cases), and `account-sync`'s "the conversation is on screen before a
backend is picked" and "reloading a project the account already has
writes nothing". The branch with this round applied fails the same
four and no others.

The `chat-threads` pair is the timing above, in the part this round
does not reach: the message is sent before the assistant effect has
mounted at all, so nothing yet exists to adopt it, and the test reloads
immediately. Worth raising on PR #29 rather than fixing here.
