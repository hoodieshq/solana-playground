import { createAnthropicProvider } from "./anthropic";
import { createOpenAiProvider } from "./openai";
import { createScriptedProvider } from "./scripted";
import { PROVIDERS } from "./types";
import type { Provider, ProviderId } from "./types";

export * from "./types";

/**
 * Build the provider for a conversation.
 *
 * @param id which backend to talk to
 * @param apiKey the user's key, for providers that need one
 * @param endpoint base URL and model, for OpenAI-compatible providers
 * @returns a provider that owns its own history
 */
export const createProvider = (
  id: ProviderId,
  apiKey: string,
  endpoint?: { baseUrl: string; model: string }
): Provider => {
  switch (id) {
    case "scripted":
      return createScriptedProvider();
    case "anthropic":
      return createAnthropicProvider(apiKey);
    case "openai":
    case "openrouter": {
      const defaults = PROVIDERS.find((p) => p.id === id)!.endpoint!;
      return createOpenAiProvider({ id, apiKey, ...(endpoint ?? defaults) });
    }
  }
};
