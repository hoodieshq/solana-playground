# Design

## Context

`InteractBody` renders one 42rem column: chips, form, result, Call history,
Accounts, Events. `BaseCallHistory` renders nothing when there are no records.
The stage scrolls inside `STAGE_FRAME`; its width depends on the chat and
Files panels, so at a 1512 px desktop with both open it is about 42rem.

No design source gives a two-column Interact (the DS prototype's ready state is
unreachable without a real build, Almaz's stand has no Call history, Spec 03
puts it under the form). The values below are decided here and sent to the
designers' batch.

## Decisions

- **Container query, not a viewport breakpoint.** The body is an
  `@container`; two columns from `@min-[40rem]`. A viewport breakpoint would
  show two cramped columns with the panels open and one column with them shut.
- **Grid `minmax(0,42rem) 18rem`, gap 1.5rem, max width 64rem.** The form keeps
  today's 42rem ceiling; the history row (dot, name, outcome, time, signature)
  fits 18rem by wrapping, as it already wraps.
- **Sticky history.** `self-start sticky top-6` inside the stage's scroll.
- **Empty history only in the wide layout.** A new `showEmpty` prop on
  `BaseCallHistory`; the narrow layout keeps rendering nothing, as today. The
  wide column is always rendered so the form never resizes; the empty line is
  hidden below the breakpoint with the same container query.
- **Accounts and Events** move out of the column into a full-width block under
  the grid.

- **History rows break after the name in a narrow column.** Under 24rem the
  instruction name takes its own line, so every row wraps at the same place
  instead of wherever its words run out.

## Measured

At 1512 x 900 with the chat and Files open the stage is 670 px (41.9rem), under
the 45.5rem a 26rem form floor would need. The threshold stays 40rem: at that
stage the form is 310 px, and an instruction with long account names and three
arguments wraps no label (only its button row, Reset going to a second line).
At a 1200 px window the stage is 358 px and keeps one column.
