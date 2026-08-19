import Anthropic from "@anthropic-ai/sdk";

import { createTools } from "./tools";
import { PgAssistant } from "../store";
import { realBridge, type PlaygroundBridge } from "../bridge/playground-bridge";
import assistantContext from "../content/assistant-context.md";

/**
 * Anthropic's most capable model for agentic work. The panel is latency
 * sensitive, so effort is one notch below the coding default; raise it if the
 * assistant starts under-thinking real errors.
 */
const MODEL = "claude-opus-5";
const EFFORT = "high";
const MAX_TOKENS = 32000;
/** A turn that has not finished after this many round trips is looping */
const MAX_ITERATIONS = 12;

/**
 * How the assistant should behave.
 *
 * Kept separate from the project context below so it is byte-stable, which is
 * what lets the cache hold across turns.
 */
const BEHAVIOUR = `You are the assistant built into Solana Playground, a browser IDE for Solana programs.

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

/** Describe the project as it stands right now */
const describeProject = (bridge: PlaygroundBridge) => {
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
      `\nThe user is looking at ${ctx.currentFilePath}:\n\n${ctx.currentFileContent ?? ""}`
    );
  }

  if (ctx.buildError) {
    lines.push(
      `\nThe last build FAILED. Compiler output:\n\n${ctx.buildError}`
    );
  } else {
    lines.push("\nThe last build did not fail.");
  }

  return lines.join("\n");
};

/** A turn's worth of conversation, in the shape the API wants */
type Messages = Anthropic.Beta.BetaMessageParam[];

/**
 * Run one turn of the agent loop.
 *
 * Streams text into the store as it arrives and returns the updated message
 * history so the next turn can continue from it.
 *
 * @param opts.apiKey the user's key, held in memory only
 * @param opts.history messages from previous turns
 * @param opts.input what the user just typed
 * @returns the history including this turn
 */
export const runTurn = async (opts: {
  apiKey: string;
  history: Messages;
  input: string;
  bridge?: PlaygroundBridge;
}): Promise<Messages> => {
  const bridge = opts.bridge ?? realBridge;

  const client = new Anthropic({
    apiKey: opts.apiKey,
    // The key is the user's own and goes only to Anthropic. See
    // docs/decisions.md -> D3 for why it is not persisted anywhere.
    dangerouslyAllowBrowser: true,
  });

  const messages: Messages = [
    ...opts.history,
    { role: "user", content: opts.input },
  ];

  const runner = client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "adaptive" },
    output_config: { effort: EFFORT },
    system: [
      {
        type: "text",
        text: `${BEHAVIOUR}\n\n---\n\n${assistantContext}`,
        // Stable across turns, so it is a cache read after the first
        cache_control: { type: "ephemeral" },
      },
      { type: "text", text: `Current project state:\n\n${describeProject(bridge)}` },
    ],
    tools: createTools(bridge),
    messages,
    max_iterations: MAX_ITERATIONS,
    stream: true,
  });

  for await (const stream of runner) {
    const messageId = PgAssistant.startAssistantMessage();

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        PgAssistant.appendToAssistantMessage(messageId, event.delta.text);
      }
    }

    // A turn that only called tools produces no text; drop the empty bubble
    PgAssistant.discardIfEmpty(messageId);
  }

  return runner.params.messages as Messages;
};
