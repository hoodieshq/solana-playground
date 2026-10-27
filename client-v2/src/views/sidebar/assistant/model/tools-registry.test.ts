// `@types/mocha` also declares a global `it`, without `each`
import { it } from "vitest";
import { createTools } from "./tools";
import { PgAssistant } from "../store";
import { BUILTIN_TOOLS } from "@/entities/agent-tools";
import type { PlaygroundBridge } from "../bridge/playground-bridge";

// A second file for `tools.ts`: these cases need the real skill tools, which
// `tools.test.ts` mocks away for the whole file
vi.mock("./mcp-tools", () => ({ createMcpTools: () => [] }));
// Only the default value is needed here; reaching the real one drags in the
// utils barrel, which wants webpack-injected globals
vi.mock("../bridge/playground-bridge", () => ({ realBridge: {} }));

/** A bridge that records every call that would change the project */
const recordingBridge = () => {
  const changes: string[] = [];
  const bridge = {
    listFiles: () => [],
    readFile: () => "old",
    getProjectContext: () => ({ cluster: "devnet", buildError: null }),
    applyPatch: async () => void changes.push("applyPatch"),
    build: async () => void changes.push("build"),
    deploy: async () => void changes.push("deploy"),
  } as unknown as PlaygroundBridge;
  return { bridge, changes };
};

/** Arguments that get each gated tool as far as its approval card */
const GATED_INPUT: Record<string, Record<string, unknown>> = {
  write_file: { path: "src/lib.rs", content: "new" },
  build: {},
  deploy: {},
};

beforeEach(() => PgAssistant.clear());

describe("the panel's built-in tools", () => {
  it("are exactly the registry's declarations, unchanged", () => {
    const panel = createTools(recordingBridge().bridge).map(
      ({ name, description, schema }) => ({ name, description, schema })
    );
    const declared = BUILTIN_TOOLS.map(({ name, description, schema }) => ({
      name,
      description,
      schema,
    }));

    expect(panel).toEqual(declared);
  });

  it.each(
    BUILTIN_TOOLS.filter((tool) => tool.approval).map((tool) => [tool.name])
  )("%s asks for approval and changes nothing when declined", async (name) => {
    const { bridge, changes } = recordingBridge();
    const tool = createTools(bridge).find((t) => t.name === name)!;

    const pending = tool.run(GATED_INPUT[name]);
    await Promise.resolve();

    const cards = PgAssistant.items.filter((item) => item.kind === "approval");
    expect(cards).toHaveLength(1);
    PgAssistant.resolveApproval(cards[0].id, false);
    await pending;

    expect(changes).toEqual([]);
  });
});
