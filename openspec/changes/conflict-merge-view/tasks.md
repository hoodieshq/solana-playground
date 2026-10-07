# Tasks

One task per PR. 1.1 and 2.1 do not depend on each other and may run at the
same time; 3.1 needs both. Tick a task in the PR that lands it.

## 1. Design system

- [ ] 1.1 The `merge` element in `design-system/`: `src/components/ui/merge.tsx`
      with the parts and `mergeHunkVariants` from design.md, the `merge`
      item in `registry.json`, and a `Block id="merge"` in
      `src/ds/pg-blocks.tsx` with a one-line conflict in `lib.rs`, a fold,
      both ribbons, every hunk state and the phone layout. Verify: `npm run build` and `npm run lint` pass in `design-system/`, `yarn ds-add merge --dry-run` from `client-v2/` resolves it from the local registry, and
      the block is reviewed in the catalogue in dark and light (the spec's
      "Reviewing the element in the catalogue" scenario) (HOO-1837)

## 2. Sync model

- [x] 2.1 Conflicts as data, answers as content: `merge3` returns `Merge3`
      chunks; `planMerge` returns `FileConflict[]`; `Conflict.files` beside
      the derived `paths`; `ResolvedFiles` accepted by `mergeWithServer`,
      `settleConflicts` and `resolve`, applied only when both hashes match
      and re-raised with fresh files otherwise. No UI change: the banner
      behaves as before. Verify: vitest cases in `merge.test.ts` (overlap,
      touch, identical change, no final newline, `\r\n`, chunks rebuild
      both sides exactly), `planMerge` `lines` vs `whole` (no base, stale
      base, delete on either side), `project-sync.test.ts` (resolved answer
      applied; server moved and local moved each re-raise and upload
      nothing), and a `two-devices.test.ts` case where device A resolves
      hunk by hunk and device B adopts the result without a conflict;
      `yarn check` green (HOO-1837)

## 3. Resolve view

- [ ] 3.1 The view in `client-v2`, after 1.1 and 2.1: `yarn ds-add modal merge button` (ticks `ui-migration` task 3.6 in the same PR); the
      Monaco controller in `features/persistence/ui/merge-editor/`
      (`pg-merge:` models, view-zone alignment, scroll sync, the
      `setHiddenAreas` wrapper with its fallback, overlay hunk controls,
      hunk state); `BaseConflictResolver` and `ConflictResolver`; the
      banner's "Resolve…". Verify: vitest for the hunk state machine on a
      fake model, the wrapper's fallback, and `BaseConflictResolver`
      keeping "Apply" disabled until every hunk of every file is resolved;
      a Playwright test in `e2e/` titled
      `project-conflict-resolution: <scenario>` for every scenario of
      `specs/project-conflict-resolution/spec.md` not marked `(manual)`,
      with the account stubbed as in `account-sync.e2e.spec.ts`; the
      phone scenario walked by hand; `yarn check` and `yarn test-e2e`
      green; then `/opsx:archive` in the same PR (HOO-1837)
