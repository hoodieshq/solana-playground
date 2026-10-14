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

/**
 * Run a storage access, read or write, answering `fallback` (and logging why)
 * if it throws
 */
const guarded = <T>(what: string, run: () => T, fallback: T): T => {
  try {
    return run();
  } catch (error) {
    // Expected in a private window, so not reported; the panel asks again
    log.warn(`could not ${what}`, { context: { reason: reasonOf(error) } });
    return fallback;
  }
};

/** Run a storage write, answering whether it went through */
const attempt = (what: string, run: () => void) =>
  guarded(
    what,
    () => {
      run();
      return true;
    },
    false
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Every field of a `Connection`, none optional, so the copies below must name
 * each one: a field added to `Connection` fails the build here until it is
 * written and read back, instead of being dropped on a reload.
 */
type StoredConnection = { [K in keyof Required<Connection>]: Connection[K] };

/** The connection as it is written to `sessionStorage` */
const toStored = (connection: Connection): string => {
  const stored: StoredConnection = {
    id: connection.id,
    apiKey: connection.apiKey,
    endpoint: connection.endpoint && {
      baseUrl: connection.endpoint.baseUrl,
      model: connection.endpoint.model,
    },
    settings: connection.settings && {
      model: connection.settings.model,
      effort: connection.settings.effort,
    },
  };
  // `JSON.stringify` leaves out the fields that are `undefined`
  return JSON.stringify(stored);
};

/** A stored connection, rebuilt field by field so nothing unknown rides along */
const fromStored = (raw: string): Connection | null => {
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

  // An OpenAI-compatible provider cannot talk without its base URL and model
  if (provider.endpoint && parsed.endpoint === undefined) return null;

  let endpoint: Connection["endpoint"];
  if (parsed.endpoint !== undefined) {
    const stored = parsed.endpoint;
    if (
      !isRecord(stored) ||
      typeof stored.baseUrl !== "string" ||
      typeof stored.model !== "string"
    ) {
      return null;
    }
    endpoint = { baseUrl: stored.baseUrl, model: stored.model };
  }

  let settings: Connection["settings"];
  if (parsed.settings !== undefined) {
    const stored = parsed.settings;
    if (!isRecord(stored) || typeof stored.model !== "string") return null;
    const effort = provider.modelSettings?.efforts.find(
      (e) => e === stored.effort
    );
    if (!effort) return null;
    settings = { model: stored.model, effort };
  }

  const connection: StoredConnection = {
    id: provider.id,
    apiKey,
    endpoint,
    settings,
  };
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

  const kept = attempt("keep the connection for this tab", () =>
    sessionStorage.setItem(CONNECTION_KEY, toStored(connection))
  );
  if (kept) return;

  // The write failed, so an earlier backend's key may still be there and a
  // reload would reconnect to it instead of the one just chosen. Dropping it
  // makes the next load ask.
  attempt("drop the previous connection", () =>
    sessionStorage.removeItem(CONNECTION_KEY)
  );
};

/** Drop both. Disconnecting is the user saying not to reconnect. */
export const forgetBackend = () => {
  attempt("forget the backend", () => localStorage.removeItem(BACKEND_KEY));
  const forgotten = attempt("forget the key", () =>
    sessionStorage.removeItem(CONNECTION_KEY)
  );
  if (forgotten) return;

  // A key that outlives its disconnect is a privacy failure, so it is
  // reported (by what failed, never with the value). Overwriting with an
  // empty string is the fallback: `fromStored` rejects it, so the next
  // read drops the entry and the key is gone either way.
  log.error(new Error("could not forget the key kept for this tab"), {
    report: true,
  });
  attempt("blank the key", () => sessionStorage.setItem(CONNECTION_KEY, ""));
};

/** Whether this browser should reconnect to the default backend by itself */
export const isDefaultBackendRemembered = () =>
  guarded(
    "read the remembered backend",
    () => localStorage.getItem(BACKEND_KEY) === DEFAULT_ID,
    false
  );

/** The key-based connection this tab was using before a reload, if any */
export const rememberedConnection = (): Connection | null => {
  const raw = guarded(
    "read the connection kept for this tab",
    () => sessionStorage.getItem(CONNECTION_KEY),
    null
  );
  if (raw === null) return null;

  const connection = fromStored(raw);
  if (!connection) {
    log.warn("dropped a kept connection this build cannot use");
    attempt("drop the unusable connection", () =>
      sessionStorage.removeItem(CONNECTION_KEY)
    );
  }
  return connection;
};
