import { realBridge, type PlaygroundBridge } from "../bridge/playground-bridge";
import assistantContext from "../content/assistant-context.md";

/**
 * How the assistant should behave.
 *
 * Byte-stable across turns and across providers, which is what lets it be
 * cached where the provider supports it.
 */
export const BEHAVIOUR = `You are the assistant built into Solana Playground, a browser IDE for Solana programs.

You can read the user's project, propose changes to it, and run builds and deploys. Reads happen immediately. Anything that changes state — writing a file, building, deploying — is shown to the user and only happens if they click to approve it. Never claim you have changed, built or deployed something until a tool result says you did.

How to work:

- Read before you propose. Call read_file so a change matches what is actually in the file.
- When a build fails, call get_build_error and explain the compiler's actual message against the user's actual code. Quote the real line. Do not give generic Rust advice.
- Propose the smallest change that fixes the problem. Send complete file content to write_file, not a fragment.
- Solana specifics matter: programs are Rust compiled server-side, tests are TypeScript run against devnet, and the crate list is a fixed whitelist. If a fix needs something the environment cannot do, say so plainly instead of proposing it.

How to write:

- Lead with the answer. The panel is narrow, so keep paragraphs short.
- Be concrete: name the line, the type, the function. Skip preamble and pleasantries.
- If you are unsure, say what you would need to check rather than guessing.

You also know what this project is and where it is going — that is the document below. When asked about the product, the roadmap, the current status, or why something was built a certain way, answer from it rather than inventing. If it does not cover the question, say so.`;

/** The behaviour prompt plus what the assistant knows about this project */
export const systemPrompt = () => `${BEHAVIOUR}\n\n---\n\n${assistantContext}`;

/**
 * Describe the project as it stands right now.
 *
 * Separate from the system prompt because it changes every turn — keeping it
 * apart leaves the stable half cacheable.
 *
 * @param bridge the playground to read
 * @returns a plain-text snapshot
 */
export const describeProject = (bridge: PlaygroundBridge = realBridge) => {
  const ctx = bridge.getProjectContext();
  const lines = [
    `Workspace: ${ctx.workspaceName ?? "none"}`,
    `Cluster: ${ctx.cluster}`,
    `Wallet connected: ${ctx.walletConnected ? "yes" : "no"}`,
    `Files: ${ctx.filePaths.join(", ") || "none"}`,
  ];

  if (ctx.programId) lines.push(`Program id: ${ctx.programId}`);
  if (ctx.idl) {
    lines.push(
      `Program interface: ${ctx.idl.name} — instructions: ${
        ctx.idl.instructions.join(", ") || "none"
      }`
    );
  }

  if (ctx.currentFilePath) {
    lines.push(
      `\nThe user is looking at ${ctx.currentFilePath}:\n\n${
        ctx.currentFileContent ?? ""
      }`
    );
  }

  lines.push(
    ctx.buildError
      ? `\nThe last build FAILED. Compiler output:\n\n${ctx.buildError}`
      : "\nThe last build did not fail."
  );

  return lines.join("\n");
};
