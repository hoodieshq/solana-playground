# Proposal

## Why

On Interact, Call history sits under the instruction form. A program with many
instructions pushes it below the fold, and the person loses the calls they just
made. On the demo-build review call of 30 Oct 2026 Sergey Prokhorov asked to
move it into a right-hand column beside the form; Accounts stay at the bottom
(HOO-2491).

## What Changes

- The `ready` surface of Interact lays out in two columns when the stage is
  wide enough: instruction chips, the form and the last result on the left,
  Call history on the right.
- The width test is a container query on the stage (at least 40rem), not the
  viewport: the chat and Files panels change how wide the stage is.
- The history column keeps a fixed 18rem width and stays in view (sticky)
  while a long form scrolls.
- In the wide layout, an empty history shows its heading and "Calls you send
  show up here.", so the form does not change width after the first call.
- Accounts and Events stay below both columns, full width.
- Narrower stages keep today's single column.

## Impact

- `client-v2/src/views/flow/stages/InteractBody.tsx`,
  `BaseCallHistory.tsx` and their tests.
- Spec `client-v2-interact`: one added requirement.
- No change to calls, results, storage or the toolbar.
- Spec 03 of the designers says the history sits "under the instruction list";
  the conflict goes to Design alignment.
