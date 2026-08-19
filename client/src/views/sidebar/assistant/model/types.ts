/** Input a tool receives, straight from the model — always validate before use */
export type ToolInput = Record<string, unknown>;

/** A JSON Schema object describing one tool's arguments */
export interface ToolSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties: false;
}

/**
 * A tool, described without reference to any vendor.
 *
 * Each provider adapts these into its own SDK's shape. The gating lives inside
 * `run` — a tool that changes state awaits the user before returning — so it is
 * enforced identically no matter which provider is driving.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  schema: ToolSchema;
  /** @returns what the model should see as the result */
  run: (input: ToolInput) => Promise<string> | string;
}

/** Which model backend the panel is talking to */
export type ProviderId = "scripted" | "anthropic" | "openai";

/**
 * One conversation with one backend.
 *
 * A provider owns its own message history and streams text into the store as it
 * arrives, so the UI does not need to know anything about the wire format.
 */
export interface Provider {
  readonly id: ProviderId;
  /** Shown in the panel footer */
  readonly label: string;
  /**
   * Take one turn.
   *
   * @param input what the user typed
   */
  send(input: string): Promise<void>;
}

/** How a provider is described on the connect screen */
export interface ProviderInfo {
  id: ProviderId;
  name: string;
  /** One line on what picking this gets you */
  description: string;
  /** Whether the user has to supply a key */
  needsKey: boolean;
  /** Where to get a key, when one is needed */
  keyUrl?: string;
  /** Placeholder for the key field */
  keyPlaceholder?: string;
  /** Declared but not implemented yet — shown, but cannot be selected */
  unavailable?: boolean;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "scripted",
    name: "Demo",
    description:
      "A scripted walkthrough of the build-error path. No key, no network — " +
      "useful for seeing the flow and for demoing without depending on an API.",
    needsKey: false,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "claude-opus-5, with the SDK's tool runner.",
    needsKey: true,
    keyUrl: "https://console.anthropic.com/",
    keyPlaceholder: "sk-ant-…",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Not wired up yet — next after the demo provider.",
    unavailable: true,
    needsKey: true,
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-…",
  },
];
