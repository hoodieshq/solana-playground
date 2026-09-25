import { colour, hueAt, vivid } from "./aurora";
import { seeded, smoothstep } from "./trail";

/**
 * Ribbons of light, in Solana's colours: the light the trail version's button
 * stands in. After offscreencanvas's WebGL intro animations — bands packed
 * edge to edge, thick where they stand and thinner as they rise, each running
 * into transparency at its own height.
 *
 * The ribbons come up out of the bottom of the screen spread wider than it,
 * and bend in as they rise until, above the button, they stand upright and
 * run straight up into the product's interface — the outer ones curving in
 * from beyond the screen's edges to climb its sides. Across the button every
 * one is solid, and every other one is deepened towards the navy the deck
 * sinks to, so the white words always sit on a dense field of alternating
 * light and dark. Above it each dissolves at its own height inside the
 * interface: highest up its sides, lower through the middle, where the
 * product shows; the heights breathe on periods of their own, with a ripple
 * running out from the middle.
 *
 * They come with the product: while it rises from the bottom of the screen
 * they stand on the fold and reach up to its window, so the interface pulls
 * them up out of the edge as it comes.
 *
 * The colour is satin: a ramp that runs green through teal and blue-violet to
 * purple and back along the row, shading along each ribbon, over the
 * alternating dark bands, with a glint of its own colour turned up sliding up
 * every ribbon — fading in at its foot and out at its top, so it never jumps,
 * and never white. The ribbons slide along the bottom from left to right and
 * round again, carrying their colours across, on a calm clock of their own.
 * The light's other clock runs faster under the pointer and on a scroll
 * (`Light.tsx`), and a scroll stretches them, springing back after. When the
 * reader pulls on the first screen, or the page glides on its own, they rise:
 * the top of their course lifts, so they lengthen upward like a slinky
 * stretched from the button — never wider — while their glints race up them.
 */

type RGB = [number, number, number];

const TAU = Math.PI * 2;

const fract = (n: number) => n - Math.floor(n);

/* The navy the deck sinks to, for every other ribbon */
const NAVY: RGB = [30, 33, 115];

const mix = (a: RGB, b: RGB, f: number): RGB => [
  a[0] + (b[0] - a[0]) * f,
  a[1] + (b[1] - a[1]) * f,
  a[2] + (b[2] - a[2]) * f,
];

/** The product's window, as shares of the canvas: its left and right edges
    and its top */
export interface Frame {
  left: number;
  right: number;
  top: number;
}

/** A shake, in the canvas's pixels */
export interface Shake {
  x: number;
  y: number;
}

/* Where the feet stand along the bottom — wider than the canvas, so the outer
   ribbons curve in from beyond the screen's edges — and how fast they slide
   along it, in canvas widths per second */
const FEET_FROM = -0.45;
const FEET_TO = 1.45;
const RANGE = FEET_TO - FEET_FROM;
const SLIDE = 0.03;

/* Where they stand: just below the bottom of the canvas, so they come up out
   of the fold */
const BASE = 1.02;
/* How the bend goes: leaning hardest where they stand, straightening as they
   rise — the higher, the sooner upright */
const EASE = 1.7;
/* How high up the interface they reach at most, as a share of the way from
   where they stand to its top edge */
const FURTHEST = 0.9;
/* How far a full rise lifts the top of their course, as a share of the
   canvas's height: they lengthen upward, never widen */
const RISE = 0.2;

/* The ramp runs green to purple and back along the row, so it goes round
   without a seam */
const sweep = (p: number) => {
  const q = fract(p);
  return q < 0.5 ? q * 2 : 2 - q * 2;
};

/** Where the ribbons go, for a window: the middle they gather round, how
    much of their spread they keep once upright, where they stand, where they
    are upright by, and the interface's top */
export interface Course {
  cx: number;
  narrow: number;
  stand: number;
  upright: number;
  top: number;
}

/** The course for the product's window `frame`, with the button's top at
    `buttonTop` and the bottom of the screen at `ground` — shares of the
    canvas. The ribbons stand on the bottom of the screen: below the canvas
    once the button is in place, higher up it while the product is still
    rising with the button. `rise`, 0 to 1, lifts the top of their course. */
export const courseFor = (
  frame: Frame,
  buttonTop: number,
  ground = 1,
  rise = 0
): Course => {
  const top = Math.min(buttonTop - 0.08, frame.top) - RISE * Math.max(0, rise);
  const stand = Math.min(BASE, ground + 0.02);
  return {
    cx: (frame.left + frame.right) / 2,
    /* The outermost feet end up climbing the interface's edges */
    narrow: Math.min(1, (frame.right - frame.left) / RANGE),
    stand,
    upright: top + (Math.max(top, Math.min(stand, buttonTop)) - top) * 0.3,
    top,
  };
};

/* How much of its spread a ribbon keeps at height `y`: all of it where it
   stands, only `narrow` once it is upright */
const keepAt = (c: Course, y: number) => {
  const q = Math.min(
    1,
    Math.max(0, (c.stand - y) / Math.max(0.001, c.stand - c.upright))
  );
  return c.narrow + (1 - c.narrow) * Math.pow(1 - q, EASE);
};

/** Where the ribbon standing at `foot` is at height `y` — a share of the
    canvas, from its top */
export const courseX = (c: Course, foot: number, y: number) =>
  c.cx + (foot - c.cx) * keepAt(c, y);

/** The height `s` of the way from where the ribbons stand to the top of the
    interface */
export const courseY = (c: Course, s: number) =>
  c.stand - s * (c.stand - c.top);

interface Ribbon {
  /** Its place along the row, 0 to 1, before the sliding */
  slot: number;
  /** Its width at the foot, as a multiple of the spacing */
  width: number;
  /** How much deeper than the ramp it is: the dark bands */
  depth: number;
  /** A little height of its own, and how its height breathes */
  lift: number;
  period: number;
  phase: number;
  /** The glint travelling up it */
  flow: number;
  flowPhase: number;
}

/* Even, so the light and dark bands still alternate where the row goes round */
const COUNT = 64;

const RIBBONS: Ribbon[] = (() => {
  const random = seeded(83);
  return Array.from({ length: COUNT }, (_, i) => ({
    slot: (i + 0.5) / COUNT,
    width: 1.05 + random() * 0.9,
    depth: i % 2 === 0 ? 0.06 + random() * 0.12 : 0.48 + random() * 0.28,
    lift: random() * 0.08,
    period: 2.4 + random() * 3.6,
    phase: random() * TAU,
    flow: 0.22 + random() * 0.32,
    flowPhase: random(),
  }));
})();

/** How many ribbons there are, for the streaks that run up them */
export const RIBBON_COUNT = COUNT;

/** Where ribbon `j` stands at time `t`, and where along the row that is, 0 to
    1 — near either end it is on its way round */
export const footOf = (j: number, t: number) => {
  const u = fract(RIBBONS[j].slot + (t * SLIDE) / RANGE);
  return { at: FEET_FROM + u * RANGE, u };
};

/** Ribbon `j`'s own colour, turned up */
export const glintOf = (j: number) => vivid(hueAt(sweep(RIBBONS[j].slot)));

/* Points up each ribbon */
const SAMPLES = 26;

/**
 * One frame of the ribbons at time `t`, in seconds, on a canvas `w` × `h`.
 * The button's top is at `buttonTop`, a share of the canvas's height — the
 * ribbons are solid below it — and the product's window is `frame`. `pace`, 0
 * to 1, is how far the light has sped up: the ribbons reach further with it.
 * `stretch` is the scroll's spring, a share of their height either way;
 * `shake` moves the whole of it. `ground` is the bottom of the screen, a share
 * of the canvas's height: the ribbons stand on it. `rise`, 0 to 1, lengthens
 * them upward; `slideT` is the calm clock they slide along the bottom on.
 */
export const drawRibbons = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  buttonTop: number,
  frame: Frame,
  pace = 0,
  stretch = 0,
  shake: Shake = { x: 0, y: 0 },
  ground = 1,
  rise = 0,
  slideT = t
) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);

  const c = courseFor(frame, buttonTop, ground, rise);
  const span = c.stand - c.top;
  /* Until the window has come up past the bottom of the screen, there is
     nothing to reach up to */
  if (span < 0.01) return;
  const spacing = RANGE / COUNT;
  /* The share of the way the button takes up: solid to here */
  const solid = Math.min(0.85, Math.max(0, (c.stand - buttonTop) / span));
  /* Under the pointer they reach further, as if the light were turned up;
     the scroll stretches them */
  const surge = (1 + 0.12 * pace) * (1 + stretch);
  const slide = (slideT * SLIDE) / RANGE;
  const inside = Math.max(0.01, (frame.right - frame.left) / 2);

  ctx.translate(shake.x, shake.y);
  RIBBONS.forEach((r, i) => {
    /* Where along the row it has slid to, and so where its foot stands */
    const u = fract(r.slot + slide);
    const at = FEET_FROM + u * RANGE;
    /* Faded out at the ends of the row, far out at the sides, where it goes
       round to the other end */
    const present = smoothstep(0, 0.1, u) * (1 - smoothstep(0.9, 1, u));
    if (present < 0.01) return;

    /* How far up the interface it reaches: highest up its sides, lower
       through the middle; and never settled — its own breath, and a ripple
       that travels out from the middle */
    const side = Math.min(1, (Math.abs(at - c.cx) * c.narrow) / inside);
    const breath = 0.5 + 0.5 * Math.sin(t / r.period + r.phase);
    const ripple =
      0.5 + 0.5 * Math.sin(TAU * 1.8 * Math.abs(at - 0.5) - t * 1.3);
    const up = Math.min(
      1,
      (0.22 + 0.78 * side + r.lift) *
        (0.6 + 0.25 * breath + 0.15 * ripple) *
        surge
    );
    const reach = Math.min(
      FURTHEST,
      solid + 0.05 + Math.max(0, FURTHEST - solid - 0.05) * up
    );
    const top = courseY(c, reach);
    /* A slow sway of its own */
    const sway = 0.004 * Math.sin(slideT / 4.1 + i * 0.7);

    /* Up its course from below the fold, as wide as its share of the spread
       at each height, so neighbours stay edge to edge all the way */
    const halfFoot = (spacing * r.width) / 2;
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let k = 0; k <= SAMPLES; k += 1) {
      const y = c.stand + (top - c.stand) * (k / SAMPLES);
      const keep = keepAt(c, y);
      const x = c.cx + (at - c.cx) * keep + sway * ((c.stand - y) / span);
      const half = halfFoot * keep;
      left.push([(x - half) * w, y * h]);
      right.push([(x + half) * w, y * h]);
    }

    const band = new Path2D();
    band.moveTo(left[0][0], left[0][1]);
    left.forEach(([x, y]) => band.lineTo(x, y));
    for (let k = right.length - 1; k >= 0; k -= 1) {
      band.lineTo(right[k][0], right[k][1]);
    }
    band.closePath();

    /* Its colour travels with it, and shades along it towards the next
       colour of the ramp; every other ribbon is deepened towards the navy */
    const hueFoot = hueAt(sweep(r.slot));
    const hueTop = hueAt(sweep(r.slot + 0.12));
    const shade = (o: number) => mix(mix(hueFoot, hueTop, o), NAVY, r.depth);
    const along = ctx.createLinearGradient(0, c.stand * h, 0, top * h);
    /* Solid across the button, then into transparency — each at its own
       height, which is the offset the top of the light is made of */
    const fadeFrom = Math.min(0.9, Math.max(solid / reach + 0.02, 0.64));
    const alphaAt = (o: number) =>
      (o < fadeFrom ? 1 : 1 - smoothstep(fadeFrom, 1, o)) * present;
    const stops: [number, string][] = [
      [0, colour(shade(0), alphaAt(0))],
      [fadeFrom, colour(shade(fadeFrom), alphaAt(fadeFrom))],
      [1, colour(shade(1), 0)],
    ];
    /* The glint: a soft glow of its own colour turned up, sliding the whole
       way up the ribbon — rising out of it at the foot and sinking back at
       the top, so going round again never shows */
    const trip = fract(r.flowPhase + t * r.flow);
    const glow = Math.pow(Math.sin(Math.PI * trip), 2) * 0.6;
    const lit = 0.04 + trip * 0.92;
    const below = Math.max(0, lit - 0.18);
    const above = Math.min(1, lit + 0.18);
    const glint = mix(shade(lit), vivid(mix(hueFoot, hueTop, lit)), glow);
    stops.push([below, colour(shade(below), alphaAt(below))]);
    stops.push([lit, colour(glint, alphaAt(lit))]);
    stops.push([above, colour(shade(above), alphaAt(above))]);
    stops
      .sort((a, b) => a[0] - b[0])
      .forEach(([offset, col]) =>
        along.addColorStop(Math.min(1, Math.max(0, offset)), col)
      );

    ctx.fillStyle = along;
    ctx.fill(band);
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  /* Solid to the bottom; eased out only at the canvas's far sides, which are
     past the screen's */
  ctx.globalCompositeOperation = "destination-in";
  const sides = ctx.createLinearGradient(0, 0, w, 0);
  sides.addColorStop(0, "rgba(0, 0, 0, 0)");
  sides.addColorStop(0.02, "rgba(0, 0, 0, 1)");
  sides.addColorStop(0.98, "rgba(0, 0, 0, 1)");
  sides.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = sides;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
};
