# HOO-1753 ai SDK probe (evidence for PR #70, not for merging)

The default backend's loop (`model/openai.ts`) rebuilt on `streamText` from
`ai@7.0.138` with `@ai-sdk/openai-compatible@3.0.68`, behind
`?transport=ai-sdk`. Off `master-2.0` at `73b9f506`, probed 2026-10-13.

- `src/views/sidebar/assistant/model/ai-sdk.ts`: the probe provider.
- `src/views/sidebar/assistant/model/ai-sdk.test.ts`: 9 unit tests (approval
  holds the loop, Stop during approval, mid-stream `{error}`, Gemini
  `extra_content`, indexless tool-call deltas, retries on 429).
- `spike-hoo-1753/fake-upstream.mjs`: the OpenAI-compatible upstream the
  browser walk ran against (`/api/agent` pointed at it).

## Bundle

Production build (`craco build`, both "Compiled successfully"), gzip of each
file under `build/static/js`, summed:

| Build | JS gzip (bytes) |
| --- | --- |
| `master-2.0` at `73b9f506` | 6,379,681 |
| this probe | 6,584,937 |
| delta | +205,256 |

The delta lands in the assistant chunk. `zod` 4 was already in `yarn.lock`
through other packages, so it is not part of the cost.

## Run

Node 22, then from `client-v2/`:

```sh
npx vitest run src/views/sidebar/assistant/model/ai-sdk.test.ts
```
