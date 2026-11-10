import { useEffect, useRef, type CSSProperties } from "react";
import { StickyNote, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { MARK_PATH } from "../../ui/brandGlyphs";
import { ICON_CELLS, ICON_LEFT, ICON_SCALE, loadIcon, paintIcon } from "../../ui/IsoVoxels";

/** Share of the banner's height the icon's middle sits at, as on the Tutorials banner. spl-memo's sits
   lower: its note is a square, and its folded corner is the far one, at the top. Lower for every icon
   cut the bottom off the rest, a database's third layer (Almaz, 10 Nov) */
const ICON_TOP = 0.42;
const ICON_TOPS = new Map<LucideIcon, number>([[StickyNote, 0.62]]);

/* The Programs banner's sibling of ui/IsoVoxels.tsx: the same tiles, light and sizes, so the two
   banners read as one family. The mark is turned on the floor and the motion tells a deploy:
   the tiles are written in, a sweep confirms them, then transactions run through it */

/** The brand colours the sculpture is shaded in, the product's BRAND tokens */
const BRAND = { purple: "#9945FF", violet: "#7A56DA", green: "#14F195" } as const;

/* The words own the left of the banner: the art fades out before it. In the corner it fades out
   down and to the left, towards the words under it, so they read over its faint end */
/* Shaped to the words, not a straight edge: the title and the line need the left 45% up top, but
   under the facts only Start stands there, so the art comes in to just past it. The band is the
   bottom rows (from 60% down) cut to the right of the button, added to the side fade */
const SIDE = "linear-gradient(90deg, transparent 42%, #000 54%)";
// Long ramps both ways: a short one read as a cut edge beside Start
const BAND_X = "linear-gradient(90deg, transparent 21%, #000 50%)";
const BAND_Y = "linear-gradient(180deg, transparent 56%, #000 78%)";
const SIDE_MASK: CSSProperties = {
  WebkitMaskImage: `${SIDE}, ${BAND_X}, ${BAND_Y}`,
  WebkitMaskComposite: "source-over, source-in",
  maskImage: `${SIDE}, ${BAND_X}, ${BAND_Y}`,
  maskComposite: "add, intersect",
};
const CORNER_MASK: CSSProperties = {
  WebkitMaskImage: "radial-gradient(130% 80% at 100% 0%, #000 30%, rgba(0, 0, 0, 0.25) 58%, transparent 78%)",
  maskImage: "radial-gradient(130% 80% at 100% 0%, #000 30%, rgba(0, 0, 0, 0.25) 58%, transparent 78%)",
};

/**
 * The ▷O mark as a voxel sculpture lying on the card, in 2:1 pixel isometric, turned a quarter on
 * the floor so it climbs from the bottom left to the top right.
 *
 * On mount the tiles are written in: they drop row by row in scan order, like a buffer filling.
 * When the last one lands a single sweep leaves the play triangle and runs out through the ring,
 * lifting the tops and warming them to green. After that a short packet travels from the triangle
 * round the ring every few seconds, and the pointer presses a soft bump up through the tiles.
 * Faces are painted into sprite atlases once per size, so a frame is a few hundred `drawImage`
 * calls on whole device pixels.
 */

/** Grid the mark is sampled into; rows follow the mark's 970 × 574 box */
const COLS = 33;
const ROWS = Math.round((COLS * 574) / 970);

/** Colour steps along the gradient, and how many lit variants each top has */
const TONES = 40;
const GLINTS = 5;

/** css px: cube grid size candidates, sweep and packet heights, pointer bump height, drop height */
const CELL_SIZES = [9, 8, 7];
/** How much larger than the banner's own fit the mark is drawn */
const MARK_SCALE = 2;
const CONFIRM_LIFT = 3;
const PACKET_LIFT = 5;
const BUMP_LIFT = 8;
const DROP_HEIGHT = 24;
const SETTLE_HOP = 1.6;

/** seconds: the write, a tile's fall and its settle */
const WRITE_START = 0.08;
const WRITE_SPREAD = 1.2;
const FALL_TIME = 0.34;
const SETTLE_TIME = 0.24;
const GROUND_TIME = 0.9;

/** The confirmation sweep: cells per second, its soft leading and longer trailing edge */
const CONFIRM_SPEED = 19;
const CONFIRM_LEAD = 1.6;
const CONFIRM_TAIL = 2.8;

/** Idle transactions: seconds between them, the first one's wait, and cells per second */
const PACKET_PERIOD = 7;
const PACKET_FIRST = 4.2;
const PACKET_SPEED = 27;
/** Packet width in cells: about three tiles read lit at once */
const PACKET_SIGMA = 0.85;

/** Pointer bump radius in cells */
const BUMP_RADIUS = 2.8;

/** The original's fit for the words' share of the banner, kept so the tiles come out the same size */
const ART_LEFT = 0.47;

/* Each pixel is a rounded square like the brand pattern's, kept low: about 5.5 css px of side,
   enough to read as iso and still a tile. Height is a share of the tile's width; radius and gap
   are shares of the cell */
const TILE_HEIGHT = 0.4;
const TILE_RADIUS = 0.3;
const TILE_GAP = 0.11;

type Lab = [number, number, number];

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Linear lookup of a CSS cubic bezier, so easing in the loop is one read */
const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const N = 256;
  const table = new Float32Array(N + 1);
  const at = (a: number, b: number, s: number) =>
    3 * a * s * (1 - s) * (1 - s) + 3 * b * s * s * (1 - s) + s * s * s;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const x = i / N;
    while (s < 1 && at(x1, x2, s) < x) s += 1 / 4096;
    table[i] = at(y1, y2, s);
  }
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const f = t * N;
    const i = Math.floor(f);
    return table[i] + (table[i + 1] - table[i]) * (f - i);
  };
};

const ground = bezier(0.45, 0, 0.2, 1);

// Shades are mixed in OKLab so purple, violet and green keep their chroma
// through the ramp instead of going muddy halfway
const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const toSrgb = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;

const lab = (hex: string): Lab => {
  const n = parseInt(hex.slice(1), 16);
  const r = toLinear(((n >> 16) & 255) / 255);
  const g = toLinear(((n >> 8) & 255) / 255);
  const b = toLinear((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

/** OKLab to a packed 0xAABBGGRR pixel, the byte order ImageData uses here */
const pixel = ([L, A, B]: Lab) => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const ch = (v: number) => Math.round(toSrgb(clamp01(v)) * 255);
  const r = ch(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = ch(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const b = ch(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
};

const mix = (a: Lab, b: Lab, t: number): Lab => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const PURPLE = lab(BRAND.purple);
const VIOLET = lab(BRAND.violet);
const GREEN = lab(BRAND.green);
const WHITE = lab("#ffffff");
/** Shadows lean cool and violet rather than going grey */
const SHADE_MID = lab("#241a52");
const SHADE_DEEP = lab("#0d0a20");
const INK = lab("#0a0a0f");

const chroma = (c: Lab) => Math.hypot(c[1], c[2]);

/** A straight OKLab blend greys out between violet and green; hold the chroma up */
const blend = (a: Lab, b: Lab, t: number): Lab => {
  const c = mix(a, b, t);
  const want = chroma(a) + (chroma(b) - chroma(a)) * t;
  const k = 1 + (want / (chroma(c) || 1) - 1) * 0.75;
  return [c[0], c[1] * k, c[2] * k];
};

const gradient = (t: number): Lab =>
  t < 0.4
    ? blend(PURPLE, VIOLET, t / 0.4)
    : blend(VIOLET, GREEN, (t - 0.4) / 0.6);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (n) => (n + 0.5) / 16
);
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

const hash = (n: number) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

/** The mark's cells, in draw order, with everything that does not depend on size */
interface Mark {
  /** A program's icon, not the mark: placed by its box, written and confirmed, no packet round a ring */
  icon: boolean;
  /** Share of the banner's height an icon's middle sits at */
  top: number;
  count: number;
  /** Screen axes in cell units: a = x - z across, b = x + z down */
  a: Int16Array;
  b: Int16Array;
  /** World floor position, for the pointer */
  x: Float32Array;
  z: Float32Array;
  /** Position in the mark's own drawing, for the write order and the packet's path */
  u: Float32Array;
  v: Float32Array;
  tone: Uint8Array;
  delay: Float32Array;
  dist: Float32Array;
  phase: Float32Array;
  minA: number;
  maxA: number;
  minB: number;
  maxB: number;
  maxDist: number;
  /** When the last tile has landed, and when the confirmation sweep has passed */
  written: number;
  confirmed: number;
  path: Path;
}

/** The packet's way through the mark: from the triangle's middle to the ring's left, then once round it */
interface Path {
  su: number;
  sv: number;
  cu: number;
  cv: number;
  /** The ring's outer radius, and the radius of its middle the packet runs round */
  outer: number;
  r: number;
  /** Length of the straight run and of the whole path, in cells */
  run: number;
  length: number;
}

/** Where along the path a packet is, in the mark's cells */
const along = (p: Path, s: number) => {
  if (s < p.run) {
    const k = s / p.run;
    return { u: p.su + (p.cu - p.r - p.su) * k, v: p.sv + (p.cv - p.sv) * k };
  }
  // Up over the top of the ring first, as the eye reads from the triangle
  const t = Math.PI + (s - p.run) / p.r;
  return { u: p.cu + Math.cos(t) * p.r, v: p.cv + Math.sin(t) * p.r };
};

const buildMark = (icon?: HTMLImageElement, Icon?: LucideIcon): Mark | null => {
  const top = (Icon && ICON_TOPS.get(Icon)) ?? ICON_TOP;
  const SS = 4;
  const cols = icon ? ICON_CELLS : COLS;
  const rows = icon ? ICON_CELLS : ROWS;
  const c = document.createElement("canvas");
  c.width = cols * SS;
  c.height = rows * SS;
  const g = c.getContext("2d");
  if (!g) return null;
  if (icon) paintIcon(g, icon, c.width, c.height, Icon);
  else {
    g.scale(c.width / 970, c.height / 574);
    g.fill(new Path2D(MARK_PATH));
  }
  const data = g.getImageData(0, 0, c.width, c.height).data;

  // Turned a quarter from the Tutorials sculpture: the mark's length runs away from the viewer to the
  // top right and its top edge to the back left, so it climbs from the triangle at the bottom left to
  // the ring at the top right and still reads ▷O, not mirrored
  const world = (u: number, v: number) => ({ x: v, z: cols - 1 - u });

  const cells: { x: number; z: number; u: number; v: number }[] = [];
  for (let v = 0; v < rows; v++) {
    for (let u = 0; u < cols; u++) {
      let sum = 0;
      for (let j = 0; j < SS; j++) {
        for (let i = 0; i < SS; i++) {
          sum += data[((v * SS + j) * c.width + u * SS + i) * 4 + 3];
        }
      }
      if (sum / (SS * SS * 255) > 0.42) cells.push({ ...world(u, v), u, v });
    }
  }
  // Painter's order for iso columns: back rows first
  cells.sort((p, q) => p.x + p.z - (q.x + q.z) || p.x - q.x);

  // The ring as the path draws it (centre 687.6, 292, outer radius 282), in cells
  const cu = (687.6 / 970) * cols - 0.5;
  const cv = (292 / 574) * rows - 0.5;
  const outer = (282 / 970) * cols;
  let ringSum = 0;
  let ringN = 0;

  const count = cells.length;
  const mark: Mark = {
    count,
    a: new Int16Array(count),
    b: new Int16Array(count),
    x: new Float32Array(count),
    z: new Float32Array(count),
    u: new Float32Array(count),
    v: new Float32Array(count),
    tone: new Uint8Array(count),
    delay: new Float32Array(count),
    dist: new Float32Array(count),
    phase: new Float32Array(count),
    icon: !!icon,
    top,
    minA: Infinity,
    maxA: -Infinity,
    minB: Infinity,
    maxB: -Infinity,
    maxDist: 0,
    written: 0,
    confirmed: 0,
    path: { su: 0, sv: 0, cu, cv, outer, r: outer, run: 0, length: 0 },
  };
  cells.forEach(({ x, z, u, v }, i) => {
    const a = x - z;
    const b = x + z;
    mark.a[i] = a;
    mark.b[i] = b;
    mark.x[i] = x;
    mark.z[i] = z;
    mark.u[i] = u;
    mark.v[i] = v;
    mark.minA = Math.min(mark.minA, a);
    mark.maxA = Math.max(mark.maxA, a);
    mark.minB = Math.min(mark.minB, b);
    mark.maxB = Math.max(mark.maxB, b);
    // The ring's right half only, clear of where the triangle joins it
    const d = Math.hypot(u - cu, v - cv);
    if (u > cu - 2 && d > outer * 0.35 && d < outer + 1) {
      ringSum += d;
      ringN++;
    }
  });

  // The sweep and the packet both leave from the middle of the play triangle, or of the icon
  const su = cols * (icon ? 0.5 : 0.2);
  const sv = rows * 0.5;
  const spanA = mark.maxA - mark.minA || 1;
  const spanB = mark.maxB - mark.minB || 1;
  for (let i = 0; i < count; i++) {
    const na = (mark.a[i] - mark.minA) / spanA;
    const nb = (mark.b[i] - mark.minB) / spanB;
    // Purple on the triangle at the bottom left, green on the ring at the top right
    const t = clamp01(na * 0.62 + (1 - nb) * 0.38);
    mark.tone[i] = Math.round(t * (TONES - 1));
    // Scan order: the mark's rows from its top edge, each written from the triangle to the ring
    mark.delay[i] =
      WRITE_START +
      ((mark.v[i] + mark.u[i] / cols) / rows) * WRITE_SPREAD +
      hash(i + 1) * 0.03;
    mark.written = Math.max(mark.written, mark.delay[i] + FALL_TIME + SETTLE_TIME);
    const d = Math.hypot(mark.u[i] - su, mark.v[i] - sv);
    mark.dist[i] = d;
    mark.maxDist = Math.max(mark.maxDist, d);
    mark.phase[i] = mark.x[i] * 0.42 + mark.z[i] * 0.27 + hash(i + 7) * 0.6;
  }
  mark.confirmed =
    mark.written + (mark.maxDist + 2 * CONFIRM_TAIL) / CONFIRM_SPEED;

  const r = ringN ? ringSum / ringN : outer * 0.75;
  const run = Math.max(0, cu - r - su);
  // An icon has no ring to run round: a path of no length sends no packet
  mark.path = { su, sv, cu, cv, outer, r, run, length: icon ? 0 : run + 2 * Math.PI * r };
  return mark;
};

/** Everything that depends on the banner's size and pixel ratio */
interface Scene {
  dpr: number;
  /** Device px: cell step, cube half width, resting cube height */
  step: number;
  w: number;
  h0: number;
  /** Device px: tallest side strip in the atlas */
  side: number;
  ox: number;
  oy: number;
  tops: HTMLCanvasElement;
  sides: HTMLCanvasElement;
  floor: HTMLCanvasElement;
}

/**
 * Paints every tone's cube faces once. Tops carry a soft key light from the
 * top left and a bright lip on their front edges; sides carry dithered
 * occlusion where they meet the floor, anchored to the bottom of the strip so
 * any column height is a crop of the same sprite.
 */
const paintSprites = (w: number, side: number) => {
  const hw = w / 2;
  const tops = document.createElement("canvas");
  tops.width = 2 * w * GLINTS;
  tops.height = w * TONES;
  const sides = document.createElement("canvas");
  sides.width = 2 * w * TONES;
  sides.height = side;
  const tg = tops.getContext("2d");
  const sg = sides.getContext("2d");
  if (!tg || !sg) return null;

  const RAMP = 8;
  const topImg = tg.createImageData(tops.width, tops.height);
  const sideImg = sg.createImageData(sides.width, sides.height);
  const topPx = new Uint32Array(topImg.data.buffer);
  const sidePx = new Uint32Array(sideImg.data.buffer);

  // The top as a rounded square on the floor. The distance is in floor units, the square spanning
  // -0.5 to 0.5 on both axes, negative inside
  const round = TILE_RADIUS;
  const inset = 0.5 - round;
  const outside = (dx: number, dy: number) => {
    const p = dx / w;
    const q = (2 * dy) / w;
    const u = Math.abs((p + q) / 2) - inset;
    const v = Math.abs((q - p) / 2) - inset;
    return (
      Math.hypot(Math.max(u, 0), Math.max(v, 0)) +
      Math.min(Math.max(u, v), 0) -
      round
    );
  };
  // How far below the top's centre each column of it reaches, so the sides hang from a rounded
  // edge; a column the rounding cut away has none
  const reach = new Float32Array(2 * w).fill(-1);
  for (let x = 0; x < 2 * w; x++) {
    for (let y = w - 1; y >= hw; y--) {
      if (outside(x - w + 0.5, y - hw + 0.5) <= 0) {
        reach[x] = y - hw + 1;
        break;
      }
    }
  }
  // The front corner is a curve, so the two side shades meet across it, not on a line
  const BLEND = 8;
  const soft = round * w * 0.9;

  for (let k = 0; k < TONES; k++) {
    const base = gradient(k / (TONES - 1));
    const left = mix(base, SHADE_MID, 0.36);
    const right = mix(base, SHADE_DEEP, 0.6);
    const leftRamp: number[] = [];
    const rightRamp: number[] = [];
    for (let r = 0; r < RAMP; r++) {
      const dark = 0.5 * (1 - r / (RAMP - 1));
      leftRamp.push(pixel(mix(left, INK, dark)));
      rightRamp.push(pixel(mix(right, INK, dark)));
    }
    const blendRamps = Array.from({ length: BLEND }, (_, j) =>
      Array.from({ length: RAMP }, (_, r) => {
        const dark = 0.5 * (1 - r / (RAMP - 1));
        return pixel(
          mix(mix(left, INK, dark), mix(right, INK, dark), j / (BLEND - 1))
        );
      })
    );

    for (let gl = 0; gl < GLINTS; gl++) {
      const top = mix(base, WHITE, 0.07 + gl * 0.075);
      const ramp: number[] = [];
      for (let r = 0; r < RAMP; r++) {
        const t = r / (RAMP - 1);
        ramp.push(
          pixel(
            t < 0.5
              ? mix(top, INK, (0.5 - t) * 0.2)
              : mix(top, WHITE, (t - 0.5) * 0.12)
          )
        );
      }
      const lipLeft = pixel(mix(top, WHITE, 0.4));
      const lipRight = pixel(mix(top, WHITE, 0.16));
      const x0 = gl * 2 * w;
      const y0 = k * w;
      for (let y = 0; y < w; y++) {
        const dy = y - hw + 0.5;
        for (let x = 0; x < 2 * w; x++) {
          const dx = x - w + 0.5;
          const out = outside(dx, dy);
          if (out > 0) continue;
          let c: number;
          if (dy > 0 && out > -1 / w) c = dx < 0 ? lipLeft : lipRight;
          else {
            const light = (-dx / w - (2 * dy) / w) * 0.5 + 0.5;
            const idx = Math.floor(light * (RAMP - 1) + bayer(x, y));
            c = ramp[Math.min(RAMP - 1, Math.max(0, idx))];
          }
          topPx[(y0 + y) * tops.width + x0 + x] = c;
        }
      }
    }

    const x0 = k * 2 * w;
    for (let y = 0; y < side; y++) {
      const fromBottom = side - y - 0.5;
      for (let x = 0; x < 2 * w; x++) {
        const dx = x - w + 0.5;
        if (reach[x] < 0) continue;
        const lift = fromBottom - (hw - reach[x]);
        if (lift < 0) continue;
        const ao = clamp01(1 - lift / (w * 1.1));
        const idx = Math.floor((1 - ao * ao) * (RAMP - 1) + bayer(x, y));
        const r = Math.min(RAMP - 1, Math.max(0, idx));
        sidePx[y * sides.width + x0 + x] =
          Math.abs(dx) < soft
            ? blendRamps[Math.round(((dx / soft + 1) / 2) * (BLEND - 1))][r]
            : dx < 0
            ? leftRamp[r]
            : rightRamp[r];
      }
    }
  }
  tg.putImageData(topImg, 0, 0);
  sg.putImageData(sideImg, 0, 0);
  return { tops, sides };
};

/**
 * The floor under the mark: a pool of the mark's own colour, dithered into
 * 2 css px pixels like the brand's pixel fields, and a soft contact shadow
 * thrown to the bottom right, away from the key light.
 */
const paintFloor = (
  mark: Mark,
  width: number,
  height: number,
  dpr: number,
  step: number,
  ox: number,
  oy: number
) => {
  const floor = document.createElement("canvas");
  floor.width = width;
  floor.height = height;
  const fg = floor.getContext("2d");
  if (!fg) return floor;

  const rhombus = (
    g: CanvasRenderingContext2D,
    scale: number,
    i: number,
    grow: number,
    sx: number,
    sy: number
  ) => {
    const cx = (ox + mark.a[i] * step + sx) * scale;
    const cy = (oy + (mark.b[i] * step) / 2 + sy) * scale;
    const r = step * grow * scale;
    g.moveTo(cx - r, cy);
    g.lineTo(cx, cy - r / 2);
    g.lineTo(cx + r, cy);
    g.lineTo(cx, cy + r / 2);
    g.closePath();
  };

  // Glow: tiny footprint, upscaled twice for a cheap wide blur, then ordered
  // dithered into a few alpha levels at 2 css px
  const tinyScale = 1 / (18 * dpr);
  const tiny = document.createElement("canvas");
  tiny.width = Math.ceil(width * tinyScale);
  tiny.height = Math.ceil(height * tinyScale);
  const ty = tiny.getContext("2d");
  const pixelSize = 2 * dpr;
  const pool = document.createElement("canvas");
  pool.width = Math.ceil(width / pixelSize);
  pool.height = Math.ceil(height / pixelSize);
  const pg = pool.getContext("2d");
  if (ty && pg) {
    // A handful of colour buckets is plenty for something this blurred
    for (let k = 0; k <= TONES; k += 4) {
      ty.beginPath();
      for (let i = 0; i < mark.count; i++) {
        if (Math.round(mark.tone[i] / 4) * 4 === k)
          rhombus(ty, tinyScale, i, 1.6, 0, step * 0.8);
      }
      const c = pixel(gradient(Math.min(1, k / (TONES - 1))));
      ty.fillStyle = `rgb(${c & 255}, ${(c >> 8) & 255}, ${(c >> 16) & 255})`;
      ty.fill();
    }
    pg.imageSmoothingEnabled = true;
    pg.drawImage(tiny, 0, 0, pool.width, pool.height);
    const img = pg.getImageData(0, 0, pool.width, pool.height);
    const d = img.data;
    const LEVELS = 5;
    const PEAK = 0.34;
    for (let y = 0; y < pool.height; y++) {
      for (let x = 0; x < pool.width; x++) {
        const o = (y * pool.width + x) * 4;
        const a = (d[o + 3] / 255) ** 1.4;
        const q = Math.floor(a * LEVELS + bayer(x, y) - 0.5) / LEVELS;
        d[o + 3] = Math.round(clamp01(q) * PEAK * 255);
      }
    }
    pg.putImageData(img, 0, 0);
    fg.imageSmoothingEnabled = false;
    fg.drawImage(pool, 0, 0, pool.width * pixelSize, pool.height * pixelSize);
  }

  // Contact shadow: footprints at quarter size, upscaled smooth
  const lowScale = 1 / (4 * dpr);
  const low = document.createElement("canvas");
  low.width = Math.ceil(width * lowScale);
  low.height = Math.ceil(height * lowScale);
  const lg = low.getContext("2d");
  if (lg) {
    lg.beginPath();
    for (let i = 0; i < mark.count; i++) {
      rhombus(lg, lowScale, i, 1.05, step * 0.45, step * 0.3);
    }
    lg.fillStyle = "#050507";
    lg.fill();
    fg.imageSmoothingEnabled = true;
    fg.globalAlpha = 0.7;
    fg.drawImage(low, 0, 0, width, height);
    fg.globalAlpha = 1;
  }
  return floor;
};

let spriteCache: {
  key: string;
  tops: HTMLCanvasElement;
  sides: HTMLCanvasElement;
} | null = null;

/* On a narrow banner the words run the full width, so the sculpture hangs
   from the top right corner instead: the same tiles, the ring in the corner
   and the triangle trailing down to the left, fading over the words */
const CORNER_CELL = 8;

const buildScene = (
  mark: Mark,
  cssW: number,
  cssH: number,
  dpr: number,
  corner: boolean
): Scene | null => {
  const spanA = mark.maxA - mark.minA;
  const spanB = mark.maxB - mark.minB;
  // The largest cube that leaves the words their room and only bleeds a little
  let cell = CELL_SIZES[CELL_SIZES.length - 1];
  for (const size of CELL_SIZES) {
    const artW = (spanA + 2) * size;
    const artH = (spanB / 2 + 2) * size;
    if (artW <= cssW * (1 - ART_LEFT) * 1.02 && artH <= cssH * 1.08) {
      cell = size;
      break;
    }
  }
  cell = corner ? CORNER_CELL : cell * (mark.icon ? ICON_SCALE : MARK_SCALE);
  const step = 2 * Math.round((cell * dpr) / 2);
  const gap = Math.max(2, 2 * Math.round(step * TILE_GAP));
  const w = step - gap;
  const h0 = Math.round(w * TILE_HEIGHT);
  const side = h0 + Math.ceil((PACKET_LIFT + BUMP_LIFT + 2) * dpr) + w / 2;

  const width = Math.round(cssW * dpr);
  const height = Math.round(cssH * dpr);
  // Placed by the ring, not by the art's box: turned, a box fit leaves the ring past the right edge
  // and shows the triangle's back corner, a "<". With the ring in view and the triangle's tip
  // pointing into it, the mark reads ▷O while the triangle's back fades into the words' side
  const { cu, cv, outer } = mark.path;
  const ringA = cv - (COLS - 1 - cu);
  const ringB = cv + (COLS - 1 - cu);
  const halfW = outer * Math.SQRT2 * step;
  const cx = corner
    ? width - halfW * 0.9
    : width - halfW * 0.8;
  const cy = corner ? halfW * 0.3 : height * 0.34;
  let ox = Math.round(cx - ringA * step);
  let oy = Math.round(cy + h0 + w / 2 - (ringB * step) / 2);
  // An icon is placed by its box, as the Tutorials banner places it: whole right of the words,
  // or hung from the corner with a third of it above the frame
  if (mark.icon) {
    const artH = (spanB * step) / 2 + h0 + w;
    const left = corner ? width * 0.4 : width * ICON_LEFT;
    const top = corner ? -artH * 0.32 : height * mark.top - artH / 2;
    ox = Math.round(left + w - mark.minA * step);
    oy = Math.round(top + h0 + w / 2 - (mark.minB * step) / 2);
  }

  // A drag across window sizes keeps the same cube, so keep its sprites too
  const key = `${w}:${side}`;
  if (spriteCache?.key !== key) {
    const painted = paintSprites(w, side);
    spriteCache = painted && { key, ...painted };
  }
  const sprites = spriteCache && {
    tops: spriteCache.tops,
    sides: spriteCache.sides,
  };
  if (!sprites) return null;
  return {
    dpr,
    step,
    w,
    h0,
    side,
    ox,
    oy,
    ...sprites,
    floor: paintFloor(mark, width, height, dpr, step, ox, oy),
  };
};

export function ProgramVoxels({
  className,
  corner = false,
  icon: Icon,
}: {
  className?: string;
  /** Hung from the top right corner, for a banner the words fill across */
  corner?: boolean;
  /** A program's icon to write in place of the mark */
  icon?: LucideIcon;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;
    let stop: (() => void) | undefined;
    let gone = false;
    const begin = (mark: Mark | null) => {
      if (!gone && mark && mark.count > 0) stop = run(root, canvas, ctx, mark);
    };
    // The icon is a picture to load first; the mark is a path, drawn at once
    const svg = iconRef.current;
    if (svg) loadIcon(svg, ICON_CELLS * 4).then((img) => begin(buildMark(img, Icon)), () => {});
    else begin(buildMark());
    return () => {
      gone = true;
      stop?.();
    };
  }, [corner, Icon]);

  function run(root: HTMLDivElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, mark: Mark) {
    const host = root.parentElement;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let scene: Scene | null = null;
    const bump = new Float32Array(mark.count);
    let clock = 0;
    let last = 0;
    let raf = 0;
    let inView = false;

    // Pointer in device px, a smoothed copy the bump follows, and how much
    // the bump is present at all, so entering and leaving both ease
    const pointer = { x: 0, y: 0, sx: 0, sy: 0, on: false, amount: 0 };

    const draw = (time: number, dt: number) => {
      const s = scene;
      if (!s) return;
      const { step, w, h0, side, ox, oy, dpr } = s;
      const live = !still;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // The floor's glow comes up first: the space the program is written into
      ctx.globalAlpha = live ? ground((time - 0.05) / GROUND_TIME) : 1;
      if (ctx.globalAlpha > 0) ctx.drawImage(s.floor, 0, 0);

      const follow = 1 - Math.exp(-dt * 12);
      if (pointer.on && pointer.amount < 0.02) {
        pointer.sx = pointer.x;
        pointer.sy = pointer.y;
      }
      pointer.sx += (pointer.x - pointer.sx) * follow;
      pointer.sy += (pointer.y - pointer.sy) * follow;
      const target = pointer.on && live ? 1 : 0;
      pointer.amount +=
        (target - pointer.amount) *
        (1 - Math.exp(-dt * (pointer.on ? 5 : 2.5)));

      // Back to the floor under the cube tops: a = x - z, b = x + z
      const pa = (pointer.sx - ox) / step;
      const pb = (pointer.sy + h0 - oy) / (step / 2);
      const px = (pa + pb) / 2;
      const pz = (pb - pa) / 2;
      const bumpGain = BUMP_LIFT * dpr * pointer.amount;
      const twoR2 = 2 * BUMP_RADIUS * BUMP_RADIUS;
      const riseRate = 1 - Math.exp(-dt * 16);
      const settleRate = 1 - Math.exp(-dt * 4.5);

      // The confirmation sweep runs once, after the last tile has landed
      const sweep = time - mark.written;
      const front =
        live && sweep > 0 && time < mark.confirmed ? sweep * CONFIRM_SPEED : -1e3;
      const confirmGain = CONFIRM_LIFT * dpr;

      // The transaction in flight, if any: its head, a dimmer cell behind it, and how present it is
      let hu = 0;
      let hv = 0;
      let tu = 0;
      let tv = 0;
      let packet = 0;
      const idle = time - mark.confirmed - PACKET_FIRST;
      if (live && idle > -0.6) {
        const k = Math.floor((idle + 0.6) / PACKET_PERIOD);
        // A little jitter so the beat does not read as a metronome
        const at = idle - k * PACKET_PERIOD - (hash(k + 3) - 0.5) * 1.2;
        const travel = at * PACKET_SPEED;
        const path = mark.path;
        if (at > 0 && travel < path.length) {
          packet =
            Math.min(1, travel / 2) * Math.min(1, (path.length - travel) / 6);
          const head = along(path, travel);
          const tail = along(path, Math.max(0, travel - 1.7));
          hu = head.u;
          hv = head.v;
          tu = tail.u;
          tv = tail.v;
        }
      }
      const twoS2 = 2 * PACKET_SIGMA * PACKET_SIGMA;
      const packetGain = PACKET_LIFT * dpr * packet;
      const breathGain = 0.6 * dpr;
      const glintScale = (GLINTS - 1) / ((PACKET_LIFT + BUMP_LIFT * 0.7) * dpr);
      const dropGain = DROP_HEIGHT * dpr;
      const hopGain = SETTLE_HOP * dpr;

      let alpha = ctx.globalAlpha;
      for (let i = 0; i < mark.count; i++) {
        // lift grows the column; float raises the whole tile, for the fall and the settle; warm
        // turns the top toward green and light
        let lift = 0;
        let float = 0;
        let warm = 0;
        let glow = 0;
        let a = 1;
        if (live) {
          const t = time - mark.delay[i];
          if (t <= 0) continue;
          if (t < FALL_TIME) {
            // Falling under gravity, so it lands with weight
            const k = t / FALL_TIME;
            float = dropGain * (1 - k * k);
            a = Math.min(1, k * 3);
          } else if (t < FALL_TIME + SETTLE_TIME) {
            const k = (t - FALL_TIME) / SETTLE_TIME;
            float = hopGain * Math.sin(Math.PI * k) * (1 - k);
            // A written tile flashes as it lands
            warm = 0.55 * (1 - k);
          }
          const landed = t >= FALL_TIME ? 1 : 0;

          const s0 = front - mark.dist[i];
          const confirm =
            s0 < 0
              ? Math.exp(-((s0 / CONFIRM_LEAD) ** 2))
              : Math.exp(-((s0 / CONFIRM_TAIL) ** 2));
          let hit = 0;
          if (packet > 0) {
            const du = mark.u[i] - hu;
            const dv = mark.v[i] - hv;
            const eu = mark.u[i] - tu;
            const ev = mark.v[i] - tv;
            hit = Math.min(
              1,
              Math.exp(-(du * du + dv * dv) / twoS2) +
                0.45 * Math.exp(-(eu * eu + ev * ev) / twoS2)
            );
          }
          const dx = mark.x[i] - px;
          const dz = mark.z[i] - pz;
          const want = bumpGain * Math.exp(-(dx * dx + dz * dz) / twoR2);
          bump[i] +=
            (want - bump[i]) * (want > bump[i] ? riseRate : settleRate);
          lift =
            (confirm * confirmGain + hit * packetGain + bump[i]) * landed +
            Math.sin(time * 0.7 + mark.phase[i]) * breathGain * landed;
          warm = Math.max(warm, confirm * 0.85, hit * packet);
          glow = hit * packet;
        }

        const h = Math.max(0, Math.min(side - w / 2, Math.round(h0 + lift)));
        const f = Math.round(float);
        const gx = ox + mark.a[i] * step;
        const gy = oy + (mark.b[i] * step) / 2 - f;
        if (a !== alpha) ctx.globalAlpha = alpha = a;
        const tone = mark.tone[i];
        const strip = h + w / 2;
        ctx.drawImage(
          s.sides,
          tone * 2 * w,
          side - strip,
          2 * w,
          strip,
          gx - w,
          gy - h,
          2 * w,
          strip
        );
        const glint = Math.max(
          0,
          Math.min(GLINTS - 1, Math.round(lift * glintScale + warm * (GLINTS - 1)))
        );
        const top = Math.round(tone + (TONES - 1 - tone) * warm * 0.7);
        ctx.drawImage(
          s.tops,
          glint * 2 * w,
          top * w,
          2 * w,
          w,
          gx - w,
          gy - h - w / 2,
          2 * w,
          w
        );
        if (glow > 0.05) {
          // The packet is light added on top, so it reads even over the green end of the ring
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = alpha = glow * 0.6;
          ctx.drawImage(s.tops, glint * 2 * w, top * w, 2 * w, w, gx - w, gy - h - w / 2, 2 * w, w);
          ctx.globalCompositeOperation = "source-over";
        }
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      clock += dt;
      draw(clock, dt);
      if (running()) raf = requestAnimationFrame(frame);
    };

    const running = () =>
      !still &&
      inView &&
      document.visibilityState === "visible" &&
      scene !== null;

    const sync = () => {
      if (running()) {
        if (!raf) {
          last = 0;
          raf = requestAnimationFrame(frame);
        }
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const resize = (cssW: number, cssH: number) => {
      if (cssW < 8 || cssH < 8) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      scene = buildScene(mark, cssW, cssH, dpr, corner);
      // Resizing clears the canvas; paint now rather than wait for a frame
      draw(clock, 0);
      sync();
    };

    const ro = new ResizeObserver(([entry]) =>
      resize(entry.contentRect.width, entry.contentRect.height)
    );
    ro.observe(root);

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    io.observe(root);
    document.addEventListener("visibilitychange", sync);

    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const dpr = scene?.dpr ?? 1;
      pointer.x = (e.clientX - r.left) * dpr;
      pointer.y = (e.clientY - r.top) * dpr;
      pointer.on = true;
    };
    const leave = () => {
      pointer.on = false;
    };
    if (host && !still) {
      host.addEventListener("pointermove", move);
      host.addEventListener("pointerleave", leave);
    }

    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      host?.removeEventListener("pointermove", move);
      host?.removeEventListener("pointerleave", leave);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      scene = null;
    };
  }

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      // The icon keeps clear of the words on its own, so it isn't faded out towards them
      style={corner ? CORNER_MASK : Icon ? undefined : SIDE_MASK}
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      <canvas ref={canvasRef} className="block size-full" />
      {/* Never shown: the effect reads its svg to sample it */}
      {Icon && <Icon ref={iconRef} className="hidden" />}
    </div>
  );
}

