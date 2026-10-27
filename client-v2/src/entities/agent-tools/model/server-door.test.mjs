// Plain Node, as Vercel runs `api/*.mjs`: no bundler, no `@/`, no TypeScript.
// The vitest suite resolves through vite, so only this proves the server
// rail can import the registry as it is deployed.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BUILTIN_TOOLS,
  DEFAULT_MCP_SERVERS,
  SKILL_CATALOGUE,
} from "../server.mjs";

test("server.mjs loads in plain Node with the whole registry", () => {
  assert.equal(BUILTIN_TOOLS.length, 9);
  assert.ok(SKILL_CATALOGUE.length > 0);
  assert.ok(DEFAULT_MCP_SERVERS.some((server) => server.id === "solana"));
});
