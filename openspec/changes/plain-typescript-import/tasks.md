# Tasks

All tasks are HOO-2147 and land in one PR, stacked on #176 (HOO-1761).
Plan: [plans/1-plain-typescript-import.md](plans/1-plain-typescript-import.md).

## 1. Import and present a project with no program

- [x] 1.1 `PgFramework.hasProgram` and the no-program layout in
  `convertToPlaygroundLayout` (`utils/framework.ts`), with in-source tests
  for every placement scenario of `project-without-program` and for a
  repository with a program staying unchanged. Verify: `yarn test-unit
  src/utils/framework.ts`.
- [ ] 1.2 Gist import accepts a gist with TS/JS under `client/` or `tests/`
  and keeps `no-program` for one with neither, with its new message
  (`features/gist/model/import.ts`); depends on 1.1. Verify: the
  `import.test.ts` cases for both scenarios, events asserted through the
  memory provider.
- [ ] 1.3 `hasProgram` in `FlowState`, the `program` event wired from the
  explorer in `PgFlow.init`, `stagesOf`, and the stepper and Ctrl+1..4
  reading it (`views/flow/state/stage.ts`, `views/flow/header/`); depends on
  1.1. Verify: reducer cases in `stage.test.ts`, a `Stepper.test.tsx` case
  rendering only `flow-stage-tab-write`.
- [ ] 1.4 e2e: `project-without-program` scenarios and the two new
  `gist-sharing` scenarios as Playwright tests titled `<capability>:
  <scenario>`, GitHub stubbed with `page.route`; depends on 1.1-1.3.
  Verify: `yarn test-e2e` on the specs touched.
