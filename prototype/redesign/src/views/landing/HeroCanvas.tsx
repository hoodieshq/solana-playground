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
 * The mark itself is three bars (SDP's geometry, `lp-demo/v2/js/solana-mark.js`
 * — K = 2/67, bars 15 high with an 8 gap, leaning alternately). Each is cut
 * into a dozen slices, so there are three dozen pieces to push around rather
 * than three: "parts of parts", which is what makes a table of them worth
 * dragging.
 *
 * Physics is deliberately shallow: velocity, friction, and circle-against-
 * circle separation with a little restitution. Slabs are convex and nearly the
 * same size, so a bounding circle is close enough that the collisions feel
 * right, and it costs one pass over n² pairs — at n = 36 that is 630 distance
 * checks a frame, which is nothing. A real solver would be more correct and
 * would not feel any different.
 */

/* ── the badge's own numbers ─────────────────────────────────────────────── */
const K = 2 / 67;
const BAR_H = 15;
const GAP = 8;
const LEAN = [1, -1, 1];
const SHEAR = 13 * K;
const X_LEFT = -33.5 * K;
const X_RIGHT = 20.5 * K;
/* Each bar is cut into a grid rather than a row of ribbons. Four across by
   two down leaves each piece roughly square — a slab you can see the shape of
   — and still gives two dozen of them. Twelve slices across made splinters. */
const COLS = 6;
const ROWS = 3;
const DEPTH = 0.055;

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

/** Faces, so a slab is lighter than the sky it lies on */
const FACES = ["#D9E2FF", "#C9D4FB", "#B4C1F7", "#9AA6EF"];

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
  /** Bounding radius in units, for collisions */
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

const HeroCanvas: FC<HeroCanvasProps> = ({ scale = 0.2, pixel = 2 }) => {
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
    let grabX = 0;
    let grabY = 0;
    let pointer = { x: 0, y: 0, px: 0, py: 0 };
    let hovering = false;
    let frame = 0;
    let started = 0;

    const build = () => {
      const out: Piece[] = [];
      const span = X_RIGHT - X_LEFT;
      for (let b = 0; b < 3; b++) {
        const halfH = (BAR_H / 2) * K;
        const shift = LEAN[b] === 1 ? SHEAR : -SHEAR;
        for (let c = 0; c < COLS; c++) {
          for (let r = 0; r < ROWS; r++) {
          const x0 = X_LEFT + (span / COLS) * c;
          const x1 = X_LEFT + (span / COLS) * (c + 1);
          const y0 = -halfH + ((2 * halfH) / ROWS) * r;
          const y1 = -halfH + ((2 * halfH) / ROWS) * (r + 1);
          // The shear is proportional to height, so a sub-row keeps the lean
          const sh0 = shift * ((y0 + halfH) / (2 * halfH));
          const sh1 = shift * ((y1 + halfH) / (2 * halfH));
          const mx = (x0 + x1 + sh0 + sh1) / 2;
          const my = (y0 + y1) / 2;
          const shape: Array<[number, number]> = [
            [x0 + sh0 - mx, y0 - my],
            [x1 + sh0 - mx, y0 - my],
            [x1 + sh1 - mx, y1 - my],
            [x0 + sh1 - mx, y1 - my],
          ];
          const radius = Math.max(
            ...shape.map(([px, py]) => Math.hypot(px, py))
          );
          out.push({
            shape,
            radius,
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
            face: FACES[(b + c + r) % FACES.length],
          });
          }
        }
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
        p.delay = reduced ? 0 : i * 34 + Math.random() * 120;
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
    const corners = (p: Piece, dx: number, dy: number) => {
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
      const d = DEPTH * unit;
      // Lower ones in front
      const order = [...pieces].sort((a, b) => a.y - b.y);
      for (const p of order) {
        if (p.grow <= 0.001) continue;
        const top = corners(p, 0, 0);
        const edge = corners(p, d * 0.5, d * 0.5);
        const cast = corners(p, d, d);

        ctx.globalAlpha = 0.22 * p.land;
        poly(cast, "#0A0836");
        ctx.globalAlpha = 1;

        poly([top[1], top[2], edge[2], edge[1]], "#5E63C9");
        poly([top[2], top[3], edge[3], edge[2]], "#4340AE");
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
      const FRICTION = 0.955;
      const SPIN_FRICTION = 0.95;
      const NUDGE = unit * 1.5;

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
        if (p === held) {
          p.squash *= 0.86;
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

        /* The cursor pushes what it passes over, whether or not anything is
           being dragged. It is the difference between a pile you can move and
           a pile that reacts to you. */
        if (!held && hovering) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < NUDGE && dist > 0.01) {
            const force = (1 - dist / NUDGE) * 0.9;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
            p.spin += (dx / dist) * force * 0.004;
            p.squash = Math.max(p.squash, force * 0.3);
            p.squashAngle = Math.atan2(dy, dx);
          }
        }

        // The table has edges
        const r = p.radius * unit;
        if (p.x < r) {
          p.x = r;
          p.vx = Math.abs(p.vx) * 0.62;
        }
        if (p.x > w - r) {
          p.x = w - r;
          p.vx = -Math.abs(p.vx) * 0.62;
        }
        if (p.y < r) {
          p.y = r;
          p.vy = Math.abs(p.vy) * 0.62;
        }
        if (p.y > h - r) {
          p.y = h - r;
          p.vy = -Math.abs(p.vy) * 0.62;
        }
      }

      /* Separation: any two overlapping slabs are pushed apart along the line
         between them, and a held piece does not move — it shoves. */
      for (let i = 0; i < pieces.length; i++) {
        const a = pieces[i];
        if (now < a.delay) continue;
        for (let j = i + 1; j < pieces.length; j++) {
          const b = pieces[j];
          if (now < b.delay) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const min = (a.radius + b.radius) * unit * 0.78;
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

          /* Both ends deform, along the line of the hit. A held piece is
             pressed by whatever it is pushing into, which is what makes
             shoving a pile feel soft rather than like sweeping tiles. */
          const bite = Math.min(0.42, overlap / (min || 1) + 0.06);
          const hitAngle = Math.atan2(ny, nx);
          a.squash = Math.max(a.squash, bite);
          a.squashAngle = hitAngle;
          b.squash = Math.max(b.squash, bite);
          b.squashAngle = hitAngle;

          const push = overlap * 0.14;
          if (!aHeld) {
            a.vx -= nx * push;
            a.vy -= ny * push;
            a.spin -= (nx * dy - ny * dx) * 0.0006;
          }
          if (!bHeld) {
            b.vx += nx * push;
            b.vy += ny * push;
            b.spin += (nx * dy - ny * dx) * 0.0006;
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

    const pick = (x: number, y: number) => {
      let best: Piece | null = null;
      let bestD = Infinity;
      for (const p of pieces) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      return best && bestD < best.radius * unit * 1.25 ? best : null;
    };

    const onDown = (e: PointerEvent) => {
      const m = toCanvas(e);
      const p = pick(m.x, m.y);
      if (!p) return;
      held = p;
      grabX = p.x - m.x;
      grabY = p.y - m.y;
      pointer = { x: m.x, y: m.y, px: m.x, py: m.y };
      p.vx = 0;
      p.vy = 0;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };

    const onMove = (e: PointerEvent) => {
      const m = toCanvas(e);
      hovering = true;
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.x = m.x;
      pointer.y = m.y;
      if (!held) {
        canvas.style.cursor = pick(m.x, m.y) ? "grab" : "default";
        return;
      }
      held.x = m.x + grabX;
      held.y = m.y + grabY;
    };

    const onUp = (e: PointerEvent) => {
      if (!held) return;
      // Let go with whatever speed the hand had
      held.vx = (pointer.x - pointer.px) * 1.5;
      held.vy = (pointer.y - pointer.py) * 1.5;
      held.spin += (pointer.x - pointer.px) * 0.002;
      held = null;
      canvas.style.cursor = "grab";
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    };

    resize();
    frame = requestAnimationFrame(step);

    const onLeave = () => {
      hovering = false;
    };
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerleave", onLeave);
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
