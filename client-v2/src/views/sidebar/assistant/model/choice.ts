import { PROVIDERS } from "./types";
import type { Effort, ProviderId } from "./types";
import type { Connection } from "../store";

/**
 * What the composer's model and effort menus offer, and what is picked before
 * anything is connected.
 *
 * The menus are the whole choice now — model and effort sit on the composer,
 * the way they do in Claude, instead of behind a form that took the chat's
 * place. A key is asked for only when a pick needs one it does not have yet.
 */

export interface ModelOption {
  /** The id the backend is sent */
  id: string;
  /** What the menu calls it */
  label: string;
  provider: ProviderId;
}

/* The ones worth a number key. Anthropic's two take adaptive thinking and the
   effort ladder, which the provider always sends; a model that takes neither
   would fail the first turn, so it is not offered. */
export const PRIMARY_MODELS: readonly ModelOption[] = [
  { id: "claude-opus-5-5", label: "Opus 5.5", provider: "anthropic" },
  { id: "claude-sonnet-5", label: "Sonnet 5", provider: "anthropic" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", provider: "gemini" },
];

/** Behind "More models" */
export const MORE_MODELS: readonly ModelOption[] = [
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", provider: "gemini" },
  { id: "gpt-5.1", label: "GPT-5.1", provider: "openai" },
  {
    id: "deepseek/deepseek-chat-v3.1:free",
    label: "DeepSeek V3.1",
    provider: "openrouter",
  },
];

/** The deployment's own backend, which picks its model server-side */
export const DEFAULT_OPTION: ModelOption = {
  id: "default",
  label: "Playground",
  provider: "default",
};

const ALL = [DEFAULT_OPTION, ...PRIMARY_MODELS, ...MORE_MODELS];

export const EFFORTS: ReadonlyArray<{ id: Effort; label: string }> = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "xhigh", label: "Extra high" },
  { id: "max", label: "Max" },
];

/** How far round the effort dial goes, 0..1 */
export const effortLevel = (effort: Effort) =>
  (EFFORTS.findIndex((e) => e.id === effort) + 1) / EFFORTS.length;

export const effortLabel = (effort: Effort) =>
  EFFORTS.find((e) => e.id === effort)?.label ?? effort;

/** Whether a backend takes an effort setting at all */
export const takesEffort = (provider: ProviderId) =>
  !!PROVIDERS.find((p) => p.id === provider)?.modelSettings;

/** A readable name for whatever id a backend was pointed at */
export const modelLabel = (id: string) =>
  ALL.find((m) => m.id === id)?.label ?? id.split("/").pop() ?? id;

/** The model a connection is talking to, as the menu should show it */
export const connectionModel = (connection: Connection): ModelOption => {
  const id =
    connection.id === "default"
      ? DEFAULT_OPTION.id
      : connection.settings?.model ?? connection.endpoint?.model ?? "";
  return (
    ALL.find((m) => m.id === id && m.provider === connection.id) ?? {
      id,
      label: modelLabel(id),
      provider: connection.id,
    }
  );
};

/**
 * The connection a pick amounts to, built on the current one where the backend
 * is the same so the key carries over — and only then: a key belongs to the
 * backend it was issued for.
 */
export const connectionFor = (
  option: ModelOption,
  effort: Effort,
  current: Connection | null
): Connection => {
  const same = current?.id === option.provider ? current : null;
  const info = PROVIDERS.find((p) => p.id === option.provider)!;
  return {
    id: option.provider,
    apiKey: same?.apiKey ?? "",
    endpoint: info.endpoint
      ? {
          baseUrl: same?.endpoint?.baseUrl ?? info.endpoint.baseUrl,
          model: option.id,
        }
      : undefined,
    settings: info.modelSettings ? { model: option.id, effort } : undefined,
  };
};

/** Whether a connection can be made without asking for anything */
export const isReady = (connection: Connection) => {
  const info = PROVIDERS.find((p) => p.id === connection.id);
  return (
    !!info && (!info.needsKey || !!info.keyOptional || !!connection.apiKey)
  );
};

/* ── the pick, before anything is connected ─────────────────────────────── */

let picked: { option: ModelOption; effort: Effort } = {
  option: PRIMARY_MODELS[0],
  effort: "high",
};
const listeners = new Set<() => void>();

export const PgModelChoice = {
  get: () => picked,
  set(next: Partial<typeof picked>) {
    picked = { ...picked, ...next };
    listeners.forEach((l) => l());
  },
  onDidChange(cb: () => void) {
    listeners.add(cb);
    return {
      dispose: () => {
        listeners.delete(cb);
      },
    };
  },
};
