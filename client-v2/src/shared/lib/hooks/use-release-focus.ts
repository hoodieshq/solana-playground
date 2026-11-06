import * as React from "react";

/**
 * A ref for a modal overlay's content that takes focus off whatever holds it
 * outside the content, as the content mounts, and a close handler that gives
 * focus back to it.
 *
 * Radix hides the rest of the page with `aria-hidden` in its first effect and
 * moves focus into the overlay only a render later, once its focus scope has
 * its container. Focus left outside (the editor when a shortcut opens
 * Settings, or a menu trigger, which Radix keeps from taking focus on press)
 * then sits in the hidden part, and Chrome refuses the attribute: "Blocked
 * aria-hidden on an element because its descendant retained focus". A ref
 * attaches before any effect runs, so the page is hidden with nothing focused
 * in it.
 *
 * The focus scope records what was focused only after that blur, so an
 * overlay that relies on it to return focus on close (ContextMenu) returns
 * it to the body. Such an overlay passes the second element as its
 * `onCloseAutoFocus`, after the caller's own, which focuses the released
 * element again. Overlays that focus their trigger on close (Dialog,
 * DropdownMenu, Select) do not need it.
 *
 * `ref` is the caller's own ref to the content, passed on.
 */
function useReleaseFocus<T extends HTMLElement>(ref: React.Ref<T> | undefined) {
  const released = React.useRef<HTMLElement | undefined>(undefined);

  const releaseFocus = React.useCallback(
    (node: T | null) => {
      if (node) {
        const active = node.ownerDocument.activeElement;
        if (active instanceof HTMLElement && !node.contains(active)) {
          released.current = active;
          active.blur();
        }
      }
      if (typeof ref === "function") return ref(node);
      if (ref) ref.current = node;
    },
    [ref]
  );

  const returnFocus = React.useCallback((event: Event) => {
    const element = released.current;
    released.current = undefined;
    if (event.defaultPrevented || !element?.isConnected) return;
    event.preventDefault();
    element.focus();
  }, []);

  return [releaseFocus, returnFocus] as const;
}

export { useReleaseFocus };
