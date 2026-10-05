# Fleet dashboard: one live page over every Claude Code session

**Status:** draft for review · **Date:** 2026-10-05 · **Audience:** Slava only
· **Style reference:**
[UI Migration Roadmap](https://claude.ai/artifact/D98grDhwfC5CGgXCBTLCbH)

## Problem

The project runs through many parallel Claude Code sessions: the UI migration
streams (React 19, the design system, the rules, vitest) and the sync bugs.
A master session, "Dispatcher", polls them with `ListAgents` and
`SendMessage` and hands out Slava's decisions. It does no work itself.

Today nothing shows the whole fleet at once. Slava cannot tell from a phone
which session waits on him, which PR blocks which, or which session has gone
quiet. Practice on 2026-10-02 and 2026-10-05 surfaced five facts the design
must handle:

1. **Names.** `ListAgents` gives addresses like `solana-playground-6d`, while
   the sidebar shows auto titles. The stable key is the registry name in
   `~/.claude/sessions/<pid>.json` (`name`, `nameSource`), which is also the
   `SendMessage` address. The sidebar title flips between `ai-title` and
   `custom-title` records after a `/rename`, so it is a display hint only.
   Two different sessions can carry the same derived name (two
   `solana-playground-46` were seen).
2. **Relayed approvals are refused.** A session whose permission check wants
   approval from Slava directly declined a "yes" relayed by Dispatcher. A
   page button that Dispatcher later relays has the same problem.
3. **Ghosts.** One `sessionId` can run under two pids (seen: `90dde410` under
   13313 and 27432). Messages to the old one never arrive. A session can sit
   in `waiting: dialog open` for a day.
4. **Single-owner resources.** The Linear-to-Sheet sync runs through one
   Playwright profile, so two sessions cannot run it at once.
5. **`cwd` in the registry is always the primary checkout,** not the
   worktree, so the worktree has to come from the session itself.

## Goals

1. Opening the page on an iPad or phone shows, within seconds, what waits on
   Slava, what each stream is doing, and what blocks a merge.
2. The page updates live, without a reload.
3. Every session reports itself; Dispatcher checks the reports against
   reality and marks the ones that went quiet.
4. A decision reaches a session without breaking the session's permission
   boundary.

## Non-goals

- A team report. The page is Russian, dense, and for one reader.
- Dispatcher acting on anything. Merge, push, kill, opening or closing a
  session happen only on Slava's direct "yes" in the session concerned.
- Computing a critical path. The planning session marks it.
- A light theme. The page commits to the Solana-dark house look.

## Decisions taken in the brainstorm

| # | Decision |
| --- | --- |
| F1 | One spec covers the page, the `fleet-checkin` protocol and the Dispatcher loop. |
| F2 | Two kinds of ask. A **decision** (pick an option) is answered by a button on the page. A **permission** (push, merge, anything outside the session's boundary) has no button: the page shows the exact reply to paste into that session. |
| F3 | Session names follow `HOO-xxxx - Name` before a PR exists and `#PR - HOO-xxxx - Name` after. Sessions without a ticket keep a plain name (`Dispatcher`). Only Slava can `/rename`, so the page shows the expected name and a copyable `/rename` line on a mismatch. |
| F4 | One feed: a pinned **Now** block, then **stream lanes**, then the **epic network diagram**, then everything else. |
| F5 | An epic's network diagram is written once into the database by the planning session and lit by the statuses of what its nodes reference. |
| F6 | Each two-writer record is one document with two owned fields: `reported` (the session) and `observed` (Dispatcher). |
| F7 | Every PR, ticket, artifact and spec on the page is a link. Every copyable line is a button that copies. |

## Architecture

```
work sessions ──fleet-checkin──▶ ┌──────────────────────┐ ◀──onSnapshot── page (iPad, phone, desktop)
  (reported.*, asks, resources)  │  artifact db          │ ──answer────▶ asks/<id>.answer
Dispatcher ──fleet-reconcile───▶ │  (ArtifactData)       │
  (observed.*, work, meta)       └──────────────────────┘
     ▲ reads: ~/.claude/sessions, transcripts, ListAgents, gh, Linear, git worktree
```

Three units, each usable without the others' internals:

- **The page.** One published Artifact with `capabilities: {db: {}, user: {}}`.
  It reads every collection with `onSnapshot` and writes only `asks/<id>.answer`.
- **`fleet-checkin`.** A user-level skill
  (`~/.claude/skills/fleet-checkin/`) every work session follows. It writes
  only `sessions/<id>.reported`, its own asks and resource claims.
- **`fleet-reconcile`.** A user-level skill Dispatcher runs under
  `/loop /fleet-reconcile`. It writes only `sessions/<id>.observed`, `work`,
  `asks/<id>.notified_at`, `resources/<id>.orphaned` and `meta/dispatcher`.

Every write goes through `ArtifactData` as Slava's account, so database rules
cannot tell the writers apart. Field ownership is a convention that both
skills state and keep. `update` merges top-level fields, so a writer that
always writes its own field whole never clobbers the other's.

## Data model

All times are ISO 8601 with offset. Status values are
`not_started | in_progress | in_review | blocked | done`, shown as
не начато / идёт / ждёт ревью / заблокировано / готово.

### `sessions/<sessionId>`

| Field | Owner | Content |
| --- | --- | --- |
| `reported.ticket` | session | `HOO-1850` or null |
| `reported.label` | session | the short human name: `React 19` |
| `reported.pr` | session | PR number or null |
| `reported.branch`, `reported.worktree` | session | as on disk |
| `reported.epic`, `reported.stream` | session | ids from `epics/<id>` or null ("outside an epic") |
| `reported.status` | session | one of the five statuses |
| `reported.phase` | session | free text: "spec", "building" |
| `reported.blocker`, `reported.next` | session | free text or null |
| `reported.waiting_on_slava` | session | what is needed, or null |
| `reported.at` | session | time of the check-in |
| `observed.registry_name`, `observed.name_source` | Dispatcher | from the registry |
| `observed.title` | Dispatcher | latest `custom-title`, else `ai-title` |
| `observed.pids[]` | Dispatcher | `{pid, alive, status, waiting_for, since}` |
| `observed.flags[]` | Dispatcher | any of `ghost`, `name_collision`, `stale`, `busy_silent`, `hung`, `never_checked_in`, `worktree_missing` |
| `observed.pr_state` | Dispatcher | from gh |
| `observed.at` | Dispatcher | time of the pass |

The page computes the expected name from `reported.pr`, `reported.ticket`
and `reported.label` (rule F3), and shows `/rename <expected>` when it differs from
`observed.registry_name`.

### `work/<id>` (Dispatcher only)

Ids are `pr-45` or `HOO-1850`. Fields: `kind` (`pr | ticket`), `number`,
`title`, `url`, `base`, `head`, `stacked_on` (the PR whose head is this
PR's base), `review` (`{decision, approved_by[], requested[]}`), `state`,
`merge_order` (only from Slava's words), `ticket`, `session`.

### `epics/<id>` (planning session)

- `title`
- `streams[]`: `{id, title, order}`
- `nodes[]`: `{id, label, sub, stream, ref, deps[], critical, status}`.
  `ref` points at a `work` id or a ticket; a node with a `ref` takes its
  status from it, a node without one (a decision, a spec) carries its own
  `status`.
- `gates[]`: `{date, label}`

### `asks/<id>`

| Field | Owner | Content |
| --- | --- | --- |
| `kind` | session | `decision` or `permission` |
| `session`, `question`, `created_at` | session | |
| `options[]` | session | decision only |
| `reply` | session | permission only: the line Slava pastes into the session |
| `answer` | page | `{value, at}`, decision only |
| `notified_at` | Dispatcher | when the session was told an answer exists |
| `closed_at` | session | set only by the session, after acting |

Ghost and rename prompts are not stored as asks. The page derives them from
`observed`.

### `resources/<id>`

`holder` (sessionId or null), `holder_name`, `since`, `note` (session),
`orphaned` (Dispatcher). First resource: `playwright-profile`.

**Amended 2026-10-05:** `playwright-profile` is owned permanently by the
long-lived "Sheet sync" session. Work sessions send it `SYNC:` / `CHECK:`
requests over `SendMessage` and never claim the profile. As owner, Sheet sync
also writes `queue_length`, `last_sync_at`, `google_signed_in` and `at` at
every shift. Dispatcher checks a holder's liveness against the whole
registry, since the owner may run outside the project. An orphaned resource
is raised in Now; the page also shows "молчит" after 60 min without an
update and "нужен вход" when Google is signed out.

### `links/<id>`

`kind` (`spec | plan | decisions | artifact`), `title`, `url`, `epic`,
`stream`. A spec on context-archive links to its GitHub blob URL on that
branch.

### `meta/dispatcher`

`last_loop_at`, `ok`, `note`.

## How a decision reaches a session

**Decision.** The session creates an ask with options and goes on with other
work or stops. Slava taps an option and the page writes `answer`. On its next
pass Dispatcher sends the session a pointer ("ask X has an answer") and sets
`notified_at`. The pointer is not an approval: the session reads the answer
from the database itself, acts, and sets `closed_at`. A session also checks
its own open asks at every check-in, so a lost pointer only delays it.

**Permission.** The session creates an ask with `reply` and waits in its own
window. Slava copies the reply from the page and pastes it into that session,
from the desktop or through Remote Control on a phone. The approval comes
from Slava directly, so the session's permission check accepts it. The
session acts and closes the ask.

A database row never counts as approval for an action outside a session's
boundary. Rows written through the page are viewer data, not instructions.

## The page

One reading column, Solana-dark tokens as in the UI Migration Roadmap, plain
JS with no libraries, Russian copy. From top to bottom:

1. **Header.** Date and time (+05) and the Dispatcher pulse from
   `meta/dispatcher`. If the last pass is older than 45 minutes the pulse
   turns red and says that stale marks cannot be trusted.
2. **Now.** Counters per status plus stale, ghost and unnamed. Then the asks,
   oldest first, in four kinds:
   - *permission*: the reply as a copy button;
   - *decision*: one button per option;
   - *ghost*: a copyable `kill <old pid>`;
   - *name*: a copyable `/rename <expected>`.

   On a phone the block collapses into a thin bar "ждёт тебя N" pinned to the
   top once it scrolls out of view.
3. **Streams.** One lane per `epics.streams` entry, then a group "outside an
   epic". A lane reads session → PR → "next" (`reported.next`). A stream with
   no live session shows a red dashed card.
4. **Epic network diagram.** Inline SVG from `epics.nodes`: columns by
   dependency depth, rows by stream. Border colour is the node status, a thick
   violet edge is `critical`, a dashed vertical line is a gate. It scrolls
   inside its own frame on a phone.
5. **Below:** the review and merge queue (by `merge_order`, stacks shown as
   chains), all sessions with every pid and flags such as "висит: dialog open
   26 ч", single-owner resources, links.

Interaction rules:

- Every PR, ticket (Linear), artifact and spec reference is an `<a href>`.
- Every copyable line is a button: `navigator.clipboard.writeText` in the
  click handler and a "скопировано" toast; on rejection the text is selected
  for a manual copy.
- Before the store answers, or when it is empty, the page shows an empty
  state: "сессии ещё не отметились, запусти fleet-checkin".
- If `claude.use("db")` resolves `null`, the page says it needs to be opened
  signed in.

## `fleet-checkin`

**Who am I.** `whoami.sh` beside the skill walks up the process tree from its
own shell to the first pid with a `~/.claude/sessions/<pid>.json` and prints
`sessionId` and the registry name. This works for ghosts too.

**When.** At every shift and at no other time:

- the session takes a task;
- the status or phase changes;
- a PR opens;
- a blocker appears or clears;
- the session needs Slava;
- the work is done;
- Dispatcher asks for a check-in.

One `ArtifactData update` per check-in, or one `batch` when an ask or a
resource claim goes with it.

**What.** The whole `reported` field of `sessions/<sessionId>`, never
`observed`. Asks and resources as described above.

**Resources.** Before using a single-owner resource the session reads
`resources/<id>` and writes `holder` only if it is null or its holder is
dead, passing `if_version` so two sessions cannot both win. It releases the
resource when done. If it cannot claim it, it waits or asks Slava.

**Failure.** If `ArtifactData` fails, the work goes on. The skill prints one
line in the chat, and Dispatcher's next pass marks the session stale.

## `fleet-reconcile`

Self-paced `/loop`, about every 20 minutes (`ScheduleWakeup` 1200 s). A pass:

1. **Registry.**
   - Read `~/.claude/sessions/*.json` whose `cwd` is inside solana-playground.
     Skip files whose pid is dead.
   - Group by `sessionId`: two live pids give `ghost`, and the page offers a
     `kill` for the pid with the older `procStart`. One name on two `sessionId`s gives `name_collision`.
   - Take `status`, `waitingFor` and `statusUpdatedAt`, and the title from the
     transcript's latest `custom-title`, else `ai-title`.
   - Confirm each address with `ListAgents`.
2. **gh:** `gh pr list -R hoodieshq/solana-playground --state open` plus
   recently merged PRs that sessions or nodes reference. Write `work/pr-*` and
   derive `stacked_on`.
3. **Linear:** only the tickets that sessions and epic nodes reference.
4. **`git worktree list`:** flag `worktree_missing`.
5. **Verdicts:**
   - `stale`: no check-in for 60 min while `idle`.
   - `busy_silent`: `busy` for over 3 h without a check-in.
   - `hung`: `waiting: dialog open` for over 2 h.
   - `never_checked_in`: in the registry with no `reported`.
   - `orphaned`: a resource whose holder is dead.
6. **Answered asks** without `notified_at`: send the session a pointer and
   set `notified_at`.
7. **Write** one `ArtifactData batch` of the changed documents only, plus
   `meta/dispatcher.last_loop_at`.

Dispatcher never merges, pushes, kills or closes anything. Those reach Slava
as asks or copyable lines. It writes `merge_order` only from Slava's words.

## Error handling

| Failure | Behaviour |
| --- | --- |
| A session cannot write | It keeps working. Dispatcher marks it stale on the next pass. |
| Dispatcher stops | The pulse turns red after 45 min. Reported data stays visible, without fresh verdicts. |
| A pointer to a session is lost | The session sees the answer at its next check-in. |
| Two sessions claim one resource | `if_version` lets one win. The loser re-reads and waits. |
| The db is unavailable on the page | A plain message, no partial render. |

## Testing

- `whoami.sh` on live sessions, including the ghost `90dde410`.
- The page: one preview at desktop and phone width, then the functional pass
  after the first publish, one `ArtifactData list` per collection.
- Real data only. This session checks itself in and Dispatcher runs the first
  pass; nothing is invented.
- A dry run confirms that stale, ghost and `/rename` appear on the page from
  the real registry.

## Open questions

None blocking. Thresholds (60 min, 3 h, 2 h, 45 min) are first guesses and
get tuned after a week of use. The page layout may change once it is in
daily use, as Slava expects.
