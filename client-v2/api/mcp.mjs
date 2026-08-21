/**
 * MCP gateway.
 *
 * Reaches MCP servers a page cannot: `mcp.solana.com` sends no CORS headers,
 * so the browser is refused, while this runs server-side where CORS does not
 * apply. Speaks MCP in and MCP out — the JSON-RPC envelope is forwarded
 * verbatim — so the browser client needs a different URL and nothing else.
 *
 * `?server[]=solana&server[]=explorer` selects upstreams; omitting it selects
 * every configured one. With a single upstream the call is a pass-through.
 * With several, `tools/list` is merged with `<id>__` prefixes and `tools/call`
 * routes on that prefix, so the caller sees one MCP server.
 *
 * Upstreams are configured here and never taken from the request. A gateway
 * that dials a caller-supplied host is an SSRF and an open relay; refusing the
 * input removes the whole class. Adding one is a deploy.
 *
 * Plain ESM on raw Node request/response APIs — see `api/health.mjs` for why.
 */

const PROTOCOL_VERSION = "2025-06-18";

/** Separates upstream id from tool name when several are selected */
const SEPARATOR = "__";

/**
 * Configured upstreams.
 *
 * Explorer is present only when a bypass is supplied through the environment.
 * It is deliberately not enabled by default: its endpoint sits behind bot
 * protection its owners chose to switch on, and fronting it with a secret of
 * ours would offer anyone who finds this endpoint a way around that. Left
 * unset, Explorer stays a browser-direct server using the user's own bypass.
 */
const upstreams = () => {
  const configured = {
    solana: { url: "https://mcp.solana.com/mcp" },
  };

  const bypass = process.env.MCP_EXPLORER_BYPASS;
  if (bypass) {
    configured.explorer = {
      url: "https://explorer.solana.com/mcp",
      queryParams: { "x-vercel-protection-bypass": bypass },
      // Explorer gates on MCP_ACCESS_KEYS when its deployment sets them
      authToken: process.env.MCP_EXPLORER_TOKEN,
    };
  }

  return configured;
};

const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
};

const rpcError = (res, id, code, message) =>
  sendJson(res, 200, {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  });

/** Read the request body, whether the platform pre-parsed it or not */
const readJson = async (req) => {
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

/** Which upstreams this request is for, defaulting to all of them */
const selected = (url, configured) => {
  // Accepts `server[]=x` and `server=x`, repeated
  const asked = [
    ...url.searchParams.getAll("server[]"),
    ...url.searchParams.getAll("server"),
  ];
  if (!asked.length) return Object.keys(configured);

  const unknown = asked.filter((id) => !configured[id]);
  if (unknown.length) {
    throw new Error(
      `Unknown server: ${unknown.join(", ")}. Configured: ${
        Object.keys(configured).join(", ") || "none"
      }`
    );
  }
  return asked;
};

/**
 * One JSON-RPC round trip to an upstream.
 *
 * Streamable HTTP answers with JSON or a one-event SSE stream, so both are
 * unwrapped here and the caller only ever sees JSON.
 */
const call = async (upstream, payload) => {
  const url = new URL(upstream.url);
  for (const [key, value] of Object.entries(upstream.queryParams ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.href, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": PROTOCOL_VERSION,
      ...(upstream.authToken
        ? { authorization: `Bearer ${upstream.authToken}` }
        : {}),
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}: ${text.slice(0, 200)}`
    );
  }

  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    return JSON.parse(text);
  }
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("data:")) return JSON.parse(line.slice(5).trim());
  }
  throw new Error("Upstream sent an event stream with no data.");
};

/** `initialize` is answered here: there is no single upstream to forward it to */
const initialize = (id, ids) => ({
  jsonrpc: "2.0",
  id,
  result: {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: "solana-playground-gateway", version: "0.1.0" },
    instructions:
      `Tools proxied from: ${ids.join(", ")}.` +
      (ids.length > 1
        ? ` Names are prefixed with the upstream id and "${SEPARATOR}".`
        : ""),
  },
});

/** Merge every selected upstream's tools, prefixing only when disambiguation is needed */
const listTools = async (id, ids, configured) => {
  const prefix = ids.length > 1;
  const lists = await Promise.all(
    ids.map(async (serverId) => {
      const payload = await call(configured[serverId], {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      });
      const tools = payload.result?.tools ?? [];
      return prefix
        ? tools.map((tool) => ({
            ...tool,
            name: `${serverId}${SEPARATOR}${tool.name}`,
          }))
        : tools;
    })
  );

  return { jsonrpc: "2.0", id, result: { tools: lists.flat() } };
};

/** Route a call by its name prefix when several upstreams are in play */
const callTool = async (id, ids, configured, params) => {
  let serverId = ids[0];
  let name = params?.name;

  if (ids.length > 1) {
    const at = String(name ?? "").indexOf(SEPARATOR);
    if (at < 0)
      throw new Error(`Tool name must be prefixed with an upstream id`);
    serverId = String(name).slice(0, at);
    name = String(name).slice(at + SEPARATOR.length);
    if (!ids.includes(serverId))
      throw new Error(`Unknown upstream "${serverId}"`);
  }

  const payload = await call(configured[serverId], {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { ...params, name },
  });

  return { ...payload, id };
};

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return sendJson(res, 405, { error: "Use POST with a JSON-RPC body." });
  }

  const configured = upstreams();
  const url = new URL(req.url ?? "/", "http://localhost");

  let body;
  let ids;
  try {
    body = await readJson(req);
    ids = selected(url, configured);
  } catch (e) {
    return sendJson(res, 400, { error: e.message });
  }

  const { id, method, params } = body;

  // A notification carries no id and expects no response body
  if (typeof method === "string" && method.startsWith("notifications/")) {
    res.statusCode = 202;
    return res.end();
  }

  try {
    switch (method) {
      case "initialize":
        return sendJson(res, 200, initialize(id, ids));
      case "tools/list":
        return sendJson(res, 200, await listTools(id, ids, configured));
      case "tools/call":
        return sendJson(res, 200, await callTool(id, ids, configured, params));
      default:
        return rpcError(res, id, -32601, `Method not supported: ${method}`);
    }
  } catch (e) {
    // An upstream failure is the model's business, not a transport error
    return rpcError(res, id, -32603, e.message);
  }
}
