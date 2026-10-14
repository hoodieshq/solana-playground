import { createLogger } from "@/shared/lib/logger";
import type { Connection } from "../store";
import { PROVIDERS, type ProviderId } from "./types";

/**
 * Which backend to reconnect to on the next load.
 *
 * Two answers in two stores. The keyless default backend is remembered by id
 * in `localStorage`, across tabs and restarts: nothing secret is written.
 * A backend that needs the user's own key is remembered whole, key included,
 * in `sessionStorage`, which lives as long as this tab and no longer. Project
 * code runs in this origin and can read either store; `sessionStorage` bounds
 * that to the tab the user is already working in. See the design of the
 * OpenSpec change `assistant-own-key-storage` (HOO-1748).
 *
 * Every access is guarded. Storage throws rather than returning `null` in a
 * private window or with site data blocked, and the panel has to open either
 * way. A failure is logged by what was attempted, never with the value.
 */
const BACKEND_KEY = "assistant.backend";
const CONNECTION_KEY = "assistant.connection";

const DEFAULT_ID: ProviderId = "default";

const log = createLogger("assistant:remembered-backend");

const reasonOf = (error: unknown) =>
  error instanceof Error ? error.name : "unknown";

const attempt = (what: string, run: () => void) => {
  try {
    run();
  } catch (error) {
    // Expected in a private window, so not reported; the panel asks again
    log.warn(`could not ${what}`, { context: { reason: reasonOf(error) } });
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** A stored connection, rebuilt field by field so nothing unknown rides along */
const parseConnection = (raw: string): Connection | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Malformed is handled by the caller, which drops the entry and logs it
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.apiKey !== "string") return null;

  const { id, apiKey } = parsed;
  const provider = PROVIDERS.find((p) => p.id === id);
  if (!provider || provider.id === DEFAULT_ID) return null;

  const connection: Connection = { id: provider.id, apiKey };

  if (parsed.endpoint !== undefined) {
    const { endpoint } = parsed;
    if (
      !isRecord(endpoint) ||
      typeof endpoint.baseUrl !== "string" ||
      typeof endpoint.model !== "string"
    ) {
      return null;
    }
    connection.endpoint = { baseUrl: endpoint.baseUrl, model: endpoint.model };
  }

  if (parsed.settings !== undefined) {
    const { settings } = parsed;
    if (!isRecord(settings) || typeof settings.model !== "string") return null;
    const effort = provider.modelSettings?.efforts.find(
      (e) => e === settings.effort
    );
    if (!effort) return null;
    connection.settings = { model: settings.model, effort };
  }

  return connection;
};

/** Record the user's choice, so the next load of this tab can act on it */
export const rememberBackend = (connection: Connection) => {
  // Written down as a whole id rather than a flag, so switching to a
  // key-based backend overwrites it instead of leaving a stale `true` behind
  attempt("remember the backend", () =>
    localStorage.setItem(BACKEND_KEY, connection.id)
  );

  if (connection.id === DEFAULT_ID) {
    attempt("forget the previous key", () =>
      sessionStorage.removeItem(CONNECTION_KEY)
    );
    return;
  }

  const stored: Connection = { id: connection.id, apiKey: connection.apiKey };
  if (connection.endpoint) stored.endpoint = connection.endpoint;
  if (connection.settings) stored.settings = connection.settings;
  attempt("keep the connection for this tab", () =>
    sessionStorage.setItem(CONNECTION_KEY, JSON.stringify(stored))
  );
};

/** Drop both. Disconnecting is the user saying not to reconnect. */
export const forgetBackend = () => {
  attempt("forget the backend", () => localStorage.removeItem(BACKEND_KEY));
  attempt("forget the key", () => sessionStorage.removeItem(CONNECTION_KEY));
};

/** Whether this browser should reconnect to the default backend by itself */
export const isDefaultBackendRemembered = () => {
  try {
    return localStorage.getItem(BACKEND_KEY) === DEFAULT_ID;
  } catch (error) {
    log.warn("could not read the remembered backend", {
      context: { reason: reasonOf(error) },
    });
    return false;
  }
};

/** The key-based connection this tab was using before a reload, if any */
export const rememberedConnection = (): Connection | null => {
  let raw: string | null = null;
  attempt("read the connection kept for this tab", () => {
    raw = sessionStorage.getItem(CONNECTION_KEY);
  });
  if (raw === null) return null;

  const connection = parseConnection(raw);
  if (!connection) {
    log.warn("dropped a kept connection this build cannot use");
    attempt("drop the unusable connection", () =>
      sessionStorage.removeItem(CONNECTION_KEY)
    );
  }
  return connection;
};
