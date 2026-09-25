import { FC, RefObject, useEffect, useRef } from "react";
import styled, { css } from "styled-components";

import { drawAurora } from "./aurora";
import { drawRibbons } from "./ribbons";
import type { Frame, Shake } from "./ribbons";
import { drawStreaks } from "./streaks";
import { smoothstep } from "./trail";

/**
 * The trail version's button, as light rather than as a slab: ribbons in
 * Solana's colours, rising out of the bottom of the screen and bending up into
 * the product's interface, over a glow of northern lights.
 *
 * Underneath, the northern lights (`aurora.ts`) — curtains drawn small and
 * blurred by CSS so they arrive as glow. Over them, the ribbons
 * (`ribbons.ts`), measured against the product's window so they rise into it,
 * drawn at the screen's resolution and blurred progressively on their way up —
 * sharp across the words, softer as they rise, as the claims further down are
 * sharp where they are read and soft further off. That is one drawing shown
 * three times, sharp, soft and softer, each through a band of the height, the
 * bands crossfading. The whole of it is solid and ends clean at its box.
 *
 * The light's clock runs faster under the pointer, or focused, and while the
 * page is scrolled — eased in quickly and out slowly, so a flick carries on a
 * moment after the hand has stopped: the ribbons slide faster and reach
 * further, and streaks (`streaks.ts`) race up them into the product — the
 * claims' lines of light. A scroll also pulls on a spring that stretches the
 * ribbons, which springs back once the page is still, and the reader's pull
 * against the first screen stretches them further. When the page glides on
 * its own, the glide drives the light: it runs at full speed, the ribbons
 * stretch, bend in and whip, and it shakes a little; under the pointer
 * everything shakes a little too. The window's own edge joins in: two lights
 * run up its sides and over its top on the same clock, brighter the faster it
 * runs. It only runs while it can be seen; asked for less motion, it draws one
 * frame and leaves it.
 *
 * The ribbons always stand on the bottom of the screen. While the page holds
 * the button against it, the light's canvases end at the fold and the ribbons
 * come up out of it; before that, while the product is still rising with the
 * button, the fold is higher up the canvas and they stand there, reaching up
 * to the window as it comes — the interface pulls them up.
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

/* The spring a scroll pulls on: its stiffness, its damping — a touch under
   critical, so it settles with a small overshoot — how hard a full-speed
   scroll pulls, and how far it may stretch or squeeze the ribbons */
const SPRING = 48;
const DAMPING = 7.5;
const PULL = 6;
const STRETCH_MAX = 0.18;
const SQUEEZE_MAX = 0.1;

/* How hard it shakes under the pointer at full speed, in the screen's
   pixels */
const SHAKE = 2.4;

/* Trips of the window's edge lights, from its sides to the middle of its
   top, per second of the light's clock */
const EDGE_RATE = 0.11;

/** What the page asks of the light (`Landing.tsx`): how hard the reader is
    pulling on it, 0 to 1 — scrolling down against it before the page lets go
    — and how hard a glide of the page's own is driving it */
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
  /** The reader's pull: it stretches the ribbons and speeds them up */
  pull?: RefObject<Pull>;
}

/* How far a full pull lengthens the ribbons upward, and how much of the full
   speed-up it gives their glints and streaks; how far a glide at full drive
   lengthens them, and how hard it shakes them against the pointer's shake.
   Neither touches how fast they slide sideways: that clock only the pointer
   quickens, a little */
const PULL_RISE = 1;
const PULL_SPEED = 0.9;
const DRIVE_RISE = 0.8;
const DRIVE_SHAKE = 0.5;
const HOVER_SLIDE = 0.6;

const Light: FC<LightProps> = ({ on, frame, pull }) => {
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
    let running = 0;
    let drawn = 0;
    /* Its own clock, running at a speed of its own, so the pointer and the
       scroll speed the light up without jumping it to another moment */
    let clock = 12;
    /* And a calm one for sliding along the bottom */
    let slideClock = 12;
    let last = 0;
    /* The pointer: whether it is on the button, and how far that has eased
       in */
    let hovered = false;
    let hover = 0;
    /* The scroll: where the page was, how fast it moves, how much speed that
       gives, and the spring it pulls on */
    let scrolled = window.scrollY;
    let velocity = 0;
    let boost = 0;
    let stretch = 0;
    let stretchSpeed = 0;
    /* The product's window in the canvas, until it has been measured, and
       where the bottom of the screen falls in it */
    const shape: Frame = { left: 0.09, right: 0.95, top: BUTTON_TOP - 0.3 };
    let ground = 1;

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

    /* Where the product's window and the bottom of the screen fall in the
       canvas, worked out from the button — whose box no transform of the
       light's touches, while the product's rise moves both alike */
    const button = sharp.closest("button");
    const measure = () => {
      if (!button) return;
      const b = button.getBoundingClientRect();
      const top = b.top - LINES_ABOVE * b.height;
      const height = TOTAL * b.height;
      const left = b.left - LIGHT_SIDE * b.width;
      const width = (1 + 2 * LIGHT_SIDE) * b.width;
      if (height > 0) ground = (window.innerHeight - top) / height;
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
      const fade = smoothstep(0, 0.08, q) * (1 - smoothstep(0.88, 1, q));
      edge.style.setProperty("--ax", `${(50 * over).toFixed(2)}%`);
      edge.style.setProperty("--bx", `${(100 - 50 * over).toFixed(2)}%`);
      edge.style.setProperty("--ay", `${(70 * (1 - up)).toFixed(2)}%`);
      edge.style.setProperty("--lit", (fade * (0.55 + 0.45 * pace)).toFixed(3));
      edge.style.setProperty("--edge", (0.6 + 0.4 * pace).toFixed(3));
    };

    const paint = (
      seconds: number,
      speed: number,
      drive = 0,
      slideT = seconds
    ) => {
      /* The pull and the page's glides lengthen the ribbons upward */
      const rise = PULL_RISE * (pull?.current?.value ?? 0) + DRIVE_RISE * drive;
      const pace = Math.max(0, Math.min(1, (speed - 1) / (HOT - 1)));
      /* A shake on the light's clock under the pointer, or while the page
         glides, harder the faster it runs */
      const hard =
        SHAKE * Math.max(hover, DRIVE_SHAKE * drive) * pace * sizes.px;
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
        BUTTON_TOP,
        shape,
        pace,
        stretch,
        { x: shake.x * 0.5, y: shake.y * 0.5 },
        ground,
        rise,
        slideT
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
        BUTTON_TOP,
        shape,
        pace,
        sizes.px,
        shake,
        ground,
        rise,
        slideT
      );
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

      /* The spring: pulled up by a scroll down the page, down by one back up */
      const tug = Math.max(-1, Math.min(1, velocity / SCROLL_FULL));
      stretchSpeed +=
        (PULL * tug - SPRING * stretch - DAMPING * stretchSpeed) * dt;
      stretch = Math.max(
        -SQUEEZE_MAX,
        Math.min(STRETCH_MAX, stretch + stretchSpeed * dt)
      );

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
      clock += dt * speed;
      slideClock += dt * (1 + (HOT - 1) * HOVER_SLIDE * hover);
      measure();
      paint(clock, speed, drive, slideClock);
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

    /* Standing still, the one frame still follows the window as it scrolls */
    let settle = 0;
    const onScroll = () => {
      if (settle) return;
      settle = requestAnimationFrame(() => {
        settle = 0;
        measure();
        paint(STILL_AT, 1);
      });
    };
    if (still) window.addEventListener("scroll", onScroll, { passive: true });

    size();
    measure();
    paint(still ? STILL_AT : clock, 1, 0, slideClock);

    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            size();
            measure();
            paint(still ? STILL_AT : clock, 1, 0, slideClock);
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
  }, [frame, pull]);

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

/* Added to the light beneath rather than laid over it, as light is */
const Streaks = styled(Layer)`
  mix-blend-mode: screen;
`;
