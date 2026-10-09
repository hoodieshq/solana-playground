/** A panel group's sizes by panel id, as `onLayoutChanged` reports them (percent) */
export type PanelLayout = { [panelId: string]: number };

/** What of the layout survives a reload, on this device */
export interface LayoutState {
  v: 1;
  leftOpen: boolean;
  assistantOpen: boolean;
  consoleOpen: boolean;
  /** The centre and assistant group */
  h?: PanelLayout;
  /** The stage and console group */
  vert?: PanelLayout;
}

export const LAYOUT_STORAGE_KEY = "layout";

/** Today's Flow: left open, assistant open, console closed */
export const DEFAULT_LAYOUT: LayoutState = {
  v: 1,
  leftOpen: true,
  assistantOpen: true,
  consoleOpen: false,
};

export const HORIZONTAL_PANELS = ["center", "assistant"] as const;
export const VERTICAL_PANELS = ["stage", "console"] as const;

/** Why a saved layout was not used */
export type RestoreFailure = "corrupt" | "version" | "storage-unavailable";

export type Restored =
  | { kind: "saved"; state: LayoutState }
  | { kind: "none"; state: LayoutState }
  | {
      kind: "failed";
      state: LayoutState;
      reason: RestoreFailure;
      error?: unknown;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Absent, or exactly the group's panel ids, each a number */
const isPanelLayout = (value: unknown, ids: readonly string[]) => {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  return (
    keys.join() === [...ids].sort().join() &&
    keys.every((key) => typeof value[key] === "number")
  );
};

const isLayoutState = (value: Record<string, unknown>): boolean =>
  typeof value.leftOpen === "boolean" &&
  typeof value.assistantOpen === "boolean" &&
  typeof value.consoleOpen === "boolean" &&
  isPanelLayout(value.h, HORIZONTAL_PANELS) &&
  isPanelLayout(value.vert, VERTICAL_PANELS);

const failed = (reason: RestoreFailure, error?: unknown): Restored =>
  error === undefined
    ? { kind: "failed", state: DEFAULT_LAYOUT, reason }
    : { kind: "failed", state: DEFAULT_LAYOUT, reason, error };

/**
 * The saved layout, or the defaults and why. Never throws: storage that
 * cannot be reached is a reason, not a crash.
 */
export const readLayout = (
  storage: () => Pick<Storage, "getItem">
): Restored => {
  let raw: string | null;
  try {
    raw = storage().getItem(LAYOUT_STORAGE_KEY);
  } catch (error) {
    return failed("storage-unavailable", error);
  }
  if (raw === null) return { kind: "none", state: DEFAULT_LAYOUT };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return failed("corrupt", error);
  }
  if (!isRecord(parsed)) return failed("corrupt");
  if (parsed.v !== 1) return failed("version");
  if (!isLayoutState(parsed)) return failed("corrupt");
  return { kind: "saved", state: parsed as unknown as LayoutState };
};

/** Saves the layout; a storage that throws is returned, never thrown */
export const writeLayout = (
  storage: () => Pick<Storage, "setItem">,
  state: LayoutState
): { ok: true } | { ok: false; error: unknown } => {
  try {
    storage().setItem(LAYOUT_STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
};
