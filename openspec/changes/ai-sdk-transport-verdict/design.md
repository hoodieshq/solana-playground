# Design

## Context

See proposal.md, "Why". The assistant has two hand-written loops: the
chat-completions loop in `model/openai.ts`, which serves the default backend
through `api/agent.mjs` and every OpenAI-compatible provider, and the
Anthropic Tool Runner in `model/anthropic.ts`. Both share the tool registry
(`createTools` in `model/tools.ts`), the approval gate inside each tool's
`run`, and the stored thread shape settled in HOO-1737.

HOO-1753 rebuilt the `openai.ts` loop on `streamText` from `ai@7.0.138` with
`@ai-sdk/openai-compatible@3.0.68`, keeping the same registry, gate and store
calls, behind a query flag on a throwaway branch off `master-2.0` at
`73b9f506`. Nothing of it is pushed.

## Goals / Non-Goals

**Goals:**

- Answer three questions: does the SDK run in `client-v2` now; what it costs
  in tools, approvals and the stored transcript; what it gives against the C
  rail's needs.
- Leave a verdict the team can approve or overturn, with the evidence behind
  it.

**Non-Goals:**

- A live-model test through the SDK (no key on the probe machine; the fake
  upstream spoke the real wire format).
- `useChat`, UI messages and the SDK's own `needsApproval`, left out on
  purpose: they replace the panel's store and approval model rather than
  sitting under them.

## Evidence

| Question | Result | How |
| --- | --- | --- |
| Peer React | `@ai-sdk/react@4` accepts `^18 \|\| ^19.2.1`; we run 19.3.0 | `npm view` |
| Node-only core? | No. `engines.node >=22` is a tooling floor. Node built-ins are reached only through `process.getBuiltinModule` behind a Node-runtime check | read `dist/` of `ai`, `@ai-sdk/provider-utils` |
| Builds under CRA 5 | `Compiled successfully` | `craco build` |
| Types on TS 5.0.4 | `tsc --noEmit`: 0 errors, but only through `skipLibCheck`; SDK types that use `NoInfer` (TS 5.4) degrade to `any` | `yarn test-types` |
| Bundle | +205 KB gzip of JS (6.36 MB to 6.56 MB), all in the assistant chunk, which loads on boot | two production builds, per-file gzip |
| Tools unchanged | `tool({ inputSchema: jsonSchema(schema), execute: run })` | probe |
| Approval gate | `run` awaiting the click holds the SDK loop: no next request until Apply; Stop rejects the turn with no further request | unit tests; browser walk through `/api/agent` with a fake upstream (second request sent 15 s later, after Apply) |
| Transcript (HOO-1737) | Unchanged: the provider still writes through the store; a reloaded thread is identical | browser reload |
| Gemini quirks | `extra_content` echoed back; tool-call deltas without an index accepted | unit tests, mutation-checked |
| Mid-stream `{error}` frame | Surfaces as a thrown error | unit test |
| Retries | Default `maxRetries: 2` sends a 429 three times; a stream that drops mid-way is not retried | unit tests |
| Anthropic provider | `pause_turn` maps to `stop`, so a paused turn ends silently; the MCP connector uses the `mcp-client-2025-04-04` beta without `mcp_toolset`, where we use `mcp-client-2025-11-20` | read `@ai-sdk/anthropic@4.0.79` |

## Decisions

### Keep our own loops; do not adopt the `ai` SDK

The SDK runs in `client-v2` now: both reasons it was first rejected are gone.
It is rejected because it does not pay for itself.

- **It gives the C rail nothing.** Streaming, tool calls and the provider set
  already work. The cost gate (HOO-1751) and the session token (HOO-1788)
  belong in `api/agent.mjs`, which pipes the upstream's stream: a client
  library cannot enforce a cap, and the pipe can read per-turn usage from the
  upstream's `usage` chunk (`stream_options.include_usage`) without it.
- **Its default retries work against the cost gate.** The gate answers 429,
  and `maxRetries: 2` sends that request three times unless every call sets
  retries to 0.
- **The Anthropic path would regress.** `@ai-sdk/anthropic@4` treats
  `pause_turn` as an ordinary stop, which is exactly the cut-off answer
  `anthropic.ts` resumes today, and it drives the MCP connector on an older
  beta.
- **+205 KB gzip on boot**, because the assistant panel is the start page.
  `zod@4` comes with it.
- **It replaces working code for a like-for-like result.** Tools, approvals
  and the transcript survive only because the probe uses the core alone and
  keeps our store.

Alternatives considered:

- **Core only (`streamText`) under our store.** What the probe built. It
  works, and is what a migration would be; rejected for the reasons above.
- **The full SDK (`useChat`, UI messages, `needsApproval`).** Rejected
  without a probe: it replaces the stored thread shape HOO-1737 settled and
  the approval cards with the SDK's own.
- **SDK on the Anthropic path only.** Rejected: that is where the provider
  is weakest (`pause_turn`, the MCP beta).

### What carries over if the question is reopened

The registry maps onto `tool({ inputSchema: jsonSchema(schema), execute:
run })` unchanged, and the gate inside `run` holds the SDK's loop the same
way it holds ours. A future migration starts from there.

### Reopen when

Any of these becomes true:

- a provider needs a wire protocol neither loop speaks (Gemini native, the
  OpenAI Responses API) and the OpenAI-compatible shim no longer reaches it;
- the agent loop moves to a server, where the SDK runs on Node and its
  providers and per-turn usage pay for themselves;
- `@ai-sdk/anthropic` handles `pause_turn` and the current MCP connector
  beta.

## Risks / Trade-offs

- [Two loops to maintain instead of one abstraction] → They share the
  registry, gate and store; each new provider quirk so far has been a few
  lines in one loop.
- [The probe never ran a live model] → The fake upstream spoke the
  wire format of the default backend, including its error and Gemini frames;
  the decision does not rest on live behaviour, which a migration would have
  needed and this verdict does not.
