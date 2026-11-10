/* The project shell's entry for the rest of Oak (New project's landing among them). See
   research/program-redesign/BRIEF.md, "Shared with the New project redesign".
   - openProject(o) lands in the shell and emits "project:open" with `o`.
   - The Build control carries data-oak="build"; a TS client project's Run carries data-oak="run". */

export { onProjectsEvent, openProject, type Framework, type OpenProject, type Source } from "./store"
