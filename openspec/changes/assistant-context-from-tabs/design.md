# Design

## Context

See proposal.md, Why. Today three places decide what the model sees, and none of them limits it:

- `describeProject` (`views/sidebar/assistant/model/prompt.ts`) sends every path, the open tabs' names and the active tab in full, unless `TurnContext.openFile` is `false`.
- `list_files` and `read_file` (`model/tools.ts`) reach every file through `PlaygroundBridge`.
- The composer's chips (`widgets/assistant/ui/AssistantComposer.tsx`) mirror that, and `use-turn` holds the one-message "left out" path.

Tools run in the tab for every backend, the default one included (`api/agent.mjs` only proxies the model call), so a limit placed in the tab covers them all.

## Goals / Non-Goals

**Goals:**
- One source of truth for "the context", read by the prompt, by `read_file` and by the chips, so the three cannot disagree.
- The rule is enforced in the tool, not only by telling the model.

**Non-Goals:**
- Selections or line ranges as context.
- A persisted context. Reload starts from the open tabs, which the workspace already persists.

## Decisions

**A new entity slice, `entities/assistant-context`.** It holds the two sets the person chose (`added`, `removed`), keyed by the workspace they were chosen in, and derives the context with a pure function `contextPaths(tabs, choice, exists)`: tabs in tab order, then added files in the order they were added, minus removed, minus files that no longer exist. The slice is an entity because it is a domain object that the widget, the bridge and the tools all read. The alternative was a `use-turn` state, as the old "left out" flag was, but the tools and the prompt run outside React and need to read it. The slice has no telemetry of its own. The widget sends the events.

**Workspace scoping by name, reset on switch.** The store remembers the workspace name it was filled in and clears on `PgExplorer.onDidSwitchWorkspace`, and also when it is read under another name, which covers a rename racing the event. Clearing on a switch matches "resets with the project" without persisting anything.

**The bridge exposes the context, the prompt sends it.** `PlaygroundBridge` gains `listContextFiles()`. `ProjectContext` replaces `filePaths`, `openFilePaths` and `currentFileContent` with `contextFiles: { path, content }[]` and keeps `currentFilePath` to say which tab is active. `TurnContext` and its `openFile` flag are removed, together with `openFileLeftOut` and `leaveOutOpenFile` in `use-turn`. The removal is now the context store's job, and it outlasts a message.

**`read_file` checks the context, `list_files` goes.** The check normalises the model's path through the bridge (`toRelative`), so `/src/lib.rs` and `src/lib.rs` are the same file. The refusal is one exported string builder, so the test and the tool cannot drift apart. `write_file` still reads `before` locally for the approval card. Only "already contains exactly that content" reaches the model, a one-bit answer about a file the model has just proposed in full, which is accepted.

**Chips.** One chip per context file: label is the file's name, title is the relative path, accessible name is "Sent with this message: <name>, in full", and the remove button reads "Remove <name> from the context". The lesson, build-error and IDL chips stay as they are. The "N files" and "N open" chips go, because what they described is no longer sent.

**"Add a file" is a `DropdownMenuSub`** of the installed design-system dropdown, listing the files outside the context by relative path. A searchable picker for large projects waits on the designers (DES-196). Projects in the playground are tens of files, so a list is enough for now.

## Risks / Trade-offs

- [The model asks for files more often] → The behaviour prompt says how: name the file and ask the person to add it with +. The refusal text says the same.
- [Many open tabs make big requests] → They were opened by the person, and each chip can be removed. The old cost was the same for the active tab.
- [Lessons expect the model to read lesson files] → A lesson opens its files as tabs, so they are in the context.

## Migration Plan

Nothing is stored, so there is nothing to migrate. Rollback is a revert.
