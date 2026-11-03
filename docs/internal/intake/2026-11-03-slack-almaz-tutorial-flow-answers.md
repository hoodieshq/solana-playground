# Slack: Almaz answers the tutorial-flow thread (2026-11-03)

## Source
Slack thread "tutorial flow", Almaz Zaripov (answering Nikita Treptsov, Sergey Prokhorov and Slava Koreshkov), 2026-11-03 14:26 his time; passed on by Slava 2026-11-03 14:27. Raw: `.claude/intake/raw/2026-11-03-slack-almaz-tutorial-flow-answers.md`. Continues `2026-11-03-slack-tutorial-flow-thread.md`.

## Decided
- Home keeps 6 tutorials plus an "All tutorials" link to a catalog page with search and filters by level and framework. Almaz, 3 Nov.
- The tutorial shows no right-hand Building / Build failed screen: code stays on the right, status goes to the chat and the bottom terminal strip, on error the terminal opens and the line is highlighted in the editor. Almaz, 3 Nov; he adds it to the spec.
- "Fix with assistant" is the same outline button on every error card, no gradient. Almaz, 3 Nov.

## Requirements changed
- Tutorial build stage: the normal-flow build stage is not shown in a tutorial (was: the right pane showed Building / Build failed).

## Facts learned
- The design had no Building / Build failed state for the tutorial's right pane.
- Almaz says the gradient on the first card was intended in BaseBuild (brand button on the first error only) but reads as an error and duplicates Explain the error in the chat.
- Desync: the chat says "failed in 0 s" while the server still builds; it seems to answer from its own check, not the build result. Almaz asks Sergey to look.

## Open questions
- Tutorial covers: Almaz collects variants and sends them.

## Actions
- Home list (6 + All tutorials, catalog with search and filters), covers as a separate task, tutorial build display, Fix button -> lead.
- Same items for the coverage check against current scope -> planner.
- FYI on the build screen and the Fix button -> design alignment.
