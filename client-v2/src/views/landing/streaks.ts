import { colour } from "./aurora";
import type { Frame, Shake } from "./ribbons";
import {
  RIBBON_COUNT,
  courseFor,
  courseX,
  courseY,
  footOf,
  glintOf,
} from "./ribbons";
import { seeded, smoothstep } from "./trail";

/**
 * The flying claims' lines of light (`Flight.tsx`), for the trail button:
 * while the light runs fast — under the pointer, or as the page is scrolled —
 * streaks race up the ribbons (`ribbons.ts`) from below the fold into the
 * product's interface, gathering speed as they go.
 *
 * Each runs up one ribbon's own course, bend and all, so the speed reads as
 * the light itself rushing into the product rather than as lines laid over
 * it; each is its ribbon's colour turned up — never white — fading in as it
 * sets off and out again as it reaches the interface. Every trip takes a new
 * ribbon, and never one on its way round the end of the row. The field shakes
 * with the light under the pointer.
 */

const fract = (n: number) => n - Math.floor(n);

/* A number that looks random but is the same for the same input */
const hash = (n: number) => fract(Math.sin(n * 12.9898) * 43758.5453);

interface Streak {
  phase: number;
  /** Its own speed, as each of the claims' lines has */
  k: number;
  width: number;
  strength: number;
}

const COUNT = 80;

/* Trips up the ribbons per second of the light's clock, at k = 1 — which
   runs faster under the pointer and on a scroll, so these fly */
const RATE = 0.32;

/* Gathering speed as they go: the claims' lines move out at a speed that
   grows with the distance gone, which makes the distance an exponential */
const GROW = 1.9;
const rise = (u: number) => (Math.exp(GROW * u) - 1) / (Math.exp(GROW) - 1);

/* Points along each streak, so it keeps to its ribbon's bend */
const STEPS = 6;

const STREAKS: Streak[] = (() => {
  const random = seeded(41);
  return Array.from({ length: COUNT }, () => ({
    phase: random(),
    k: 0.6 + random() * 0.8,
    width: 0.7 + random() * 1,
    strength: 0.45 + random() * 0.55,
  }));
})();

/**
 * One frame of the streaks at time `t`, in seconds, on the ribbons' canvas,
 * `w` × `h`, with the button's top at `buttonTop`, the product's window
 * `frame` and the bottom of the screen at `ground`. `pace`, 0 to 1, is how far
 * the light has sped up: none, and there are no streaks. `px` is the canvas's
 * pixels to the screen's, for the line widths; `shake` moves the whole field;
 * `warp` bends the courses in with the ribbons'.
 */
export const drawStreaks = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  buttonTop: number,
  frame: Frame,
  pace: number,
  px = 1,
  shake: Shake = { x: 0, y: 0 },
  ground = 1,
  warp = 0
) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);
  if (pace < 0.01) return;

  const c = courseFor(frame, buttonTop, ground, warp);
  if (c.stand - c.top < 0.01) return;
  const shown = smoothstep(0, 0.3, pace);

  ctx.translate(shake.x, shake.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  STREAKS.forEach((s, i) => {
    const run = s.phase + t * RATE * s.k;
    const trip = Math.floor(run);
    const u = run - trip;
    /* The ribbon this trip runs up */
    const j = Math.floor(hash(trip * 7.13 + i * 1.37) * RIBBON_COUNT);
    const { at, u: place } = footOf(j, t);
    if (place < 0.12 || place > 0.88) return;

    const gone = rise(u);
    const head = 0.96 * gone;
    const length = (0.06 + 0.22 * pace * s.k) * (0.3 + gone);
    const tail = Math.max(0, head - length);
    const alpha =
      (0.14 + 0.5 * pace) *
      s.strength *
      shown *
      smoothstep(0, 0.1, u) *
      (1 - smoothstep(0.8, 1, u));
    if (alpha < 0.01) return;

    ctx.beginPath();
    let x1 = 0;
    let y1 = 0;
    let x2 = 0;
    let y2 = 0;
    for (let k = 0; k <= STEPS; k += 1) {
      const y = courseY(c, tail + (head - tail) * (k / STEPS));
      const x = courseX(c, at, y) * w;
      if (k === 0) {
        x1 = x;
        y1 = y * h;
        ctx.moveTo(x1, y1);
      } else {
        x2 = x;
        y2 = y * h;
        ctx.lineTo(x2, y2);
      }
    }
    const tint = glintOf(j);
    const stroke = ctx.createLinearGradient(x1, y1, x2, y2);
    stroke.addColorStop(0, colour(tint, 0));
    stroke.addColorStop(1, colour(tint, alpha));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = s.width * (0.8 + 0.7 * pace) * px;
    ctx.stroke();
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
};
