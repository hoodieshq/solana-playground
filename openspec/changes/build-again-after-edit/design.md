## Decisions

**Compare content, not edit events.** The baseline is the text of the files a
build sends (non-empty files under `src/`), taken when the build starts, so an
edit made during the build counts. Paths are left out, so a rename alone is no
change, and an edit undone back to the built text is no change either. A
"dirty" flag set per edit gets both wrong.

**Only a success moves the baseline.** A stopped or failed build leaves it, so
a stopped rebuild returns to the surface it left, with the same answer.

**The baseline follows its workspace by name**, as `ownOutput` does for the
report. Sync re-opens a workspace after a merge, which resets the flow; the
check runs again after the reset, so the other device's edit still reads as a
change. Another workspace has no baseline.

**In memory only.** Everything read is `PgExplorer.files`; nothing touches the
filesystem on a save.

**Deploy stays open.** Almaz's sentence makes Build again the main button and
locks nothing. Spec 01's lock (TUT-R03) belongs to the tutorial, not to this
general surface, and tutorial behaviour does not change here. The stepped-down
button is outline, the weight Build again has without a change. The line takes
Spec 01's first sentence; "to deploy" would be false with Deploy open, so it
ends "before you deploy".
