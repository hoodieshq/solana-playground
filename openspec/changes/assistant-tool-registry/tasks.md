# Tasks

## 1. Registry slice

- [x] 1.1 ([plan](plans/1-registry.md)) Create `client-v2/src/entities/agent-tools/` with `model/registry.mjs` (nine tool declarations, skill catalogue without content, `DEFAULT_MCP_SERVERS`), `index.ts` and `server.mjs`; verify with unit tests for the declarations, the approval marks, the MCP defaults, and a Node-environment test that `server.mjs` exports equal `index.ts`'s (HOO-1749)

## 2. Panel reads the registry

- [x] 2.1 Bind runners to declared names in `views/sidebar/assistant/model/tools.ts` and `model/skill-tools.ts`; verify the parity test (same names, description and schema unchanged) and the gated-tools-decline test pass, and the existing `tools.test.ts` stays green (HOO-1749; depends on 1.1)
- [x] 2.2 Make `grounding/registry.ts` read the registry's catalogue and bind bundled content by id; verify a test that the panel's `SKILLS` equals the catalogue with content, and that a bundled entry without content fails (HOO-1749; depends on 1.1; may run alongside 2.1)

## 3. Integration

- [ ] 3.1 `yarn run check` passes in `client-v2/`, and the PR names the `server.mjs` exports the server rail and the gateway can import (HOO-1749; depends on 2.1, 2.2)
