import { useSyncExternalStore } from "react";

/**
 * Where the editor's tab row goes: the element `BaseEditorHead` keeps on its
 * left. The row stays mounted inside the stage, where `EditorWithTabs` puts
 * it and where its contexts are, and portals here: lifting it into the shell
 * would show it over the pages `Primary` swaps in that have no tabs.
 * One slot: the frame draws one head.
 */
let host: HTMLElement | null = null;
const listeners = new Set<() => void>();

/** Sets the host, or clears it with null, and tells every reader */
const setEditorHeadHost = (el: HTMLElement | null) => {
  if (el === host) return;
  host = el;
  listeners.forEach((listener) => listener());
};

/**
 * The head's ref callback: takes the slot on mount, and on unmount gives it
 * up only if it still holds it, so a head that unmounts after another one
 * took the slot cannot send the row back into the stage
 */
export const editorHeadHost = (el: HTMLElement | null) => {
  if (!el) return;
  setEditorHeadHost(el);
  return () => {
    if (host === el) setEditorHeadHost(null);
  };
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const snapshot = () => host;

/**
 * The head's host, or null where no head is drawn (a phone, Home, a unit
 * test); a host that appears later re-renders the reader
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

    it("lets a head give up the slot only while it holds it", () => {
      const first = document.createElement("div");
      const second = document.createElement("div");
      const releaseFirst = editorHeadHost(first)!;
      const releaseSecond = editorHeadHost(second)!;
      releaseFirst();
      expect(snapshot()).toBe(second);
      releaseSecond();
      expect(snapshot()).toBeNull();
    });

    it("stops telling a reader that unsubscribed", () => {
      const listener = vi.fn();
      subscribe(listener)();
      setEditorHeadHost(document.createElement("div"));
      expect(listener).not.toHaveBeenCalled();
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
