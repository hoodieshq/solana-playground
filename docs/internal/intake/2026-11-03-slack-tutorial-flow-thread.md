# Slack: tutorial flow thread, build-failed state and tutorial list (2026-11-03)

## Source
Slack thread "tutorial flow", Sergey Prokhorov and Nikita Treptsov, 2026-11-03 03:13-07:18; passed on by Slava 2026-11-03 14:08 with three screenshots. Raw: `.claude/intake/raw/2026-11-03-slack-tutorial-flow-thread.md`.

## Decided
- Coverage by existing tickets is checked by Planner before Lead files anything, to avoid duplicates. Slava, 3 Nov 14:10.

## Requirements changed
None yet.

## Facts learned
- Nikita: the start screen must show fewer tutorials, with a link to all of them on a landing page or a proper search; the covers need polish. The home list now has 12 cards with inconsistent covers.
- Nikita: the design likely has no "failed build" state for the browser window; he proposes a Build failed screen with a retry offer. Almaz to check.
- Sergey triggered a build in the explainer (PR hoodieshq#227): the chat shows "Build failed in 0 s" while the right pane and terminal still say "Building...".
- On the Build failed screen the first error card's "Fix with assistant" has a gradient outline, the second card's is plain. Nikita asks Almaz and Slava whether this is a DS discrepancy.

## Open questions
- Which "Fix with assistant" style is right, gradient or plain (asked of Slava and Almaz).
- Which of the asks existing tickets already cover (Planner checking).

## Actions
- Tutorial list on home: fewer at start, link to all or search, consistent covers -> lead (waits for Planner's coverage check).
- Bug: chat shows build failed while the build still runs -> lead (waits for Planner's coverage check).
- Check coverage by existing tickets of all three asks -> planner.
- Failed-build state for the browser window, and the "Fix with assistant" discrepancy -> design alignment.
