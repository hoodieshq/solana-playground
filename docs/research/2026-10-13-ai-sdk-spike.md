# ai SDK spike (HOO-1753)

**Date:** 2026-10-13 · **Verdict:** do not migrate (D62; under review in PR #70). HOO-1754 is cancelled once it is approved.

## What was probed

The default rail's loop (`openai.ts`) rebuilt on `streamText` from `ai@7.0.138` with
`@ai-sdk/openai-compatible@3.0.68`, and the same tool registry, approval gate and store
calls. It ran behind `?transport=ai-sdk` in a throwaway worktree on
`spike/hoo-1753-ai-sdk` (off `master-2.0` at `73b9f506`). The branch is not pushed, and none of it lands.
The Anthropic loop was not rebuilt; `@ai-sdk/anthropic` was read, not run.

## Evidence

| Question                   | Result                                                                                                                                           | How                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Peer React                 | `@ai-sdk/react@4` accepts `^18 \|\| ^19.2.1`; we run 19.3.0                                                                                      | `npm view`                                                                                                  |
| Node-only core?            | No. `engines.node >=22` is a tooling floor. Node built-ins are reached only through `process.getBuiltinModule` behind an `isNodeRuntime()` check | read `dist/` of `ai`, `provider-utils`                                                                      |
| Builds under CRA 5         | `Compiled successfully`                                                                                                                          | `craco build`                                                                                               |
| Types on TS 5.0.4          | `tsc --noEmit`: 0 errors, but only because of `skipLibCheck`; SDK types that use `NoInfer` (TS 5.4) degrade to `any`                             | `yarn test-types`                                                                                           |
| Bundle                     | +205 KB gzip of JS (6.36 → 6.56 MB), all in the assistant chunk, which loads on boot                                                             | two builds, per-file gzip                                                                                   |
| Tools unchanged            | `tool({ inputSchema: jsonSchema(schema), execute: run })`                                                                                        | probe                                                                                                       |
| Approval gate              | `run` awaiting the click holds the SDK loop; no next request until Apply; Stop rejects the turn with no further request                          | unit tests; browser walk through `/api/agent` with a fake upstream (second request 15 s later, after Apply) |
| Transcript (HOO-1737)      | Unchanged: the provider still writes through `PgAssistant`; restored thread identical                                                            | browser reload                                                                                              |
| Gemini quirks              | `extra_content` echoed back; indexless tool-call deltas taken                                                                                    | unit tests (mutation-checked)                                                                               |
| Mid-stream `{error}` frame | Surfaces as a thrown error                                                                                                                       | unit test                                                                                                   |
| Retries                    | Default `maxRetries: 2` sends a 429 three times; a mid-stream drop is not retried                                                                | unit tests                                                                                                  |
| Anthropic provider         | `pause_turn` maps to `stop` (turn cut off silently); MCP connector on `mcp-client-2025-04-04`, no `mcp_toolset` (we use `-2025-11-20`)           | read `@ai-sdk/anthropic@4.0.79`                                                                             |

## What it would give, against what the C rail needs

- **Streaming:** we already have it on both paths.
- **Providers:** one abstraction instead of two loops, plus native packages. We do not need a provider today that the OpenAI-compatible shim cannot reach.
- **Retries:** harmful as the default, because the cost gate answers 429. Network retries alone would be a small gain.
- **Usage:** `totalUsage` per turn on the client. The cost gate (HOO-1751) and the session token (HOO-1788) are enforced in `api/agent.mjs`, which pipes the upstream stream. Usage there comes from the upstream's `usage` chunk (`stream_options.include_usage`), with no SDK.

## Not tested

A live model through the SDK (no key on this machine; the fake upstream speaks the real wire format).
The Anthropic provider end to end. `useChat` and the SDK's own `needsApproval` were left out on purpose: they would replace the panel's store and approval model.
