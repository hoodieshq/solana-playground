// `@types/mocha` also declares a global `it`, without `each`
import { it } from "vitest";
import {
  BUILTIN_TOOLS,
  DEFAULT_MCP_SERVERS,
  SKILL_CATALOGUE,
} from "./registry.mjs";

describe("BUILTIN_TOOLS", () => {
  it("declares every built-in tool once, in the order the model sees them", () => {
    expect(BUILTIN_TOOLS.map((tool) => tool.name)).toEqual([
      "list_skills",
      "load_skill",
      "read_skill_reference",
      "list_files",
      "read_file",
      "get_build_error",
      "write_file",
      "build",
      "deploy",
    ]);
  });

  it.each(BUILTIN_TOOLS.map((tool) => [tool.name, tool]))(
    "%s has a description and a closed object schema",
    (_, tool) => {
      expect(tool.description.trim()).not.toBe("");
      expect(tool.schema.type).toBe("object");
      expect(tool.schema.additionalProperties).toBe(false);
      for (const key of tool.schema.required ?? []) {
        expect(tool.schema.properties).toHaveProperty(key);
      }
    }
  );

  it("marks exactly the tools that change state as needing approval", () => {
    const gated = BUILTIN_TOOLS.filter((tool) => tool.approval).map(
      (tool) => tool.name
    );
    expect(gated).toEqual(["write_file", "build", "deploy"]);
  });
});

describe("SKILL_CATALOGUE", () => {
  it("lists the skills with unique ids and no bundled content", () => {
    expect(SKILL_CATALOGUE.map((skill) => skill.id)).toEqual([
      "playground-env",
      "solana-dev",
    ]);
    for (const skill of SKILL_CATALOGUE) {
      expect(skill.name.trim()).not.toBe("");
      expect(skill.description.trim()).not.toBe("");
      // Node cannot import the markdown; the browser binds it by id
      expect(skill.source).not.toHaveProperty("content");
    }
  });
});

describe("DEFAULT_MCP_SERVERS", () => {
  it("offers the public Solana upstream", () => {
    expect(DEFAULT_MCP_SERVERS).toContainEqual({
      id: "solana",
      name: "Solana Developer MCP",
      url: "https://mcp.solana.com/mcp",
    });
  });

  it.each(DEFAULT_MCP_SERVERS.map((server) => [server.id, server]))(
    "%s has a prefix-safe id and an https URL",
    (id, server) => {
      expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(new URL(server.url).protocol).toBe("https:");
    }
  );
});
