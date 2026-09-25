import { colour, hueAt, vivid } from "./aurora";
import { seeded, smoothstep } from "./trail";

/**
 * Ribbons of light, in Solana's colours: the light the trail version's button
 * stands in. After offscreencanvas's WebGL intro animations — the one inspired
 * by a park Christmas tree: bands packed edge to edge, thick where they stand
 * and thinning as they gather, each running into transparency at its own
 * height.
 *
 * The ribbons stand along the bottom of the frame, wider than it, and rise
 * towards the top of the product's window — spread at the foot, gathering
 * quickly across the button, then bending in towards the middle of the
 * window's top edge — so they run into the product rather than past it. They
 * thin as they gather, thick at the bottom and thin at the top, and dissolve
 * before they meet, each at its own height: tallest through the middle, where
 * they peak into the window, and the heights breathe on periods of their own
 * with a ripple running out from the middle.
 *
 * The colours change the way the reference's do, smoothly: from one ribbon to
 * the next they step along a palette that runs from the deck's navy through
 * indigo, purple and blue-violet to teal and green and back, and each shades
 * along its length — dark bands and bright ones, but no hard alternation. The
 * ribbons slide along the bottom from left to right and round again, carrying
 * their colours across; a glint travels up each, its own colour turned up,
 * never white. Under the pointer the light's clock runs faster (`Light.tsx`),
 * so they slide faster and reach further; their shapes never change.
 */

type RGB = [number, number, number];

const TAU = Math.PI * 2;

const fract = (n: number) => n - Math.floor(n);

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

/* The brand ramp travels across, in ramps per second: green to purple and
   back, so it can travel for ever without a seam */
const SWEEP = 0.05;
const sweep = (p: number) => {
  const q = fract(p);
  return q < 0.5 ? q * 2 : 2 - q * 2;
};

/** The brand's colour at `x` across the canvas at time `t` — moving left to
    right */
export const rampAt = (x: number, t: number) =>
  hueAt(sweep(x * 0.9 - t * SWEEP));

/* The palette the ribbons step along: the deck's navy, indigo, Solana's
   purple, a blue-violet, the deck's teal and Solana's green */
const PALETTE: RGB[] = [
  [30, 33, 115],
  [90, 63, 217],
  [153, 69, 255],
  [98, 104, 240],
  [45, 206, 169],
  [20, 241, 149],
];

/* Along the palette, navy to green and back, so it can run for ever */
const paletteAt = (p: number): RGB => {
  const q = sweep(p) * (PALETTE.length - 1);
  const i = Math.min(PALETTE.length - 2, Math.floor(q));
  return mix(PALETTE[i], PALETTE[i + 1], q - i);
};

/* How far the palette moves from one ribbon to the next, how far along a
   ribbon it shades from its foot to its top, and how fast it drifts, in
   palettes per second */
const STEP = 0.075;
const SHADE = 0.14;
const DRIFT = 0.012;

/* Where the feet stand along the bottom — wider than the canvas, so the outer
   ribbons curve in from beyond its sides — and how fast they slide along it,
   in canvas widths per second */
const FEET_FROM = -0.45;
const FEET_TO = 1.45;
const RANGE = FEET_TO - FEET_FROM;
const SLIDE = 0.03;

/* The point they bend towards: this far inside the window's top edge, as a
   share of the canvas's height */
const INTO = 0.01;
/* The shape of the way there: part of the spread goes quickly, near the foot
   — the flare — and the rest bends away gently towards the point; the higher
   the bend, the later and rounder it comes */
const FLARE = 0.45;
const BEND = 1.6;
/* How far towards the point they reach at most: they dissolve before they
   meet */
const FURTHEST = 0.93;

/** How much of its spread a ribbon keeps `s` of the way to the point */
const keep = (s: number) => {
  const q = Math.min(1, Math.max(0, s));
  return (
    (1 - FLARE) * Math.pow(1 - Math.pow(q, BEND), 1 / BEND) +
    FLARE * Math.pow(1 - q, 3)
  );
};

interface Ribbon {
  /** Its place along the row, 0 to 1, before the sliding */
  slot: number;
  /** Where it is along the palette, before the palette drifts */
  hue: number;
  /** Its width at the foot, as a multiple of the spacing */
  width: number;
  /** A little height of its own, and how its height breathes */
  lift: number;
  period: number;
  phase: number;
  /** The glint travelling up it */
  flow: number;
  flowPhase: number;
}

/* Fewer and broader than a stripe pattern: bands, as the reference has */
const COUNT = 40;

const RIBBONS: Ribbon[] = (() => {
  const random = seeded(83);
  return Array.from({ length: COUNT }, (_, i) => ({
    slot: (i + 0.5) / COUNT,
    hue: i * STEP + random() * 0.02,
    width: 1.1 + random() * 0.7,
    lift: random() * 0.08,
    period: 2.4 + random() * 3.6,
    phase: random() * TAU,
    flow: 0.22 + random() * 0.32,
    flowPhase: random(),
  }));
})();

/* Points up each ribbon */
const SAMPLES = 26;

/**
 * One frame of the ribbons at time `t`, in seconds, on a canvas `w` × `h`.
 * The button's foot is at `foot` and its top at `buttonTop` — shares of the
 * canvas's height; the ribbons are solid between the two — and the product's
 * window is `frame`. `pace`, 0 to 1, is how far the light has sped up under
 * the pointer: the ribbons reach further with it. `hold`, 0 to 1, is how far
 * the button is held against the bottom of the screen: held, the ribbons run
 * solid to the bottom of the canvas, which is then the fold; in its place on
 * the page, they fade out below the button. `shake` moves the whole of it.
 */
export const drawRibbons = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  foot: number,
  buttonTop: number,
  frame: Frame,
  pace = 0,
  hold = 0,
  shake: Shake = { x: 0, y: 0 }
) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);

  const cx = (frame.left + frame.right) / 2;
  /* The point: just inside the top of the window — never below the button */
  const pointY = Math.min(buttonTop - 0.05, frame.top + INTO);
  const rise = foot - pointY;
  const spacing = RANGE / COUNT;
  /* The share of the way the button takes up: solid to here */
  const solid = (foot - buttonTop) / rise;
  /* Under the pointer they reach further, as if the light were turned up */
  const surge = 1 + 0.12 * pace;
  const slide = (t * SLIDE) / RANGE;

  ctx.translate(shake.x, shake.y);
  RIBBONS.forEach((r) => {
    /* Where along the row it has slid to, and so where its foot stands */
    const u = fract(r.slot + slide);
    const at = FEET_FROM + u * RANGE;
    /* Faded out at the ends of the row, far out at the sides, where it goes
       round to the other end */
    const present = smoothstep(0, 0.1, u) * (1 - smoothstep(0.9, 1, u));
    if (present < 0.01) return;

    /* How far it reaches past the button: tallest through the middle, where
       the light peaks into the window; and never settled — its own breath,
       and a ripple that travels out from the middle */
    const middle = 1 - Math.min(1, Math.abs(at - cx) / (RANGE / 2));
    const breath = 0.5 + 0.5 * Math.sin(t / r.period + r.phase);
    const ripple =
      0.5 + 0.5 * Math.sin(TAU * 1.8 * Math.abs(at - 0.5) - t * 1.3);
    const past = Math.min(
      1,
      (0.3 + 0.62 * middle + r.lift) *
        (0.6 + 0.25 * breath + 0.15 * ripple) *
        surge
    );
    const reach = Math.min(
      FURTHEST,
      solid + 0.04 + (FURTHEST - solid - 0.04) * past
    );

    /* Its middle line, from below the bottom of the canvas — so held against
       the fold it comes up out of it — bending in towards the point, and as
       wide as its share of the spread at each height */
    const halfFoot = ((spacing * r.width) / 2) * w;
    const pts: { x: number; y: number; half: number }[] = [
      { x: at * w, y: 1.02 * h, half: halfFoot },
    ];
    for (let k = 0; k <= SAMPLES; k += 1) {
      const s = (k / SAMPLES) * reach;
      const kept = keep(s);
      pts.push({
        x: (cx + (at - cx) * kept) * w,
        y: (foot - s * rise) * h,
        half: halfFoot * kept,
      });
    }
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    pts.forEach((q, j) => {
      const prev = pts[Math.max(0, j - 1)];
      const next = pts[Math.min(pts.length - 1, j + 1)];
      const tx = next.x - prev.x;
      const ty = next.y - prev.y;
      const len = Math.hypot(tx, ty) || 1;
      left.push([q.x - (ty / len) * q.half, q.y + (tx / len) * q.half]);
      right.push([q.x + (ty / len) * q.half, q.y - (tx / len) * q.half]);
    });

    const band = new Path2D();
    band.moveTo(left[0][0], left[0][1]);
    left.forEach(([x, y]) => band.lineTo(x, y));
    for (let k = right.length - 1; k >= 0; k -= 1) {
      band.lineTo(right[k][0], right[k][1]);
    }
    band.closePath();

    /* Its colour, stepping from its neighbours' and shading along it */
    const hue = r.hue + t * DRIFT;
    const shade = (o: number) => paletteAt(hue + SHADE * o);
    /* The glint: its own colour turned up */
    const glint = (o: number) => mix(vivid(shade(o)), shade(o), 0.25);

    const top = foot - reach * rise;
    const along = ctx.createLinearGradient(0, foot * h, 0, top * h);
    /* Solid across the button, then into transparency — each at its own
       height, which is the offset the top of the light is made of */
    const fadeFrom = Math.min(0.9, Math.max(solid / reach + 0.02, 0.64));
    const alphaAt = (o: number, solidAlpha: number) =>
      (o < fadeFrom ? solidAlpha : 1 - smoothstep(fadeFrom, 1, o)) * present;
    const stops: [number, string][] = [
      [0, colour(shade(0), alphaAt(0, 1))],
      [fadeFrom, colour(shade(fadeFrom), alphaAt(fadeFrom, 0.96))],
      [1, colour(shade(1), 0)],
    ];
    /* Longer and softer than a dash: a glow sliding up the ribbon */
    const lit = 0.1 + fract(r.flowPhase + t * r.flow) * 0.8;
    const below = Math.max(0, lit - 0.14);
    const above = Math.min(1, lit + 0.14);
    stops.push([below, colour(shade(below), alphaAt(below, 1))]);
    stops.push([
      lit,
      colour(glint(lit), Math.max(0.2 * present, alphaAt(lit, 1)) * 0.92),
    ]);
    stops.push([above, colour(shade(above), alphaAt(above, 0.96) * 0.95)]);
    stops
      .sort((a, b) => a[0] - b[0])
      .forEach(([offset, c]) =>
        along.addColorStop(Math.min(1, Math.max(0, offset)), c)
      );

    ctx.fillStyle = along;
    ctx.fill(band);
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  /* At the bottom, eased out below the button unless it is held against the
     fold, where the light stands on the edge; a little at the sides */
  ctx.globalCompositeOperation = "destination-in";
  const edges = ctx.createLinearGradient(0, 0, 0, h);
  edges.addColorStop(0, "rgba(0, 0, 0, 1)");
  edges.addColorStop(Math.min(0.99, foot + 0.01), "rgba(0, 0, 0, 1)");
  edges.addColorStop(1, `rgba(0, 0, 0, ${Math.max(0, Math.min(1, hold))})`);
  ctx.fillStyle = edges;
  ctx.fillRect(0, 0, w, h);
  const sides = ctx.createLinearGradient(0, 0, w, 0);
  sides.addColorStop(0, "rgba(0, 0, 0, 0)");
  sides.addColorStop(0.02, "rgba(0, 0, 0, 1)");
  sides.addColorStop(0.98, "rgba(0, 0, 0, 1)");
  sides.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = sides;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
};
