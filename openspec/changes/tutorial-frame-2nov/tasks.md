# Tasks

Ticket: HOO-2548. One PR lands all tasks; base `scope/tutorial-flow`.

## 1. Frame

- [ ] 1.1 In the frame, the workspace shows the editor alone: no stage tabs,
      no stage area, no Steps/Files column; the shell stops holding the
      files column open there. Verify: the shell's frame tests; "Deploy step
      in the frame" and "An ordinary project keeps its stages" by hand at
      1440

## 2. Step head and divider

- [ ] 2.1 `BaseStepBar` as one trigger over four segments; `BaseFeed` drops
      the narrow split; segments light whole per step. Verify:
      `BaseStepBar.test.tsx` and the "Jumping back from step 3" component
      test
- [ ] 2.2 `BaseStepDivider` as the step's heading alone, 24/28; the jump
      lands 22 px under the feed's top. Verify: component test for the
      divider's text

## 3. Reading scale

- [ ] 3.1 `ui/type.ts` and the ringed chip in `Prose`; the scale in Say,
      intro, question, wrote, win, finish and you cards; the feed's rhythm
      and the waiting cards' 8 px. Verify: screenshots against the reference
      at 1440
- [ ] 3.2 Wrote card ends on "⋯ N more lines", heads with the path alone.
      Verify: component test for the thirteen-line write
- [ ] 3.3 Reduced motion fades new turns in. Verify: component test for the
      class under reduced motion

## 4. Shortcuts and copy

- [ ] 4.1 Grouped shortcuts dialog. Verify: component test for the three
      groups in order
- [ ] 4.2 Hello Anchor's headlines without closing periods. Verify:
      `yarn tutorial:check`

## 5. Spec pin

- [ ] 5.1 Re-pin `tutorial-flow-v2` proposal and design to `f7d42bf2e`, with
      the line that the 31 Oct type scale and step head supersede
      `fb4b8e9ee`. Verify: `yarn spec:validate`
