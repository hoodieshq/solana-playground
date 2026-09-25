import { FC, useEffect, useRef } from "react";
import styled, { css, keyframes } from "styled-components";

import { drawAurora } from "./aurora";
import { drawWarp } from "./warp";

/**
 * The trail version's button, as light rather than as a slab: a warp made of
 * lines, over a flow of colour.
 *
 * Two canvases. Underneath, the northern lights (`aurora.ts`) — curtains in
 * Solana's colours, drawn small and blurred by CSS so they arrive as glow.
 * Over them, the warp (`warp.ts`) — hairline streaks out of the button's
 * middle, drawn sharp at the screen's own resolution, so the speed reads as
 * lines and the colour as a flow beneath them.
 *
 * Both run off one clock that runs faster under the pointer — eased, so the
 * warp surges rather than jumps. They only run while they can be seen, and
 * asked for less motion they draw one frame and leave it.
 *
 * The lines run past the button on every side, furthest above it; the light
 * has faded out before any edge, and the page holds the button far enough
 * above the fold that nothing is cut.
 */

/** How far the light runs on below the button's own box, as a share of its
    height. The page holds the button this far above the fold. */
export const LIGHT_BELOW = 0.148;

/* Above it and past its ends: the flow keeps to a band around the words, the
   lines have room to rise into */
const FLOW_ABOVE = 0.18;
const LINES_ABOVE = 0.9;
const LIGHT_SIDE = 0.06;

const TOTAL = LINES_ABOVE + 1 + LIGHT_BELOW;
/* Where the button's middle falls in the lines' canvas: the warp's heart */
const HEART_Y = (LINES_ABOVE + 0.5) / TOTAL;
/* Where the flow's band starts, from the top of the lines' canvas */
const FLOW_TOP = ((LINES_ABOVE - FLOW_ABOVE) / TOTAL) * 100;

/* The flow is drawn small and blurred; the lines at the screen's resolution,
   up to a point */
const FLOW_BACKING = 640;
const LINES_BACKING = 1800;

/* The frame drawn when motion is asked to stay still */
const STILL_AT = 4.2;

/* How much faster it runs under the pointer, and how quickly it gets there */
const HOT = 2.6;
const EASING = 3;

interface LightProps {
  /** Whether it has come on. It opens out the first time this is true. */
  on: boolean;
}

const Light: FC<LightProps> = ({ on }) => {
  const flowRef = useRef<HTMLCanvasElement>(null);
  const linesRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const flow = flowRef.current;
    const lines = linesRef.current;
    const flowCtx = flow?.getContext("2d");
    const linesCtx = lines?.getContext("2d");
    if (!flow || !lines || !flowCtx || !linesCtx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sizes = { fw: 1, fh: 1, lw: 1, lh: 1 };
    let frame = 0;
    let drawn = 0;
    /* Its own clock, running at `speed`, so the hover speeds the light up
       without jumping it to another moment */
    let clock = 12;
    let speed = 1;
    let target = 1;
    let last = 0;

    /* Layout sizes, not on-screen ones — the hover lift and the entrance
       scale the canvases, and the drawing should not change with them */
    const size = () => {
      const fScale = Math.min(1, FLOW_BACKING / Math.max(1, flow.offsetWidth));
      sizes.fw = Math.max(1, Math.round(flow.offsetWidth * fScale));
      sizes.fh = Math.max(1, Math.round(flow.offsetHeight * fScale));
      flow.width = sizes.fw;
      flow.height = sizes.fh;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const lScale = Math.min(
        dpr,
        LINES_BACKING / Math.max(1, lines.offsetWidth)
      );
      sizes.lw = Math.max(1, Math.round(lines.offsetWidth * lScale));
      sizes.lh = Math.max(1, Math.round(lines.offsetHeight * lScale));
      lines.width = sizes.lw;
      lines.height = sizes.lh;
    };
    const paint = (seconds: number) => {
      drawAurora(flowCtx, sizes.fw, sizes.fh, seconds);
      drawWarp(linesCtx, sizes.lw, sizes.lh, seconds, 0.5, HEART_Y);
    };

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
    const button = lines.closest("button");
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
    resize?.observe(lines);

    const watch =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) start();
            else stop();
          });
    if (watch) watch.observe(lines);
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
      <Flow ref={flowRef} />
      <Lines ref={linesRef} />
    </Wrap>
  );
};

export default Light;

/* It comes on after the product has risen: opening out from a narrow, dim
   glow at the button's middle, as a light warms up rather than switches on */
const ignite = keyframes`
  from { opacity: 0; transform: translate3d(0, 4%, 0) scale(0.62, 0.42); }
`;

const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

const Wrap = styled.span<{ $on: boolean }>`
  ${({ $on }) => css`
    position: absolute;
    top: ${-LINES_ABOVE * 100}%;
    bottom: ${-LIGHT_BELOW * 100}%;
    left: ${-LIGHT_SIDE * 100}%;
    right: ${-LIGHT_SIDE * 100}%;
    z-index: -1;
    display: block;
    pointer-events: none;
    opacity: 0.94;
    transform-origin: 50% ${HEART_Y * 100}%;
    transition: opacity 480ms ease, transform 620ms ${EASE};
    ${$on &&
    css`
      animation: ${ignite} 1500ms cubic-bezier(0.16, 1, 0.3, 1) 850ms backwards;
    `}

    /* Under the pointer the light lifts a little and brightens, the way the
       slab used to rise */
    button:hover > & {
      opacity: 1;
      transform: translate3d(0, -1.2%, 0) scale(1.015);
    }

    button:focus-visible > & {
      opacity: 1;
    }

    button:active > & {
      transform: translate3d(0, -0.5%, 0) scale(1.005);
      transition-duration: 160ms;
    }

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      transition: none;
    }
  `}
`;

/* The blur scales with the frame, so the flow has the same softness at any
   width; the same filter list at rest and lit, so the change is a smooth one */
const SOFT = `max(6px, calc(15 * var(--u)))`;

const Flow = styled.canvas`
  position: absolute;
  top: ${FLOW_TOP}%;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: ${100 - FLOW_TOP}%;
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

/* Sharp, with just enough softness that a hairline glows */
const Lines = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  filter: blur(0.35px);
`;
