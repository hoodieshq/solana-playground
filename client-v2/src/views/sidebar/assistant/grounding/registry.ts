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
 * MCP servers, each with the executor its own reachability forces.
 *
 * The executor is measured, not chosen: `mcp.solana.com` answers a CORS
 * preflight with 405 and no `access-control-allow-origin` (2026-08-20), so no
 * page can call it. Explorer sets `access-control-allow-origin: *` and exposes
 * `mcp-session-id` (read from `solana-explorer/app/mcp/route.ts`, 2026-08-21),
 * so it is callable from anywhere.
 */
export const MCP_SERVERS: McpServerEntry[] = [
  {
    id: "solana",
    name: "Solana Developer MCP",
    // Through our own gateway (`api/mcp.mjs`): the upstream sends no CORS
    // headers, so a page cannot call it, but our origin can. Point this at
    // `https://mcp.solana.com/mcp` with `executor: "server"` instead to go
    // back through Anthropic's connector.
    url: "/api/mcp?server[]=solana",
    enabled: true,
    executor: "browser",
  },
  {
    // Off by default: the endpoint answers every request with a Vercel bot
    // challenge until a bypass secret is supplied. The key is spelled out so
    // only the value has to be filled in.
    id: "explorer",
    name: "Solana Explorer MCP",
    url: "https://explorer.solana.com/mcp",
    enabled: false,
    executor: "browser",
    queryParams: { "x-vercel-protection-bypass": "" },
  },
];

/** Skills that are on unless the user turns them off */
export const DEFAULT_SKILL_IDS = SKILLS.map((skill) => skill.id);

export const findSkill = (id: string) => SKILLS.find((s) => s.id === id);
