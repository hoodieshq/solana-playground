import type { DocsLink } from "../lib/link";

type Listener = (link: DocsLink | null) => void;

let current: DocsLink | null = null;
let broken = false;
const listeners = new Set<Listener>();

/**
 * The docs link the open project came from. The `/open` route sets it and
 * clears it when another route takes over, so a project opened any other way
 * never shows the link's source line or asks for its SOL.
 */
export const PgDocsLink = {
  get opened() {
    return current;
  },

  /**
   * Whether the open view is "This link is broken". The frame around it
   * still shows the stage row, and its Run would run a project nobody opened.
   */
  get broken() {
    return broken;
  },

  set(link: DocsLink | null, opts: { broken?: boolean } = {}) {
    current = link;
    broken = opts.broken ?? false;
    listeners.forEach((listener) => listener(link));
  },

  /**
   * @param listener called with the new link on every change
   * @returns a disposable that removes the listener
   */
  onDidChange(listener: Listener) {
    listeners.add(listener);
    return { dispose: () => void listeners.delete(listener) };
  },
};
