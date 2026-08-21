/** Where a skill's files come from */
export type SkillSource =
  /** Shipped in the bundle, so it survives a network failure */
  | { type: "bundled"; content: string }
  /**
   * Fetched at runtime. `baseUrl` must send `access-control-allow-origin`;
   * `raw.githubusercontent.com` sends `*`.
   */
  | { type: "remote"; baseUrl: string; entry: string };

/**
 * A body of ecosystem knowledge the model loads when it decides it needs it.
 *
 * Only `name` and `description` reach the prompt — the content arrives as a
 * tool result, which keeps the cached prompt prefix byte-stable.
 */
export interface SkillEntry {
  id: string;
  name: string;
  /** One line the model reads when deciding whether to load this */
  description: string;
  source: SkillSource;
}

/**
 * A remote MCP server, reached through the Anthropic connector.
 *
 * What the connector can carry, and what it cannot:
 *
 * - `authToken` becomes `authorization_token`, sent as a bearer token.
 * - `queryParams` is appended to the URL, which is the only way to pass a
 *   credential the server expects outside the `Authorization` header — a
 *   Vercel `x-vercel-protection-bypass`, for instance.
 * - `headers` is **not sent**. The connector's server definition has no header
 *   map, so this is carried for the parked proxy path only. See
 *   `docs/decisions.md` -> D12.
 */
export interface McpServerEntry {
  /** Also the `mcp_server_name` the toolset references; must be unique */
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  authToken?: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
}
