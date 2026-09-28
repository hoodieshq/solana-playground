# Two columns for the customer sheet, 2026-09-25

Slava was given write access to the roadmap spreadsheet. The working copy
built on 2026-09-24 is no longer the deliverable: the statuses go into the
original, as two columns and nothing else. See D43 as amended today.

## What was done, and how

The columns are **in the customer sheet**, written 2026-09-25.
`Status` sits at **`E`**, straight after `Priority`, where the reader
meets it before the story and the scope; `Linear` is the last column,
`L`. Rows 1 to 120. Nothing else in the sheet was touched - the ten
original columns moved one place right and kept their contents.

Three things make it read as a board rather than a list:

- **`Status` is a dropdown, not free text.** Data validation over the 93
  item rows only - twelve ranges, `E3:E8` through `E104:E106` - so the
  section, blocker and risk rows stay clean. Display style is the arrow,
  not the chip, so the value reads as plain text and the row colour is
  what carries the signal.
- **The fill covers the whole row.** Seven conditional-format rules over
  `A2:L120`, each a custom formula `=$E2="<status>"`. A section row has
  no status, so nothing tints it.
- **`Not started` has no rule**, which is the point: it is 64 of 93 rows.

**The write path is Playwright, not an API.** No Google credentials exist
on this machine - no `gcloud`, no ADC, no service-account key, no Sheets
MCP - and Slava declined setting one up: a key on disk is standing access
he would then have to fence, and he wanted this done without that. So the
browser did it, the way a person would.

`make_html.py` renders the two columns as an HTML `<table>`; Playwright
writes that table to the clipboard as `text/html` and presses paste at
the first free column. Sheets reads pasted HTML, so one operation carried the values, the
ticket links as real hyperlinks on the ticket number, and the fills - no
formulas, so the spreadsheet's locale cannot break an argument separator.
The column was then moved to `E`, the dropdown added, and the
conditional-format rules built through the sidebar, with the static fills
cleared afterwards - so **colour follows the status rather than being
painted on**: pick a different value and the whole row moves with it.

`sheet_sync.py` is the same job against the Sheets API, written before
Slava ruled the credential out. It is kept because it is the better tool
the day an API path exists - it is idempotent, reuses its own columns on a
rerun, and manages its own rules. It has never been run.

## What anyone repeating this needs to know

**The sheet accepts anonymous edits.** The Playwright browser was not
signed in to any Google account, and it wrote to the document. Link
sharing on it is set to allow editing, not commenting or viewing, so
anybody holding the URL - it is the URL given to the customer - can change
the scope document. That is worth raising with whoever owns it.

## Inputs

- The sheet, exported 2026-09-25 via the public CSV endpoint. **Byte
  identical to the 2026-09-22 and 2026-09-24 exports** - the scope has
  not moved in three days.
- Linear project `Solana Playground`, re-pulled 2026-09-25: 47 issues,
  `hasNextPage: false`, and **no status changed since the 24th**. Nothing
  new was filed either.
- `rowmap.py`, the row-by-row mapping built on 2026-09-24 and unchanged.

## The numbers in the Status column

93 scope items: `Not started` 64, `Done` 8, `Todo` 8, `In Progress` 5,
`Backlog` 4, `Needs confirmation` 2, `In Review` 1, `Descoped` 1. The 26
remaining rows - 12 section headers, one blank, ten blockers, three risks
- are left empty on purpose.

24 rows carry a Linear link. Lanes `B`, `C`, `H` and `I` have none at
all, and `C` and `H` are P1 in the customer's own document.

Seven statuses carry a fill, all muted: `Done` green, `In Review` blue,
`In Progress` sand, `Todo` a near-neutral warm grey, `Backlog` lilac,
`Needs confirmation` clay, `Descoped` grey. **`Not started` is left
unfilled on purpose** - it is 64 of 93 rows, and tinting two thirds of the
sheet would drown the three colours that matter.

## What the columns deliberately do not say

**`Status` is the row's state, not the ticket's.** Five rows read
`In Progress` against an issue that is `Done` or `Todo`, because the
issue covers half of what the row promises - most visibly row 79, where
persist-and-reflect shipped (HOO-1651) and the reaped-program half did
not. Reading the linked issue's own state instead would have overstated
those rows to the customer.

**`Not started` means no ticket exists.** It is defensible because every
Hoodies issue created since 2026-09-01 was swept and none of the
Playground work sits outside the project. It is still an inference, not a
report from the person doing the work.

**Two cells say `Needs confirmation` instead of asserting.** Row 7, the
Postgres instance: a Postgres exists and syncs, but whether it is the
Foundation's is unconfirmed. Row 36, the ai SDK transport migration: the
customer was told on ~19 Sep that it is in progress, this row is gated on
a spike verdict that does not exist, and D1 rejected the Vercel AI SDK
outright. **Settle row 36 before the sheet is shared** - it is the one
cell where the sheet and the last status message disagree.

**Eight rows are `Done` on Sergey's ~19 Sep Slack status, not on a
ticket.** They are the A1/A2 history rows. Walking A2 with him row by row
is ten rows and five minutes, and would replace the weakest evidence in
the file.

## Still open from the round before

HOO-1615, HOO-1616 and HOO-1617 are still titled "Solana Wallet Adapter";
D40 records the customer naming ConnectorKit the day after they were
filed. Retitle, do not duplicate. The `Linear` column links them as they
stand.
