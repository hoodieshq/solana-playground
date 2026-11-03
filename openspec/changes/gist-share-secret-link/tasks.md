# Tasks

All tasks land in one follow-up PR into `scope/typescript-2`, after SF#75
(the TypeScript landing). Groups 1–3 are HOO-2390. Groups 4 and 5 are SF#75
landing findings, kept in this PR without tickets of their own by Slava's
decision of 2 November. Plan: [plans/1-gist-secret-link.md](plans/1-gist-secret-link.md). Group 1 comes first. Groups 4
and 5 may run in parallel with 2–3.

## 1. Visibility on the server and in the export (HOO-2390)

- [ ] 1.1 `parseGist` in `client-v2/api/gists.mjs` accepts an optional
  boolean `public` (absent → `false`, anything else → `400`), and
  `createGist` sends it instead of `public: true`. Verify with `yarn
  test-api`: new cases in `api/gists.test.mjs` (a non-boolean `public` gives
  400 and no GitHub call; an absent field means secret) and in
  `create-gist.test.mjs` (`public: false` and `true` reach GitHub).
- [ ] 1.2 `exportProject` takes `visibility: "secret" | "public"`, posts
  `public`, and returns `id` (falling back to `parseGistUrl(url)`). Add
  `lib/playground-link.ts` (`playgroundLink(origin, id)`). Verify with
  `export.test.ts` (body carries `public`, `id` read or derived, a missing
  id is `request-failed`) and a `playground-link` unit test.
- [ ] 1.3 Telemetry in `model/telemetry.ts`: add `visibility` to
  `gist_export_started/succeeded/failed`, `source` to `gist_export_started`,
  and the new `gist_link_copied {copied}`. Emit them. Verify through the
  memory provider in `export.test.ts` and `ShareGist.test.tsx`. Depends on
  1.2.

## 2. The "Share to GitHub" dialog (HOO-2390)

- [ ] 2.1 `BaseShareGist`: Spec 05 copy, the Visibility radio group (ids
  `share-gist-visibility-secret` / `-public`, Secret default, help tip), the
  "Share to GitHub" / "Sharing to GitHub…" button, choice locked while busy,
  and the shared state ("Shared", Playground link field + "Copy Playground
  link", the what-it-opens line, Open on GitHub, "Copy GitHub link", copy
  error line). Verify with `BaseShareGist` tests for each state. Depends on
  1.2.
- [ ] 2.2 `ShareGist`: visibility state, `onCopy` writing the clipboard,
  then `PgView.setToast` "Link copied" (name `gist-link-copied`) plus
  `gist_link_copied`. The origin is read here. `ModalFrame` title becomes
  "Share to GitHub". Verify with `ShareGist.test.tsx` (default secret posts
  `public: false`, Public posts `true`, copy writes `<origin>/gist/<id>`,
  toast and event fire, a refused clipboard shows the error and no toast).
  Depends on 1.3, 2.1.
- [ ] 2.3 Update the e2e `gist-sharing` spec for the new dialog (secret by
  default, Playground link shown and copied). Verify with `yarn test-e2e
  e2e/gist-sharing` against the mocked route.

## 3. Where Share is offered (HOO-2390)

- [ ] 3.1 `BaseProjectList`: Share (label "Share", hint `G`) only on the open
  project's row, and `G` inert elsewhere. Verify with `BaseProjectList` /
  `ProjectList` tests for the open row, another row and a lesson row.
- [ ] 3.2 `BaseStageBar` gains an optional `actions` slot, threaded through
  `LayoutShell` as `stageBarActions`. A `ShareButton` (`flow-share`, "Share",
  accessible name "Share <name>") in `app/ShareGistDialog` opens the dialog
  with `source: "header"`. The project menu passes `"project_menu"`. Shown
  only with an open project and not under Home. Verify with `BaseStageBar`
  tests (slot renders) and a `Flow`- or `ShareButton`-level test (opens the
  dialog for the open project, absent on a phone). Depends on 2.2.

## 4. Cancel while sign-in waits (SF#75 landing, no separate ticket)

- [ ] 4.1 Add a `waiting` step whose one button reads "Cancel sign-in"
  (`share-gist-cancel-sign-in`) to `BaseShareGist`, and make
  `SignInToShare`'s submit read "Cancel sign-in" (enabled) while its
  sign-in waits. `ShareGist` takes a
  `cancelSignIn` prop and `app/ShareGistDialog` wires it to
  `PgSession.cancelSignIn`. Verify with a `ShareGist.test.tsx` case:
  Cancel → sign-in step with the cancelled message, `gist_export_failed
  {reason: "sign-in-failed"}`, and a second press starts a new sign-in.
- [ ] 4.2 Add the e2e case "gist-sharing: Sign-in cancelled" and mark the
  spec scenario covered. Verify with `yarn test-e2e e2e/gist-sharing`.
  Depends on 4.1.

## 5. No phone stepper for a project with no program (SF#75 landing, no separate ticket)

- [ ] 5.1 `StageBar` leaves the `Stepper` out on a phone when
  `!state.hasProgram` and keeps the "Client project" badge. Verify with a
  `StageBar`/`Stepper.test.tsx` case at phone width: no "Development loop"
  tablist, badge present. A desktop no-program project still shows the Write
  tab.

## 6. Integration

- [ ] 6.1 `yarn run check` in `client-v2` is green, plus `yarn test-api` and
  the gist and no-program e2e specs. Take desktop and phone screenshots of
  the dialog before and after for the PR body.
