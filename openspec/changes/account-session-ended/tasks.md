# Tasks

## 1. The session says when it ended

- [x] 1.1 HOO-2624: `PgSession` keeps the remembered user id and `expiredUser`, tracks `auth_session_expired`, adds `fetchAuthed` and the `expired` sign-in origin; verified by its in-source tests, including the event through the memory provider

## 2. Sync keeps the marks

- [x] 2.1 HOO-2624 (after 1.1): the sync routes use `fetchAuthed`; `PgSyncMark` reads the expired id; `syncMarkerOf` asks `PgProjectSync.hasExpiredMarks`; the session effect stays put for an origin; verified by in-source tests of `sync-mark` and `sync-marker`, and `effects/session/session.test.ts`

## 3. The row and the menu say so

- [x] 3.1 HOO-2624 (after 1.1): `AccountSession` status `ended`, `AccountLine` kind `session-ended`, "Sign in again"; verified by the ranking tests in `account.ts`, `BaseSessionFooter.test.tsx` and `BaseAccountMenu.test.tsx`; `session-footer` sends no new event, the pick stays `sign-in`

## 4. End to end

- [x] 4.1 HOO-2624 (after 2.1, 3.1): `e2e/session-ended.e2e.spec.ts` stubs the 401 and covers the scenarios "A session ended", "Signing in again" and "A sign-out in another tab"; verified by running that spec
