/** A panel group's sizes by panel id, as `onLayoutChanged` reports them (percent) */
export type PanelLayout = { [panelId: string]: number };

export const HORIZONTAL_PANELS = ["center", "assistant"] as const;
export const VERTICAL_PANELS = ["stage", "console"] as const;

/** The centre and assistant group's sizes */
export type HorizontalLayout = Record<typeof HORIZONTAL_PANELS[number], number>;
/** The stage and console group's sizes */
export type VerticalLayout = Record<typeof VERTICAL_PANELS[number], number>;

export type LayoutPanel = "left" | "assistant" | "console";

/** What of the layout survives a reload, on this device */
export interface LayoutState {
  v: 1;
  open: Record<LayoutPanel, boolean>;
  h?: HorizontalLayout;
  vert?: VerticalLayout;
}

/** What is stored: version 1's three flags, unchanged since it first shipped */
interface StoredLayout {
  v: 1;
  leftOpen: boolean;
  assistantOpen: boolean;
  consoleOpen: boolean;
  h?: HorizontalLayout;
  vert?: VerticalLayout;
}

export const LAYOUT_STORAGE_KEY = "layout";

/** The layout a first visit gets: left open, assistant open, console closed */
export const DEFAULT_LAYOUT: Readonly<LayoutState> = Object.freeze({
  v: 1,
  open: Object.freeze({ left: true, assistant: true, console: false }),
});

/** Why a saved layout was not used */
export type RestoreFailure = "corrupt" | "version" | "storage-unavailable";

/** Callers use `DEFAULT_LAYOUT` for everything but `saved` */
export type Restored =
  | { kind: "saved"; state: LayoutState }
  | { kind: "none" }
  | { kind: "failed"; reason: "version" }
  | {
      kind: "failed";
      reason: "corrupt" | "storage-unavailable";
      error: unknown;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSize = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100;

/** Exactly the group's panel ids, each a size in percent */
const isPanelLayout = <Id extends string>(
  value: unknown,
  ids: readonly Id[]
): value is Record<Id, number> => {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  return (
    keys.join() === [...ids].sort().join() &&
    keys.every((key) => isSize(value[key]))
  );
};

const isStoredLayout = (
  value: Record<string, unknown>
): value is Record<string, unknown> & StoredLayout =>
  value.v === 1 &&
  typeof value.leftOpen === "boolean" &&
  typeof value.assistantOpen === "boolean" &&
  typeof value.consoleOpen === "boolean" &&
  (value.h === undefined || isPanelLayout(value.h, HORIZONTAL_PANELS)) &&
  (value.vert === undefined || isPanelLayout(value.vert, VERTICAL_PANELS));

/** The group's layout as the library reports it, or null if a panel is missing */
export const horizontalOf = (layout: PanelLayout): HorizontalLayout | null =>
  isPanelLayout(layout, HORIZONTAL_PANELS) ? layout : null;

/** The group's layout as the library reports it, or null if a panel is missing */
export const verticalOf = (layout: PanelLayout): VerticalLayout | null =>
  isPanelLayout(layout, VERTICAL_PANELS) ? layout : null;

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
    return { kind: "failed", reason: "storage-unavailable", error };
  }
  if (raw === null) return { kind: "none" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { kind: "failed", reason: "corrupt", error };
  }
  if (!isRecord(parsed)) {
    return {
      kind: "failed",
      reason: "corrupt",
      error: new Error("Not an object"),
    };
  }
  if (parsed.v !== 1) return { kind: "failed", reason: "version" };
  if (!isStoredLayout(parsed)) {
    return {
      kind: "failed",
      reason: "corrupt",
      error: new Error("Unexpected shape"),
    };
  }
  // Field by field, so a key this version does not know is not carried along
  const state: LayoutState = {
    v: 1,
    open: {
      left: parsed.leftOpen,
      assistant: parsed.assistantOpen,
      console: parsed.consoleOpen,
    },
    h: parsed.h,
    vert: parsed.vert,
  };
  return { kind: "saved", state };
};

/** Saves the layout; a storage that throws is returned, never thrown */
export const writeLayout = (
  storage: () => Pick<Storage, "setItem">,
  state: LayoutState
): { ok: true } | { ok: false; error: unknown } => {
  try {
    const stored: StoredLayout = {
      v: 1,
      leftOpen: state.open.left,
      assistantOpen: state.open.assistant,
      consoleOpen: state.open.console,
      h: state.h,
      vert: state.vert,
    };
    storage().setItem(LAYOUT_STORAGE_KEY, JSON.stringify(stored));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
};
