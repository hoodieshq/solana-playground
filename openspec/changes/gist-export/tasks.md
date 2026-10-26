# Tasks

All tasks belong to HOO-1760 and land in one PR into `scope/users-work`
(plan: [plans/1-gist-export.md](plans/1-gist-export.md)).

## 1. Gist format

- [ ] 1.1 Create `features/gist` with `lib/format.ts`: `isExportablePath`, `toGistFiles`, `fromGistFiles` (manifest and hand-made branches), `GistFormatError` with its reasons and the size limits; verify with its in-source tests (round trip, clash naming, empty files, every untrusted-manifest reason, hand-made placement). HOO-1760; HOO-1761 builds on it.

## 2. Server route

- [ ] 2.1 Add `features/gist/server.mjs` (`createGist`: GitHub call and answer mapping) and `api/gists.mjs` (origin, session, token, body checks); verify with `api/gists.test.mjs` under `yarn test-api` covering every status in the spec, and the dev server's routing. HOO-1760; depends on nothing.

## 3. Export model and dialog

- [ ] 3.1 Let `PgSession.signIn` take extra `scopes` and pass them to `/sign-in/social`; verify with its unit test that the body carries them and that a re-sign-in as the same user fires no account change. HOO-1760.
- [ ] 3.2 Add `model/export.ts` (`exportProject` result union), `model/telemetry.ts` (four `gist_*` events, prefix registered), `ui/BaseShareGistDialog.tsx` and `ui/ShareGistDialog.tsx`; verify with unit tests of the model (each route answer to a result, events through the memory provider) and render tests of the Base dialog in every state. HOO-1760; depends on 1.1, 3.1.

## 4. Menu entry

- [ ] 4.1 Add `share-gist` to `ProjectAction`, the Share as gist item (key `G`) to `BaseProjectList`, and open `ShareGistDialog` from `ProjectList` with `PgSession`'s state and sign-in; verify with the app-nav tests (item, key, action event) and a manual run of the spec's manual scenarios on the dev server. HOO-1760; depends on 3.2.
