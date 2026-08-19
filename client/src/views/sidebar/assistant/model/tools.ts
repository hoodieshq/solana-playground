import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";

import { PgAssistant } from "../store";
import { realBridge, type PlaygroundBridge } from "../bridge/playground-bridge";

/**
 * What the assistant can do to the project.
 *
 * Reads run unattended. Everything that changes state — writing a file,
 * building, deploying — calls `PgAssistant.requestApproval` and does not
 * return until the user clicks, which holds the agent loop open. That is
 * "propose automatically, apply explicitly" enforced inside the loop rather
 * than around it.
 *
 * @param bridge the playground to act on
 * @returns the tools, ready for `toolRunner`
 */
export const createTools = (bridge: PlaygroundBridge = realBridge) => {
  const listFiles = betaTool({
    name: "list_files",
    description:
      "List every file in the user's project, as paths relative to the " +
      "project root. Use this to find out what exists before reading.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: () => {
      PgAssistant.addToolCall("listed the project");
      const paths = bridge.listFiles();
      return paths.length ? paths.join("\n") : "The project has no files.";
    },
  });

  const readFile = betaTool({
    name: "read_file",
    description:
      "Read one file from the user's project. Always read a file before " +
      "proposing a change to it, so the change matches what is actually there.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path relative to the project root, e.g. src/lib.rs",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
    run: ({ path }) => {
      PgAssistant.addToolCall(`read ${path}`);
      const content = bridge.readFile(path);
      if (content === null) return `There is no file at ${path}.`;
      return content;
    },
  });

  const getBuildError = betaTool({
    name: "get_build_error",
    description:
      "Get the compiler output from the most recent build. Returns the " +
      "compiler's own text, including file paths and error codes. Use this " +
      "rather than guessing what an error says.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: () => {
      PgAssistant.addToolCall("read the build output");
      const { buildError } = bridge.getProjectContext();
      if (!buildError) {
        return "The last build did not fail, or nothing has been built yet.";
      }
      return buildError;
    },
  });

  const writeFile = betaTool({
    name: "write_file",
    description:
      "Propose new content for a file. This does NOT write anything on its " +
      "own — the user is shown a diff and decides. Send the file's complete " +
      "new content, not a fragment. Prefer the smallest change that fixes " +
      "the problem.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path relative to the project root, e.g. src/lib.rs",
        },
        content: {
          type: "string",
          description: "The complete new content of the file",
        },
      },
      required: ["path", "content"],
      additionalProperties: false,
    },
    run: async ({ path, content }) => {
      const allowed = await PgAssistant.requestApproval({
        type: "patch",
        path,
        before: bridge.readFile(path),
        after: content,
      });
      const approvalId = PgAssistant.lastApprovalId;

      if (!allowed) {
        return (
          "The user rejected this change. Do not try to apply it again — ask " +
          "what they would prefer instead."
        );
      }

      try {
        await bridge.applyPatch({ path, content });
        if (approvalId) PgAssistant.setApprovalOutcome(approvalId, `wrote ${path}`);
        return `Wrote ${path}.`;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (approvalId) PgAssistant.setApprovalOutcome(approvalId, "write failed");
        return `Could not write ${path}: ${message}`;
      }
    },
  });

  const build = betaTool({
    name: "build",
    description:
      "Compile the program. Requires the user's approval. After it finishes, " +
      "call get_build_error to see what the compiler said.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async () => {
      const allowed = await PgAssistant.requestApproval({
        type: "command",
        name: "build",
        effect:
          "Sends src/ to the build server and replaces the compiled program.",
      });
      const approvalId = PgAssistant.lastApprovalId;
      if (!allowed) return "The user declined to build.";

      try {
        await bridge.build();
        const { buildError } = bridge.getProjectContext();
        if (approvalId) {
          PgAssistant.setApprovalOutcome(
            approvalId,
            buildError ? "build failed" : "build succeeded"
          );
        }
        return buildError
          ? `The build failed:\n\n${buildError}`
          : "The build succeeded.";
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (approvalId) PgAssistant.setApprovalOutcome(approvalId, "build errored");
        return `The build could not run: ${message}`;
      }
    },
  });

  const deploy = betaTool({
    name: "deploy",
    description:
      "Deploy the compiled program to the configured cluster. Requires the " +
      "user's approval. Costs SOL and needs a funded wallet.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async () => {
      const { cluster } = bridge.getProjectContext();
      const allowed = await PgAssistant.requestApproval({
        type: "command",
        name: "deploy",
        effect: `Sends a transaction to ${cluster} and spends SOL from the connected wallet.`,
      });
      const approvalId = PgAssistant.lastApprovalId;
      if (!allowed) return "The user declined to deploy.";

      try {
        await bridge.deploy();
        if (approvalId) PgAssistant.setApprovalOutcome(approvalId, "deployed");
        return "Deployed. The program id and transaction are in the terminal.";
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (approvalId) PgAssistant.setApprovalOutcome(approvalId, "deploy failed");
        return `The deployment failed: ${message}`;
      }
    },
  });

  return [listFiles, readFile, getBuildError, writeFile, build, deploy];
};
