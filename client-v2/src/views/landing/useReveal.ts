import { RefObject, useEffect, useRef, useState } from "react";

/**
 * Whether an element has been scrolled into view, once.
 *
 * Content arrives rather than being there already — the way a slide's does.
 * `IntersectionObserver` does what a ScrollTrigger would here — fire once when
 * a threshold is crossed — without a scroll listener per element or a library
 * to schedule them.
 *
 * It latches. A section that has arrived stays arrived, because replaying the
 * entrance every time someone scrolls back up is a fidget, not an effect.
 */
export const useReveal = <T extends HTMLElement>(): [RefObject<T>, boolean] => {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      // A little before the bottom edge, so it is moving by the time it lands
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, shown];
};
