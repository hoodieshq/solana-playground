# Design

## Context

The account row (`widgets/session-footer`) builds its lines in
`model/account.ts` from `PgSession` (signed in, or `SignInState`) and the
wallet. Failure messages are written where `PgSession` throws
(`features/auth/model/session.ts`). The project list (`widgets/app-nav`)
lists the explorer's workspaces and knows nothing of sync.

Sync already answers "is this project in the account, and does the account
hold what this browser holds" (root `CLAUDE.md`, sync gotchas):

- a sync mark per project per account (`PgSyncMark`) exists once the
  account has accepted the project from this browser;
- `isCleanAgainst(mark, localName, files)` says whether the local user files
  and name are what the mark recorded; reconcile and sign-out
  (`releaseLocalProjects`) both decide on it;
- `mark.dirty` is the hint that lets reconcile skip the hash for a project
  nothing touched;
- `PgProjectSync.conflicts` holds projects waiting on the person.

## Goals / Non-Goals

**Goals:**

- The marker is a read of those four facts, in the order reconcile reads
  them, so it can never disagree with what reconcile or sign-out will do.
- No filesystem work per keystroke (sync gotcha: "Never do filesystem work
  per filesystem write").

**Non-Goals:**

- No new state in the sync model, no change to what sync writes.
- Session-expiry detection, the import offer, sign-out leftovers.

## Decisions

**1. One read in `features/persistence`: `syncMarkerOf`.** A new module
`model/sync-marker.ts`, exported from the slice's `index.ts`:

```
null           <- !PgProjectSync.isAvailable()        (signed out, ending, no database)
"not-synced"   <- PgProjectSync.conflictFor(id)
"this-browser" <- !PgSyncMark.exists(id)              (no record for this account)
null           <- mark && !mark.dirty                 (reconcile's cheap path)
null | "not-synced" <- isCleanAgainst(mark, name, snapshotOf(name).files)
```

A mark that exists but cannot be read (`read` gives `null`) is "Not
synced": the account has the project, the agreement is unknown, and
reconcile merges it against an empty base. Alternatives: a status field on
the mark (a second notion of synced, rejected by the ticket); deciding on
`dirty` alone (the gotcha that broke reconcile twice).

**2. When the list re-reads.** `onDidChangeSyncMarkers` in the same module
fires on: a mark written or removed (a new `PgSyncMark.onDidChange`, fired by
`write`, `remove` and `markDirty`, carrying which of them), a conflict raised
or settled (`onDidChangeConflicts`), and `online`/`offline`. A `markDirty`
fires it only while the browser is offline: online, the editor's 3-second
debounce uploads and the following `write` clears it, so the open project
would otherwise read "Not synced" for the length of a pause in typing. The
widget also re-reads on the explorer's workspace events and on
`PgSession.onDidChange`. Re-reads are coalesced (one pass in flight, one
queued), and each pass hashes only projects whose mark is dirty, which is
almost always only the open one.

**3. Online state.** A `useOnline` hook in `shared/lib/hooks`
(`useSyncExternalStore` over `navigator.onLine` and the window's
`online`/`offline` events) feeds the account row's "Offline · saving here".
`AccountView` gains `online`.

**4. Copy.** `accountLines` returns exactly one line per state: "Saved in
this browser", "Waiting for GitHub…" (primary "Signing in…"), "Couldn't
sign in" (the prototype's row; the reason is in the menu), the @login under
the display name, "Offline · saving here". The wallet line goes (Spec 02
puts the wallet in the menu's group; the live prototype keeps it off the
row too). The failure strings are Spec 02's, set where `PgSession` throws.

**5. Sign-out in the menu.** `BaseAccountMenu` takes a `signOut` state
(`idle | asking | leftovers(n)`) and swaps its content in place: the Sign
out item's `onSelect` calls `preventDefault`, so Radix keeps the menu open.
The question is a `MenuNote` with an `AsyncButton`-backed destructive item
and a Cancel that takes focus on mount. Confirm keeps the menu open while
`PgSession.signOut` runs (its teardown releases clean projects through
`releaseLocalProjects`); then the remaining workspace count is the
leftovers. `useAccount` resets the state when the menu closes and emits
`session_sign_out_ended` once per question. `BaseSignOutDialog` is deleted.
Alternative: keep the dialog (rejected: Spec 02's requirement and ACC-27 ask
for the menu, and the menu closing was our code, not a constraint).

**6. Marker look (design gap, decided).** Caption-size text at the row's
right edge, in the slot the pin glyph uses and hidden on hover like it, so
the row's action button keeps its place; "Not synced" adds a warning
`StatusDot`. On the designers' sync page as 4.23.


## Risks / Trade-offs

- [A push that fails online leaves the open project's mark dirty with no
  re-read] → the next re-read (switch, refocus reconcile, conflict, any mark
  write) shows it; the failure itself is reported through diagnostics.
- [A tutorial with no mark yet reads "This browser" for the seconds before
  its first upload] → it is true until the upload; the write that follows
  re-reads and clears it.
- [Hashing on a re-read] → limited to dirty marks; coalesced.
