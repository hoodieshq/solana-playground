import { clamp01, seeded, smoothstep } from "./trail";

/**
 * The northern lights, in Solana's colours — the glow under the trail
 * version's button, with its ribbons (`ribbons.ts`) drawn over it.
 *
 * Four curtains of light run across the button: a solid main one behind the
 * words, a thinner veil above it throwing rays upward, a flare that curls up
 * past the play icon, and a bright lower border just under the words. Each is
 * a band with wavy, uneven edges, filled with the brand's ramp along its
 * length — green, teal, blue-violet, purple, left to right as on the slab it
 * replaces — pinched to nothing at its tips. Inside, soft vertical rays
 * brighten and fade, which is what makes a band read as a curtain.
 *
 * Nothing loops. Every wave is a sum of sines on periods that do not divide
 * one another (7, 9.5, 11, 13, 17, 19 s…), travelling in different
 * directions, so the silhouette is never the same twice; the edges ripple on
 * shorter periods still, and each ray has its own shimmer and its own drift.
 *
 * Drawn additively, so where curtains cross they get brighter, the way light
 * does. The canvas is small and blurred by CSS on the way to the screen,
 * which turns bands into glow and rays into streaks; there is no ellipse, no
 * radial mask — the shape is the curtains'.
 *
 * Coordinates are shares of the canvas: x across, y down. The words sit
 * between y 0.30 and 0.73 and x 0.09 and 0.77, the play icon at x 0.80–0.91.
 */

type RGB = [number, number, number];

const TAU = Math.PI * 2;

/* Green, the deck's teal, a blue-violet between, and purple */
const STOPS: [number, RGB][] = [
  [0, [20, 241, 149]],
  [0.34, [45, 206, 169]],
  [0.68, [98, 104, 240]],
  [1, [153, 69, 255]],
];

export const hueAt = (p: number): RGB => {
  const q = clamp01(p);
  let i = 1;
  while (i < STOPS.length - 1 && q > STOPS[i][0]) i += 1;
  const [a, from] = STOPS[i - 1];
  const [b, to] = STOPS[i];
  const f = (q - a) / (b - a);
  return [
    from[0] + (to[0] - from[0]) * f,
    from[1] + (to[1] - from[1]) * f,
    from[2] + (to[2] - from[2]) * f,
  ];
};

/* Brighter in its own hue, for the brightest parts — rays, borders, glints:
   the colour turned up until its strongest channel is full, never mixed
   towards white */
export const vivid = (c: RGB): RGB => {
  const k = 255 / Math.max(1, c[0], c[1], c[2]);
  return [c[0] * k, c[1] * k, c[2] * k];
};

export const colour = (c: RGB, alpha: number) =>
  `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${
    Math.round(clamp01(alpha) * 1000) / 1000
  })`;

/** A wave travelling along a curtain: k crests across the width, one full
    cycle every `period` seconds — negative periods travel the other way */
const wave = (x: number, t: number, k: number, period: number, phase: number) =>
  Math.sin(TAU * (k * x - t / period) + phase);

const fract = (n: number) => n - Math.floor(n);

interface Ray {
  /** Where along the curtain it starts, and how fast it drifts along it */
  at: number;
  drift: number;
  /** Its width, as a share of the canvas */
  width: number;
  /** Its shimmer */
  rate: number;
  phase: number;
  strength: number;
}

const raysFor = (count: number, seed: number): Ray[] => {
  const random = seeded(seed);
  return Array.from({ length: count }, () => ({
    at: random(),
    drift: (random() - 0.5) * 0.012,
    width: 0.0025 + random() * 0.0055,
    rate: 0.35 + random() * 0.95,
    phase: random() * TAU,
    strength: 0.12 + random() * 0.22,
  }));
};

interface Curtain {
  /** How far across it runs */
  from: number;
  to: number;
  /** The line it hangs along, and how thick it is there, before its tips pinch */
  mid: (x: number, t: number) => number;
  thickness: (x: number, t: number) => number;
  /** How uneven its top and bottom edges are */
  ragTop: number;
  ragBottom: number;
  /** How solid it is at its brightest */
  alpha: number;
  /** A nudge along the ramp, so crossing curtains are not quite one colour */
  shift: number;
  /** How far its rays rise past its top edge, as a share of its thickness —
      none keeps them inside it */
  reach: number;
  /** The brightness of its lower border; none for no border */
  rim: number;
  rays: Ray[];
  phase: number;
}

const CURTAINS: Curtain[] = [
  /* The main curtain, behind the words: the solid part of the light */
  {
    from: 0.03,
    to: 0.97,
    mid: (x, t) =>
      0.55 +
      0.045 * wave(x, t, 1.1, 11, 0.4) +
      0.025 * wave(x, t, 2.3, -7, 1.3),
    thickness: (x, t) => 0.44 * (0.85 + 0.15 * wave(x, t, 1.7, 17, 2.1)),
    ragTop: 0.22,
    ragBottom: 0.1,
    alpha: 0.94,
    shift: 0,
    reach: 0,
    rim: 0.4,
    rays: raysFor(26, 23),
    phase: 0.9,
  },
  /* The veil above, throwing its rays up past the words */
  {
    from: 0.1,
    to: 0.86,
    mid: (x, t) =>
      0.25 + 0.05 * wave(x, t, 0.9, -13, 2.2) + 0.03 * wave(x, t, 2.1, 9, 0.3),
    thickness: (x, t) => 0.18 * (0.8 + 0.2 * wave(x, t, 1.3, -19, 0)),
    ragTop: 0.4,
    ragBottom: 0.14,
    alpha: 0.5,
    shift: 0.1,
    reach: 0.75,
    rim: 0,
    rays: raysFor(18, 11),
    phase: 2.6,
  },
  /* The flare, curling up past the play icon: the light leans towards the
     thing to press, and the shape is not symmetric */
  {
    from: 0.55,
    to: 0.99,
    mid: (x, t) =>
      0.6 - 0.34 * smoothstep(0.55, 0.99, x) + 0.04 * wave(x, t, 1.6, 8.3, 0.8),
    thickness: (x, t) => 0.16 * (0.85 + 0.15 * wave(x, t, 2.4, -12, 1.7)),
    ragTop: 0.3,
    ragBottom: 0.12,
    alpha: 0.5,
    shift: 0.04,
    reach: 0.6,
    rim: 0,
    rays: raysFor(10, 37),
    phase: 4.1,
  },
  /* The lower border: thin and bright under the words, and well clear of the
     bottom of the canvas, which is the fold */
  {
    from: 0.08,
    to: 0.94,
    mid: (x, t) =>
      0.8 + 0.03 * wave(x, t, 1.4, 9.5, 1.1) + 0.015 * wave(x, t, 3.2, -6.1, 0),
    thickness: (x, t) => 0.1 * (0.8 + 0.2 * wave(x, t, 2, 14, 0.5)),
    ragTop: 0.2,
    ragBottom: 0.15,
    alpha: 0.8,
    shift: -0.08,
    reach: 0,
    rim: 0.5,
    rays: raysFor(10, 53),
    phase: 5.3,
  },
];

/* Points along each edge — plenty, at this canvas's size */
const SAMPLES = 40;

const drawCurtain = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  c: Curtain,
  breath: number
) => {
  const xs: number[] = [];
  const tops: number[] = [];
  const bottoms: number[] = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const s = i / SAMPLES;
    const x = c.from + (c.to - c.from) * s;
    /* Pinched to nothing at the tips, full through the middle */
    const half = (c.thickness(x, t) * Math.pow(Math.sin(Math.PI * s), 0.6)) / 2;
    const mid = c.mid(x, t);
    const rag =
      0.6 * wave(x, t, 5.3, 3.7, c.phase) +
      0.4 * wave(x, t, 9.1, -5.3, c.phase * 1.7);
    xs.push(x * w);
    tops.push((mid - half * (1 + c.ragTop * rag)) * h);
    bottoms.push(
      (mid + half * (1 + c.ragBottom * wave(x, t, 4.1, -4.9, c.phase * 0.6))) *
        h
    );
  }

  const band = new Path2D();
  band.moveTo(xs[0], tops[0]);
  for (let i = 1; i <= SAMPLES; i += 1) band.lineTo(xs[i], tops[i]);
  for (let i = SAMPLES; i >= 0; i -= 1) band.lineTo(xs[i], bottoms[i]);
  band.closePath();

  /* The ramp along its length, fading at the tips; a little softer on the
     left, where the green is brightest and the words begin */
  const fill = ctx.createLinearGradient(c.from * w, 0, c.to * w, 0);
  for (let k = 0; k <= 8; k += 1) {
    const s = k / 8;
    const x = c.from + (c.to - c.from) * s;
    const along = smoothstep(0, 0.16, s) * (1 - smoothstep(0.84, 1, s));
    fill.addColorStop(
      s,
      colour(hueAt(x + c.shift), c.alpha * breath * along * (0.84 + 0.16 * x))
    );
  }
  ctx.fillStyle = fill;
  ctx.fill(band);

  /* The lower border an aurora has: a brighter line along the bottom edge */
  if (c.rim > 0) {
    const edge = new Path2D();
    edge.moveTo(xs[0], bottoms[0]);
    for (let i = 1; i <= SAMPLES; i += 1) edge.lineTo(xs[i], bottoms[i]);
    const glow = ctx.createLinearGradient(c.from * w, 0, c.to * w, 0);
    for (let k = 0; k <= 6; k += 1) {
      const s = k / 6;
      const x = c.from + (c.to - c.from) * s;
      const along = smoothstep(0.04, 0.24, s) * (1 - smoothstep(0.76, 0.96, s));
      glow.addColorStop(
        s,
        colour(vivid(hueAt(x + c.shift)), c.rim * breath * along)
      );
    }
    ctx.strokeStyle = glow;
    ctx.lineWidth = Math.max(1, 0.035 * h);
    ctx.lineJoin = "round";
    ctx.stroke(edge);
  }

  /* The rays: brightest at the curtain's foot, gone at its top; kept inside
     the curtain, or let rise past it */
  ctx.save();
  if (c.reach === 0) ctx.clip(band);
  c.rays.forEach((ray) => {
    const s = 0.04 + 0.92 * fract(ray.at + ray.drift * t);
    const i = Math.round(s * SAMPLES);
    const along = smoothstep(0.02, 0.2, s) * (1 - smoothstep(0.8, 0.98, s));
    const shimmer = 0.55 + 0.45 * Math.sin(ray.rate * t + ray.phase);
    const strength = ray.strength * shimmer * along * breath * (c.alpha + 0.2);
    const foot = bottoms[i];
    /* Never up to the canvas's own edge, where the blur would show the cut */
    const head = Math.max(0.05 * h, tops[i] - c.reach * (bottoms[i] - tops[i]));
    if (strength < 0.01 || foot - head < 1) return;

    const tint = vivid(hueAt(c.from + (c.to - c.from) * s + c.shift));
    const shaft = ctx.createLinearGradient(0, head, 0, foot);
    shaft.addColorStop(0, colour(tint, 0));
    shaft.addColorStop(0.6, colour(tint, strength * 0.6));
    shaft.addColorStop(1, colour(tint, strength));
    ctx.fillStyle = shaft;
    const half = Math.max(0.5, (ray.width * w) / 2);
    ctx.fillRect(xs[i] - half, head, half * 2, foot - head);
  });
  ctx.restore();
};

/** One frame of the lights at time `t`, in seconds, on a canvas `w` × `h` */
export const drawAurora = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number
) => {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  /* The whole of it breathes, slowly and only a little */
  const breath = 0.95 + 0.05 * Math.sin((TAU * t) / 13);
  CURTAINS.forEach((c) => drawCurtain(ctx, w, h, t, c, breath));
  ctx.globalCompositeOperation = "source-over";
};
