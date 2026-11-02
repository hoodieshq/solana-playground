# Slack: merge the file-tree column into the project column (2026-11-02)

## Source
Slack, Almaz Zaripov, Sergey Prokhorov, Slava Koreshkov; passed on by Slava 2026-11-02 19:19. Raw: `.claude/intake/raw/2026-11-02-slack-almaz-file-tree-column.md`.

## Decided
- A ticket is filed for removing the third column (file structure) by merging it into the project column; the design is DES-205 "Editor: hide and show the file tree from the editor head" (Almaz). Slava, 2 Nov.
- Priority: the very end of the queue, at the polish stage. If it fits, good; if not, it ships after Breakpoint. Slava, 2 Nov 19:20 (Sergey had said: last task, after the interface is finished).

## Requirements changed
None yet.

## Facts learned
- Almaz finds the third column (file structure) hard to understand; the client mentioned it in the tutorial context. He proposes dropping it on other screens too.
- Sergey's idea: merge it with the first column, where projects are listed: a project expands into its file tree, like workspaces in an IDE.
- Almaz already designed it inside DES-203 and then split it into DES-205, which has a description and a live Before/After example.
- Sergey cannot say whether it fits before Breakpoint.

## Open questions
- Whether it fits before Breakpoint (Sergey: unknown; Slava: it is polish-stage, after Breakpoint if not).

## Actions
- Create the ticket, design from DES-205, polish-stage priority, end of the queue -> Lead, pending.
- Place it at the end of the plan, polish stage -> planner, pending.
