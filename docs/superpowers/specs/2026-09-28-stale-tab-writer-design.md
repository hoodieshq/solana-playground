# Stop a stale tab from overwriting another tab's work (HOO-1723)

**Status:** draft for review · **Date:** 2026-09-28 · **Ticket:**
[HOO-1723](https://linear.app/solana-fndn/issue/HOO-1723) · **Follow-up:**
[HOO-1814](https://linear.app/solana-fndn/issue/HOO-1814) (the same bug for
the thread index, deliberately out of scope)

## Problem

When two tabs of one browser have the same project open, a tab that has fallen
behind can silently replace the other tab's work. The bad copy lands on the
server, and on disk for any file the stale tab saves. There is also a race in
which switching tabs quickly raises a false "changed on another device" banner,
and answering "Keep this version" to it does the same damage.

## Root cause

The tabs share IndexedDB: the workspace files and the sync marks. Each tab
also keeps its own in-memory copy of the current workspace, in
`PgExplorer.files` and in its Monaco models. The sync mark records what *this
browser* agreed with the server. The staleness, though, belongs to a *tab*.

1. **Silent overwrite.** Tab A pushes, and the shared mark is updated. When
   tab B becomes visible, it sees that the mark and the server agree, takes
   the fast path (`project-restore.ts:141`) and re-reads nothing. B's next
   edit uploads a snapshot built from its stale memory (`buildSnapshot` calls
   `PgExplorer.getAllFiles()`). Because its `baseUpdatedAt` equals the server's
   current value, the compare-and-swap accepts it.
2. **Per-file overwrite on disk.** B's Monaco model for the file still holds
   the old text, and B's autosave (`Monaco.tsx:395`) writes the whole buffer
   back. Fixing the snapshot alone would not stop this.
3. **Race.** B's reconcile reads the list, the mark and the files in one
   order, while A's flush-on-hide pushes and writes the mark in another.
   Nothing makes these steps atomic across tabs.
4. **The existing re-read does not re-read.** `adopt` and the "stale" branch
   in `session.tsx` both reopen the workspace with `switchWorkspace`. That
   refreshes `PgExplorer.files`, but Monaco reuses any cached model by path
   (`Monaco.tsx:321-331`), so a file that was already open keeps its old text.
   `playground-bridge.ts:148-156` documents the same trap. The existing e2e
   test for "Take the other version" checks a file that had no model, so it
   passes anyway. **Verify this first**; the reload below fixes it as a side
   effect.

The cross-tab channel starts from one fact: an edit reaches disk right after
it reaches state. Monaco's autosave calls `saveFileToState` and then
`fs.writeFile` in the same callback, so memory runs ahead of disk by at most
one write. **Disk is therefore the shared, per-file source of truth between
tabs, and only memory goes stale.**

## Goals

- No tab can upload, or save to disk, a copy it has not re-read since another
  tab wrote.
- A tab showing a project another tab is editing follows it on screen. This
  covers two windows side by side, where both are visible and no
  `visibilitychange` fires.
- No false `divergent` conflict from the tab-switch race.

## Non-goals

- Concurrent editing of **the same file** in two tabs. Last writer wins per
  file, which is how two editors on one disk already behave. We do not merge.
- Separate browsers or devices. The existing mark and compare-and-swap design
  already handles them.
- The thread index (`PgThreadIndex._cache`), which is HOO-1814.
- Undo history. When a file is replaced under a tab, that file loses its undo
  stack in that tab.

## Design

Four parts. All new code lives in `client-v2/src/features/persistence/model/`,
and no upstream-owned file is edited. The effect, the session effect and the
persistence model are all fork files.

### 1. `tab-reload.ts`: bring the current workspace in line with disk

`reloadCurrentFromDisk(): Promise<"unchanged" | "contents" | "reopened">`

1. Skip if there is no current workspace or it is temporary, since a temporary
   workspace has nothing on disk.
2. Read the current workspace from disk (the same walk as `buildSnapshotOf`,
   limited to names `isItemNameValid` accepts, which is the set the in-memory
   tree can hold) and compare it with `PgExplorer.files`, file by file.
3. **Set of paths differs** (another tab created, deleted or renamed a file):
   dispose this workspace's Monaco models, then `switchWorkspace(current)`.
   Returns `"reopened"`. This is rare, so its cost (a reconcile, and
   `PgProgramInfo` rewriting the keypair) is acceptable.
4. **Only contents differ:** for each changed path,
   - **skip the path if its Monaco model's value differs from the state's
     content.** That means the user has typed in this tab and autosave has
     not run yet. The local keystrokes win, and the next autosave makes that
     file last-writer-wins, as the non-goal above says;
   - otherwise set `PgExplorer.files[path].content` directly. This dispatches
     no save event, so nothing is scheduled to push;
   - replace the model instead of calling `setValue`, which would fire
     `onDidChangeModelContent` and so the autosave, and autosave writing back
     what was just read is how two tabs would start bouncing edits. If the
     model is the one in `monaco.editor.getEditors()[0]`: `createModel` with
     the new text, `setModel`, restore selection and scroll, then dispose the
     old model. If it is not visible, dispose it so the next open recreates it
     from state. If no model exists, only state changes.

   Returns `"contents"`.
5. Nothing differs: returns `"unchanged"`. Receivers act only on user files,
   so a tab that rewrites the keypair does not make its neighbour reload.
   That is what stops two tabs from bouncing.

`adopt` (`project-sync.ts`) and the "stale" branch of `session.tsx` call this
instead of a bare `switchWorkspace`. That fixes root cause 4.

### 2. `tab-sync.ts`: tabs tell each other they wrote

A `BroadcastChannel("pg-workspace-sync")`, with a random per-tab id and one
message type: `{ type: "files-written", projectId, from }`.

- **Send:** subscribe to `PgFs.onDidWriteFile` plus the explorer's
  create/rename/delete events. Map each written path to its workspace, then to
  its id (a write can target a workspace that is not current: an import, or
  an adopt of another project). Skip `.workspace/metadata.json`, which is
  rewritten on every open and holds only tabs and cursors. Debounce each
  project with a 250 ms trailing edge.
- **Receive:** if `projectId` is this tab's current workspace, run
  `reloadCurrentFromDisk()`, debounced 300 ms. The same rule applies whether
  or not the tab has focus. The per-file skip in step 4 of part 1 already
  protects keystrokes that have not been saved yet, so separate handling for
  a focused tab is not needed.
- If `BroadcastChannel` does not exist (jsdom), this is a no-op, and parts 3
  and 4 still guarantee correctness.

### 3. One cross-tab lock around deciding and writing

`withSyncLock(fn)` wraps `navigator.locks.request("pg-project-sync", fn)`,
and runs `fn` directly where Web Locks do not exist.

- It is held for the whole of `reconcile()`, and for the part of `push()`
  that reads the mark, sends the PUT and writes the mark. Pushes that
  reconcile issues pass `immediate: true`, and in that case `push` does not
  take the lock again, because it would wait for itself. This is the same
  reasoning as the existing push gate.
- `resolve()` runs under the lock, because it calls `push` and `adopt` from
  outside reconcile.
- `reconcile()` begins with `reloadCurrentFromDisk()`. That is the backstop
  for a message that was missed or a tab opened before this change shipped,
  and it runs before anything reads the current workspace.

This makes list → mark → push atomic between tabs, so the tab-switch race
cannot produce a `divergent` conflict.

### 4. Upload what is on disk, not what is in memory

`pushCurrent()` builds its snapshot from disk (`buildSnapshotOf(current)`),
not from `PgExplorer.getAllFiles()`. Memory is ahead of disk by at most one
write, and the push is debounced by 3 s, so an edit never reaches the server
later than it would today. A stale in-memory copy can then never be uploaded.
If disk and memory disagree on user files at push time, the push still goes
ahead with the disk copy, and `reloadCurrentFromDisk()` is scheduled.

`snapshotOf(name)` does the same: disk always. `buildSnapshot()` stays only
if something else needs the in-memory view. If nothing does, it is removed.

If disk and memory disagree on user files at push time, the push still goes
ahead with the disk copy. `pushCurrent` does not schedule a reload for this
(see "Amended while planning" below) -- the channel from part 2 and the
reload at the start of `reconcile()` already cover the editor.

## Amended while planning

Four points below turned out differently once planning got specific. D50
(`docs/decisions.md`) records why; this section is the pointer from the
design to that reasoning.

- `session.tsx` is not touched. Once `adopt` reloads properly, the
  session's own `switchWorkspace(target)` re-opens a workspace whose models
  are already fresh, so the stale branch there needs no change. See
  "Interaction with PR #36" below.
- `adopt` always takes the full reopen path (`{ reopen: true }`), never a
  quiet path, because the quiet path would leave `PgProgramInfo` holding the
  old keypair.
- `pushCurrent` does not schedule a reload when disk and memory disagree at
  push time (part 4, above). The channel plus reconcile-time reloads
  already cover the editor.
- The model swap in part 1, step 4 does not use `createModel`/`setModel`.
  It disposes the model and re-dispatches `ON_DID_OPEN_FILE`, which is
  exactly what `Monaco.tsx` does after a rename or delete; swapping behind
  its back would leave its per-second position timer calling `getOffsetAt`
  on a disposed model.

## Interaction with PR #36

PR #36 adds `adoptAccountThreads()` and a panel reopen to `session.tsx`,
directly around the reconcile block that part 3 wraps and the stale branch
that part 1 was originally going to replace. `session.tsx` is untouched
instead (see "Amended while planning" above): once `adopt` takes the full
reload path, the existing stale branch's `switchWorkspace(target)` reopens a
workspace whose models are already fresh, so there is no textual conflict
with PR #36 to resolve. COOP/COEP from #36 do not affect `BroadcastChannel`
or Web Locks: both work within one origin and do not depend on
`window.opener`.

## Testing

**Unit (jest)**
- `tab-reload`: unchanged, contents-only (state updated, no save event), a
  skipped path with local unsaved typing, and a changed set of paths leading
  to a reopen. Monaco is mocked at `monaco.editor`.
- `tab-sync`: path → project mapping, `metadata.json` ignored, the debounce,
  own messages ignored.
- `withSyncLock`: the fallback without `navigator.locks`, and no re-entry
  from `immediate` pushes.
- `pushCurrent` builds from disk (update the existing `project-sync.test.ts`
  cases that stub `getAllFiles`).

**E2E (Playwright, two pages of one context)**
1. The ticket's repro: edit `lib.rs` in A, wait, bring B up. B shows A's text
   *before any input*. Type in B, reload A: both edits are present.
2. Side by side: both pages stay visible, A edits, B's editor updates with no
   visibility change.
3. The race: edit in A, switch to B within the debounce. No banner appears
   and the server holds A's edit.
4. Regression for root cause 4: "Take the other version" with the replaced
   file *already open* shows the new text.

Hand-check: two real windows side by side, typing in each alternately.

## Records

- `docs/decisions.md`: a new D-entry. Chosen: disk as the cross-tab truth,
  `BroadcastChannel` plus Web Locks. Rejected: reload only on focus (fails
  side by side); only building the snapshot from disk (Monaco still writes
  the stale buffer); a single writer per project with a "Work here" banner
  (strongest guarantee, but a UX change nobody asked for); `model.setValue`
  for the reload (autosave echo). Revisit if same-file concurrent editing
  becomes a requirement.
- `docs/upstream-divergences.md`: no entry, since no upstream file changes.
