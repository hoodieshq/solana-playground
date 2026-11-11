# Tasks

All tasks belong to HOO-2608 and land in one PR, stacked on #466. They run
in order. Plan: [plans/1-wire-import-card.md](plans/1-wire-import-card.md).

## 1. The link model

- [x] 1.1 `PgGithub` throws `GithubNotFoundError` (owner, repo, today's
      message) for a repository's 404; unit test in `utils/github` proves a
      404 tree answer rejects with it and keeps the message.
- [x] 1.2 `widgets/catalog/model/link-import.ts`: `importLink(link)` routes
      gist / repository / bad link and answers a `LinkImport` outcome with the
      message and the `reason`; `GistImportSource` gains `"new-project"`; the
      outcome type and the two events declared in `features/new-project`.
      Unit tests cover each route, each message and each `reason` (depends
      on 1.1).

## 2. The card and New project

- [x] 2.1 `ImportFromUrl` connected for real (presets removed): states,
      events through the memory provider, cancel to idle, toast after the
      page closed; component tests (depends on 1.2).
- [x] 2.2 `useNewProject` holds `importing`; `NewProject` passes
      `importHeld`/`onImporting`/`closePage`; Start and the cards wait on the
      import and Import on them; `NewProject.test.tsx` covers it (depends on
      2.1).
- [ ] 2.3 e2e `new-project-import.e2e.spec.ts`: a TypeScript-only repository
      imports through the card and opens; a GitLab link shows the bad-link
      message with no GitHub request; a 404 shows the can't-find message
      (depends on 2.2).
