import type { ModelShown } from "./choice";
import type { KeyedProviderId } from "./connection";

/** The head's words around the model's name; only `model` may be cut */
export interface HeadLabel {
  before: string;
  /** `null` while there is no model to name */
  model: string | null;
  after: string;
}

/**
 * Whose key a keyed model runs on, as "your … key" reads it. Not
 * `PROVIDERS`' names: "your OpenAI-compatible key" says nothing to a person.
 */
const KEY_OWNER: Record<KeyedProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  gemini: "Gemini",
};

/** What the assistant's head reads for the model the composer shows (Spec 04's copy) */
export const headLabel = (shown: ModelShown): HeadLabel => {
  if (shown.kind === "default") {
    return { before: "Assistant · ", model: shown.label, after: " · hosted" };
  }
  if (shown.kind === "keyed") {
    return {
      before: "",
      model: shown.label,
      after: ` · your ${KEY_OWNER[shown.provider]} key`,
    };
  }
  return { before: "Assistant", model: null, after: "" };
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("widgets/assistant/model/head-label", () => {
    it("names the hosted model as hosted", () => {
      expect(
        headLabel({ kind: "default", label: "GLM 5.3 Flash", connected: true })
      ).toEqual({
        before: "Assistant · ",
        model: "GLM 5.3 Flash",
        after: " · hosted",
      });
    });

    it("names a keyed model with the provider whose key it runs on", () => {
      expect(
        headLabel({
          kind: "keyed",
          provider: "openrouter",
          model: "deepseek/deepseek-chat-v3.1:free",
          label: "deepseek/deepseek-chat-v3.1:free",
          effort: null,
        })
      ).toEqual({
        before: "",
        model: "deepseek/deepseek-chat-v3.1:free",
        after: " · your OpenRouter key",
      });
    });

    it("says OpenAI, not the provider list's OpenAI-compatible", () => {
      expect(
        headLabel({
          kind: "keyed",
          provider: "openai",
          model: "gpt-5.1",
          label: "gpt-5.1",
          effort: null,
        }).after
      ).toBe(" · your OpenAI key");
    });

    it("reads Assistant alone with no model, and while checking", () => {
      const alone = { before: "Assistant", model: null, after: "" };
      expect(headLabel({ kind: "none" })).toEqual(alone);
      expect(headLabel({ kind: "checking" })).toEqual(alone);
    });
  });
}
