import playgroundEnvSkill from "../content/playground-env.skill.md";
import type { McpServerEntry, SkillEntry } from "./types";

/**
 * The skills the panel offers.
 *
 * Adding one is a single entry here — the tools, the prompt catalogue and the
 * picker all read this list.
 */
export const SKILLS: SkillEntry[] = [
  {
    id: "playground-env",
    name: "Playground build environment",
    description:
      "What this environment can actually compile: anchor-lang 0.29, " +
      "solana-program 1.16, the crate whitelist, TypeScript-only tests. " +
      "Load this before proposing a fix, and prefer it over any other " +
      "source when they disagree about versions.",
    source: { type: "bundled", content: playgroundEnvSkill },
  },
  {
    id: "solana-dev",
    name: "Official Solana developer skill",
    description:
      "The Solana Foundation's own skill (solana-foundation/solana-dev-skill): " +
      "common errors, security, testing, Anchor and @solana/kit references. " +
      "Teaches current versions, so check it against playground-env before " +
      "proposing code for this environment.",
    source: {
      type: "remote",
      baseUrl:
        "https://raw.githubusercontent.com/solana-foundation/" +
        "solana-dev-skill/main/skills/solana-dev/",
      entry: "SKILL.md",
    },
  },
];

/**
 * MCP servers the connector can reach.
 *
 * `mcp.solana.com` is public and needs no token. It sends no CORS headers, so
 * it is only reachable because Anthropic opens the connection server-side —
 * see `docs/decisions.md`.
 */
export const MCP_SERVERS: McpServerEntry[] = [
  {
    id: "solana",
    name: "Solana Developer MCP",
    url: "https://mcp.solana.com/mcp",
    enabled: true,
  },
  {
    // Off by default: the endpoint answers every request with a Vercel bot
    // challenge until a bypass secret is supplied. The key is spelled out so
    // only the value has to be filled in — whether the query-param form of the
    // bypass satisfies challenge mode is unverified, see `docs/decisions.md`.
    id: "explorer",
    name: "Solana Explorer MCP",
    url: "https://explorer.solana.com/mcp",
    enabled: false,
    queryParams: { "x-vercel-protection-bypass": "" },
  },
];

/** Skills that are on unless the user turns them off */
export const DEFAULT_SKILL_IDS = SKILLS.map((skill) => skill.id);

export const findSkill = (id: string) => SKILLS.find((s) => s.id === id);
