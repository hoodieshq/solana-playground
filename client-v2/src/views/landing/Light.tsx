import { FC, RefObject, useEffect, useRef } from "react";
import styled, { css } from "styled-components";

import { drawAurora } from "./aurora";
import { drawRibbons } from "./ribbons";
import type { Frame } from "./ribbons";
import { smoothstep } from "./trail";

/**
 * The landing's button, as light rather than as a slab: ribbons in Solana's
 * colours, rising out of the bottom of the screen and bending up into the
 * product's interface, over a glow of northern lights.
 *
 * Underneath, the northern lights (`aurora.ts`) — curtains drawn small and
 * blurred by CSS so they arrive as glow. Over them, the ribbons
 * (`ribbons.ts`), drawn at the screen's resolution and blurred progressively
 * on their way up — sharp across the words, softer as they rise, as the
 * claims further down are sharp where they are read and soft further off.
 * That is one drawing shown three times, sharp, soft and softer, each through
 * a band of the height, the bands crossfading. The whole of it is solid and
 * ends clean at its box.
 *
 * The ribbons hold still: one shape, for the product's window as it stands
 * when the page has come to rest on this first screen, worked out from the
 * layout — which neither a scroll, the page's pull nor the product's rise
 * touches — so they move with the page and never on their own. Only colour
 * moves: along the row, and in glints up every ribbon. The light's clock runs
 * faster under the pointer, or focused, while the page is scrolled or pulled,
 * and while it glides on its own — eased in quickly and out slowly, so a
 * flick carries on a moment after the hand has stopped — and the colour
 * flows on quicker with it. The window's own edge joins in: two lights run up
 * its sides and over its top on the same clock, brighter the faster it runs.
 * It only runs while it can be seen; asked for less motion, it draws one
 * frame and leaves it.
 */

/** How far the light runs on below the button's own box, as a share of its
    height. The page holds the button this far above the fold, so held there
    the light's bottom is the fold. */
export const LIGHT_BELOW = 0.148;

/* Above it and past its ends: the glow keeps to a band around the words; the
   ribbons have the screen above to rise into */
const FLOW_ABOVE = 0.18;
const LINES_ABOVE = 2.4;
const LIGHT_SIDE = 0.06;

const TOTAL = LINES_ABOVE + 1 + LIGHT_BELOW;
/* Where the button's top falls in the canvas */
const BUTTON_TOP = LINES_ABOVE / TOTAL;
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

/* How much faster it runs at full speed, and how quickly the pointer brings
   it there */
const HOT = 2.6;
const EASING = 3;

/* The scroll: how fast, in px a second, counts as full speed; how much of
   the pointer's speed-up a scroll gives; and how quickly that comes in and
   goes out again */
const SCROLL_FULL = 1600;
const SCROLL_SHARE = 0.8;
const SCROLL_IN = 8;
const SCROLL_OUT = 2.2;

/* Trips of the window's edge lights, from its sides to the middle of its
   top, per second of the light's clock */
const EDGE_RATE = 0.11;

/** What the page asks of the light (`Landing.tsx`): how hard the reader is
    pulling on it, 0 to 1 — scrolling down against it before the page lets go
    — and how hard a glide of the page's own is driving it. Either only
    quickens its clock. */
export interface Pull {
  value: number;
  drive: number;
}

interface LightProps {
  /** Whether it has come on. It rises the first time this is true. */
  on: boolean;
  /** The product's window, for the ribbons to rise into and its edge to
      light up */
  frame?: RefObject<HTMLElement>;
  /** The reader's pull: it speeds the light up */
  pull?: RefObject<Pull>;
  /** Where the top of the product's frame — the section the button is in —
      stands in the window once the page rests on this first screen. Without
      it, wherever the frame is when the light is drawn. */
  restTop?: () => number | null;
}

/* How much of the full speed-up a full pull gives. Neither the pull nor a
   glide touches how fast the colour flows along the row: that clock only the
   pointer quickens, a little */
const PULL_SPEED = 0.9;
const HOVER_FLOW = 0.6;

/* One time for every light on the page: the trail version shows its hero
   again at the bottom of its loop and jumps from that copy back to the top,
   which only goes unseen if both are drawn at the same moment. Whichever light
   ticks first in a frame moves it on. */
const shared = { clock: 12, flowClock: 12, stamp: -1 };

const Light: FC<LightProps> = ({ on, frame, pull, restTop }) => {
  const flowRef = useRef<HTMLCanvasElement>(null);
  const sharpRef = useRef<HTMLCanvasElement>(null);
  const softRef = useRef<HTMLCanvasElement>(null);
  const softerRef = useRef<HTMLCanvasElement>(null);
  /* Works the ribbons' shape out again: the layout it is measured on can
     settle after the light is first drawn */
  const reshapeRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const flow = flowRef.current;
    const sharp = sharpRef.current;
    const soft = softRef.current;
    const softer = softerRef.current;
    const flowCtx = flow?.getContext("2d");
    const sharpCtx = sharp?.getContext("2d");
    const softCtx = soft?.getContext("2d");
    const softerCtx = softer?.getContext("2d");
    if (
      !flow ||
      !sharp ||
      !soft ||
      !softer ||
      !flowCtx ||
      !sharpCtx ||
      !softCtx ||
      !softerCtx
    ) {
      return;
    }

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sizes = { fw: 1, fh: 1, lw: 1, lh: 1, sw: 1, sh: 1, px: 1 };
    let running = 0;
    let drawn = 0;
    /* The shared clocks (above) run at a speed of their own, so the pointer
       and the scroll speed the light up without jumping it to another
       moment; the calm one is for the colour's flow along the row */
    let last = 0;
    /* The pointer: whether it is on the button, and how far that has eased
       in */
    let hovered = false;
    let hover = 0;
    /* The scroll: where the page was, how fast it moves, and how much speed
       that gives */
    let scrolled = window.scrollY;
    let velocity = 0;
    let boost = 0;
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
      sizes.sw = Math.max(1, Math.round(sizes.lw * SOFT_SCALE));
      sizes.sh = Math.max(1, Math.round(sizes.lh * SOFT_SCALE));
      soft.width = sizes.sw;
      soft.height = sizes.sh;
      softer.width = sizes.sw;
      softer.height = sizes.sh;
    };

    /* Where the product's window falls in the canvas, once and for all: its
       sides as they are, since nothing moves them sideways, and its top as
       it will be when the page rests. The top is worked out from the layout
       — offsets, which no transform touches — and from the button's own
       place in it: the page holds the button on the fold while it is short
       of that place, so where it stands at rest is whichever is higher. */
    const button = sharp.closest("button");
    const section = button?.closest("section") ?? null;
    const offsetIn = (el: HTMLElement) => {
      let y = 0;
      let at: HTMLElement | null = el;
      while (at && at !== section) {
        y += at.offsetTop;
        at = at.offsetParent as HTMLElement | null;
      }
      return y;
    };
    const reshape = () => {
      const win = frame?.current;
      if (!button || !win || !section) return;
      const style = window.getComputedStyle(button);
      const held = style.position === "sticky";
      const was = button.style.position;
      if (held) button.style.position = "static";
      const own = offsetIn(button);
      if (held) button.style.position = was;
      const winAt = offsetIn(win);
      const top = restTop?.() ?? section.getBoundingClientRect().top;
      const hold =
        window.innerHeight -
        (parseFloat(style.bottom) || 0) -
        button.offsetHeight;
      const buttonAt = held ? Math.min(top + own, hold) : top + own;
      const height = TOTAL * button.offsetHeight;
      if (height > 0) {
        shape.top = BUTTON_TOP - (buttonAt - (top + winAt)) / height;
      }
      const b = button.getBoundingClientRect();
      const w = win.getBoundingClientRect();
      const left = b.left - LIGHT_SIDE * b.width;
      const width = (1 + 2 * LIGHT_SIDE) * b.width;
      if (width > 0) {
        shape.left = (w.left - left) / width;
        shape.right = (w.right - left) / width;
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
      const fade = smoothstep(0, 0.08, q) * (1 - smoothstep(0.88, 1, q));
      edge.style.setProperty("--ax", `${(50 * over).toFixed(2)}%`);
      edge.style.setProperty("--bx", `${(100 - 50 * over).toFixed(2)}%`);
      edge.style.setProperty("--ay", `${(70 * (1 - up)).toFixed(2)}%`);
      edge.style.setProperty("--lit", (fade * (0.55 + 0.45 * pace)).toFixed(3));
      edge.style.setProperty("--edge", (0.6 + 0.4 * pace).toFixed(3));
    };

    const paint = (seconds: number, speed: number, flowT = seconds) => {
      const pace = Math.max(0, Math.min(1, (speed - 1) / (HOT - 1)));
      drawAurora(flowCtx, sizes.fw, sizes.fh, seconds);
      drawRibbons(
        sharpCtx,
        sizes.lw,
        sizes.lh,
        seconds,
        flowT,
        BUTTON_TOP,
        shape
      );
      /* The same frame, smaller, for CSS to blur */
      softCtx.clearRect(0, 0, sizes.sw, sizes.sh);
      softCtx.drawImage(sharp, 0, 0, sizes.sw, sizes.sh);
      softerCtx.clearRect(0, 0, sizes.sw, sizes.sh);
      softerCtx.drawImage(soft, 0, 0);
      light(seconds, pace);
    };

    /* About sixty frames a second, on a display that offers more too */
    const tick = (now: number) => {
      running = requestAnimationFrame(tick);
      if (now - drawn < 15) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      drawn = now;

      /* How fast the page is moving, smoothed over a few frames */
      const y = window.scrollY;
      if (dt > 0) {
        velocity += ((y - scrolled) / dt - velocity) * Math.min(1, dt * 12);
      }
      scrolled = y;
      const wanted = Math.min(1, Math.abs(velocity) / SCROLL_FULL);
      boost +=
        (wanted - boost) *
        Math.min(1, dt * (wanted > boost ? SCROLL_IN : SCROLL_OUT));

      hover += ((hovered ? 1 : 0) - hover) * Math.min(1, dt * EASING);
      const drag = Math.max(0, pull?.current?.value ?? 0);
      const asked = pull?.current?.drive ?? 0;
      const drive = Number.isFinite(asked)
        ? Math.max(0, Math.min(1, asked))
        : 0;
      const speed =
        1 +
        (HOT - 1) *
          Math.min(
            1,
            Math.max(hover, SCROLL_SHARE * boost, PULL_SPEED * drag, drive)
          );
      if (shared.stamp !== now) {
        shared.clock += dt * speed;
        shared.flowClock += dt * (1 + (HOT - 1) * HOVER_FLOW * hover);
        shared.stamp = now;
      }
      paint(shared.clock, speed, shared.flowClock);
    };
    const start = () => {
      if (!running && !still) running = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (running) cancelAnimationFrame(running);
      running = 0;
      last = 0;
    };

    /* Under the pointer, or focused, it all runs faster */
    const hot = () => {
      hovered = true;
    };
    const cool = () => {
      hovered = false;
    };
    button?.addEventListener("pointerenter", hot);
    button?.addEventListener("pointerleave", cool);
    button?.addEventListener("focus", hot);
    button?.addEventListener("blur", cool);

    /* Drawn again at once whenever the shape is worked out again; running,
       the next frame would draw it anyway */
    const redraw = () => {
      reshape();
      if (still) paint(STILL_AT, 1);
      else paint(shared.clock, 1, shared.flowClock);
    };
    reshapeRef.current = redraw;

    size();
    redraw();
    /* The page's faces move its layout once they arrive */
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) redraw();
    });

    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            size();
            redraw();
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
      live = false;
      reshapeRef.current = () => undefined;
      stop();
      watch?.disconnect();
      resize?.disconnect();
      button?.removeEventListener("pointerenter", hot);
      button?.removeEventListener("pointerleave", cool);
      button?.removeEventListener("focus", hot);
      button?.removeEventListener("blur", cool);
    };
  }, [frame, pull, restTop]);

  /* Coming on, the product has risen into its place: its layout is final */
  useEffect(() => {
    if (on) reshapeRef.current();
  }, [on]);

  return (
    <Wrap $on={on} aria-hidden="true">
      <Flow ref={flowRef} />
      <Sharp ref={sharpRef} />
      <Soft ref={softRef} />
      <Softer ref={softerRef} />
    </Wrap>
  );
};

export default Light;

const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

/* Solid, and cut clean at its box: nothing of the glow's blur spills past
   its bottom */
const Wrap = styled.span<{ $on: boolean }>`
  ${({ $on }) => css`
    position: absolute;
    top: ${-LINES_ABOVE * 100}%;
    bottom: ${-LIGHT_BELOW * 100}%;
    left: ${-LIGHT_SIDE * 100}%;
    right: ${-LIGHT_SIDE * 100}%;
    z-index: -1;
    display: block;
    overflow: hidden;
    pointer-events: none;
    /* Nothing of its own to fade in: it comes with the product, whose rise
       pulls the ribbons up out of the fold */
    opacity: ${$on ? 1 : 0};
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
