import { colour, vivid } from "./aurora";
import { FEET_FROM, FEET_TO, hueAtFoot, leanX } from "./ribbons";
import { seeded, smoothstep } from "./trail";

/**
 * The flying claims' lines of light (`Flight.tsx`), for the trail button:
 * under the pointer, streaks rush down the cone of ribbons (`ribbons.ts`) out
 * of the point it gathers to, spreading and gathering speed as they come — the
 * speed the claims below are flown in with, the moment you reach for the
 * button.
 *
 * The same lines as the claims': hairlines, faster and wider the nearer they
 * come, each fading in out of the distance and out again before the words.
 * But where the claims' come straight out of a vanishing point, these follow
 * the cone's lines, curving out as its ribbons do, and each is the colour of
 * the ribbons it runs down, turned up — never white. They only exist while
 * the light runs faster than at rest, and every trip comes down a new line.
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

const COUNT = 90;

/* Trips down the cone per second of the light's clock, at k = 1 — which runs
   faster under the pointer, so these fly */
const RATE = 0.3;

/* Gathering speed as they come: the claims' lines move out at a speed that
   grows with the distance gone, which makes the distance an exponential */
const GROW = 1.9;
const rise = (u: number) => (Math.exp(GROW * u) - 1) / (Math.exp(GROW) - 1);

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
 * One frame of the streaks at time `t`, in seconds, on a canvas `w` × `h` —
 * the cone's own, with the button's top at `wordsTop`, a share of its height.
 * `pace`, 0 to 1, is how far the light has sped up: none, and there are no
 * streaks. `px` is the canvas's pixels to the screen's, for the line widths.
 */
export const drawStreaks = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  wordsTop: number,
  pace: number,
  px = 1
) => {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);
  if (pace < 0.01) return;

  const shown = smoothstep(0, 0.3, pace);
  /* From the top of the canvas down to the button's top */
  const from = 0.02;
  const to = wordsTop + 0.03;

  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  STREAKS.forEach((s, i) => {
    const run = s.phase + t * RATE * s.k;
    const trip = Math.floor(run);
    const u = run - trip;
    /* The line this trip comes down — more of them through the middle */
    const line =
      FEET_FROM +
      (FEET_TO - FEET_FROM) *
        (0.15 +
          0.7 * ((hash(trip * 7.13 + i) + hash(trip * 3.71 + i * 1.9)) / 2));

    const near = rise(u);
    const head = from + (to - from) * near;
    const length = (0.03 + 0.16 * pace * s.k) * (0.25 + near);
    const tail = Math.max(from, head - length);
    const alpha =
      (0.12 + 0.48 * pace) *
      s.strength *
      shown *
      smoothstep(0, 0.12, u) *
      (1 - smoothstep(0.8, 1, u));
    if (alpha < 0.01) return;

    const x1 = leanX(line, tail) * w;
    const y1 = tail * h;
    const x2 = leanX(line, head) * w;
    const y2 = head * h;

    const tint = vivid(hueAtFoot(line, t));
    const stroke = ctx.createLinearGradient(x1, y1, x2, y2);
    stroke.addColorStop(0, colour(tint, 0));
    stroke.addColorStop(1, colour(tint, alpha));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = s.width * (0.8 + 0.7 * pace) * (0.6 + 0.8 * near) * px;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  /* Gone before the top of the frame and its sides */
  ctx.globalCompositeOperation = "destination-in";
  const edges = ctx.createLinearGradient(0, 0, 0, h);
  edges.addColorStop(0, "rgba(0, 0, 0, 0)");
  edges.addColorStop(0.1, "rgba(0, 0, 0, 1)");
  edges.addColorStop(1, "rgba(0, 0, 0, 1)");
  ctx.fillStyle = edges;
  ctx.fillRect(0, 0, w, h);
  const sides = ctx.createLinearGradient(0, 0, w, 0);
  sides.addColorStop(0, "rgba(0, 0, 0, 0)");
  sides.addColorStop(0.06, "rgba(0, 0, 0, 1)");
  sides.addColorStop(0.94, "rgba(0, 0, 0, 1)");
  sides.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = sides;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
};
