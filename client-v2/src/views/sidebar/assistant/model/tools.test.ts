import { createTools } from "./tools";
import { PgAssistant, type AssistantMode } from "../store";
import type { PlaygroundBridge } from "../bridge/playground-bridge";

vi.mock("./skill-tools", () => ({ createSkillTools: () => [] }));
vi.mock("./mcp-tools", () => ({ createMcpTools: () => [] }));
// Only the default value is needed here; reaching the real one drags in the
// utils barrel, which wants webpack-injected globals
vi.mock("../bridge/playground-bridge", () => ({ realBridge: {} }));

const bridge = (content: string | null): PlaygroundBridge =>
  ({
    readFile: () => content,
    applyPatch: vi.fn(async () => {}),
  } as unknown as PlaygroundBridge);

const writeFile = (b: PlaygroundBridge) =>
  createTools(b).find((tool) => tool.name === "write_file")!;

/** The id of the approval card added most recently */
const latestCard = () =>
  PgAssistant.items.filter((i) => i.kind === "approval").slice(-1)[0].id;

beforeEach(() => PgAssistant.clear());

describe("write_file", () => {
  it("does not ask for approval when the content is unchanged", async () => {
    const result = await writeFile(bridge("same")).run({
      path: "src/lib.rs",
      content: "same",
    });

    expect(result).toContain("already contains exactly that content");
    expect(PgAssistant.items).toHaveLength(0);
    expect(PgAssistant.status).toBe("idle");
  });

  it("asks for approval when the content differs", async () => {
    const pending = writeFile(bridge("old")).run({
      path: "src/lib.rs",
      content: "new",
    });

    // The approval card holds the tool open until the user clicks
    await Promise.resolve();
    expect(PgAssistant.items).toHaveLength(1);
    expect(PgAssistant.status).toBe("awaiting");

    PgAssistant.resolveApproval(latestCard(), false);
    expect(await pending).toContain("rejected");
  });

  it("records each outcome on its own card when two run at once", async () => {
    // The Anthropic runner executes a turn's tool calls concurrently, so two
    // cards can be open together. Reading "the latest approval" after the
    // await gave both outcomes to the second card and none to the first.
    const b = bridge("old");
    const first = writeFile(b).run({ path: "src/a.rs", content: "a" });
    const second = writeFile(b).run({ path: "src/b.rs", content: "b" });
    await Promise.resolve();

    const [a, z] = PgAssistant.items;
    PgAssistant.resolveApproval(a.id, true);
    PgAssistant.resolveApproval(z.id, true);
    await Promise.all([first, second]);

    const outcomes = PgAssistant.items.map((item) =>
      item.kind === "approval" ? [item.request, item.outcome] : null
    );
    expect(outcomes).toEqual([
      [expect.objectContaining({ path: "src/a.rs" }), "wrote src/a.rs"],
      [expect.objectContaining({ path: "src/b.rs" }), "wrote src/b.rs"],
    ]);
  });
});

describe("a mode", () => {
  const hint = {
    name: "hint",
    description: "Post the live question's hint",
    schema: {
      type: "object" as const,
      properties: {},
      additionalProperties: false as const,
    },
    run: () => "Posted.",
  };
  const tutorial: AssistantMode = {
    name: "tutorial",
    context: () => "Tutorial: Hello Anchor",
    tools: [hint],
    allows: (name) => name === "read_file",
  };
  const names = (tools: { name: string }[]) => tools.map((t) => t.name);

  it("leaves the tools as they are without one", () => {
    expect(names(createTools(bridge("old"), null))).toEqual([
      "list_files",
      "read_file",
      "get_build_error",
      "write_file",
      "build",
      "deploy",
    ]);
  });

  it("refuses a write-file call in tutorial mode, with no approval card", async () => {
    const write = createTools(bridge("old"), tutorial).find(
      (tool) => tool.name === "write_file"
    );
    const result = await write?.run({ path: "src/lib.rs", content: "new" });

    expect(result).toContain("write_file is not available in this tutorial");
    expect(PgAssistant.items).toHaveLength(0);
    expect(PgAssistant.status).toBe("idle");
  });

  it("runs what it allows, and adds its own tools", async () => {
    const tools = createTools(bridge("fn main() {}"), tutorial);
    expect(names(tools)).toContain("hint");
    const read = tools.find((tool) => tool.name === "read_file");
    expect(await read?.run({ path: "src/lib.rs" })).toBe("fn main() {}");
  });

  it("is read by the next createTools, and cleared only by its own setter", () => {
    const set = PgAssistant.setMode(tutorial);
    expect(names(createTools(bridge("old")))).toContain("hint");
    const other = PgAssistant.setMode({
      name: "other",
      context: () => "",
      tools: [],
      allows: () => true,
    });
    set.dispose();
    expect(PgAssistant.mode?.name).toBe("other");
    other.dispose();
    expect(PgAssistant.mode).toBeNull();
  });
});
