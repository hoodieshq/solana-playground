import { useSyncExternalStore } from "react";

import { createLogger } from "@/shared/lib/logger";

const log = createLogger("setup-list:storage");

/**
 * Where the checklist keeps what only this device knows: whether it was
 * dismissed, whether all four steps were once done together (the assistant
 * connection is per tab, so the live state alone would bring "3 of 4" back
 * in a new tab), and whether a network was ever chosen.
 */
export const SETUP_LIST_KEY = "setup-list";

export interface SetupMarks {
  dismissed: boolean;
  completed: boolean;
  networkChosen: boolean;
}

const nothingDone = (): SetupMarks => ({
  dismissed: false,
  completed: false,
  networkChosen: false,
});

const isMarks = (value: unknown): value is SetupMarks => {
  if (typeof value !== "object" || value === null) return false;
  const marks = value as Record<string, unknown>;
  return (
    typeof marks.dismissed === "boolean" &&
    typeof marks.completed === "boolean" &&
    typeof marks.networkChosen === "boolean"
  );
};

/**
 * The stored marks. Nothing stored is nothing done; a value of the wrong
 * shape, or storage that cannot be read, is nothing done too, logged, so a
 * bad value never takes the navigation down.
 */
export const readMarks = (storage?: Storage): SetupMarks => {
  let raw: string | null;
  try {
    // Resolved in here: where site data is blocked, reaching
    // `window.localStorage` is itself what throws
    raw = (storage ?? localStorage).getItem(SETUP_LIST_KEY);
  } catch (e) {
    log.warn("marks unreadable: storage unavailable", { context: { e } });
    return nothingDone();
  }
  if (raw === null) return nothingDone();

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (e) {
    log.warn("marks unreadable: not JSON", { context: { e } });
    return nothingDone();
  }
  if (isMarks(value)) return value;

  log.warn("marks unreadable: wrong shape");
  return nothingDone();
};

/**
 * The marks held in memory, read from storage once. A mark takes effect on
 * this page before it is written, so a refused write (reported) still hides
 * a dismissed checklist until the next load.
 */
export const createSetupMarks = (storage?: Storage) => {
  let marks: SetupMarks | null = null;
  const listeners = new Set<() => void>();

  const get = () => {
    marks ??= readMarks(storage);
    return marks;
  };

  return {
    get,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    mark(patch: Partial<SetupMarks>) {
      const current = get();
      marks = {
        dismissed: patch.dismissed ?? current.dismissed,
        completed: patch.completed ?? current.completed,
        networkChosen: patch.networkChosen ?? current.networkChosen,
      };
      listeners.forEach((listener) => listener());
      try {
        (storage ?? localStorage).setItem(
          SETUP_LIST_KEY,
          JSON.stringify(marks)
        );
      } catch (e) {
        log.error(e, { report: true, context: { patch } });
      }
    },
  };
};

export const setupMarks = createSetupMarks();

/** Counts "Choose a network": any pick in the settings, the current one too */
export const markNetworkChosen = () => setupMarks.mark({ networkChosen: true });

export const useSetupMarks = () =>
  useSyncExternalStore(setupMarks.subscribe, setupMarks.get);
