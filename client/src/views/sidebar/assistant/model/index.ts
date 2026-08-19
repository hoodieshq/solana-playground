import { createAnthropicProvider } from "./anthropic";
import { createScriptedProvider } from "./scripted";
import type { Provider, ProviderId } from "./types";

export * from "./types";

/**
 * Build the provider for a conversation.
 *
 * @param id which backend to talk to
 * @param apiKey the user's key, for providers that need one
 * @returns a provider that owns its own history
 */
export const createProvider = (id: ProviderId, apiKey: string): Provider => {
  switch (id) {
    case "scripted":
      return createScriptedProvider();
    case "anthropic":
      return createAnthropicProvider(apiKey);
    case "openai":
      throw new Error("The OpenAI provider is not wired up yet.");
  }
};
