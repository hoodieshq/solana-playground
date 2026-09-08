# Entering a lesson is legible (D34)

**Date:** 2026-09-08 · **Status:** design, implementing on
`feat/lesson-entry` off `feat/lesson-ledger` (stacked on PR #20) ·
**Decision:** D34 (2026-09-04, amended 2026-09-07) · **Estimate on the
roadmap:** ~1 d

## The problem, in the tech lead's words

"Today you open a tutorial and land in the code. The document is visibly
a clickable tab, but nothing tells the learner to read the lesson first
-- maybe when I click a tutorial I should land on the tutorial. Where
you go after closing something is the same class of gap."

Checked against `feat/lesson-ledger` on 2026-09-08, this is four
concrete gaps, all in Flow's own lesson chrome (`views/flow/lessons`,
`Flow.tsx`, `header/ProjectSwitcher.tsx`), none in upstream files:

1. **Start lands in the code.** The gallery's *Open* shows upstream's
   About page, and *START* drops the learner into a bare editor. The
   lesson page exists (`Reader.tsx`) but opens only from a button.
2. **The page is one of four equal buttons.** The band's actions are
   `<- -> Read the page · I'm stuck · Build to prove this`. Nothing says
   which comes first, and the band never knows whether the page was
   ever opened.
3. **The reader has an exit but no destination.** It closes on Esc or
   `x` and says nothing about what to do next. For the one step whose
   proof *is* reading (`verify.kind === "read"`), the proving control is
   in the band behind the sheet, not where the reading ends.
4. **Finishing leaves you nowhere.** Once every step is behind the
   learner the cursor is `end`, `describeStep` returns `null`, the band
   disappears, and the project switcher reads **"Hello Anchor - 5 of
   4"** (`positionNumber` is one past the end by contract, and the
   switcher prints it raw).

Out of scope, deliberately: upstream's About page and its "Go back to
tutorials" link (an upstream component, and it does leave you
somewhere -- the tutorials list); the frame revision (D34 puts it in
the bonus bucket); the readiness explainer (its own roadmap slot).

## The design in one rule

**The page opens by itself only when you enter the lesson, and only if
you have never opened it; everywhere else the band points at it.**
Everything below follows from that sentence plus "every surface names
where you go next".

### 1. The record learns one fact: `opened`

A new event kind in the lesson's event log (`events.ts`):

```ts
| { type: "opened"; stepId: string }
```

"The learner opened this step's page." A recorded fact with no mark
edge and no cursor effect, like `attempt` and `hint`. It is admitted
once per step: `admits` refuses a second `opened` for a step already in
the fold's `opened` set, the same way it refuses a `move` to where the
cursor already stands. The fold (`ledger.ts`) gains
`opened: ReadonlySet<string>` on `LessonView`, and the trim snapshot
(`LessonSnapshot`) gains `opened?: string[]` so the fact survives a
trim -- it is what the band's signpost is derived from, and a signpost
that forgets would re-nag.

Why the record and not session memory: the ledger round's whole point
was provenance -- one log, every fact about the learner's route in it.
"Did they ever open the page" is such a fact; the assistant's lesson
context can read it later without a second store. A session-only set
would re-open the page on every reload and forget it on every switch,
and would be the kind of shortcut that gets re-litigated.

`opened` is not `attest`. Opening a page proves nothing; D26's "Mark as
read" is still the only edge a read step has, and it stays a human
click at the frontier.

The store (`store.ts`) gains one action, `PgLesson.opened(stepId)`,
dispatched by Flow whenever the reader opens for a step -- by the entry
rule or by the band's button. The v1 migration writes no `opened`: a
migrated learner's current step reads as unopened once, and opens once.

### 2. Entry opens the reader

`Flow.tsx` already owns `reading`. A new pure helper,
`lessons/reading.ts`:

```ts
/** The step whose page should open on this state, or null */
export const entryReading = (state: LessonState): LessonStep | null
```

Returns the cursor's step when all of these hold: the state has a path;
the record's last event is `enter` (the load just landed -- every later
event moves the tail off it); the cursor is not `end`; the step has a
`readPage`; the step is not in `view.opened`. Otherwise `null`.

Flow keeps its existing effect (step changes close the reader) and adds
one after it, keyed on `entryReading(lesson)?.id`: when non-null, open
the reader and record `opened`. Recording moves the tail off `enter`,
so the helper returns `null` on the next state and the effect is inert
-- opening does not close itself.

What this means for the learner:

- *START* on a fresh tutorial: the workspace is created, the store
  loads and appends `enter`, page 1 opens over the editor. You land on
  the tutorial.
- Reload mid-step, page already opened: the editor, as today.
- Reload on a step whose page you never opened: that page.
- A build proves step 1: the cursor moves to step 2, the reader (if
  open) closes as today, and the band's read button says *Read step 2
  first*. The page does not hijack the build result.
- Switch to a project and back: `enter` again; opens only if unopened.

### 3. The band signposts

`ObjectiveBand.tsx`, actions in this order:
`<- -> [Read step 2 first | Read the page] · I'm stuck · Build to prove this`.

The read button moves to the front of the group and takes an `unread`
state while the cursor step is not in `view.opened`: a leading dot in
the primary colour, a primary-coloured border, and the label **Read
step N first**. Opened, it is the plain **Read the page** it is today.
The criterion stays the band's only filled primary (D25: the primary
*is* the criterion); the signpost is an outlined emphasis, not a second
primary. Copy lives in `band-copy.ts` as `readLabel(position, opened)`.

### 4. The reader names where you are and where you go

`Reader.tsx`:

- The bar gains an eyebrow above the title: **Step 2 of 4**.
- A footer below the scrolling body, always visible: the criterion line
  (`Verified when the program is live on devnet.` -- the same string
  `describeStep` builds, passed in) and one action:
  - **Mark as read** when the step is an attestation kind and offers its
    primary (cursor at the frontier, step open) -- it attests and closes,
    so the proof sits where the reading ends;
  - **Back to the code** otherwise -- closes the sheet. Esc and `x` stay.

Reader props become `{ step, position, criterion, offersAttest,
onClose, onAttest }`. Flow computes them from `describeStep`.

### 5. Finishing leaves you somewhere

`band-copy.ts` gains `describeFinish(state)`: non-null only when the
cursor is `end`. It returns `{ number: "4 of 4 steps", objective: "You
have finished Hello Anchor.", verifiedBy }`, where `verifiedBy`
summarises the marks honestly, in the record's own vocabulary: `3
proved, 1 marked read.` or `2 proved, 1 skipped -- go back to prove
it.` The band renders it with the same layout: the back arrow (legal,
the rail's positions are still there), and a **Browse gallery** action
that opens the gallery modal (`onOpenGallery`, passed from Flow, the
same handler the header uses).

`band-copy.ts` also gains `positionLabel(path, view)`: `"2 of 4"` while
in the path, `"done"` at `end`. The project switcher uses it, so the
label reads **Hello Anchor - done**, never *5 of 4*. The assistant's
`describeLesson` already clamps to the last step; unchanged.

## Files

| File | Change |
| --- | --- |
| `lessons/events.ts` | `opened` event; `opened?` in the snapshot |
| `lessons/ledger.ts` | fold `opened`; `admits` refuses a repeat; trim carries it |
| `lessons/store.ts` | `opened` action, `PgLesson.opened(stepId)` |
| `lessons/reading.ts` (new) | `entryReading(state)` |
| `lessons/band-copy.ts` | `readLabel`, `describeFinish`, `positionLabel` |
| `lessons/ObjectiveBand.tsx` | read button first + unread state; finished state; `onOpenGallery` |
| `lessons/Reader.tsx` | eyebrow, footer with criterion + one action |
| `lessons/index.ts` | export the new helpers |
| `Flow.tsx` | entry effect; `read()` records `opened`; reader props; band props |
| `header/ProjectSwitcher.tsx` | `positionLabel` |
| `e2e/lesson-path.e2e.spec.ts` | Start lands on the page; Esc; the band's plain label after |

No upstream file is touched. `PgTutorial`, the route, `LessonRoute` and
`LessonSurface` are unchanged.

## Testing

Unit (jest, no browser), each red before green:

- `ledger.test.ts`: `opened` lands in the fold; a second `opened` for
  the same step is not admitted; `opened` never flips a mark or moves
  the cursor; the trim snapshot carries `opened` and a fold from it
  restores the set; the random-series properties still hold with the
  new kind in the alphabet.
- `store.test.ts`: `opened` appends once and is a no-op the second
  time; refused outside a lesson.
- `reading.test.ts`: null outside a lesson; the cursor step on an
  `enter` tail when unopened with a page; null once opened; null when
  the tail is not `enter`; null at `end`; null for a step with no page.
- `band-copy.test.ts`: `readLabel`; `describeFinish` null while any
  step is ahead, the summaries for all-proved / with-attested /
  with-passed; `positionLabel` in-path and `done`.

Browser (playwright, `e2e/lesson-path.e2e.spec.ts`): after *START* the
dialog is visible with no click; Esc closes it; the band's read button
then reads *Read the page*; the existing assertions follow.

Visual: before/after screenshots of Start (bare editor vs page open),
the band (four equal buttons vs signposted read), the reader (no footer
vs footer), and the finished state (no band + "5 of 4" vs the finished
band + "done"). Hosted on `context-archive` under
`docs/internal/assets/2026-09-08-lesson-entry/`.

## Amendments this creates

- **D25's event table** gains `opened` as a recorded fact (no edge), and
  the snapshot gains `opened`. To record beside the `attempt`-payload
  and `graded`-fixpoint amendments already queued from the friction log.
- **Friction §5 (persist-on-load stays off)**: the entry rule appends
  `opened` right after `enter`, so a first visit now writes storage on
  load. `_persist` still refuses while `loadFailed` is set, which was
  the reason the rule existed; the note should say so.
