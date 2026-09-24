import { FC, useEffect, useRef } from "react";

/**
 * The hero: a dithered sky, a table of Solana-mark pieces lying on it, and one
 * dither pass over the whole thing.
 *
 * Sky and pieces share a canvas on purpose. The dither has to sit *over* the
 * slabs, not behind them — otherwise the pieces are the one smooth thing in a
 * crosshatched frame and read as stickers. So the frame is drawn first, in
 * full colour, and the Bayer pass quantises everything at once: sky, faces,
 * edges and shadows all land on the same eleven-step ramp.
 *
 * The pieces are the mark's own three bars, several of each, lying at every
 * angle. They were fragments of bars before — a grid cut through each one —
 * which produced a field of small rhombi that read as confetti rather than as
 * a logo taken apart.
 *
 * They are solid, not stickers: each slab's top face is projected away from a
 * camera standing above and beyond the near edge, so the flanks you see depend
 * on where the piece lies, and the shadow falls along the light instead.
 *
 * Physics is shallow but shaped. Three collision circles spaced along each bar
 * so a long piece behaves like a long piece — one made them dinner plates that
 * stopped a body width apart — and every force applies its torque through the
 * lever it actually acts on, which is what makes them limp. The hand grabs a
 * point rather than the slab: it pulls on that point with a spring, so a bar
 * taken by its end swings round to hang from your cursor and keeps swinging
 * after you stop.
 */

/* ── the mark ─────────────────────────────────────────────────────────────
   Three bars. Each has a flat top and bottom and both ends cut at the same
   angle, so it is a parallelogram lying on its side; the middle one leans
   against the other two. Those are the shapes — not fragments of them. Cutting
   them into a grid gave a field of little rhombi that had nothing to do with
   the logo.

   Units follow SDP's `lp-demo/v2/js/solana-mark.js`: K = 2/67, bars 15 high
   with an 8 gap, the ends shifted by 13. */
const K = 2 / 67;
const BAR_H = 15 * K;
const SHEAR = 13 * K;
const X_LEFT = -33.5 * K;
const X_RIGHT = 20.5 * K;
const LEAN = [1, -1, 1];

/** Slab thickness, in the same units as the bar. A third of the bar's height:
    thin enough to still read as the logo, thick enough to be an object. */
const DEPTH = 0.34;

/**
 * The camera. It stands above the table and a little beyond its near edge, so
 * a slab's top face sits displaced *away* from that point — up-screen for
 * everything, and sideways by however far off the centre line the piece lies.
 *
 * This is the whole difference between a solid and a sticker. A fixed diagonal
 * offset gives every piece the same edge in the same place, which the eye reads
 * as a drop shadow on something flat. Here a piece on the left shows its right
 * flank, one on the right shows its left, and the far ones show more thickness
 * than the near ones — the frame has a place to stand in.
 */
const CAM_Y = 1.7;
/** Where the light comes from, as the direction it travels */
const LIGHT: [number, number] = [0.52, 0.85];

/** One bar, centred on itself, as four corners. */
const bar = (lean: number): Array<[number, number]> => {
  const h = BAR_H / 2;
  const shift = lean * SHEAR;
  // The top edge is displaced against the bottom; the ends take the angle
  const pts: Array<[number, number]> = [
    [X_LEFT, -h],
    [X_RIGHT, -h],
    [X_RIGHT + shift, h],
    [X_LEFT + shift, h],
  ];
  const cx = pts.reduce((a, [x]) => a + x, 0) / 4;
  return pts.map(([x, y]) => [x - cx, y] as [number, number]);
};
/**
 * A wedge off the play triangle, and a segment off its O.
 *
 * The table was three bars and nothing else, which reads as one shape in three
 * rotations. The proposed mark is a triangle and a ring as well, so its parts
 * are the parts that belong here — a wedge and an arc give the pile two more
 * silhouettes to catch the eye, and both still behave as slabs.
 */
const wedge = (): Array<[number, number]> => {
  const r = BAR_H * 1.55;
  const pts: Array<[number, number]> = [
    [-r * 0.62, -r * 0.78],
    [r * 0.86, 0],
    [-r * 0.62, r * 0.78],
    [-r * 0.28, 0],
  ];
  return pts;
};

/** A slice of the ring, as a polygon — the physics only deals in corners. */
const arc = (from: number, to: number, steps = 5): Array<[number, number]> => {
  const outer = BAR_H * 1.5;
  const inner = BAR_H * 0.82;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    pts.push([Math.cos(a) * outer, Math.sin(a) * outer]);
  }
  for (let i = steps; i >= 0; i--) {
    const a = from + ((to - from) * i) / steps;
    pts.push([Math.cos(a) * inner, Math.sin(a) * inner]);
  }
  const cx = pts.reduce((t, [x]) => t + x, 0) / pts.length;
  const cy = pts.reduce((t, [, y]) => t + y, 0) / pts.length;
  return pts.map(([x, y]) => [x - cx, y - cy] as [number, number]);
};

const SHAPES = [
  ...LEAN.map(bar),
  wedge(),
  arc(-0.85, 0.85),
  arc(Math.PI - 0.7, Math.PI + 0.7),
];

/** How many of each shape are on the table */
const PER_SHAPE = 9;

/** The landing's ramp, top to bottom. Everything is quantised onto this. */
const RAMP_HEX = [
  "#C9D4FB",
  "#B4C1F7",
  "#9AA6EF",
  "#7C85E0",
  "#5E63C9",
  "#4340AE",
  "#2A2596",
  "#1E1B8C",
  "#12105A",
  "#0A0836",
  "#050507",
];
const RAMP = RAMP_HEX.map((hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]);
const LUM = RAMP.map(([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b);
const LUM_HI = LUM[0];
const LUM_LO = LUM[LUM.length - 1];

/** Top faces, so a slab is lighter than the sky it lies on */
const FACES = ["#D9E2FF", "#C9D4FB", "#B4C1F7", "#9AA6EF"];
/** Flanks, lit to unlit. Which one an edge takes depends on where it faces. */
const SIDES = ["#8F9AEA", "#7C85E0", "#5E63C9", "#4340AE", "#2A2596", "#1E1B8C"];

const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

interface Piece {
  /** Top-face corners in units, centred on the piece's own middle */
  shape: Array<[number, number]>;
  /**
   * Collision shape: three circles spaced along the bar's length. One circle
   * round a bar this long behaves like a dinner plate — pieces stop a body
   * width apart and never overlap the way slabs should. Three is enough for
   * them to lie across each other and still be pushed end-on.
   */
  lobes: Array<{ ox: number; r: number }>;
  /** Bounding radius in units, for picking */
  radius: number;
  /** Screen position and motion */
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  /** Entrance: 0 before it appears, 1 once it is full size */
  land: number;
  delay: number;
  /** Scale as it arrives, overshooting 1 before settling */
  grow: number;
  /** How much it is deformed, and along which axis */
  squash: number;
  squashAngle: number;
  face: string;
}

interface HeroCanvasProps {
  /** Fraction of the short edge one logo unit takes */
  scale?: number;
  /** Resolution divisor — bigger means coarser dither cells and less work */
  pixel?: number;
}

const HeroCanvas: FC<HeroCanvasProps> = ({ scale = 0.068, pixel = 2 }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    /* Everything below is in low-resolution canvas pixels — the canvas is a
       fraction of the CSS box and scaled back up, which is what makes the
       dither cells visible and the whole loop affordable. */
    let w = 0;
    let h = 0;
    let unit = 1;
    let pieces: Piece[] = [];
    let held: Piece | null = null;
    /** Where the hand took hold, in the slab's own frame */
    let grabLX = 0;
    let grabLY = 0;
    let pointer = { x: 0, y: 0, px: 0, py: 0 };
    let frame = 0;
    let started = 0;

    const build = () => {
      const out: Piece[] = [];
      for (let i = 0; i < SHAPES.length * PER_SHAPE; i++) {
        const shape = SHAPES[i % SHAPES.length];
        const halfLen = Math.max(...shape.map(([x]) => Math.abs(x)));
        const halfH = BAR_H / 2;
        // Three lobes along the length, each as fat as the bar is tall
        const lobes = [-1, 0, 1].map((k) => ({
          ox: k * halfLen * 0.58,
          r: halfH * 1.1,
        }));
        out.push({
          shape,
          lobes,
          radius: Math.max(...shape.map(([x, y]) => Math.hypot(x, y))),
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          angle: 0,
          spin: 0,
          land: 0,
          delay: 0,
          grow: 0,
          squash: 0,
          squashAngle: 0,
          face: FACES[i % FACES.length],
        });
      }
      return out;
    };

    /* They arrive where they land rather than falling from off-screen: each
       pops into place, overshoots its size and settles, a beat after the one
       before. Falling meant most of the entrance happened above the frame
       where nobody could see it. */
    const scatter = () => {
      const shuffled = [...pieces].sort(() => Math.random() - 0.5);
      shuffled.forEach((p, i) => {
        p.x = w * (0.06 + Math.random() * 0.88);
        p.y = h * (0.08 + Math.random() * 0.84);
        p.vx = (Math.random() - 0.5) * 1.2;
        p.vy = (Math.random() - 0.5) * 1.2;
        p.angle = Math.random() * Math.PI * 2;
        p.spin = (Math.random() - 0.5) * 0.06;
        p.land = 0;
        p.grow = reduced ? 1 : 0;
        p.delay = reduced ? 0 : i * 16 + Math.random() * 140;
      });
      if (reduced) for (const p of pieces) p.land = 1;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      w = Math.max(1, Math.round(rect.width / pixel));
      h = Math.max(1, Math.round(rect.height / pixel));
      canvas.width = w;
      canvas.height = h;
      unit = Math.min(w, h) * scale;
      if (!pieces.length) {
        pieces = build();
        scatter();
      }
    };

    /* ── the frame, in full colour ─────────────────────────────────────── */

    const paintSky = (time: number) => {
      const last = RAMP.length - 1;
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let y = 0; y < h; y++) {
        const ny = y / (h - 1 || 1);
        for (let x = 0; x < w; x++) {
          const nx = x / (w - 1 || 1);
          const bow = Math.pow(Math.abs(nx - 0.46), 2) * 0.16;
          const drift =
            Math.sin(nx * 2.3 + time * 0.00021) * 0.014 +
            Math.sin((nx + ny) * 3.1 - time * 0.00013) * 0.01;
          const t = Math.min(1, Math.max(0, ny * 1.02 + bow + drift));
          /* Smooth here, on purpose: quantising twice — once into the ramp and
             again in the dither pass — throws away the fraction the ordered
             threshold needs, and the sky comes out in hard bands instead of
             crosshatch. */
          const pos = t * last;
          const lo = Math.floor(pos);
          const hi = Math.min(last, lo + 1);
          const f = pos - lo;
          const a = RAMP[lo];
          const b = RAMP[hi];
          const i = (y * w + x) * 4;
          d[i] = a[0] + (b[0] - a[0]) * f;
          d[i + 1] = a[1] + (b[1] - a[1]) * f;
          d[i + 2] = a[2] + (b[2] - a[2]) * f;
          d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    /* Soft rather than rigid: a knock squashes the slab along the line it was
       hit and stretches it across, and the deformation springs out over the
       next few frames. It is one scale applied in the collision's own frame —
       not a mass-spring mesh — but it is the part of a soft body you actually
       see, and it costs two trig calls. */
    const corners = (p: Piece, dx = 0, dy = 0) => {
      const cos = Math.cos(p.angle);
      const sin = Math.sin(p.angle);
      const sq = p.squash;
      const ca = Math.cos(p.squashAngle);
      const sa = Math.sin(p.squashAngle);
      const along = (1 - sq * 0.55) * p.grow;
      const across = (1 + sq * 0.4) * p.grow;
      return p.shape.map(([sx, sy]) => {
        // into world orientation
        let rx = sx * cos - sy * sin;
        let ry = sx * sin + sy * cos;
        // into the squash's frame, scale, and back
        const u = rx * ca + ry * sa;
        const v = -rx * sa + ry * ca;
        const su = u * along;
        const sv = v * across;
        rx = su * ca - sv * sa;
        ry = su * sa + sv * ca;
        return {
          x: p.x + rx * unit + dx,
          y: p.y + ry * unit * 0.92 + dy,
        };
      });
    };

    const poly = (pts: Array<{ x: number; y: number }>, colour: string) => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = colour;
      ctx.fill();
    };

    const paintPieces = () => {
      const rise = DEPTH * unit;
      /* Camera ground position, and how far a unit of height throws a point
         away from it. Both in low-res canvas pixels. */
      const camX = w * 0.5;
      const camY = h * CAM_Y;
      const throwK = rise / (h * 0.8);
      const [lx, ly] = LIGHT;

      // Further up the table is further away, so it goes down first
      const order = [...pieces].sort((a, b) => a.y - b.y);

      for (const p of order) {
        if (p.grow <= 0.001) continue;

        /* The footprint, where the slab meets the table, and the same polygon
           lifted to the top of the slab. */
        const base = corners(p);
        const dx = (p.x - camX) * throwK;
        const dy = (p.y - camY) * throwK;
        const top = base.map((c) => ({ x: c.x + dx, y: c.y + dy }));

        // What it casts, along the light rather than along the camera
        ctx.globalAlpha = 0.24 * p.land;
        poly(
          base.map((c) => ({ x: c.x + lx * rise * 1.1, y: c.y + ly * rise * 1.1 })),
          "#0A0836"
        );
        ctx.globalAlpha = 1;

        /* Which way round the footprint runs, so the normals point outward and
           not into the slab. Screen y is down, so a positive shoelace is the
           clockwise one. */
        let area = 0;
        for (let i = 0; i < base.length; i++) {
          const a = base[i];
          const b = base[(i + 1) % base.length];
          area += a.x * b.y - b.x * a.y;
        }
        const wind = area >= 0 ? 1 : -1;

        /* One flank per edge that turns toward the camera — that is, whose
           outward normal opposes the lift. Their shade comes from how squarely
           each one faces the light, which is what separates the two visible
           sides of a slab from each other. */
        for (let i = 0; i < base.length; i++) {
          const a = base[i];
          const b = base[(i + 1) % base.length];
          const ex = b.x - a.x;
          const ey = b.y - a.y;
          const len = Math.hypot(ex, ey) || 1;
          const nx = (ey / len) * wind;
          const ny = (-ex / len) * wind;
          if (nx * dx + ny * dy >= 0) continue;

          const lit = Math.max(0, -(nx * lx + ny * ly));
          const shade = SIDES[
            Math.min(
              SIDES.length - 1,
              Math.round((1 - lit) * (SIDES.length - 1))
            )
          ];
          poly(
            [a, b, { x: b.x + dx, y: b.y + dy }, { x: a.x + dx, y: a.y + dy }],
            shade
          );
        }

        poly(top, p.face);
      }
    };

    /** Quantise the whole frame onto the ramp with an ordered threshold. */
    const dither = () => {
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const last = RAMP.length - 1;
      const range = LUM_HI - LUM_LO || 1;
      for (let y = 0; y < h; y++) {
        const brow = BAYER[y & 7];
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          // Position on the ramp, brightest first
          const pos = (1 - (lum - LUM_LO) / range) * last;
          const step = Math.floor(pos);
          const frac = pos - step;
          const threshold = (brow[x & 7] + 0.5) / 64;
          const level = Math.max(
            0,
            Math.min(last, step + (frac > threshold ? 1 : 0))
          );
          const c = RAMP[level];
          d[i] = c[0];
          d[i + 1] = c[1];
          d[i + 2] = c[2];
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    /* ── motion ─────────────────────────────────────────────────────────── */

    const settle = (now: number) => {
      /* Loose enough to keep sliding after a shove, tight enough to stop.
         At 0.9 everything stopped almost at once and the table felt like mud. */
      const FRICTION = 0.962;
      const SPIN_FRICTION = 0.978;

      for (const p of pieces) {
        if (now < p.delay) continue;
        if (p.land < 1) {
          p.land = Math.min(1, p.land + 0.09);
          /* Overshoot: a spring that passes 1 and comes back, so arriving has
             a snap to it rather than easing politely into place. */
          const e = p.land;
          p.grow = 1 + Math.sin(e * Math.PI) * 0.34 * (1 - e);
          if (p.land === 1) {
            p.grow = 1;
            p.squash = 0.3;
            p.squashAngle = Math.random() * Math.PI;
          }
        }
        /* Held: the hand pulls on the one point it grabbed, and the rest of
           the slab follows. A spring there gives both a force on the middle
           and a torque about it, so a bar picked up by its end swings round
           and hangs, lags behind a fast hand, and overshoots when it stops.
           Pinning the centre to the cursor instead made it a cursor with a
           picture attached. */
        if (p === held) {
          const cos = Math.cos(p.angle);
          const sin = Math.sin(p.angle);
          const rx = (grabLX * cos - grabLY * sin) * unit;
          const ry = (grabLX * sin + grabLY * cos) * unit * 0.92;
          const ex = pointer.x - (p.x + rx);
          const ey = pointer.y - (p.y + ry);

          const STIFF = 0.34;
          p.vx += ex * STIFF;
          p.vy += ey * STIFF;
          // Moment of inertia, near enough: a slab of this reach
          const inertia = Math.max(1, Math.pow(p.radius * unit, 2)) * 1.4;
          p.spin += ((rx * ey - ry * ex) * STIFF) / inertia;

          p.x += p.vx;
          p.y += p.vy;
          p.angle += p.spin;
          // Damped hard, or the spring rings forever
          p.vx *= 0.58;
          p.vy *= 0.58;
          p.spin *= 0.88;
          p.squash *= 0.9;
          continue;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.spin *= SPIN_FRICTION;
        // Springs back
        p.squash *= 0.86;

        /* The table has edges. A bar that meets one at an angle is turned by
           it — the component of its travel along the wall becomes spin, which
           is what keeps the pile from settling into a neat row. */
        const r = p.radius * unit;
        if (p.x < r) {
          p.x = r;
          p.vx = Math.abs(p.vx) * 0.62;
          p.spin += p.vy * 0.012;
        } else if (p.x > w - r) {
          p.x = w - r;
          p.vx = -Math.abs(p.vx) * 0.62;
          p.spin -= p.vy * 0.012;
        }
        if (p.y < r) {
          p.y = r;
          p.vy = Math.abs(p.vy) * 0.62;
          p.spin -= p.vx * 0.012;
        } else if (p.y > h - r) {
          p.y = h - r;
          p.vy = -Math.abs(p.vy) * 0.62;
          p.spin += p.vx * 0.012;
        }
      }

      /* Separation, lobe against lobe. A held piece does not move — it
         shoves — which is what makes dragging one through the pile feel like
         pushing something rather than passing through it. */
      const world = (p: Piece, l: { ox: number; r: number }) => {
        const cos = Math.cos(p.angle);
        const sin = Math.sin(p.angle);
        return {
          x: p.x + l.ox * cos * unit,
          y: p.y + l.ox * sin * unit * 0.92,
          r: l.r * unit,
        };
      };

      for (let i = 0; i < pieces.length; i++) {
        const a = pieces[i];
        if (now < a.delay) continue;
        for (let j = i + 1; j < pieces.length; j++) {
          const b = pieces[j];
          if (now < b.delay) continue;
          // Cheap reject before the nine lobe pairs
          const far = (a.radius + b.radius) * unit;
          if (Math.abs(a.x - b.x) > far || Math.abs(a.y - b.y) > far) continue;

          for (const la of a.lobes) {
            const ca = world(a, la);
            for (const lb of b.lobes) {
              const cb = world(b, lb);
              const dx = cb.x - ca.x;
              const dy = cb.y - ca.y;
              const min = ca.r + cb.r;
              const dist = Math.hypot(dx, dy) || 0.0001;
              if (dist >= min) continue;

              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = min - dist;
              const aHeld = a === held;
              const bHeld = b === held;
              const aShare = aHeld ? 0 : bHeld ? 1 : 0.5;
              const bShare = bHeld ? 0 : aHeld ? 1 : 0.5;

              a.x -= nx * overlap * aShare;
              a.y -= ny * overlap * aShare;
              b.x += nx * overlap * bShare;
              b.y += ny * overlap * bShare;

              /* Off-centre hits turn the bar. The lever is how far along the
                 bar the contact landed, which is what stops a long piece from
                 sliding sideways like a puck. */
              const bite = Math.min(0.4, overlap / (min || 1) + 0.05);
              const hitAngle = Math.atan2(ny, nx);
              a.squash = Math.max(a.squash, bite);
              a.squashAngle = hitAngle;
              b.squash = Math.max(b.squash, bite);
              b.squashAngle = hitAngle;

              /* Torque by the actual lever: the contact's offset from the
                 middle crossed into the push. An end-on knock spins a bar
                 hard, one through the middle barely at all — the difference is
                 most of what makes a pile of them look jointed rather than
                 like a raft of tiles sliding about. */
              const push = overlap * 0.12;
              const torque = (p: Piece, l: { ox: number }, sign: number) => {
                const rx = l.ox * Math.cos(p.angle) * unit;
                const ry = l.ox * Math.sin(p.angle) * unit * 0.92;
                const fx = sign * nx * push;
                const fy = sign * ny * push;
                const inertia = Math.max(1, Math.pow(p.radius * unit, 2)) * 0.5;
                p.spin += (rx * fy - ry * fx) / inertia;
              };
              if (!aHeld) {
                a.vx -= nx * push;
                a.vy -= ny * push;
                torque(a, la, -1);
              }
              if (!bHeld) {
                b.vx += nx * push;
                b.vy += ny * push;
                torque(b, lb, 1);
              }
            }
          }
        }
      }
    };

    const step = (now: number) => {
      if (!started) started = now;
      const t = now - started;
      settle(t);
      paintSky(t);
      paintPieces();
      dither();
      frame = requestAnimationFrame(step);
    };

    /* ── dragging ───────────────────────────────────────────────────────── */

    const toCanvas = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * w,
        y: ((e.clientY - rect.top) / rect.height) * h,
      };
    };

    /* Anywhere along the bar, not just its middle: distance to the nearest
       lobe, so a long piece is grabbable end to end. */
    const pick = (x: number, y: number) => {
      let best: Piece | null = null;
      let bestD = Infinity;
      for (const p of pieces) {
        const cos = Math.cos(p.angle);
        const sin = Math.sin(p.angle);
        for (const l of p.lobes) {
          const lx = p.x + l.ox * cos * unit;
          const ly = p.y + l.ox * sin * unit * 0.92;
          const d = Math.hypot(lx - x, ly - y) - l.r * unit;
          if (d < bestD) {
            bestD = d;
            best = p;
          }
        }
      }
      return bestD < unit * 0.2 ? best : null;
    };

    const onDown = (e: PointerEvent) => {
      const m = toCanvas(e);
      const p = pick(m.x, m.y);
      if (!p) return;
      held = p;
      // The clicked point, un-rotated into the slab's frame
      const cos = Math.cos(p.angle);
      const sin = Math.sin(p.angle);
      const wx = (m.x - p.x) / unit;
      const wy = (m.y - p.y) / (unit * 0.92);
      grabLX = wx * cos + wy * sin;
      grabLY = -wx * sin + wy * cos;
      pointer = { x: m.x, y: m.y, px: m.x, py: m.y };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };

    const onMove = (e: PointerEvent) => {
      const m = toCanvas(e);
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.x = m.x;
      pointer.y = m.y;
      if (!held) canvas.style.cursor = pick(m.x, m.y) ? "grab" : "default";
    };

    const onUp = (e: PointerEvent) => {
      if (!held) return;
      // Let go with whatever speed the hand had
      held.vx = (pointer.x - pointer.px) * 1.2 + held.vx * 0.5;
      held.vy = (pointer.y - pointer.py) * 1.2 + held.vy * 0.5;
      held = null;
      canvas.style.cursor = "grab";
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    };

    resize();
    frame = requestAnimationFrame(step);

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [scale, pixel]);

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        touchAction: "none",
        imageRendering: "pixelated",
      }}
    />
  );
};

export default HeroCanvas;
