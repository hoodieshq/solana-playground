# Spec Delta

## Purpose

Lets anyone, signed in or not, open a project that was shared as a GitHub
gist, from the import dialog or from a link.

## ADDED Requirements

### Requirement: A gist URL is recognised in every form GitHub hands out

The client SHALL accept as a gist URL `https://gist.github.com/<owner>/<id>`,
`https://gist.github.com/<id>`, either followed by `/<revision>` or by a
`#file-...` anchor, and `https://gist.githubusercontent.com/<owner>/<id>/raw/...`,
with or without `https://`. A revision in the URL selects that revision of the
gist. Any other URL is not a gist URL.

#### Scenario: Owner, id and revision are read from the URL
- **WHEN** the URL is `https://gist.github.com/alice/0123abcd/9f8e7d`
- **THEN** it is a gist URL with owner `alice`, id `0123abcd` and revision `9f8e7d`

#### Scenario: A repository URL is not a gist URL
- **WHEN** the URL is `https://github.com/alice/repo`
- **THEN** it is not a gist URL, and repository import handles it as today

### Requirement: The import dialog imports a gist as a saved project

The GitHub import dialog (`import-github`) SHALL accept a gist URL as well
as a repository URL, and its field SHALL say so. Importing a gist SHALL
create a project named `gist-<owner>/<id>` (`gist-<owner>/<id>@<revision>`
for a URL naming a revision) and open it; when a project of
that name exists, it SHALL open that project instead of downloading again.

#### Scenario: Importing a gist from the dialog
- **WHEN** a signed-out user enters a public gist URL in the import dialog and presses Import
- **THEN** a project named `gist-<owner>/<id>` is created with the gist's files and opened

#### Scenario: Importing the same gist twice
- **WHEN** the user imports a gist whose project already exists
- **THEN** that project opens and no new project is created

### Requirement: A gist link opens the gist as a view

The client SHALL open `/gist/<id>`, and the playground URL followed by a
gist URL, as an unsaved view of the gist's files, the way `/{githubUrl}`
opens a repository.

#### Scenario: Opening a gist link signed out
- **WHEN** a signed-out user opens `/gist/<id>` for a public gist
- **THEN** the gist's files show in the explorer as an unsaved view and no project is created

### Requirement: A gist's files land where its manifest or their kind says

When the gist carries Playground's manifest, each file SHALL land at the
path the manifest names, and a manifest that names a path outside the
project, a hidden workspace file, or a file the gist lacks SHALL fail the
import. Without a manifest, Rust files SHALL land under `src/`, test files
under `tests/`, other TypeScript and JavaScript under `client/`, and other
files SHALL be left out.

#### Scenario: A gist exported by Playground
- **WHEN** the gist's manifest maps `src-lib.rs` to `src/lib.rs` and `client-client.ts` to `client/client.ts`
- **THEN** the project holds `src/lib.rs` and `client/client.ts`

#### Scenario: A gist made by hand
- **WHEN** the gist holds `lib.rs`, `anchor.test.ts`, `client.ts` and `notes.txt` and no manifest
- **THEN** the project holds `src/lib.rs`, `tests/anchor.test.ts` and `client/client.ts`, and not `notes.txt`

#### Scenario: A manifest that escapes the project
- **WHEN** the manifest maps a file to `../x.rs` or to `.workspace/program-info.json`
- **THEN** the import fails with a message that the gist's manifest is invalid, and no project is created

### Requirement: A gist that cannot be opened says why

The import SHALL show one message per cause: a gist that is missing or
was deleted, GitHub's hourly request limit, a gist with more files than
GitHub lists, an invalid manifest, a gist with no program, and any other
failed request with its status. A file GitHub's gist API cuts short SHALL be
downloaded whole rather than imported cut.

#### Scenario: A missing gist
- **WHEN** the gist id does not exist
- **THEN** the import fails with a message that the gist was not found and the link may be out of date

#### Scenario: GitHub's hourly limit is reached
- **WHEN** GitHub answers 403 with no requests remaining
- **THEN** the import fails with a message to try again later

#### Scenario: A large file in a gist
- **WHEN** the gist API marks a file as truncated
- **THEN** the file's whole content is downloaded and imported

### Requirement: Gist import is measured

The `features/gist` slice SHALL send, under the prefix `gist`:
`gist_import_started` when an import or a link starts reading a gist;
`gist_import_succeeded` when its files are in place; `gist_import_failed`
when it stops. Each carries `from`: `dialog` or `link`. `gist_import_succeeded`
carries `layout`: `manifest` or `loose`. `gist_import_failed` carries
`reason`: `not_found`, `rate_limited`, `too_large`, `invalid`, `no_program`
or `request_failed`.

#### Scenario: A failed import is counted with its reason
- **WHEN** an import from the dialog fails because the gist does not exist
- **THEN** `gist_import_failed` is sent with `from: dialog` and `reason: not_found`
