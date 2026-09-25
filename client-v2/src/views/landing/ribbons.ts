import { colour, hueAt, vivid } from "./aurora";
import { seeded, smoothstep } from "./trail";

/**
 * A cone of ribbons, in Solana's colours: the light the trail version's button
 * stands in. After offscreencanvas's WebGL intro animations — the one inspired
 * by a park Christmas tree: bands of light packed edge to edge, wide where
 * they stand and gathering towards a point far above, each running from full
 * colour into transparency at its own height.
 *
 * The ribbons stand along the bottom of the frame, wider than it, and lean in
 * towards a point above the button as they rise — spread at the foot, steep
 * near the top — thinning with the cone, so each is thick at the bottom and
 * thin at the top. Across the button's own height every one is solid, and
 * every other one is deepened towards the navy the deck sinks to, so the white
 * words always sit on a dense field of alternating light and dark — the thing
 * that keeps them legible. Above, each dissolves at its own height, the
 * heights breathing on periods of their own with a ripple running out from the
 * middle: the offset the top of the light is made of.
 *
 * The cone turns: the ribbons slide along the bottom from left to right and
 * round again, carrying their colours across — the ramp, green through teal
 * and blue-violet to purple and back, shading along each ribbon too. A glint
 * travels up every ribbon, its own colour turned up, never white. Under the
 * pointer the light's clock runs faster (`Light.tsx`), so the cone turns
 * faster and the ribbons reach higher; their shapes never change.
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

/* The point the ribbons lean towards — the middle of the canvas, this far
   above its top, as a share of its height — and how the lean curves: spread
   at the foot, steep towards the point */
const APEX = -0.42;
const CURVE = 1.6;

/** Where the ribbons' feet stand along the bottom: wider than the canvas, so
    the outer ones leave it at the sides */
export const FEET_FROM = -0.45;
export const FEET_TO = 1.45;
const RANGE = FEET_TO - FEET_FROM;

/* How fast the feet slide along the bottom, in canvas widths per second */
const SLIDE = 0.03;

/* The ramp runs green to purple and back along the row, so it goes round the
   cone without a seam */
const sweep = (p: number) => {
  const q = fract(p);
  return q < 0.5 ? q * 2 : 2 - q * 2;
};

/** How much of its spread a line keeps at height `y` — a share of the
    canvas, from its top: all of it at the bottom, none at the point */
const coneAt = (y: number) =>
  Math.pow(Math.max(0, (y - APEX) / (1 - APEX)), CURVE);

/** Where the line standing at `foot` across the bottom has leant in to at
    height `y` */
export const leanX = (foot: number, y: number) =>
  0.5 + (foot - 0.5) * coneAt(y);

/** The colour of the ribbon standing at `foot` at time `t` — the ribbons
    carry their colours with them as they slide */
export const hueAtFoot = (foot: number, t: number) =>
  hueAt(sweep((foot - FEET_FROM - t * SLIDE) / RANGE));

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
    lift: random() * 0.06,
    period: 2.4 + random() * 3.6,
    phase: random() * TAU,
    flow: 0.22 + random() * 0.32,
    flowPhase: random(),
  }));
})();

/* Points up each ribbon */
const SAMPLES = 24;

/**
 * One frame of the cone at time `t`, in seconds, on a canvas `w` × `h`. The
 * button's foot is at `foot` and its top at `wordsTop` — shares of the
 * canvas's height; the ribbons are solid between the two. `pace`, 0 to 1, is
 * how far the light has sped up under the pointer: the ribbons reach higher
 * with it. `hold`, 0 to 1, is how far the button is held against the bottom
 * of the screen: held, the ribbons run solid to the bottom of the canvas,
 * which is then the fold; in its place on the page, they fade out below the
 * button.
 */
export const drawRibbons = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  foot: number,
  wordsTop: number,
  pace = 0,
  hold = 0
) => {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);

  const spacing = RANGE / COUNT;
  const tallest = foot - 0.03;
  /* The share of a ribbon's height the button takes up: solid to here */
  const solid = (foot - wordsTop) / tallest;
  /* Under the pointer the light reaches higher, as if it were turned up */
  const surge = 1 + 0.14 * pace;
  const slide = (t * SLIDE) / RANGE;

  RIBBONS.forEach((r) => {
    /* Where along the row it has slid to, and so where its foot stands */
    const u = fract(r.slot + slide);
    const at = FEET_FROM + u * RANGE;
    /* Faded out at the ends of the row, far out at the sides, where it goes
       round to the other end */
    const present = smoothstep(0, 0.1, u) * (1 - smoothstep(0.9, 1, u));
    if (present < 0.01) return;

    /* Taller towards the middle, where the cone peaks; and never settled:
       its own breath, and a ripple that travels out from the centre — but
       never below the button's top */
    const middle = 1 - Math.min(1, Math.abs(at - 0.5) / (RANGE / 2));
    const breath = 0.5 + 0.5 * Math.sin(t / r.period + r.phase);
    const ripple =
      0.5 + 0.5 * Math.sin(TAU * 1.8 * Math.abs(at - 0.5) - t * 1.3);
    const reach = Math.min(
      1,
      Math.max(
        solid + 0.06,
        (0.62 + 0.36 * middle + r.lift) *
          (0.5 + 0.28 * breath + 0.22 * ripple) *
          surge
      )
    );
    const top = foot - reach * tallest;

    /* From below the bottom of the canvas, so held against the fold the
       ribbon comes up out of it, to where it has dissolved; as wide as the
       cone is at each height */
    const halfFoot = (spacing * r.width) / 2;
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let k = 0; k <= SAMPLES; k += 1) {
      const y = 1.02 + (top - 1.02) * (k / SAMPLES);
      const cone = coneAt(y);
      const x = 0.5 + (at - 0.5) * cone;
      const half = halfFoot * cone;
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
       colour of the ramp */
    const hueFoot = hueAt(sweep(r.slot));
    const hueTop = hueAt(sweep(r.slot + 0.12));
    const shade = (o: number) => mix(mix(hueFoot, hueTop, o), NAVY, r.depth);
    /* The glint: its own colour turned up — on the dark ribbons a flash of
       the colour they are deepened from */
    const glint = (o: number) =>
      mix(vivid(mix(hueFoot, hueTop, o)), shade(o), 0.2);

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

  /* Eased out at the top and a little at the sides, so nothing ends on the
     canvas's edge; at the bottom, eased out below the button unless it is
     held against the fold, where the light stands on the edge */
  ctx.globalCompositeOperation = "destination-in";
  const edges = ctx.createLinearGradient(0, 0, 0, h);
  edges.addColorStop(0, "rgba(0, 0, 0, 0)");
  edges.addColorStop(0.06, "rgba(0, 0, 0, 1)");
  edges.addColorStop(Math.min(0.99, foot + 0.01), "rgba(0, 0, 0, 1)");
  edges.addColorStop(1, `rgba(0, 0, 0, ${Math.max(0, Math.min(1, hold))})`);
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
