# Tasks

## 1. Context from open tabs plus "Add a file" (HOO-2424, one PR)

Plan: [plans/1-context-from-tabs.md](plans/1-context-from-tabs.md)

- [x] 1.1 `entities/assistant-context`: the added/removed store per workspace and `contextPaths`, with in-source tests
- [x] 1.2 Bridge and prompt: `listContextFiles`, `ProjectContext.contextFiles`; `describeProject` sends the context in full and no other path; `TurnContext` removed (depends on 1.1)
- [x] 1.3 Tools and registry: `read_file` refuses outside the context, `list_files` removed, descriptions and the behaviour prompt updated (depends on 1.2)
- [x] 1.4 Composer: a chip per context file with "Remove <file> from the context", "Add a file" submenu in the + menu, `use-turn`'s left-out state removed; `assistant_context_file_added` declared and sent, `assistant_file_chip_removed` re-described; tests through the memory provider (depends on 1.1)
- [x] 1.5 e2e: "Only the context reaches the model", "Remove an open tab from the context", "Add a file that is not open" (depends on 1.2–1.4)
- [x] 1.6 `docs/assistant-context.md` updated and synced into the in-product copy
