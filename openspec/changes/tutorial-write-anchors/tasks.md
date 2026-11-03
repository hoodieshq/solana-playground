# Tasks

## 1. Writes against their own reference

- [x] 1.1 `writes.ref` and `writes.start` in `tutorial.schema.json` and the
      definition types; `yarn tutorial:check` checks a block against its
      `ref`, exactly once; the write effect carries both and `store.ts`
      lands the block against them; `AUTHORING.md` documents them. Verify:
      Lumberjack step 1's writes and Zero Copy step 1's fix, copied from the
      prototype, pass the check and land in place in unit tests
      (HOO-2504; after nothing; plan:
      [plans/1.1-write-anchors.md](plans/1.1-write-anchors.md))
