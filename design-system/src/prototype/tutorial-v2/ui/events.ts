// Requests between parts that don't share state: an answer's Show me opens the nav, Ask me anything
// first focuses the composer, a chip's question flies into the feed. Nothing here is progress, so
// none of it belongs in the store
type Name = "nav:open" | "composer:focus" | "feed:live"

const bus = new EventTarget()

export const emit = (name: Name) => bus.dispatchEvent(new Event(name))

export function on(name: Name, fn: () => void) {
  bus.addEventListener(name, fn)
  return () => bus.removeEventListener(name, fn)
}
