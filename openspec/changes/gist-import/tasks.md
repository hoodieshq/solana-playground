# Tasks

All tasks are HOO-1761 and land in one PR. They stack on HOO-1760's
`features/gist/lib/format.ts` commit.

## 1. Import a gist

- [x] 1.1 `features/gist/lib/url.ts`: `parseGistUrl` for every form in the spec's "A gist URL is recognised" requirement; verify with its in-source tests, including a repository URL that is refused. Plan: [plans/1.1-gist-import.md](plans/1.1-gist-import.md)
- [x] 1.2 `features/gist/model/import.ts`: read the gist API, download truncated files, refuse a truncated gist, name each failure, lay files out through `fromGistFiles`, refuse a gist no framework recognises, create or reopen `gist-<owner>/<id>`; declare and emit `gist_import_started|succeeded|failed` under the prefix `gist` (registered by HOO-1760). Verify with a test file that stubs `fetch` with `vi.spyOn` and asserts each spec scenario and each event through the memory provider. Depends on 1.1.
- [x] 1.3 Entry points: the import dialog takes a gist URL (label "GitHub or gist URL", validator accepts either, gist goes to 1.2 with `from: dialog`); `routes/gist` opens `/gist/{id}` and the playground URL followed by a gist URL as a temporary view with `from: link`. Verify with the dialog's test and an e2e spec `e2e/gist-import.e2e.spec.ts` that stubs the gist API with `page.route` and covers "Importing a gist from the dialog" and "Opening a gist link signed out". Depends on 1.2.
