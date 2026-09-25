import { FC, RefObject, useEffect, useRef } from "react";
import styled, { css, keyframes } from "styled-components";

import { drawAurora } from "./aurora";
import { drawRibbons } from "./ribbons";
import type { Frame, Shake } from "./ribbons";
import { drawStreaks } from "./streaks";
import { smoothstep } from "./trail";

/**
 * The trail version's button, as light rather than as a slab: ribbons in
 * Solana's colours, rising out of the bottom of the screen and bending in
 * towards the product, over a glow of northern lights.
 *
 * Underneath, the northern lights (`aurora.ts`) — curtains drawn small and
 * blurred by CSS so they arrive as glow. Over them, the ribbons
 * (`ribbons.ts`), measured against the product's window so they bend in
 * towards its top, drawn at the screen's resolution and blurred progressively on
 * their way up — sharp across the words, softer as they rise, as the claims
 * further down are sharp where they are read and soft further off. That is
 * one drawing shown three times, sharp, soft and softer, each through a band
 * of the height, the bands crossfading.
 *
 * Under the pointer, or focused, the light's clock runs faster — eased, so it
 * surges rather than jumps: the ribbons slide faster, everything shakes,
 * and streaks (`streaks.ts`) shoot up from the bottom of the screen to the
 * top — the claims' lines of light. The window's own edge joins in: two
 * lights run up its sides and over its top on the same clock, brighter the
 * faster it runs. It only runs while it can be seen; asked for less motion,
 * it draws one frame and leaves it.
 *
 * While the page holds the button against the bottom of the screen, the light
 * stands on the edge: its canvases end at the fold and the ribbons run solid
 * into it. Scrolled to its place on the page, they fade out below the button.
 */

/** How far the light runs on below the button's own box, as a share of its
    height. The page holds the button this far above the fold, so held there
    the light's bottom is the fold. */
export const LIGHT_BELOW = 0.148;

/* Above it and past its ends: the glow keeps to a band around the words; the
   ribbons and the streaks have the screen above to rise into */
const FLOW_ABOVE = 0.18;
const LINES_ABOVE = 2.4;
const LIGHT_SIDE = 0.06;

const TOTAL = LINES_ABOVE + 1 + LIGHT_BELOW;
/* Where the button's top and bottom fall in the canvas */
const BUTTON_TOP = LINES_ABOVE / TOTAL;
const BUTTON_FOOT = (LINES_ABOVE + 1) / TOTAL;
/* Where the glow's band starts, from the top of the canvas */
const FLOW_TOP = ((LINES_ABOVE - FLOW_ABOVE) / TOTAL) * 100;

/* The progressive blur, in percent of the canvas's height from its top: all
   sharp below the first, all soft at the second, all softer above the third */
const SHARP_BELOW = (BUTTON_TOP - 0.02) * 100;
const SOFT_AT = (BUTTON_TOP - 0.2) * 100;
const SOFTER_ABOVE = (BUTTON_TOP - 0.4) * 100;

/* The glow is drawn small and blurred; the ribbons at the screen's
   resolution, up to a point; their soft copies at half that, since the blur
   hides it */
const FLOW_BACKING = 640;
const LINES_BACKING = 1800;
const SOFT_SCALE = 0.5;

/* The frame drawn when motion is asked to stay still */
const STILL_AT = 4.2;

/* How much faster it runs under the pointer, and how quickly it gets there */
const HOT = 2.6;
const EASING = 3;

/* How hard it shakes at full speed, in the screen's pixels */
const SHAKE = 2.4;

/* Trips of the window's edge lights, from its sides to the middle of its
   top, per second of the light's clock */
const EDGE_RATE = 0.11;

/* Held against the fold while the light's bottom is within the first of
   these, in px, of it; let go of entirely by the second */
const HELD_WITHIN = 2;
const LET_GO_BY = 64;

interface LightProps {
  /** Whether it has come on. It rises the first time this is true. */
  on: boolean;
  /** The product's window, for the ribbons to bend towards and its edge to
      light up */
  frame?: RefObject<HTMLElement>;
}

const Light: FC<LightProps> = ({ on, frame }) => {
  const flowRef = useRef<HTMLCanvasElement>(null);
  const sharpRef = useRef<HTMLCanvasElement>(null);
  const softRef = useRef<HTMLCanvasElement>(null);
  const softerRef = useRef<HTMLCanvasElement>(null);
  const streaksRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const flow = flowRef.current;
    const sharp = sharpRef.current;
    const soft = softRef.current;
    const softer = softerRef.current;
    const streaks = streaksRef.current;
    const flowCtx = flow?.getContext("2d");
    const sharpCtx = sharp?.getContext("2d");
    const softCtx = soft?.getContext("2d");
    const softerCtx = softer?.getContext("2d");
    const streaksCtx = streaks?.getContext("2d");
    if (
      !flow ||
      !sharp ||
      !soft ||
      !softer ||
      !streaks ||
      !flowCtx ||
      !sharpCtx ||
      !softCtx ||
      !softerCtx ||
      !streaksCtx
    ) {
      return;
    }

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sizes = { fw: 1, fh: 1, lw: 1, lh: 1, sw: 1, sh: 1, px: 1 };
    let frame_ = 0;
    let drawn = 0;
    /* Its own clock, running at `speed`, so the hover speeds the light up
       without jumping it to another moment */
    let clock = 12;
    let speed = 1;
    let target = 1;
    let last = 0;
    let hold = 1;
    /* The product's window in the canvas, until it has been measured */
    const shape: Frame = { left: 0.09, right: 0.95, top: BUTTON_TOP - 0.3 };

    /* Layout sizes, not on-screen ones — the entrance scales the canvases,
       and the drawing should not change with it */
    const size = () => {
      const fScale = Math.min(1, FLOW_BACKING / Math.max(1, flow.offsetWidth));
      sizes.fw = Math.max(1, Math.round(flow.offsetWidth * fScale));
      sizes.fh = Math.max(1, Math.round(flow.offsetHeight * fScale));
      flow.width = sizes.fw;
      flow.height = sizes.fh;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      sizes.px = Math.min(dpr, LINES_BACKING / Math.max(1, sharp.offsetWidth));
      sizes.lw = Math.max(1, Math.round(sharp.offsetWidth * sizes.px));
      sizes.lh = Math.max(1, Math.round(sharp.offsetHeight * sizes.px));
      sharp.width = sizes.lw;
      sharp.height = sizes.lh;
      streaks.width = sizes.lw;
      streaks.height = sizes.lh;
      sizes.sw = Math.max(1, Math.round(sizes.lw * SOFT_SCALE));
      sizes.sh = Math.max(1, Math.round(sizes.lh * SOFT_SCALE));
      soft.width = sizes.sw;
      soft.height = sizes.sh;
      softer.width = sizes.sw;
      softer.height = sizes.sh;
    };

    /* Where the canvas is laid out, worked out from the button — whose box
       no transform of the light's touches — and from it, how far the button
       is held against the bottom of the screen and where the product's
       window falls in the canvas */
    const button = sharp.closest("button");
    const measure = () => {
      if (!button) return;
      const b = button.getBoundingClientRect();
      const top = b.top - LINES_ABOVE * b.height;
      const height = TOTAL * b.height;
      const left = b.left - LIGHT_SIDE * b.width;
      const width = (1 + 2 * LIGHT_SIDE) * b.width;
      hold =
        1 -
        smoothstep(HELD_WITHIN, LET_GO_BY, window.innerHeight - (top + height));
      const win = frame?.current?.getBoundingClientRect();
      if (win && width > 0 && height > 0) {
        shape.left = (win.left - left) / width;
        shape.right = (win.right - left) / width;
        shape.top = (win.top - top) / height;
      }
    };

    /* The window's edge lights: up its sides from low down, then over its
       top to the middle, where they meet — on the light's clock */
    const edge = frame?.current;
    const light = (seconds: number, pace: number) => {
      if (!edge) return;
      const q = (seconds * EDGE_RATE) % 1;
      const up = Math.min(1, q / 0.5);
      const over = Math.max(0, (q - 0.5) / 0.5);
      const y = 70 * (1 - up);
      const x = 50 * over;
      const fade = smoothstep(0, 0.08, q) * (1 - smoothstep(0.88, 1, q));
      edge.style.setProperty("--ax", `${x.toFixed(2)}%`);
      edge.style.setProperty("--bx", `${(100 - x).toFixed(2)}%`);
      edge.style.setProperty("--ay", `${y.toFixed(2)}%`);
      edge.style.setProperty("--lit", (fade * (0.55 + 0.45 * pace)).toFixed(3));
      edge.style.setProperty("--edge", (0.6 + 0.4 * pace).toFixed(3));
    };

    const paint = (seconds: number) => {
      const pace = Math.max(0, Math.min(1, (speed - 1) / (HOT - 1)));
      /* A shake on the light's clock, harder the faster it runs */
      const hard = SHAKE * pace * sizes.px;
      const shake: Shake = {
        x:
          hard *
          (0.6 * Math.sin(seconds * 47.3) +
            0.4 * Math.sin(seconds * 83.9 + 1.7)),
        y:
          hard *
          (0.6 * Math.sin(seconds * 53.1 + 0.4) +
            0.4 * Math.sin(seconds * 71.3 + 2.1)),
      };
      drawAurora(flowCtx, sizes.fw, sizes.fh, seconds);
      drawRibbons(
        sharpCtx,
        sizes.lw,
        sizes.lh,
        seconds,
        BUTTON_FOOT,
        BUTTON_TOP,
        shape,
        pace,
        hold,
        { x: shake.x * 0.5, y: shake.y * 0.5 }
      );
      /* The same frame, smaller, for CSS to blur */
      softCtx.clearRect(0, 0, sizes.sw, sizes.sh);
      softCtx.drawImage(sharp, 0, 0, sizes.sw, sizes.sh);
      softerCtx.clearRect(0, 0, sizes.sw, sizes.sh);
      softerCtx.drawImage(soft, 0, 0);
      drawStreaks(
        streaksCtx,
        sizes.lw,
        sizes.lh,
        seconds,
        shape,
        pace,
        sizes.px,
        shake
      );
      light(seconds, pace);
    };

    /* About sixty frames a second, on a display that offers more too */
    const tick = (now: number) => {
      frame_ = requestAnimationFrame(tick);
      if (now - drawn < 15) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      drawn = now;
      speed += (target - speed) * Math.min(1, dt * EASING);
      clock += dt * speed;
      measure();
      paint(clock);
    };
    const start = () => {
      if (!frame_ && !still) frame_ = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (frame_) cancelAnimationFrame(frame_);
      frame_ = 0;
      last = 0;
    };

    /* Under the pointer, or focused, it all runs faster */
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

    /* Standing still, the one frame still follows the button off the fold */
    let settle = 0;
    const onScroll = () => {
      if (settle) return;
      settle = requestAnimationFrame(() => {
        settle = 0;
        measure();
        paint(STILL_AT);
      });
    };
    if (still) window.addEventListener("scroll", onScroll, { passive: true });

    size();
    measure();
    paint(still ? STILL_AT : clock);

    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            size();
            measure();
            paint(still ? STILL_AT : clock);
          });
    resize?.observe(sharp);

    const watch =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) start();
            else stop();
          });
    if (watch) watch.observe(sharp);
    else start();

    return () => {
      stop();
      if (settle) cancelAnimationFrame(settle);
      window.removeEventListener("scroll", onScroll);
      watch?.disconnect();
      resize?.disconnect();
      button?.removeEventListener("pointerenter", hot);
      button?.removeEventListener("pointerleave", cool);
      button?.removeEventListener("focus", hot);
      button?.removeEventListener("blur", cool);
    };
  }, [frame]);

  return (
    <Wrap $on={on} aria-hidden="true">
      <Flow ref={flowRef} />
      <Sharp ref={sharpRef} />
      <Soft ref={softRef} />
      <Softer ref={softerRef} />
      <Streaks ref={streaksRef} />
    </Wrap>
  );
};

export default Light;

/* It comes on after the product has risen: up out of the bottom edge, from a
   low, narrow glow, as a light warms up rather than switches on */
const ignite = keyframes`
  from { opacity: 0; transform: scale(0.82, 0.3); }
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
    /* The entrance grows from the bottom edge, which stays put: held against
       the fold, the light never lifts off it */
    transform-origin: 50% 100%;
    transition: opacity 480ms ease;
    ${$on &&
    css`
      animation: ${ignite} 1500ms cubic-bezier(0.16, 1, 0.3, 1) 850ms backwards;
    `}

    /* Under the pointer it brightens; the rest of the change is drawn */
    button:hover > &,
    button:focus-visible > & {
      opacity: 1;
    }

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      transition: none;
    }
  `}
`;

/* The blur scales with the frame, so the glow has the same softness at any
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
  /* A glow under the ribbons, not a haze over them */
  opacity: 0.45;
  filter: blur(${SOFT}) brightness(1) saturate(1);
  transition: filter 480ms ${EASE};

  button:hover & {
    filter: blur(${SOFT}) brightness(1.14) saturate(1.08);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Layer = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
`;

/* Each of the ribbons' three layers is seen through its band of the height;
   where one band gives way the next takes over, so the blur deepens evenly */
const band = (gradient: string) => css`
  -webkit-mask-image: ${gradient};
  mask-image: ${gradient};
`;

const Sharp = styled(Layer)`
  filter: saturate(1.05);
  ${band(
    `linear-gradient(to bottom, transparent ${SOFT_AT}%, #000 ${SHARP_BELOW}%)`
  )}
`;

const Soft = styled(Layer)`
  filter: blur(max(1.5px, calc(3 * var(--u)))) saturate(1.05);
  ${band(
    `linear-gradient(to bottom, transparent ${SOFTER_ABOVE}%, #000 ${SOFT_AT}%, transparent ${SHARP_BELOW}%)`
  )}
`;

const Softer = styled(Layer)`
  filter: blur(max(4px, calc(8 * var(--u)))) saturate(1.05);
  ${band(
    `linear-gradient(to bottom, #000 ${SOFTER_ABOVE}%, transparent ${SOFT_AT}%)`
  )}
`;

/* Added to the light beneath rather than laid over it, as light is */
const Streaks = styled(Layer)`
  mix-blend-mode: screen;
`;
