# Tasks

One PR, HOO-2508, into `scope/interface-2`.

## 1. Editor head with Files and Terminal (HOO-2508)

Plan: [plans/1-editor-head.md](plans/1-editor-head.md)

- [x] 1.1 `BaseEditorHead` and the head-host store in `widgets/layout-shell`; the shell draws the head between the stage tabs and the files/center group and hands it the files and console state; verify with a `BaseEditorHead` test (both toggles' `aria-pressed`, clicks call their toggles) and a `BaseLayoutShell` case that the head is present from 768 px and absent on a phone
- [x] 1.2 `components/Tabs` renders into the head's host when one exists, in place otherwise; the row is hidden off the Write stage; verify with a `LayoutShell`/Tabs test that `#tabs` sits inside `#editor-head`, and the spec's "The head on another stage"
- [x] 1.3 Remove the stage bar's files toggle and `LeftPanel`'s head and Hide button; ⌘E and "Show files" still open the column; verify with updated `BaseStageBar.test.tsx`, `LeftPanel.test.tsx` and `LayoutShell.test.tsx` cases (depends on 1.1)
- [x] 1.4 `DEFAULT_LAYOUT` opens with the files column closed; verify with the `use-layout-state` / `layout-state` cases for a first visit and for a saved open column
- [x] 1.5 e2e: the spec's scenarios as `client-v2-editor-head: <name>` tests, and `left-panel-toggle`, `client-v2-layout` and `files` specs moved from "Expand project panel" / "Hide files" to the head's "Files" (depends on 1.1 to 1.4)
- [ ] 1.6 Before/after screenshots at 1440: tree closed, tree open, in a lesson; compared with DES-205's Before/After; report the superseded `ui-migration` layout sentences (design.md, Context) to Lead
