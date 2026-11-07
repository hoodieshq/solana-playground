# Tasks

Plan: [plans/1-settings-section.md](plans/1-settings-section.md). One PR,
HOO-2710.

## 1. Settings section

- [x] 1.1 Grounding's ids unique per view, and an `embedded` layout for a
      settings card; the Assistant section of Settings renders it in a
      "Skills and MCP servers" card and calls `PgAssistant.initMcp` on open;
      unit test pins the shared state (HOO-2710)
