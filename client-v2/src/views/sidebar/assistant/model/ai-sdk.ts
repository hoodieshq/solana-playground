// SPIKE (HOO-1753): throwaway probe, never merged.
//
// The OpenAI-compatible loop of `openai.ts`, rebuilt on the ai SDK's
// `streamText` with the same tool registry, the same approval gate (inside
// `run`) and the same store calls, so the two can be compared like for like.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { jsonSchema, stepCountIs, streamText, tool, type ModelMessage } from "ai";

import { createTools } from "./tools";
import { describeProject, systemPrompt } from "./prompt";
import { PgAssistant } from "../store";
import type { ReplayMessage } from "../../../../features/persistence/model/replay";
import type { Provider, ProviderId, ToolInput } from "./types";

const MAX_ITERATIONS = 12;

export interface AiSdkConfig {
  id: ProviderId;
  /** Whole endpoint URL, e.g. `/api/agent` */
  url: string;
  model?: string;
  apiKey?: string;
  label?: string;
  /** The SDK's default is 2 */
  maxRetries?: number;
}

export const createAiSdkProvider = (
  config: AiSdkConfig,
  seed: readonly ReplayMessage[] = []
): Provider => {
  const provider = createOpenAICompatible({
    name: config.id,
    // The SDK always appends `/chat/completions`; the default rail is one URL
    baseURL: "http://rail.invalid",
    apiKey: config.apiKey || undefined,
    fetch: (_input, init) => fetch(config.url, init),
  });

  const tools = Object.fromEntries(
    createTools().map((t) => [
      t.name,
      tool({
        description: t.description,
        inputSchema: jsonSchema<ToolInput>(t.schema as never),
        execute: async (input) => {
          try {
            return await t.run(input);
          } catch (e) {
            return `The tool failed: ${e instanceof Error ? e.message : String(e)}`;
          }
        },
      }),
    ])
  );

  const history: ModelMessage[] = seed.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return {
    id: config.id,
    label: config.label ?? config.model ?? "default backend",

    async send(input, signal) {
      history.push({ role: "user", content: input });

      const result = streamText({
        model: provider.chatModel(config.model ?? ""),
        system: `${systemPrompt()}\n\nCurrent project state:\n\n${describeProject()}`,
        messages: history,
        tools,
        stopWhen: stepCountIs(MAX_ITERATIONS),
        abortSignal: signal,
        maxRetries: config.maxRetries ?? 0,
      });

      let messageId: string | null = null;
      for await (const part of result.fullStream) {
        switch (part.type) {
          case "start-step":
            messageId = PgAssistant.startAssistantMessage();
            break;
          case "text-delta":
            if (messageId) {
              PgAssistant.appendToAssistantMessage(messageId, part.text);
            }
            break;
          case "finish-step":
            if (messageId) PgAssistant.discardIfEmpty(messageId);
            messageId = null;
            break;
          case "error":
            throw part.error;
          case "abort":
            throw signal?.reason ?? new Error("aborted");
        }
      }

      const { messages } = await result.response;
      history.push(...messages);
    },
  };
};
