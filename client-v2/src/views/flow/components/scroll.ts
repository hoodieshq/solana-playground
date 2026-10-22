import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { css } from "styled-components";

/**
 * The system's own scrollbar, in its slim form. Styling the scrollbar's
 * parts by hand turns the overlay bars macOS draws into permanent grey
 * slabs, so only the standard properties are set: width and colour.
 */
export const thinScroll = css`
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
`;

export interface ScrollEdges {
  /** More below the fold */
  bottom: boolean;
  /** More past the right edge */
  right: boolean;
  /** The scrollbars' own room, in px, which a fade laid over must leave */
  barX: number;
  barY: number;
}

/** How far from an edge still counts as at it, for subpixel scroll offsets */
const SLACK = 2;

/**
 * Whether a scroller has more to show below or to the right, kept current
 * as it scrolls, resizes or grows.
 */
export const useScrollEdges = (ref: RefObject<HTMLElement>): ScrollEdges => {
  const [edges, setEdges] = useState<ScrollEdges>({
    bottom: false,
    right: false,
    barX: 0,
    barY: 0,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const bottom = el.scrollHeight - el.clientHeight - el.scrollTop > SLACK;
      const right = el.scrollWidth - el.clientWidth - el.scrollLeft > SLACK;
      const barX = el.offsetHeight - el.clientHeight;
      const barY = el.offsetWidth - el.clientWidth;
      setEdges((e) =>
        e.bottom === bottom &&
        e.right === right &&
        e.barX === barX &&
        e.barY === barY
          ? e
          : { bottom, right, barX, barY }
      );
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    const grow = new MutationObserver(measure);
    grow.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      el.removeEventListener("scroll", measure);
      resize.disconnect();
      grow.disconnect();
    };
  }, [ref]);

  return edges;
};

/**
 * Content fading out at the edges it continues past: a hint that there is
 * more, on any ground, since it is a mask rather than a colour laid over.
 */
export const fadeEdges = (
  { bottom, right }: Pick<ScrollEdges, "bottom" | "right">,
  size = "2.5rem"
) => {
  if (!bottom && !right) return css``;
  const down = `linear-gradient(to bottom, #000 calc(100% - ${size}), transparent)`;
  const across = `linear-gradient(to right, #000 calc(100% - ${size}), transparent)`;
  const masks = [bottom && down, right && across].filter(Boolean).join(", ");
  return css`
    -webkit-mask-image: ${masks};
    mask-image: ${masks};
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
  `;
};
