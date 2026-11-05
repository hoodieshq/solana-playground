# Design

## Context

SF#74's fix (c3bc8f482) makes a session read that finds nobody sign the tab out. Nothing records why. Everything keyed by the user then stops: `PgSyncMark.currentUserId` answers `null`, so `markDirty` does nothing and `syncMarkerOf` reports no marker. Reconcile's cheap path (`mark && !mark.dirty && mark.updatedAt === project.updatedAt`) then skips a project edited meanwhile, so the edit is not uploaded on the next sign-in.

Sync routes that answer 401 only report a diagnostic today: nothing re-reads the session.

## Goals / Non-Goals

**Goals:** the requirements in `specs/`.

**Non-Goals:** keeping the tab signed in on an expired cookie. Pushes stay off because no user is set. The row keeps the name (Almaz on DES-197, confirmed by Design alignment over Spec 02's "Sign in"), so the person sees which account to sign back in to.

## Decisions

**The session read decides; a route's 401 only asks for it.** A 401 from a sync route might be a proxy's or a route's bug. `PgSession.fetchAuthed` wraps the sync routes' `fetch` and, on a 401 for a known user, starts one read (joining a read in flight, and not during a sign-out, whose flush may race the cookie). Alternative: sign out on the 401 itself; rejected, because one bad route would sign the person out.

**Which reads say "expired".** A 401, or JSON with no user. Not an HTML page, a 404 or the not-configured 503: those say this host has no sign-in, or a proxy answered.

**A remembered user in `localStorage`, removed only by an accepted sign-out.** It tells the cases apart that an in-memory flag cannot: a sign-out in another tab removes it, so this tab's later read is a plain sign-out, and a tab opened after the cookie expired still finds it. It holds what the row draws (id, name, login, avatar URL) and nothing secret, in one small value. Alternatives: `BroadcastChannel` for the sign-out, which misses a tab that is closed and says nothing on a fresh load; a file through `PgFs`, which is async and would make the first read wait. If storage throws, the tab falls back to the user it holds in memory.

**`PgSession.expiredUser`, not a flag.** It answers three questions: whether the session expired, whose marks stay readable, and whose name the row keeps. It clears as soon as a user is set. `PgSession.get()` still answers `undefined`, so nothing treats the person as signed in.

**Only `PgSyncMark` falls back to the expired id.** `currentUserId` there becomes `PgSession.get()?.id ?? PgSession.expiredUser?.id ?? null`, which keeps the markers and lets `markDirty` flag edits. `PgSyncBase` and `PgSyncClaim` keep the signed-in id, and everything that uploads still gates on `PgSession.get()` through `_ready`, so a mark is read and flagged but never pushed. `syncMarkerOf` asks a new `PgProjectSync.hasExpiredMarks()` as well as `isAvailable`, which reconcile also uses and so must stay false while expired.

**One `AccountSession`, a new status `ended` holding the user.** `use-account` derives it: idle or a cancelled sign-in, plus an expired user. A sign-in under way or a failure the person did not cancel still wins, so the row keeps saying what is happening right now. No separate flag in `AccountView`, so a failed and an ended state cannot both show.

**The sign-in stays put.** `signingInFrom` is set to a new origin `expired` when a sign-in starts on an expired session, and the session effect opens the newest project only when a sign-in has no origin. Set inside `PgSession`, so every sign-in surface gets it, the handoff sheet included.

**`auth_session_expired`, not Spec 16's `session_expired_shown`.** The auth slice detects it and owns the `auth_` prefix, and it fires once per tab when the state starts. Counting from the widget would count again whenever the footer remounts, as it does crossing the phone breakpoint and swapping for the rail.

## Risks / Trade-offs

- [A person who cleared cookies by hand reads "Your session ended"] → True enough, and signing in clears it.
- [The line stays until the next sign-in, with no way to dismiss it] → Intended: sync stays off until then.
- [Sessions signed in before this ships have no remembered id until their first read] → A session that expires before any read after the release reads as a plain sign-out, once.
- [The other device changed the same file while expired] → Spec 02 allows the question. No base was captured for those edits, so it asks about the whole file.
