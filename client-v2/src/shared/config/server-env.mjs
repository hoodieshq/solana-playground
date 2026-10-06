// The environment variables the serverless side reads: `api/*.mjs` and the
// `server.mjs` models behind them. `.mjs` so Node imports it directly (see
// api/health.mjs); `allowJs` lets TypeScript read the same file.
//
// Every getter reads `process.env` when called, never at import: tests stub
// the environment per case, and a value captured on import would outlive it.
// Names and defaults live here and nowhere else; `.env.example` documents them.

/**
 * A variable's value, or `undefined` when it is unset or blank.
 *
 * @param {string} name
 * @returns {string | undefined}
 */
const read = (name) => process.env[name]?.trim() || undefined;

/**
 * The assistant's Default backend. Only `apiKey` has no default: without it
 * the backend is off.
 */
export const agentEnv = () => ({
  apiKey: read("AGENT_API_KEY"),
  baseUrl:
    read("AGENT_BASE_URL") || "https://inference-api.nousresearch.com/v1",
  model: read("AGENT_MODEL") || "z-ai/glm-5.3-flash:US",
  // GLM always reasons and defaults to `max`; the panel shows none of it, so
  // a high effort reads as a stalled answer
  reasoningEffort: read("AGENT_REASONING_EFFORT") || "low",
});

/** The Explorer MCP upstream; `bypass` unset leaves it out of the gateway */
export const mcpExplorerEnv = () => ({
  bypass: read("MCP_EXPLORER_BYPASS"),
  url: read("MCP_EXPLORER_URL") || "https://explorer.solana.com/mcp",
  token: read("MCP_EXPLORER_TOKEN"),
});

/** Postgres for sync, and its opt-in kill switch */
export const databaseEnv = () => ({
  url: read("DATABASE_URL"),
  // Only the exact string enables sync; anything else keeps it off
  syncEnabled: process.env.SYNC_ENABLED === "true",
});

/**
 * Better Auth's secret and GitHub credentials, and the origins it can build
 * URLs from. `vercelUrl` is Vercel's own hostname for the deployment, without
 * a scheme.
 */
export const authEnv = () => ({
  baseUrl: read("AUTH_BASE_URL"),
  vercelUrl: read("VERCEL_URL"),
  secret: read("AUTH_SECRET"),
  githubClientId: read("GITHUB_CLIENT_ID"),
  githubClientSecret: read("GITHUB_CLIENT_SECRET"),
});
