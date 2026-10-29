# Tasks

All tasks are HOO-2387 and land in one PR; 4.1 depends on 1–3. Scenarios marked `(manual)` are pinned by unit and component tests; the three without the mark are e2e tests of the same title.

## 1. Undo patch

- [x] 1.1 `PgPatchUndo` (record, `can`, `undo`), `undone` on an approval, `deleteFile` on the bridge, `write_file` records the patch; unit tests for edit, create, edited-after, restored card ([plan, Task 1](plans/1-spec-04.md#task-1-undo-patch-tasks-11-12))
- [x] 1.2 The card shows "Undo patch" (44 px on a phone) and "Undone"; `assistant_patch_undone`; component tests ([plan, Task 1](plans/1-spec-04.md#task-1-undo-patch-tasks-11-12))

## 2. Turn states

- [x] 2.1 Thinking with seconds, announced once, still under reduced motion; BaseThread tests ([plan, Task 2](plans/1-spec-04.md#task-2-turn-states-tasks-21-22))
- [x] 2.2 A reply's `state`, cut off by a network error or a reload, Escape stops, Try again on the last stopped notice or cut-off reply; `assistant_reply_retried`, `assistant_reply_failed`; store, use-turn and thread tests ([plan, Task 2](plans/1-spec-04.md#task-2-turn-states-tasks-21-22))

## 3. Composer

- [x] 3.1 Chip accessible names; the open-file chip's remove button and a turn without the open file (`Provider.send` context, `describeProject`); `assistant_file_chip_removed`; 44 px phone targets; tests ([plan, Task 3](plans/1-spec-04.md#task-3-composer-tasks-3133))
- [x] 3.2 The + menu (Sources and tools, Connect a model… / Connection and key…), the same pair in More, `via: "add"`; tests ([plan, Task 3](plans/1-spec-04.md#task-3-composer-tasks-3133))
- [x] 3.3 Focus in the composer after a placed prompt, including on mount and from Sources; tests ([plan, Task 3](plans/1-spec-04.md#task-3-composer-tasks-3133))

## 4. Integration

- [x] 4.1 e2e for the scenarios of the three delta specs a browser can reach (Undo patch, Try again after Stop, the + menu), and before/after screenshots on desktop and phone ([plan, Task 4](plans/1-spec-04.md#task-4-integration-task-41))
