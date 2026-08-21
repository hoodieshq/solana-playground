# Browser MCP over a same-origin rewrite

Design spec, 2026-08-21. Status: proposed, not started.

## Why

MCP works today only on the Anthropic backend, because the only thing that can
call an MCP server is Anthropic's connector (`decisions.md` → D12). Anthropic's
API has no free tier, so every MCP demo costs money and needs a key. Several
attempts to work around that — keyless Demo mode, a local model, reusing a
Claude Code login — all fail on the same two facts:

- `mcp.solana.com` sends no CORS headers (preflight 405), so the browser cannot
  call it. Measured 2026-08-20.
- Nothing else in the stack speaks MCP.

A same-origin path removes both. The browser talks to our own origin, CORS
never enters the picture, and MCP tools become ordinary `ToolDefinition`s that
every provider already knows how to drive — the same way skills already work
everywhere.

**But only one of the two servers needs it.** Read from
`solana-explorer/app/mcp/route.ts` on 2026-08-21: Explorer's endpoint sets
`Access-Control-Allow-Origin: *` and exposes `mcp-session-id` and
`mcp-protocol-version` through `Access-Control-Expose-Headers`. It is designed
to be called from a browser. So the work splits:

| Server | CORS | Needs the proxy? |
| --- | --- | --- |
| `explorer.solana.com/mcp` | `*`, session id exposed | **No** — direct from the browser |
| `mcp.solana.com/mcp` | none (preflight 405) | Yes |

Phase 1 is therefore the MCP client alone, with no infrastructure at all: it
unlocks Explorer on every provider, Gemini's free tier included. Phase 2 adds
the proxy purely to reach `mcp.solana.com` and its `program_autofixer`.

Three details taken from Explorer's implementation, all of which apply to us:

- **The bypass must stay in the query string, even for direct browser calls.**
  Explorer's `Access-Control-Allow-Headers` is
  `Authorization, Content-Type, mcp-session-id, mcp-protocol-version,
  Last-Event-ID` — `x-vercel-protection-bypass` is not on it, so sending it as
  a request header fails preflight. The `queryParams` we already ship is the
  correct mechanism, not a workaround.
- **`Authorization` is allowed**, and Explorer gates on `MCP_ACCESS_KEYS` when
  set. The entry's `authToken` covers that, and may be needed in addition to
  the bypass.
- **The endpoint is inert (`503`) unless `MCP_ENDPOINT_ENABLED`.** The `200` we
  measured means production has it on — worth re-checking rather than assuming
  permanence.

**What this buys:** MCP on Gemini's free tier, `program_autofixer` with no
Anthropic key, a keyless tool console, and custom headers (which the connector
cannot carry at all).

## Shape

The client stays exactly what it is — a CRA/craco static bundle. The function
is a second, independent artifact in the same Vercel project: Vercel serves
`outputDirectory` as static files and `api/` as serverless functions, and
neither build touches the other. `framework: null` does not prevent this;
functions are detected from the directory.

```
                    ┌─ static bundle (craco build → build/)
Vercel project ─────┤
                    └─ client-v2/api/mcp.ts  ──(MCP client, server-side)──▶ mcp.solana.com

browser ──────────────────────────────────────(direct, CORS is fine)──────▶ explorer.solana.com/mcp
```

Phase 1 needs none of the function. Phase 2 adds it only for the server that
refuses browser calls.

## Work — phase 1, no infrastructure

**`grounding/mcp-client.ts`** (new, ~150 lines) — Streamable HTTP against a URL:
`initialize`, keep `Mcp-Session-Id`, send `notifications/initialized`, then
`tools/list` and `tools/call`. Responses arrive as either `application/json` or
a one-event SSE stream, so both need parsing. A failed `fetch` must be reported
as "the browser blocked this (CORS)" distinctly from an error the server
returned — that distinction is what tells a user which server they are dealing
with.

**`model/mcp-tools.ts`** (new) — a cached `tools/list` becomes
`ToolDefinition[]`, names prefixed with the server id so two servers cannot
collide.

**`model/tools.ts`** — merge them, exactly like `createSkillTools()`.

**`Component/Grounding.tsx`** — a console per server: connect, list tools, pick
one, edit JSON arguments, call, read the result. The keyless path, and the
diagnostic when something is wrong.

## Work — phase 2, the gateway

**`client-v2/api/mcp.ts`** — a Node serverless function holding a real MCP
client (`@modelcontextprotocol/sdk`), exposing plain JSON to the browser:

```
POST /api/mcp   { server, method: "tools/list" | "tools/call", name?, args? }
             →  { tools } | { content, isError }
```

Stateless, a fresh client per request — the same property Explorer's own
handler documents as what makes it serverless-safe. SSE terminates inside the
function; the browser only ever sees a JSON body, which removes the streaming
question entirely.

**Upstreams are configured on the server and nowhere else.** No URL, host or
credential is ever accepted from a caller. That is a deliberate exclusion, not
an omission: a gateway that dials a client-supplied address is an SSRF and an
open relay, and defending it properly needs DNS-resolution checks, private-range
blocks, per-caller keys and rate limits. Refusing the input removes the entire
class. Adding an upstream is a deploy.

### Which server goes where, and why Explorer does not

| Upstream | Path | Reason |
| --- | --- | --- |
| `mcp.solana.com` | gateway | No CORS, so the browser cannot reach it. Public and unauthenticated, so fronting it circumvents nothing. |
| `explorer.solana.com` | browser-direct | CORS already works. Its bot protection is deliberate, and the bypass belongs to the user. |

Explorer stays off the gateway on purpose. Putting it behind our function with
*our* bypass secret would turn our deployment into a public way around bot
protection that the Foundation chose to switch on — for anyone who finds the
endpoint, not just our users. Leaving it browser-direct keeps the bypass in the
hands of whoever legitimately holds one. If Explorer ever has to move behind
the gateway, per-caller access keys stop being optional and become the entry
condition.

The SDK dependency goes in `client-v2/package.json` but never enters the
bundle — nothing under `src/` imports it.

The SDK dependency goes in `client-v2/package.json` but never enters the
bundle — nothing under `src/` imports it.

**Routing note.** Vercel matches the filesystem, including functions, before
`rewrites`, so the existing SPA catch-all (`/((?!static/|.*\..*).*)` →
`/index.html`) does not swallow `/api/mcp`. Worth confirming on a preview
rather than trusting it. If bot protection turns out to match `/api/*` on our
domain, Explorer's own workaround applies — they put their endpoint at `/mcp`
precisely "to escape the BotID proxy matcher" — and we would expose the
function under a different public path via a rewrite.

**`client-v2/craco.config.js`** — a devServer proxy so the same path works
locally, in the existing `devServer` hook that currently only sets COOP/COEP.

**`grounding/registry.ts`** — each server gains an optional `proxyPath`. Its
absence means "call this one directly", which is Explorer.

**`model/mcp-tools.ts`** (new) — turn a cached `tools/list` into
`ToolDefinition[]`, names prefixed with the server id to avoid collisions
between servers. Each `run` calls `tools/call` and returns the text content.

**`model/tools.ts`** — merge them, exactly like `createSkillTools()`.

**`Component/Grounding.tsx`** — a console per server: connect, list tools,
pick one, edit JSON arguments, call, read the raw result. This is the keyless
path and doubles as the diagnostic when something is wrong.

## Two design decisions worth stating

**Anthropic keeps the connector; everyone else uses the browser client.** On
Anthropic the connector is strictly better — no proxy hop, no extra round trip,
and MCP calls resolve server-side. The browser client is what gives every other
provider MCP at all.

That means the merge in `tools.ts` is **conditional**: if the connector is
already declaring a server, its tools must not also be merged locally, or the
model sees two tools with the same name. The provider knows which mode it is
in; the merge has to ask.

**Tool discovery is async, and `createTools()` is not.** `createTools()` is
called synchronously when a provider is constructed. `tools/list` is a network
round trip. So the tool lists have to be fetched into the store — on Apply in
the Sources tab, and on connect — and `createTools()` reads the cached result
synchronously. A server that has not been listed yet contributes nothing that
turn rather than blocking it.

## Risks, in the order they will bite

1. **Explorer's CORS is read from source, not measured.**
   `Access-Control-Allow-Origin: *` is what `route.ts` sets today; the deployed
   build could differ, and the endpoint is env-gated (`MCP_ENDPOINT_ENABLED`,
   `MCP_ACCESS_KEYS`) so it can change without notice. One `fetch` from the
   browser console with the bypass confirms it, and phase 1 is worthless if it
   fails. Do that first.
2. **The function is code we run.** Not a rewrite rule — a deployed artifact
   with cold starts, an execution ceiling, and a dependency to keep current.
   `get_documentation` can return 200 KB and take real time; Explorer sets
   `maxDuration = 60` for its own handler, and we should expect to need
   something similar rather than the default.
3. **The bypass cannot move out of the URL for direct calls.** Explorer's
   `Access-Control-Allow-Headers` does not list `x-vercel-protection-bypass`,
   so sending it as a request header fails preflight. It stays in the query
   string on the phase-1 path, with the exposure that implies — it reaches the
   server in the request line. Only the phase-2 function could carry it as a
   header, and only for servers routed through it.
4. **Someone else's capacity under our domain.** Phase-2 traffic to
   `mcp.solana.com` arrives from our deployment rather than from users. It is
   public and unauthenticated, so this is a courtesy issue rather than a
   security one, but a runaway loop would carry our name. Copy Explorer's
   `MCP_ENDPOINT_ENABLED` switch so it can be turned off without a code change,
   and add a rate limit before it is public.
5. **Extra round trips on the non-Anthropic path.** Every MCP call becomes
   tool_use → browser → tool_result, where the connector resolves it
   server-side. More latency and more tokens per call. Acceptable, since the
   alternative on those providers is no MCP at all.

## Verification

- **Gate 0, before any code:** one `fetch` from the browser console to
  `explorer.solana.com/mcp` with the bypass in the query string. Confirms the
  CORS headers read from source are what production actually serves. Phase 1
  depends entirely on this.
- Phase 1, no backend connected at all: the console lists Explorer's tools and
  calls `inspect_entity` — no key, no model, no tokens.
- Phase 1 on Gemini: an AI Studio key, and a question that needs an on-chain
  lookup produces MCP chips on a provider that has never had them.
- Phase 2 on a preview deployment: `tools/list` against `mcp.solana.com`
  through the function. The only way to learn whether the function path works
  in production.
- Console: call `program_autofixer` on a broken `lib.rs` with no backend
  connected at all — no key, no model, no tokens.
- Gemini: connect with an AI Studio key and ask a question that needs the docs
  search; expect MCP chips on a provider that has never had them.
- Anthropic: unchanged. Same connector path, no duplicate tools.
- Explorer: same as the console check, with the bypass moved into a header.

## Not in scope

**Client-supplied upstreams.** Considered and dropped: letting a caller name
the host it wants reached is an SSRF and an open relay, and the machinery to
make it safe — DNS-resolution checks, private-range blocks, per-caller access
keys, rate limits, and an encrypted config blob to carry credentials past
Anthropic's connector, which can only pass a URL and a bearer token — costs
more than the feature is worth here. Pre-configured upstreams give the same
grounding with none of it. Revisit only with the access-key layer in place.

Also out: OAuth flows to third-party MCP servers, and exposing our gateway as a
public MCP server for other people's clients.
