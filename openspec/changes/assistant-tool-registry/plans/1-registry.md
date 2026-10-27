# Plan: tasks 1.1, 2.1, 2.2 (one PR, HOO-1749)

Inline execution, TDD per step. Paths relative to `client-v2/src/`.

1. **Registry tests first** — `entities/agent-tools/model/registry.test.ts`:
   nine names in order (list_skills, load_skill, read_skill_reference,
   list_files, read_file, get_build_error, write_file, build, deploy), unique,
   non-empty descriptions, object schemas with `additionalProperties: false`;
   approval exactly on write_file/build/deploy; `DEFAULT_MCP_SERVERS` holds
   solana; catalogue ids playground-env, solana-dev, bundled source carries no
   content. `entities/agent-tools/server.test.ts` (`@vitest-environment node`):
   `server.mjs` exports are the same values as `index.ts`'s.
2. **Registry** — `model/registry.mjs` (JSDoc types, no imports), descriptions
   and schemas copied byte-for-byte from today's `tools.ts`/`skill-tools.ts`;
   `index.ts` re-exports with TS types; `server.mjs` re-exports.
3. **Panel parity tests** — in `views/sidebar/assistant/model/tools.test.ts`
   (unmocked skill tools for this block): built-in names == registry names;
   each description/schema equals its declaration; each `approval` tool, with
   a fake bridge and approval declined, requested approval and touched nothing.
4. **Panel binds runners** — `tools.ts`: `runners: Record<name, run>` and
   `BUILTIN_TOOLS.map(decl => ({...decl, run: runners[decl.name]}))`, throwing
   on a declared name without a runner; MCP tools stay between skill and
   project groups. `skill-tools.ts` the same for its three.
5. **Skills** — `grounding/registry.ts` maps `SKILL_CATALOGUE` adding bundled
   content by id; test for missing content.
6. `yarn run check`, then the sx gate.
