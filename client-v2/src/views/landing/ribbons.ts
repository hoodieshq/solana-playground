import { colour, hueAt, vivid } from "./aurora";
import { seeded, smoothstep } from "./trail";

/**
 * Ribbons of light, in Solana's colours: the light the landing's button
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
 * product shows.
 *
 * The ribbons themselves never move. They are drawn for the product's window
 * as it stands when the page rests (`Light.tsx`) and keep that shape; only
 * the colour moves through them. It is satin: a ramp that runs green through
 * teal and blue-violet to purple and back along the row, shading along each
 * ribbon, over the alternating dark bands. It flows along the row from left
 * to right and round again, on a calm clock of its own, and a glint of each
 * ribbon's own colour turned up slides up it — fading in at its foot and out
 * at its top, so it never jumps, and never white. The light's other clock
 * runs faster under the pointer and while the page moves (`Light.tsx`): the
 * glints race and the colour flows on quicker, and the ribbons stay put.
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

/* Where the feet stand along the bottom — wider than the canvas, so the outer
   ribbons curve in from beyond the screen's edges */
const FEET_FROM = -0.45;
const FEET_TO = 1.45;
const RANGE = FEET_TO - FEET_FROM;

/* How fast the colour flows along the row, in rounds of the ramp per second
   of the calm clock */
const FLOW = 0.035;

/* Where they stand: just below the bottom of the canvas, so they come up out
   of the fold */
const BASE = 1.02;
/* How the bend goes: leaning hardest where they stand, straightening as they
   rise — the higher, the sooner upright */
const EASE = 1.7;
/* How high up the interface they reach at most, as a share of the way from
   where they stand to its top edge */
const FURTHEST = 0.9;

/* The moment of the old breathing heights the ribbons keep: each its own
   height, with the ripple that ran out from the middle caught mid-run */
const SHAPE_AT = 4.2;

/* The ramp runs green to purple and back along the row, so it goes round
   without a seam */
const sweep = (p: number) => {
  const q = fract(p);
  return q < 0.5 ? q * 2 : 2 - q * 2;
};

/** Where the ribbons go, for a window: the middle they gather round, how
    much of their spread they keep once upright, where they stand, where they
    are upright by, and the interface's top */
interface Course {
  cx: number;
  narrow: number;
  stand: number;
  upright: number;
  top: number;
}

/* The course for the product's window `frame`, with the button's top at
   `buttonTop` — shares of the canvas */
const courseFor = (frame: Frame, buttonTop: number): Course => {
  const top = Math.min(buttonTop - 0.08, frame.top);
  return {
    cx: (frame.left + frame.right) / 2,
    /* The outermost feet end up climbing the interface's edges */
    narrow: Math.min(1, (frame.right - frame.left) / RANGE),
    stand: BASE,
    upright: top + (Math.max(top, Math.min(BASE, buttonTop)) - top) * 0.3,
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

/* The height `s` of the way from where the ribbons stand to the top of the
   interface */
const courseY = (c: Course, s: number) => c.stand - s * (c.stand - c.top);

interface Ribbon {
  /** Its place along the row, 0 to 1 */
  slot: number;
  /** Its width at the foot, as a multiple of the spacing */
  width: number;
  /** How much deeper than the ramp it is: the dark bands */
  depth: number;
  /** A little height of its own, and the share of its reach it keeps */
  lift: number;
  height: number;
  /** The glint travelling up it */
  flow: number;
  flowPhase: number;
}

/* Even, so the light and dark bands alternate right along the row */
const COUNT = 64;

const RIBBONS: Ribbon[] = (() => {
  const random = seeded(83);
  return Array.from({ length: COUNT }, (_, i) => {
    const slot = (i + 0.5) / COUNT;
    const width = 1.05 + random() * 0.9;
    const depth = i % 2 === 0 ? 0.06 + random() * 0.12 : 0.48 + random() * 0.28;
    const lift = random() * 0.08;
    const period = 2.4 + random() * 3.6;
    const phase = random() * TAU;
    const at = FEET_FROM + slot * RANGE;
    const breath = 0.5 + 0.5 * Math.sin(SHAPE_AT / period + phase);
    const ripple =
      0.5 + 0.5 * Math.sin(TAU * 1.8 * Math.abs(at - 0.5) - SHAPE_AT * 1.3);
    return {
      slot,
      width,
      depth,
      lift,
      height: 0.6 + 0.25 * breath + 0.15 * ripple,
      flow: 0.22 + random() * 0.32,
      flowPhase: random(),
    };
  });
})();

/* Points up each ribbon, and stops up the fade at its top */
const SAMPLES = 26;
const FADE_STEPS = 6;

/**
 * One frame of the ribbons on a canvas `w` × `h`: their colour at `colourT`,
 * the calm clock it flows along the row on, and their glints at `t`, the
 * light's clock, both in seconds. The button's top is at `buttonTop`, a share
 * of the canvas's height — the ribbons are solid below it — and the product's
 * window is `frame`, the one shape they are drawn in.
 */
export const drawRibbons = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  colourT: number,
  buttonTop: number,
  frame: Frame
) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);

  const c = courseFor(frame, buttonTop);
  const span = c.stand - c.top;
  /* A window below the button has nothing above it to reach up to */
  if (span < 0.01) return;
  const spacing = RANGE / COUNT;
  /* The share of the way the button takes up: solid to here */
  const solid = Math.min(0.85, Math.max(0, (c.stand - buttonTop) / span));
  const along = colourT * FLOW;
  const inside = Math.max(0.01, (frame.right - frame.left) / 2);

  RIBBONS.forEach((r) => {
    const at = FEET_FROM + r.slot * RANGE;
    /* Faded out at the ends of the row, far out at the sides */
    const present =
      smoothstep(0, 0.1, r.slot) * (1 - smoothstep(0.9, 1, r.slot));
    if (present < 0.01) return;

    /* How far up the interface it reaches: highest up its sides, lower
       through the middle, each at a height of its own */
    const side = Math.min(1, (Math.abs(at - c.cx) * c.narrow) / inside);
    const up = Math.min(1, (0.22 + 0.78 * side + r.lift) * r.height);
    const reach = Math.min(
      FURTHEST,
      solid + 0.05 + Math.max(0, FURTHEST - solid - 0.05) * up
    );
    const top = courseY(c, reach);

    /* Up its course from below the fold, as wide as its share of the spread
       at each height, so neighbours stay edge to edge all the way */
    const halfFoot = (spacing * r.width) / 2;
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let k = 0; k <= SAMPLES; k += 1) {
      const y = c.stand + (top - c.stand) * (k / SAMPLES);
      const keep = keepAt(c, y);
      const x = c.cx + (at - c.cx) * keep;
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

    /* The colour flowing along the row passes through it, shading along it
       towards the next colour of the ramp; every other ribbon is deepened
       towards the navy */
    const hueFoot = hueAt(sweep(r.slot - along));
    const hueTop = hueAt(sweep(r.slot + 0.12 - along));
    const shade = (o: number) => mix(mix(hueFoot, hueTop, o), NAVY, r.depth);
    const gradient = ctx.createLinearGradient(0, c.stand * h, 0, top * h);
    /* Solid across the button, then into transparency — each at its own
       height, which is the offset the top of the light is made of. The fade
       is held at stops of its own, and the glint takes it as it finds it
       wherever it passes, so where a ribbon dissolves never moves. */
    const fadeFrom = Math.min(0.9, Math.max(solid / reach + 0.02, 0.64));
    const fade: [number, number][] = [[0, present]];
    for (let k = 0; k <= FADE_STEPS; k += 1) {
      const o = fadeFrom + ((1 - fadeFrom) * k) / FADE_STEPS;
      fade.push([o, (1 - smoothstep(fadeFrom, 1, o)) * present]);
    }
    const alphaAt = (o: number) => {
      let i = 1;
      while (i < fade.length - 1 && o > fade[i][0]) i += 1;
      const [a, from] = fade[i - 1];
      const [b, to] = fade[i];
      return b > a ? from + ((to - from) * (o - a)) / (b - a) : to;
    };
    const stops: [number, string][] = fade.map(([o, alpha]) => [
      o,
      colour(shade(o), alpha),
    ]);
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
        gradient.addColorStop(Math.min(1, Math.max(0, offset)), col)
      );

    ctx.fillStyle = gradient;
    ctx.fill(band);
  });

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
