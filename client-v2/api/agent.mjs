/**
 * Default backend rail.
 *
 * Speaks chat-completions in and out, so the panel's existing provider loop
 * reaches it by URL alone and needs no protocol of its own. The upstream, its
 * key and the model are configured here from the environment and never taken
 * from the request — same rule as `api/mcp.mjs`, and for the same reason.
 *
 * What runs behind it is a deploy-time choice: a hosted model today, an agent
 * service later. The wire shape is the contract; nothing else is promised.
 *
 * **This is not a cost gate.** Anything that can reach our origin can spend the
 * configured key. A challenge and a per-session limit belong in front of this
 * before it is pointed at a paid account.
 *
 * Plain ESM on raw Node request/response APIs — see `api/health.mjs` for why.
 */

/** Request fields forwarded upstream; everything else is the server's to decide */
const FORWARDED = ["messages", "tools", "tool_choice"];

/** An operator's kill switch: off even when the rail is fully configured */
const enabled = () =>
  !/^(false|0|off|no)$/i.test(process.env.AGENT_ENABLED ?? "");

/**
 * The configured upstream, or `null` when this deployment has none.
 *
 * Absent by default: with nothing set the panel simply reports the default
 * backend as unavailable, which is what a fork with no key of its own wants.
 *
 * `AGENT_BASE_URL` is a base, not a full path -- the same shape the panel's
 * OpenAI-compatible provider takes, so one endpoint is configured identically
 * whether it is reached through here or entered by hand.
 */
const upstream = () => {
  const configured = process.env.AGENT_BASE_URL?.trim();
  const model = process.env.AGENT_MODEL;
  if (!enabled() || !configured || !model) return null;

  // Tolerate a pasted full endpoint: provider docs quote the completions path,
  // the panel's own field wants the base, and both mean the same deployment
  const baseUrl = configured
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/, "");

  return {
    url: `${baseUrl}/chat/completions`,
    model,
    apiKey: process.env.AGENT_API_KEY ?? "",
  };
};

const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
};

/** Read the request body, whether the platform pre-parsed it or not */
const readJson = async (req) => {
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

/** Copy the upstream's event stream to the client until either end stops */
const pipeStream = async (req, res, body) => {
  const reader = body.getReader();
  req.on("close", () => reader.cancel().catch(() => {}));

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // A full write buffer means the client is slower than the upstream
      if (!res.write(value)) {
        await new Promise((resolve) => res.once("drain", resolve));
      }
    }
  } finally {
    res.end();
  }
};

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
export default async function handler(req, res) {
  const configured = upstream();

  // Discovery, mirroring `api/mcp.mjs`: the client asks whether this
  // deployment has a default backend rather than assuming one. The model is
  // named so the panel can show what answered; the key never leaves here.
  if (req.method === "GET") {
    return sendJson(res, 200, {
      configured: !!configured,
      model: configured?.model ?? null,
    });
  }

  if (req.method !== "POST") {
    res.setHeader("allow", "GET, POST");
    return sendJson(res, 405, {
      error: "Use GET to check availability, POST to take a turn.",
    });
  }

  if (!configured) {
    return sendJson(res, 503, {
      error:
        "No default backend on this deployment. Pick another backend and " +
        "supply your own key.",
    });
  }

  let body;
  try {
    body = await readJson(req);
  } catch (e) {
    return sendJson(res, 400, {
      error: `Malformed request body: ${e.message}`,
    });
  }

  if (!Array.isArray(body.messages) || !body.messages.length) {
    return sendJson(res, 400, {
      error: "`messages` must be a non-empty array.",
    });
  }

  let response;
  try {
    response = await fetch(configured.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "text/event-stream",
        ...(configured.apiKey
          ? { authorization: `Bearer ${configured.apiKey}` }
          : {}),
      },
      body: JSON.stringify({
        ...Object.fromEntries(
          FORWARDED.filter((field) => field in body).map((field) => [
            field,
            body[field],
          ])
        ),
        model: configured.model,
        stream: true,
      }),
    });
  } catch (e) {
    return sendJson(res, 502, { error: `Upstream unreachable: ${e.message}` });
  }

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    // The upstream's own status, so a 429 still reads as a 429 in the panel
    return sendJson(res, response.status, {
      error: `Upstream ${response.status}: ${text.slice(0, 300)}`,
    });
  }

  res.statusCode = 200;
  res.setHeader("content-type", "text/event-stream");
  res.setHeader("cache-control", "no-cache, no-transform");
  await pipeStream(req, res, response.body);
}
