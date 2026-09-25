import { useLayoutEffect, useRef } from "react";

/**
 * Carrying an element across a change of slide.
 *
 * Figma's Smart Animate matches layers by name between two frames and moves
 * each one from where it was to where it is. This is the same thing for the
 * deck: anything marked `data-carry="<name>"` that exists on both slides is
 * measured on the way out, and on the way in it starts from the old position
 * and travels to the new one. "Explore" slides left as "Learn," arrives; the
 * mark shrinks into its place in the lockup.
 *
 * The measurement has to happen before React replaces the slide, so the deck
 * calls `noteCarried` in the same handler that changes the index, while the
 * old slide is still the one on screen.
 */

const origins = new Map<string, DOMRect>();
let notedAt = 0;

/* A position is only good for the change it was noted for. Anything nothing
   claimed is forgotten, so a word on some later page — the landing sets the
   same line — never flies in from a slide that was left long ago. */
const FRESH_MS = 400;
const fresh = () => performance.now() - notedAt < FRESH_MS;

/** Record where every carryable element on the outgoing slide is */
export const noteCarried = (root: ParentNode | null | undefined) => {
  origins.clear();
  notedAt = performance.now();
  root?.querySelectorAll<HTMLElement>("[data-carry]").forEach((el) => {
    const key = el.dataset.carry;
    if (key) origins.set(key, el.getBoundingClientRect());
  });
};

export const CARRY_MS = 900;
const EASE = "cubic-bezier(0.45, 0, 0.2, 1)";

/**
 * Whether the slide being rendered will carry `name` in. Known before the
 * render, because the deck notes the outgoing slide first — which lets a
 * slide hold its new arrivals back until the carried ones have moved out of
 * their way, instead of landing a new word on top of an old one in transit.
 */
export const willCarry = (name: string) => fresh() && origins.has(name);

/** How long new arrivals wait when something is being carried past them */
export const MAKE_ROOM_MS = Math.round(CARRY_MS * 0.5);

/**
 * Bring an element in from its twin on the last slide. Returns whether it was
 * carried; if it was, its own entrance is cancelled — the journey replaces it.
 */
const carryIn = (el: HTMLElement): boolean => {
  const key = el.dataset.carry;
  if (!key || !fresh()) return false;
  const from = origins.get(key);
  if (!from) return false;
  origins.delete(key);

  /* One of it on screen: the outgoing twin steps out of the way at once */
  document
    .querySelectorAll<HTMLElement>(
      `[data-leaving] [data-carry="${CSS.escape(key)}"]`
    )
    .forEach((twin) => (twin.style.visibility = "hidden"));

  const to = el.getBoundingClientRect();
  if (!to.width || !to.height) return false;

  el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return true;

  /* Uniform scale, from the heights. A word that gains a comma is wider on the
     new slide than the old, and scaling each axis separately would squash it
     for the length of the move. */
  const k = from.height / to.height;
  el.animate(
    [
      {
        transformOrigin: "0 0",
        transform: `translate(${from.left - to.left}px, ${
          from.top - to.top
        }px) scale(${k})`,
      },
      { transformOrigin: "0 0", transform: "none" },
    ],
    { duration: CARRY_MS, easing: EASE }
  );
  return true;
};

/** Attach to an element that carries `data-carry` */
export const useCarry = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    if (ref.current) carryIn(ref.current);
  }, []);
  return ref;
};
