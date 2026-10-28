# Design

## Context

Home lives in `widgets/home` (`Home`, `PhoneHome`, their `Base` parts); `homeSlot` picks one by viewport and already hands the phone an `onContinue` back to the work. Projects come from `PgExplorer.allWorkspaceNames`, with no timestamps; a started tutorial is a workspace that `PgTutorial.isWorkspaceTutorial` recognises and `PgTutorial.open` resumes at its page. A build is `PgCommand.build.execute()`; `PgFlow` records `build: "running"` and `buildStartedAt`. The Build stage's "Nothing built yet" surface already says "Building..." while one runs.

## Goals / Non-Goals

**Goals:** the spec's five behaviours with the fewest new moving parts; the build server hit once per example created.

**Non-Goals:** a stored "first run done" flag; recency timestamps; the landing route; indicators and the setup list (HOO-2323).

## Decisions

- **First visit = no project in the browser.** No flag. A user who deletes every project sees the example again, which Spec 06's own rule ("a browser with no project") allows. A signed-in account's projects are imported into the browser by sync, so they count without reading the session.
- **The example is found by name, `anchor-example`.** A second "Run it" opens it. A stored id was rejected: a rename would then still find it, but a name is what the user sees, and storage (`localStorage` is near its budget) is avoided.
- **The automatic build is part of the "Run it" action**, called after `createWorkspace` resolves. It is not a flag read on load, so a reload cannot start one, by construction.
- **Recency is the explorer's list, reversed, with the open project first.** No timestamps exist; new projects are appended to the list, so its tail is the newest. The open one is what the explorer re-opens on a load, so it is the last used.
- **The open project returns to the work** through the same `onContinue`/`leaveHome` the phone's Continue uses, never a switch, which would re-read it under a live editor.
- **Elapsed time is computed in the connected `Build`** from `buildStartedAt` with a one-second tick only while a build runs; `BaseBuild` takes `elapsedMs` as a prop and stays pure. 60 s is `SLOW_BUILD_MS`, Spec 06's number "to agree".
- **Look (design gap, no source draws it):** the example is an `ActionCard` row above the tiles with a `BrandButton` "Run it"; the recent list is a caption heading plus `ActionCard` rows each with an outline "Open", as the tutorial cards below are drawn. Sent to the designers' batch.

## Risks / Trade-offs

- [The example's build fails on a cold or unreachable server] → the Build stage's existing "Build failed" surface with "Retry build"; the action does not fail because the build did.
- [A project named `anchor-example` made by hand counts as the example] → it opens, no build; harmless.
- [Explorer order is not strictly recency] → acceptable for the MVP cut; a timestamp is a follow-up if usability shows it.
