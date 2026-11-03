// The store and the bridge reach the `utils` barrel; only the text matters here
const store = vi.hoisted(() => ({
  PgAssistant: { enabledSkills: [] as unknown[] },
}));
vi.mock("../store", () => store);
vi.mock("../bridge/playground-bridge", () => ({ realBridge: {} }));

import { describeProject, systemPrompt } from "./prompt";
import type { PlaygroundBridge } from "../bridge/playground-bridge";

// `prompt.ts` imports the assistant context as `.md`: webpack hands it over
// as text, and so must the test runner (`markdownAsText` in vitest.config.ts)
describe("systemPrompt", () => {
  it("carries the assistant context as text, not a module", () => {
    expect(systemPrompt()).toContain("# Assistant context");
  });

  it("names in its catalogue only the skills the server listed and the user has on", () => {
    store.PgAssistant.enabledSkills = [
      {
        id: "playground-env",
        name: "Playground build environment",
        description: "What compiles here.",
        source: { type: "bundled", content: "" },
        enabled: true,
      },
    ];

    expect(systemPrompt()).toContain(
      "- playground-env (Playground build environment): What compiles here."
    );
    expect(systemPrompt()).not.toContain("- solana-dev (");
  });
});

describe("describeProject", () => {
  const bridge = (idl: unknown) =>
    ({
      getProjectContext: () => ({
        workspaceName: "p",
        // eslint-disable-next-line unicorn/no-null -- `ProjectContext.currentFilePath` is `string | null`
        currentFilePath: null,
        filePaths: [],
        openFilePaths: [],
        idl,
        // eslint-disable-next-line unicorn/no-null -- `ProjectContext.programId` is `string | null`
        programId: null,
        deployState: "ready",
        cluster: "devnet",
        walletConnected: false,
        // eslint-disable-next-line unicorn/no-null -- `ProjectContext.lesson` is `LessonContext | null`
        lesson: null,
      }),
    } as unknown as PlaygroundBridge);

  it("names why the Playground cannot call a refused IDL", () => {
    expect(
      describeProject(
        bridge({
          name: "counter",
          instructions: [],
          accounts: [],
          refused: "a custom discriminator on initialize",
        })
      )
    ).toContain(
      "Program interface: counter — the Playground cannot call it: a custom discriminator on initialize"
    );
  });

  it("lists a callable IDL's instructions", () => {
    expect(
      describeProject(
        bridge({ name: "counter", instructions: ["increment"], accounts: [] })
      )
    ).toContain("Program interface: counter — instructions: increment");
  });
});
