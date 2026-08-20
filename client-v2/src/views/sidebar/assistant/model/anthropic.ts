import Anthropic from "@anthropic-ai/sdk";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";

import { createTools } from "./tools";
import { describeProject, systemPrompt } from "./prompt";
import { PgAssistant } from "../store";
import type { Provider, ToolInput } from "./types";

const MODEL = "claude-opus-5";
const EFFORT = "high";
const MAX_TOKENS = 32000;
/** A turn that has not finished after this many round trips is looping */
const MAX_ITERATIONS = 12;

/**
 * Anthropic, driven by the SDK's tool runner.
 *
 * The runner owns the loop; the approval gate lives inside each tool's `run`,
 * which does not return until the user clicks.
 */
export const createAnthropicProvider = (apiKey: string): Provider => {
  const client = new Anthropic({
    apiKey,
    // The key is the user's own and goes only to Anthropic. See
    // docs/decisions.md -> D3 for why it is not persisted anywhere.
    dangerouslyAllowBrowser: true,
  });

  const tools = createTools().map((tool) =>
    betaTool({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema as never,
      run: (args) => Promise.resolve(tool.run(args as ToolInput)),
    })
  );

  let history: Anthropic.Beta.BetaMessageParam[] = [];

  return {
    id: "anthropic",
    label: MODEL,

    async send(input) {
      const runner = client.beta.messages.toolRunner({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: "adaptive" },
        output_config: { effort: EFFORT },
        system: [
          {
            type: "text",
            text: systemPrompt(),
            // Stable across turns, so it is a cache read after the first
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: `Current project state:\n\n${describeProject()}`,
          },
        ],
        tools,
        messages: [...history, { role: "user", content: input }],
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

      history = runner.params.messages as Anthropic.Beta.BetaMessageParam[];
    },
  };
};
