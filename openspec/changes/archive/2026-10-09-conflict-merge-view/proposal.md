# Proposal

## Why

Since #40, two devices' edits to one file merge on their own when they touch
different lines. When both change the same lines, `merge3` returns `null`,
`planMerge` keeps only the path, and the user gets a banner with two
whole-file answers: "Keep this version" or "Take the other version". Either
throws away the other device's side of that file, though the merge knew
exactly which lines were in question (HOO-1837).

## What Changes

- `merge3` returns the file as an ordered list of settled and conflicting
  chunks (base, this device's and the other device's lines) instead of
  `null`, and `planMerge` carries them per path. A file that has no base, or
  that one side deleted, is carried as one whole-file conflict.
- A divergent conflict holds those chunks in memory, as conflicts are held
  today; nothing new is written to disk or sent until the user confirms.
- The user can answer with the resolved content of each conflicted file.
  The answer is pinned to the two versions it was made against: if either
  has moved by the time it is applied, the question is asked again with the
  new chunks. Otherwise it goes through the same merge, mark, base and
  upload path as any accepted merge, so the other device takes it without
  asking.
- A new design-system element, `merge`: the three-way merge view after
  IntelliJ IDEA's, with this device on the left, the editable result in the
  centre, the other device on the right, ribbons between them, per-hunk
  take and dismiss controls, folded unchanged regions, a file switcher, and
  a one-pane-at-a-time layout at phone width. It draws what it is given;
  the editors inside the panes are the app's.
- `client-v2` installs `modal`, `merge` and `button` from the design system,
  the first components in `shared/ui` (`ui-migration` task 3.6).
- The sync banner's divergent prompt gains "Resolve…", which opens the view
  over three Monaco editors kept aligned and scrolled together. "Keep this
  version" and "Take the other version" stay, in the banner and under the
  same names in the view's footer (IDEA's "Accept Left" and "Accept Right").

## Capabilities

### New Capabilities

- `project-conflict-resolution`: what the user sees and can do when two
  devices changed the same lines of a project, and what reaches the store,
  the server and the other device as a result.

### Modified Capabilities

None. `openspec/specs/` holds no capability for project sync yet.

## Impact

- `client-v2/src/features/persistence/model/merge.ts`: `merge3`'s return
  type, `MergePlan.conflicts`, `settleConflicts`.
- `client-v2/src/features/persistence/model/project-sync.ts`: `Conflict`
  gains the per-file chunks; `mergeWithServer` and `resolve` accept resolved
  content.
- `client-v2/src/features/persistence/Component/SyncBanner.tsx`: the
  "Resolve…" button.
- `client-v2/src/features/persistence/ui/`: new, the resolve view and its
  Monaco controller.
- `client-v2/src/shared/ui/`, `client-v2/src/styles/playground-*.css`,
  `client-v2/package.json`: the installed components, their tokens and npm
  dependencies (`radix-ui`, `lucide-react`, `class-variance-authority`,
  `tw-animate-css`, `cn`).
- `design-system/src/components/ui/merge.tsx`, `registry.json`,
  `src/ds/pg-blocks.tsx`: the new element and its catalogue block.
- Users: a same-line conflict can be settled line by line instead of losing
  one device's side of the file. Until the token bridge (HOO-1802) lands,
  the view is drawn in the design system's palette, which may not match a
  legacy theme around it.
- Out of scope: the assistant performing the merge (a follow-up change; the
  resolved-content answer is what it would fill in); IDEA's whitespace,
  word-highlight and settings controls; keeping per-hunk choices across a
  refresh when the other device moves while the view is open; conflicts
  other than `divergent` (`deleted-elsewhere`, `name-taken`, `too-large`
  keep their banners).
