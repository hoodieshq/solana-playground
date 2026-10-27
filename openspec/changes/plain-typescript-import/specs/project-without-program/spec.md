# Spec Delta

## Purpose

Lets a user bring TypeScript work with no Solana program into the
Playground, and keeps the dev loop from offering stages such a project
cannot use.

## ADDED Requirements

### Requirement: A repository with no program imports as a TypeScript project

Import from GitHub SHALL accept a repository, or a folder of one, in which
no supported framework finds a program but which holds TypeScript or
JavaScript files (`ts`, `tsx`, `js`, `jsx`). It SHALL be imported as a
project with no program. A repository in which a framework finds a program
SHALL be imported as before this change.

#### Scenario: A client and its tests
- **WHEN** the user imports a repository that holds `index.ts`,
  `lib/rpc.ts` and `tests/rpc.test.ts` and no program
- **THEN** a project is created and opened, holding
  `client/index.ts`, `client/lib/rpc.ts` and `tests/rpc.test.ts`

#### Scenario: A repository with an Anchor program
- **WHEN** the user imports a repository with `programs/<name>/src/lib.rs`
  and a TypeScript client
- **THEN** the project is laid out exactly as an Anchor repository was
  before this change

#### Scenario: A repository with neither
- **WHEN** the user imports a repository that holds no program and no
  TypeScript or JavaScript file
- **THEN** the import fails with the message it gave before this change
  for a repository it cannot recognise

### Requirement: Place a no-program repository's files by kind

In a repository imported with no program, a test file (`*.test.*` or
`*.spec.*` of `ts`, `tsx`, `js`, `jsx`) or any TypeScript or JavaScript
file under a `tests/` or `test/` folder SHALL go under `tests/`; every
other TypeScript or JavaScript file SHALL go under `client/`. Each file
keeps its path below the folder that placed it, with a leading `client/`,
`tests/` or `test/` dropped. Files of any other kind SHALL be left out.

#### Scenario: Folders are kept
- **WHEN** a repository with no program holds `src/app/main.ts`,
  `test/unit/math.ts`, `client/run.ts`, `README.md` and `package.json`
- **THEN** the project holds `client/src/app/main.ts`,
  `tests/unit/math.ts` and `client/run.ts`, and nothing else

#### Scenario: A test file outside a tests folder
- **WHEN** a repository with no program holds `lib/math.spec.ts`
- **THEN** the project holds `tests/lib/math.spec.ts`

### Requirement: A project with no program shows only the Write stage

A project SHALL count as having no program when its `src/` folder holds
no Rust (`.rs`) or Python (`.py`) file. For such a project the dev-loop
stepper SHALL show only the Write stage: the Build, Deploy and Interact
tabs (`flow-stage-tab-build`, `flow-stage-tab-deploy`,
`flow-stage-tab-interact`) SHALL not be rendered, and their keyboard
shortcuts SHALL do nothing. The stepper row SHALL stay in place. The
check SHALL follow the files, so the stages return as soon as a program
file is added and leave when the last one is removed.

#### Scenario: An imported TypeScript project
- **WHEN** the user opens a project that holds only `client/` and
  `tests/` files
- **THEN** the stepper shows the Write tab and no Build, Deploy or
  Interact tab, and Ctrl+2 leaves the Write stage shown

#### Scenario: A program is added
- **WHEN** the user creates `src/lib.rs` in a project with no program
- **THEN** the Build, Deploy and Interact tabs appear

#### Scenario: A project with a program
- **WHEN** the user opens a project whose `src/` holds `lib.rs`
- **THEN** the stepper shows Write, Build, Deploy and Interact as before
