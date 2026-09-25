import { colour, vivid } from "./aurora";
import type { Frame, Shake } from "./ribbons";
import { rampAt } from "./ribbons";
import { seeded, smoothstep } from "./trail";

/**
 * The flying claims' lines of light (`Flight.tsx`), for the trail button:
 * under the pointer, streaks shoot up from the bottom of the screen past the
 * product and the headline, gathering speed as they go, shaking with it — the
 * speed the claims below are flown in with, the moment you reach for the
 * button.
 *
 * The same lines as the claims': hairlines, faster and longer the further
 * they have gone, each fading in as it sets off and out again before the
 * top. They lean in a little towards a point above the product, as the
 * claims' lines lean out of theirs, and each is the colour of the light
 * where it rises, turned up — never white. The whole field shakes, and every
 * line wavers on its own, harder the faster the light runs. They only exist
 * while it runs faster than at rest, and every trip starts somewhere new.
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

const COUNT = 110;

/* Trips up the canvas per second of the light's clock, at k = 1 — which
   runs faster under the pointer, so these fly */
const RATE = 0.32;

/* Gathering speed as they go: the claims' lines move out at a speed that
   grows with the distance gone, which makes the distance an exponential */
const GROW = 1.9;
const rise = (u: number) => (Math.exp(GROW * u) - 1) / (Math.exp(GROW) - 1);

/* The point above the product they lean towards, as a share of the canvas's
   height above its top */
const VANISH = -0.35;

const STREAKS: Streak[] = (() => {
  const random = seeded(41);
  return Array.from({ length: COUNT }, () => ({
    phase: random(),
    k: 0.6 + random() * 0.8,
    width: 0.6 + random() * 0.9,
    strength: 0.45 + random() * 0.55,
  }));
})();

/**
 * One frame of the streaks at time `t`, in seconds, on a canvas `w` × `h`,
 * leaning in towards the middle of the product's window `frame`. `pace`, 0 to
 * 1, is how far the light has sped up: none, and there are no streaks. `px`
 * is the canvas's pixels to the screen's, for the line widths; `shake` moves
 * the whole field.
 */
export const drawStreaks = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  frame: Frame,
  pace: number,
  px = 1,
  shake: Shake = { x: 0, y: 0 }
) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);
  if (pace < 0.01) return;

  const cx = (frame.left + frame.right) / 2;
  const shown = smoothstep(0, 0.3, pace);
  /* Straight towards the point above the product */
  const lean = (x0: number, y: number) =>
    cx + (x0 - cx) * ((y - VANISH) / (1 - VANISH));

  ctx.translate(shake.x, shake.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  STREAKS.forEach((s, i) => {
    const run = s.phase + t * RATE * s.k;
    const trip = Math.floor(run);
    const u = run - trip;
    /* Where across the bottom this trip sets off */
    const x0 = 0.03 + 0.94 * hash(trip * 7.13 + i * 1.37);

    const gone = rise(u);
    const head = 1 - 0.98 * gone;
    const length = (0.05 + 0.24 * pace * s.k) * (0.3 + gone);
    const tail = Math.min(1.02, head + length);
    const flicker = 0.8 + 0.2 * Math.sin(t * 37 + i * 2.3);
    const alpha =
      (0.12 + 0.5 * pace) *
      s.strength *
      shown *
      flicker *
      smoothstep(0, 0.1, u) *
      (1 - smoothstep(0.8, 1, u));
    if (alpha < 0.01) return;

    /* Each line wavers across its path, harder the faster it all runs */
    const waver = pace * 1.8 * px * Math.sin(t * 61 + i * 1.7);
    const x1 = lean(x0, tail) * w + waver;
    const y1 = tail * h;
    const x2 = lean(x0, head) * w + waver;
    const y2 = head * h;

    const tint = vivid(rampAt(lean(x0, head), t));
    const stroke = ctx.createLinearGradient(x1, y1, x2, y2);
    stroke.addColorStop(0, colour(tint, 0));
    stroke.addColorStop(1, colour(tint, alpha));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = s.width * (0.8 + 0.7 * pace) * px;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  /* Gone before the top of the canvas */
  ctx.globalCompositeOperation = "destination-in";
  const edges = ctx.createLinearGradient(0, 0, 0, h);
  edges.addColorStop(0, "rgba(0, 0, 0, 0)");
  edges.addColorStop(0.08, "rgba(0, 0, 0, 1)");
  edges.addColorStop(1, "rgba(0, 0, 0, 1)");
  ctx.fillStyle = edges;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
};
