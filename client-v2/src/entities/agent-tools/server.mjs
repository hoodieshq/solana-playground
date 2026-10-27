/**
 * What this entity offers a server route. The one door into it.
 *
 * `index.ts` is the same registry for the browser; this is its counterpart
 * for `api/*.mjs`, which Vercel executes as plain ESM with no build step.
 * `api/agent.mjs` can declare `BUILTIN_TOOLS` to the model, and `api/mcp.mjs`
 * can serve `DEFAULT_MCP_SERVERS` instead of restating the Solana upstream.
 */
export {
  BUILTIN_TOOLS,
  DEFAULT_MCP_SERVERS,
  SKILL_CATALOGUE,
} from "./model/registry.mjs";
