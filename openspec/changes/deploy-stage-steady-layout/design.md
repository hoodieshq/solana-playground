# Design

## Context

`BaseDeploy` draws the facts card (`BeforeDeploySummary`) before the first deploy on the network picked: Network,
IDL, the who-pays line, the program id. While a deploy runs, the card drops the who-pays line and the action row
(`StageEmptyActions`) draws `BaseDeployProgress` above the held pill. The stage is a centred column, so any change
in its height moves the title and the pill; past the frame's height the column overflows and loses its centring
margin as well. No design-system prototype draws a running deploy (`design-system/src/ds/pg-blocks.tsx` has the
empty stage and the result block only), so the placement follows the ticket's proposal.

## Goals / Non-Goals

**Goals:**

- Nothing above or below the facts card's who-pays row moves when a first deploy starts or ends, for three steps
  or four.

**Non-Goals:**

- The redeploy layout and the sideways shift (see proposal.md, Impact).

## Decisions

- **One row for who pays and the steps.** The row the who-pays line had in the card holds the line before a
  deploy and the steps while one runs. The steps answer "what is the deploy doing", the line "who pays for it";
  only one is true at a time, and both are facts of this deploy, so they share the card's place for them. The
  alternative, keeping the steps over the pill with a fixed reserve there, would leave an empty band between the
  outline buttons and the pill before every deploy.
- **The reserve is the tallest list itself.** The row is a one-cell grid holding an invisible, `aria-hidden` copy
  of the four-step list under its content, so its height follows the list's type and spacing in every theme and
  at every font size; a fixed `min-height` in pixels would drift from the list the first time either changes.
  The content sits in the middle of the cell.
- **Until the run reports its first step, the row is empty.** The view turns to running before
  `PgDeployRun` reports a step; the reserve keeps the row's height through that gap.

## Risks / Trade-offs

- [The card is about 60 px taller before every first deploy] → On a short frame the stage overflows before a
  deploy too, so the title sits higher than centred; it stays there when the deploy starts. The design review
  decides whether that cost is worth the steadiness.
- [Placement not yet signed off] → The PR opens as a draft, with the question at the top of its description.
