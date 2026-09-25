import { FC, useEffect, useRef } from "react";
import styled, { css, keyframes } from "styled-components";

import { drawAurora } from "./aurora";

/**
 * The trail version's button, as light rather than as a slab: the northern
 * lights in Solana's colours, drawn behind the words (see `aurora.ts` for the
 * curtains themselves).
 *
 * This is the part that puts them on the page. A small canvas, redrawn about
 * sixty times a second and blurred by CSS on its way to the screen, so the
 * bands arrive as glow and the rays as soft streaks. It only runs while it
 * can be seen — an IntersectionObserver starts and stops it — and asked for
 * less motion it draws one frame and leaves it.
 *
 * The canvas runs past the button on every side, and furthest below it: the
 * page holds the button that far above the fold, and the curtains stop well
 * inside the canvas, so the light has faded out before the edge of the screen
 * and nothing is ever cut by it.
 */

/** How far the light runs on below the button's own box, as a share of its
    height. The page holds the button this far above the fold. */
export const LIGHT_BELOW = 0.148;

/* Above it, for the skyline's spire and flames to rise into — about one
   button's height, held clear of the headline — and a little past its ends,
   for the sides to curve down in */
const LIGHT_ABOVE = 1.75;
const LIGHT_SIDE = 0.03;

/* Where in the canvas the button's middle falls, for the light to open out
   from when it comes on */
const ORIGIN_Y = ((LIGHT_ABOVE + 0.5) / (LIGHT_ABOVE + 1 + LIGHT_BELOW)) * 100;

/* How much faster it all moves under the pointer, and how quickly it gets
   there — eased, so the light surges rather than jumps */
const HOT = 2.6;
const EASING = 3;

/* The canvas is drawn at most this many pixels wide and blurred on the way
   up, so every frame is cheap */
const BACKING = 640;

/* The frame drawn when motion is asked to stay still */
const STILL_AT = 4.2;

interface LightProps {
  /** Whether it has come on. It opens out the first time this is true. */
  on: boolean;
}

const Light: FC<LightProps> = ({ on }) => {
  const sky = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = sky.current;
    const ctx = canvas ? canvas.getContext("2d") : null;
    if (!canvas || !ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 1;
    let height = 1;
    let frame = 0;
    let drawn = 0;
    /* Its own clock, running at `speed`: the hover speeds the light up
       without it jumping to another moment */
    let clock = 12;
    let speed = 1;
    let target = 1;
    let last = 0;

    /* Layout size, not the on-screen one — the hover lift and the entrance
       scale it, and the drawing should not change with them */
    const size = () => {
      const scale = Math.min(1, BACKING / Math.max(1, canvas.offsetWidth));
      width = Math.max(1, Math.round(canvas.offsetWidth * scale));
      height = Math.max(1, Math.round(canvas.offsetHeight * scale));
      canvas.width = width;
      canvas.height = height;
    };
    const paint = (seconds: number) => drawAurora(ctx, width, height, seconds);

    /* About sixty frames a second, on a display that offers more too */
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - drawn < 15) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      drawn = now;
      speed += (target - speed) * Math.min(1, dt * EASING);
      clock += dt * speed;
      paint(clock);
    };
    const start = () => {
      if (!frame && !still) frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    };

    /* Under the pointer, or focused, it all runs faster */
    const button = canvas.closest("button");
    const hot = () => {
      target = HOT;
    };
    const cool = () => {
      target = 1;
    };
    button?.addEventListener("pointerenter", hot);
    button?.addEventListener("pointerleave", cool);
    button?.addEventListener("focus", hot);
    button?.addEventListener("blur", cool);

    size();
    paint(still ? STILL_AT : clock);

    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            size();
            paint(still ? STILL_AT : clock);
          });
    resize?.observe(canvas);

    const watch =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) start();
            else stop();
          });
    if (watch) watch.observe(canvas);
    else start();

    return () => {
      stop();
      watch?.disconnect();
      resize?.disconnect();
      button?.removeEventListener("pointerenter", hot);
      button?.removeEventListener("pointerleave", cool);
      button?.removeEventListener("focus", hot);
      button?.removeEventListener("blur", cool);
    };
  }, []);

  return (
    <Wrap $on={on} aria-hidden="true">
      <Sky ref={sky} />
    </Wrap>
  );
};

export default Light;

/* It comes on after the product has risen: opening out from a narrow, dim
   glow to its full width, as a light warms up rather than switches on */
const ignite = keyframes`
  from { opacity: 0; transform: translate3d(0, 9%, 0) scale(0.62, 0.42); }
`;

const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

const Wrap = styled.span<{ $on: boolean }>`
  ${({ $on }) => css`
    position: absolute;
    top: ${-LIGHT_ABOVE * 100}%;
    bottom: ${-LIGHT_BELOW * 100}%;
    left: ${-LIGHT_SIDE * 100}%;
    right: ${-LIGHT_SIDE * 100}%;
    z-index: -1;
    display: block;
    pointer-events: none;
    opacity: 0.94;
    transform-origin: 50% ${ORIGIN_Y}%;
    transition: opacity 480ms ease, transform 620ms ${EASE};
    ${$on &&
    css`
      animation: ${ignite} 1500ms cubic-bezier(0.16, 1, 0.3, 1) 850ms backwards;
    `}

    /* Under the pointer the light lifts a little and brightens, the way the
       slab used to rise */
    button:hover > & {
      opacity: 1;
      transform: translate3d(0, -2.5%, 0) scale(1.015);
    }

    button:focus-visible > & {
      opacity: 1;
    }

    button:active > & {
      transform: translate3d(0, -1%, 0) scale(1.005);
      transition-duration: 160ms;
    }

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      transition: none;
    }
  `}
`;

/* The blur scales with the frame, so the light has the same softness at any
   width; the same filter list at rest and lit, so the change is a smooth one */
const SOFT = `max(6px, calc(15 * var(--u)))`;

const Sky = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  filter: blur(${SOFT}) brightness(1) saturate(1);
  transition: filter 480ms ${EASE};

  button:hover & {
    filter: blur(${SOFT}) brightness(1.14) saturate(1.08);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
