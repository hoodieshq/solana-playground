# Design

## Context

Repository import (`utils/github.ts`) downloads a repository's files and
hands them to `PgFramework.convertToPlaygroundLayout`, which asks each
framework (Anchor, native, Seahorse) whether the files are its own and
throws "Could not identify framework" when none says yes. The catalog cards
and the `/{githubUrl}` route go through the same call. Gist import
(`features/gist/model/import.ts`) lays files out itself and then refuses a
gist that `PgFramework.getFromFiles` does not recognise, with reason
`no-program`.

The Flow's dev loop is a reducer, `PgFlow` in `views/flow/state/stage.ts`,
over a fixed list `STAGES`; the stepper (`views/flow/header/Stepper.tsx`)
draws one tab per entry, `StageBar` binds Ctrl+1..4 to them, and
`StageRouter` mounts the panel for `state.stage`. A build started anywhere
(terminal, assistant) moves the stage to `build` through the reducer.

## Goals / Non-Goals

**Goals:**

- One layout rule for a no-program repository and a hand-made gist, so the
  two imports place a file the same way.
- One "has a program" check for the importers and the stepper.

**Non-Goals:**

- A stored project kind. The answer follows the files.
- Changing what Build or Deploy do when run from the terminal or the
  assistant on such a project.

## Decisions

- **The no-program layout lives in `convertToPlaygroundLayout`.** When no
  framework recognises the files, it lays out TypeScript and JavaScript as
  the spec says and throws "Could not identify framework" only when nothing
  is left. Every caller (dialog, catalog, `/{githubUrl}` route) gets it with
  no change to `utils/github.ts`. The alternative, a branch in
  `PgGithub.getFiles`, would leave the route and the catalog refusing what
  the dialog accepts.
- **Placement by kind matches the gist rule.** `*.test.*`/`*.spec.*` and the
  `tests/`/`test/` folders go to `tests/`, other TS/JS to `client/`. A gist
  is flat, so its rule never sees folders; the repository rule keeps the
  path below the folder that placed it and drops a leading `client/`,
  `tests/` or `test/` so the result is never `client/client/`. Other files
  are left out: a project with no program runs only `client/` and `tests/`,
  and a `README.md` at the root would be the only file outside them.
- **"Has a program" is `src/` holding a `.rs` or `.py` file,** a static
  `PgFramework.hasProgram(files)` over relative paths. It is what Build
  compiles. Framework detection was the alternative and is wrong here: a
  native program being written has no `entrypoint!` yet and would lose its
  Build tab.
- **Gist import checks "a program or something to run".** After `layOut`,
  a gist passes when a framework recognises it or when a file sits under
  `client/` or `tests/` with a TS/JS extension; otherwise the `no-program`
  refusal stands with a new message. The reason keeps its name, so
  `gist_import_failed`'s values do not change.
- **The stage list is state.** `FlowState` gains `hasProgram` (default
  `true`, so nothing changes until the explorer answers), set by a
  `program` event that `PgFlow.init` sends from the explorer's init,
  workspace switch, create, delete and rename events. `stagesOf(state)`
  returns `["write"]` or `STAGES`; the stepper and the keybinds read it.
  The reducer keeps `stage` on `write` while `hasProgram` is `false`: a
  `set-stage` to a hidden stage is ignored and `build-start`/`deploy-start`
  leave the stage alone, so `StageRouter` never shows a panel with no tab.
  Hiding tabs in the stepper alone was the alternative; a terminal build
  would then open a Build panel the user cannot leave by its tab.
- **The row stays.** One tab, Write, in the same row: the frame's layout
  does not depend on the project. The visual call is ours (no design source
  covers a project with no program) and goes to the designers' batch.

## Risks / Trade-offs

- [A repository that is TypeScript plus a program in a layout no framework
  knows imports as TypeScript only] → the program files are dropped rather
  than the import failing; this was a refusal before, so nothing that worked
  stops working.
- [Recomputing on every create/delete/rename] → the check is a scan of the
  open project's paths in memory, no file reads; the explorer already holds
  them.
- [The stage collapses while a build runs from the terminal on a project
  that just lost its last `.rs`] → the build's own output still lands in the
  console; the stepper shows Write. Accepted.
