import type { ModelProvider } from "@/shared/lib/ai";
import type { Connection } from "../store";
import type { Effort } from "./types";

/**
 * Which backend a thread was created with, or a reply produced by.
 *
 * Never the API key, in any form -- not the value, not a hash, not the last
 * four characters. A thread is synced to the account; the key never is.
 */
export interface BackendParams {
  provider: ModelProvider;
  /** Absent only on a backend that picks its own model server-side */
  model?: string;
  /** Only the OpenAI-compatible providers have one */
  baseUrl?: string;
  effort?: Effort;
}

/** The parameters a connection is identified by, with the key left behind */
export const paramsOf = (
  connection: Connection | null
): BackendParams | undefined => {
  if (!connection) return undefined;

  const params: BackendParams = { provider: connection.id };
  const model = connection.endpoint?.model ?? connection.settings?.model;
  if (model) params.model = model;
  if (connection.endpoint?.baseUrl)
    params.baseUrl = connection.endpoint.baseUrl;
  if (connection.settings?.effort) params.effort = connection.settings.effort;
  return params;
};
