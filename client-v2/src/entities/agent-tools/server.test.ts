// @vitest-environment node
import * as browser from "./index";
import * as server from "./server.mjs";

describe("entities/agent-tools doors", () => {
  it("gives server code the same registry as the browser", () => {
    expect(server.BUILTIN_TOOLS).toBe(browser.BUILTIN_TOOLS);
    expect(server.SKILL_CATALOGUE).toBe(browser.SKILL_CATALOGUE);
    expect(server.DEFAULT_MCP_SERVERS).toBe(browser.DEFAULT_MCP_SERVERS);
  });
});
