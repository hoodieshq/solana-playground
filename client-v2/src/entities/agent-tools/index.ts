// Public API of the slice for the browser. `server.mjs` is the same registry
// for server code.
import { BUILTIN_TOOLS } from "./model/registry.mjs";
import type { ToolDefinition } from "@/shared/lib/ai";

export {
  BUILTIN_TOOLS,
  DEFAULT_MCP_SERVERS,
  SKILL_CATALOGUE,
} from "./model/registry.mjs";
export type {
  McpUpstream,
  SkillDeclaration,
  ToolDeclaration,
} from "./model/registry.mjs";

/**
 * A declared tool with the browser's runner attached. Name, description and
 * schema come from the registry, so the panel cannot describe a tool
 * differently from what the server rail declares.
 *
 * @param name a name in {@link BUILTIN_TOOLS}
 * @param run what the tool does in this tab
 * @throws when the name is not declared, so a runner cannot exist without a
 *   declaration
 */
export const bindTool = (
  name: string,
  run: ToolDefinition["run"]
): ToolDefinition => {
  const declared = BUILTIN_TOOLS.find((tool) => tool.name === name);
  if (!declared) {
    throw new Error(
      `"${name}" is not declared in entities/agent-tools; declare it there ` +
        "so both backends offer it."
    );
  }
  const { description, schema } = declared;
  return { name, description, schema, run };
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("entities/agent-tools/index", () => {
    it("bindTool takes the description and schema from the registry", () => {
      const run = () => "ran";
      const tool = bindTool("read_file", run);
      const declared = BUILTIN_TOOLS.find((t) => t.name === "read_file")!;

      expect(tool.description).toBe(declared.description);
      expect(tool.schema).toBe(declared.schema);
      expect(tool.run).toBe(run);
    });

    it("bindTool refuses a name the registry does not declare", () => {
      expect(() => bindTool("format_disk", () => "")).toThrow(
        /"format_disk" is not declared/
      );
    });
  });
}
