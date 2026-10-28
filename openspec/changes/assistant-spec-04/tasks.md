# Tasks

All tasks are HOO-2387 and land in one PR; plan: [plans/1-spec-04.md](plans/1-spec-04.md). 4.1 depends on 1–3.

## 1. Undo patch

- [x] 1.1 `PgPatchUndo` (record, `can`, `undo`), `undone` on an approval, `deleteFile` on the bridge, `write_file` records the patch; unit tests for edit, create, edited-after, restored card
- [x] 1.2 The card shows "Undo patch" (44 px on a phone) and "Undone"; `assistant_patch_undone`; component tests

## 2. Turn states

- [x] 2.1 Thinking with seconds, announced once, still under reduced motion; BaseThread tests
- [x] 2.2 A reply's `state`, cut off by a network error or a reload, Escape stops, Try again on the last stopped notice or cut-off reply; `assistant_reply_retried`, `assistant_reply_failed`; store, use-turn and thread tests

## 3. Composer

- [x] 3.1 Chip accessible names; the open-file chip's remove button and a turn without the open file (`Provider.send` context, `describeProject`); `assistant_file_chip_removed`; 44 px phone targets; tests
- [x] 3.2 The + menu (Sources and tools, Connect a model… / Connection and key…), the same pair in More, `via: "add"`; tests
- [x] 3.3 Focus in the composer after a placed prompt, including on mount and from Sources; tests

## 4. Integration

- [ ] 4.1 e2e for the scenarios of the three delta specs a browser can reach (Undo patch, Try again after Stop, the + menu), and before/after screenshots on desktop and phone
