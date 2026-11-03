import { useSyncExternalStore } from "react";

/**
 * Where the editor's tab row goes: the element `BaseEditorHead` keeps on its
 * left. The row stays mounted inside the stage, where `EditorWithTabs` puts
 * it and where its contexts are, and portals here (design.md, decision 2).
 * One slot: the frame draws one head.
 */
let host: HTMLElement | null = null;
const listeners = new Set<() => void>();

/** The head's ref callback: sets the host on mount, clears it on unmount */
export const setEditorHeadHost = (el: HTMLElement | null) => {
  if (el === host) return;
  host = el;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const snapshot = () => host;

/**
 * The head's host, or null where no head is drawn (a phone, the legacy
 * tutorial view, a test); a host that appears later re-renders the reader
 */
export const useEditorHeadHost = () =>
  useSyncExternalStore(subscribe, snapshot, snapshot);

if (import.meta.vitest) {
  const { describe, it, expect, vi, afterEach } = import.meta.vitest;

  describe("widgets/layout-shell/model/editor-head-host", () => {
    afterEach(() => setEditorHeadHost(null));

    it("notifies readers when the host changes", () => {
      const listener = vi.fn();
      const unsubscribe = subscribe(listener);
      const el = document.createElement("div");
      setEditorHeadHost(el);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(snapshot()).toBe(el);
      setEditorHeadHost(null);
      expect(listener).toHaveBeenCalledTimes(2);
      expect(snapshot()).toBeNull();
      unsubscribe();
    });

    it("does not notify when the same host is set again", () => {
      const el = document.createElement("div");
      setEditorHeadHost(el);
      const listener = vi.fn();
      const unsubscribe = subscribe(listener);
      setEditorHeadHost(el);
      expect(listener).not.toHaveBeenCalled();
      unsubscribe();
    });
  });
}
