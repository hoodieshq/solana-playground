import { clamp01, seeded, smoothstep } from "./trail";

/**
 * The northern lights, in Solana's colours — what the trail version's button
 * is made of.
 *
 * One silhouette, not bands: a skyline of light rising behind the product and
 * the words. Low along the left, a tall spire just right of centre that
 * reaches up under the headline, smaller ragged flames to the right, and both
 * sides curving back down to the foot, so it reads as a shape the light makes
 * rather than a strip it was put in.
 *
 * Everything moves out from the middle. New flames are born at the centre and
 * travel to either side, swelling and dying on the way, so the skyline is
 * always changing and always changing *outwards*; and inside it, streaks of
 * light shoot from behind the button towards the edges, lengthening as they
 * go — a warp, the way stars stretch past a ship. Periods never divide one
 * another, so no frame repeats.
 *
 * Filled with the brand's ramp across its width — green, teal, blue-violet,
 * purple — solid at its foot and fading towards its peaks, and drawn
 * additively where streaks and rays cross it. The canvas is small and
 * blurred by CSS on the way to the screen, which turns the silhouette into
 * glow and the streaks into soft rays.
 *
 * Coordinates are shares of the canvas: x across, y down. The button's box
 * sits at the bottom (see `Light`), the words around y 0.80, the spire's top
 * held clear of the headline above.
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

const hueAt = (p: number): RGB => {
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

/* Towards white, for the brightest parts */
const toward = (c: RGB, white: number): RGB => [
  c[0] + (255 - c[0]) * white,
  c[1] + (255 - c[1]) * white,
  c[2] + (255 - c[2]) * white,
];

const colour = (c: RGB, alpha: number) =>
  `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${
    Math.round(clamp01(alpha) * 1000) / 1000
  })`;

const fract = (n: number) => n - Math.floor(n);

/** A soft hump at `c`, `s` wide */
const bump = (x: number, c: number, s: number) =>
  Math.exp(-((x - c) * (x - c)) / (2 * s * s));

/* Where the light stands, and how high it may reach */
const FOOT = 0.97;
const CEILING = 0.31;
/* The point everything moves out from: behind the button's middle */
const CENTRE = { x: 0.5, y: 0.8 };

interface Flame {
  /** Which way it travels from the centre */
  side: 1 | -1;
  /** One trip, centre to edge, in seconds */
  period: number;
  phase: number;
  height: number;
  width: number;
}

/* Taller and quicker on the right, lower and slower on the left: the light
   leans towards the play icon, and is never symmetric */
const FLAMES: Flame[] = (() => {
  const random = seeded(71);
  return Array.from({ length: 9 }, (_, i) => {
    const side: 1 | -1 = i % 3 === 2 ? -1 : 1;
    return {
      side,
      period: (side > 0 ? 5.2 : 7.4) + random() * 3.1,
      phase: random(),
      height: (side > 0 ? 0.12 : 0.07) + random() * (side > 0 ? 0.14 : 0.07),
      width: 0.022 + random() * 0.03,
    };
  });
})();

/** How high the light stands at `x`, as a share of the canvas */
const heightAt = (x: number, t: number) => {
  /* The body: a low swell right across, breathing */
  let h =
    0.34 +
    0.035 * Math.sin(TAU * 1.3 * x - t / 3.1) +
    0.02 * Math.sin(TAU * 2.7 * x + t / 2.3);

  /* The spire, just right of centre, never quite still */
  const spire = 0.565 + 0.03 * Math.sin(t / 4.7) + 0.012 * Math.sin(t / 1.9);
  h +=
    (0.26 + 0.07 * Math.sin(t / 2.9) + 0.03 * Math.sin(t / 1.3)) *
    bump(x, spire, 0.055 + 0.015 * Math.sin(t / 3.7));

  /* Flames born at the centre, carried out to either side */
  FLAMES.forEach((f) => {
    const u = fract(f.phase + t / f.period);
    const at = 0.5 + f.side * u * 0.47;
    const life = Math.pow(Math.sin(Math.PI * u), 0.85);
    h += f.height * life * bump(x, at, f.width * (0.7 + 0.8 * u));
  });

  /* The ragged edge: flicker, finer on the right where the flames are */
  h +=
    (0.012 + 0.012 * x) * Math.sin(TAU * 11 * x - t * 3.3) +
    (0.008 + 0.01 * x) * Math.sin(TAU * 23 * x + t * 4.1);

  /* Down to the foot at both sides */
  const sides = smoothstep(0, 0.14, x) * (1 - smoothstep(0.86, 1, x));
  return Math.max(0, h) * sides;
};

interface Streak {
  /** Direction out of the centre, radians; 0 is right, -π/2 straight up */
  angle: number;
  phase: number;
  /** Trips per second, before the hover speed-up */
  rate: number;
  strength: number;
  width: number;
}

/* Mostly up and out: the light is above the fold, so little goes down */
const STREAKS: Streak[] = (() => {
  const random = seeded(19);
  return Array.from({ length: 64 }, () => ({
    angle: -Math.PI - 0.12 + random() * (Math.PI + 0.24),
    phase: random(),
    rate: 0.16 + random() * 0.22,
    strength: 0.32 + random() * 0.38,
    width: 1.2 + random() * 2.2,
  }));
})();

interface Ray {
  at: number;
  rate: number;
  phase: number;
  width: number;
  strength: number;
}

/* Vertical shimmer inside the silhouette: what makes glow read as curtain */
const RAYS: Ray[] = (() => {
  const random = seeded(43);
  return Array.from({ length: 34 }, () => ({
    at: random(),
    rate: 0.4 + random() * 1.1,
    phase: random() * TAU,
    width: 0.002 + random() * 0.005,
    strength: 0.1 + random() * 0.2,
  }));
})();

/* Points along the skyline */
const SAMPLES = 96;

/** One frame of the lights at time `t`, in seconds, on a canvas `w` × `h` */
export const drawAurora = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number
) => {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);

  /* The silhouette */
  const sky = new Path2D();
  sky.moveTo(0, FOOT * h);
  for (let i = 0; i <= SAMPLES; i += 1) {
    const x = i / SAMPLES;
    const top = Math.max(CEILING, FOOT - heightAt(x, t));
    sky.lineTo(x * w, top * h);
  }
  sky.lineTo(w, FOOT * h);
  sky.closePath();

  /* Filled with the ramp across, a little softer at the left end, where the
     green is brightest and the words begin */
  const fill = ctx.createLinearGradient(0, 0, w, 0);
  for (let k = 0; k <= 10; k += 1) {
    const x = k / 10;
    fill.addColorStop(x, colour(hueAt(x), 0.92 * (0.8 + 0.2 * x)));
  }
  ctx.fillStyle = fill;
  ctx.fill(sky);

  ctx.save();
  ctx.clip(sky);
  ctx.globalCompositeOperation = "lighter";

  /* Curtain rays, rising from the foot and shimmering */
  RAYS.forEach((ray) => {
    const x = fract(ray.at + 0.004 * Math.sin(t / 5 + ray.phase));
    const shimmer = 0.5 + 0.5 * Math.sin(ray.rate * t + ray.phase);
    const strength = ray.strength * shimmer;
    if (strength < 0.02) return;
    const top = Math.max(CEILING, FOOT - heightAt(x, t)) * h;
    const shaft = ctx.createLinearGradient(0, top, 0, FOOT * h);
    const tint = toward(hueAt(x), 0.3);
    shaft.addColorStop(0, colour(tint, 0));
    shaft.addColorStop(0.5, colour(tint, strength * 0.7));
    shaft.addColorStop(1, colour(tint, strength));
    ctx.fillStyle = shaft;
    const half = Math.max(0.5, (ray.width * w) / 2);
    ctx.fillRect(x * w - half, top, half * 2, FOOT * h - top);
  });

  /* The warp: streaks out of the centre, accelerating and lengthening */
  const cx = CENTRE.x * w;
  const cy = CENTRE.y * h;
  const reach = Math.hypot(w * 0.52, h * 0.85);
  ctx.lineCap = "round";
  STREAKS.forEach((s) => {
    const u = fract(s.phase + t * s.rate);
    const d = Math.pow(u, 1.7) * reach;
    const length = (0.04 + 0.34 * u) * reach * 0.5;
    const dx = Math.cos(s.angle);
    const dy = Math.sin(s.angle);
    const hx = cx + dx * d;
    const hy = cy + dy * d;
    const tx = cx + dx * Math.max(0, d - length);
    const ty = cy + dy * Math.max(0, d - length);
    const alpha = s.strength * Math.pow(Math.sin(Math.PI * u), 0.7);
    if (alpha < 0.02) return;
    const tint = toward(hueAt(hx / w), 0.45);
    const line = ctx.createLinearGradient(tx, ty, hx, hy);
    line.addColorStop(0, colour(tint, 0));
    line.addColorStop(1, colour(tint, alpha));
    ctx.strokeStyle = line;
    ctx.lineWidth = s.width * (1 + 2.2 * u) * (w / 640);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx, hy);
    ctx.stroke();
  });
  ctx.restore();

  /* Solid at the foot, thinning towards the peaks, and eased out at the very
     bottom so the light never ends on a line */
  ctx.globalCompositeOperation = "destination-in";
  const fade = ctx.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, "rgba(0, 0, 0, 0.18)");
  fade.addColorStop(0.35, "rgba(0, 0, 0, 0.5)");
  fade.addColorStop(0.62, "rgba(0, 0, 0, 0.92)");
  fade.addColorStop(FOOT - 0.1, "rgba(0, 0, 0, 1)");
  fade.addColorStop(FOOT, "rgba(0, 0, 0, 0)");
  fade.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
};
