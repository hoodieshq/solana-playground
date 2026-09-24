import { FC, useEffect, useRef } from "react";
import styled from "styled-components";

/**
 * How the mark is made: Solana's three bars become the three edges of the play
 * triangle, and the O opens beside them.
 *
 * The Figma's own "Logo Creation" sequence (node 51:3065) — stacked, rotated
 * apart, closed into the triangle, then the ellipse.
 *
 * Every vertex moves, not the shape. The first version transformed three whole
 * paths, which is a rigid body sliding: the right positions with nothing alive
 * in between. Each bar is resampled to 64 points around its perimeter, and
 * every point travels its own line from stack to edge on its own slightly
 * delayed clock. That delay is the whole thing — the leading end arrives first
 * and the rest follows it round, so a bar *flows* into place instead of being
 * carried there.
 *
 * On rAF rather than CSS, because `d` is not an animatable property anywhere
 * that matters; the path is rewritten every frame.
 *
 * The bars end thick enough that their union is the triangle, which is what the
 * Figma's last slide resolves its booleans to. Nothing cross-fades: the drawing
 * does not turn into the logo, it *is* the logo by the time it stops.
 */

/** Points per bar. Enough that the outline stays smooth while it bends. */
const N = 64;
/** The whole sequence */
const RUN = 3600;
/** How far apart the first and last point start moving, as a fraction of RUN */
const STAGGER = 0.3;

type Pt = [number, number];

/**
 * A bar as a closed polygon: a parallelogram resampled to `N` points spaced
 * evenly by arc length, so point *i* of the start and point *i* of the end are
 * the same place on the shape. Without that the morph shears as it goes.
 */
const bar = (
  cx: number,
  cy: number,
  len: number,
  thick: number,
  deg: number,
  skew: number
): Pt[] => {
  const h = thick / 2;
  const l = len / 2;
  // Corners before rotation, sheared along x like Solana's own bars
  const corners: Pt[] = [
    [-l + skew, -h],
    [l + skew, -h],
    [l - skew, h],
    [-l - skew, h],
  ];
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const placed: Pt[] = corners.map(([x, y]) => [
    cx + x * cos - y * sin,
    cy + x * sin + y * cos,
  ]);

  const seg = placed.map((p, i) => {
    const q = placed[(i + 1) % placed.length];
    return Math.hypot(q[0] - p[0], q[1] - p[1]);
  });
  const total = seg.reduce((t, s) => t + s, 0);
  const step = total / N;

  const out: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const want = i * step;
    let side = 0;
    let acc = 0;
    for (; side < seg.length; side++) {
      if (acc + seg[side] > want) break;
      acc += seg[side];
    }
    side = Math.min(side, seg.length - 1);
    const along = (want - acc) / (seg[side] || 1);
    const p = placed[side];
    const q = placed[(side + 1) % placed.length];
    out.push([p[0] + (q[0] - p[0]) * along, p[1] + (q[1] - p[1]) * along]);
  }
  return out;
};

/**
 * Start and end for each bar, in the finished mark's own 970 x 574 space — so
 * an end position *is* an edge of the real logo rather than a guess at one.
 *
 * The middle bar becomes the vertical on the left and the outer two swing to
 * the diagonals: the only assignment in which none of the three has to cross
 * another on the way.
 */
const MOVES: Array<{ from: Pt[]; to: Pt[] }> = [
  /* Measured off the mark's own path: the left edge runs x 0-110 between
     y 43 and y 549, and the diagonals meet it at the apex near (400, 292). The
     bars are a little long on purpose so the corners overlap and close. */
  { from: bar(430, 168, 360, 62, 0, 26), to: bar(228, 150, 470, 104, 37.2, 6) },
  { from: bar(430, 287, 360, 62, 0, 26), to: bar(55, 296, 524, 112, 90, 0) },
  { from: bar(430, 406, 360, 62, 0, 26), to: bar(226, 430, 462, 104, -34.8, -6) },
];

/** Leaves slowly, travels, settles — without the overshoot a spring would add */
const ease = (t: number) =>
  t <= 0
    ? 0
    : t >= 1
    ? 1
    : t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

const toPath = (pts: Pt[]) =>
  pts.reduce(
    (d, [x, y], i) => d + (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1),
    ""
  ) + "Z";

interface MarkMorphProps {
  /** Held on the teaser slide: the Solana mark, still */
  hold?: boolean;
}

const MarkMorph: FC<MarkMorphProps> = ({ hold }) => {
  const bars = useRef<Array<SVGPathElement | null>>([null, null, null]);
  const ring = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (hold) {
      MOVES.forEach((m, i) =>
        bars.current[i]?.setAttribute("d", toPath(m.from))
      );
      return;
    }

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) {
      MOVES.forEach((m, i) => bars.current[i]?.setAttribute("d", toPath(m.to)));
      ring.current?.setAttribute("r", "144");
      if (ring.current) ring.current.style.opacity = "1";
      return;
    }

    let frame = 0;
    let started = 0;
    const tick = (now: number) => {
      if (!started) started = now;
      const t = clamp01((now - started) / RUN);
      // The bars have the first three quarters; the O opens over the rest
      const move = clamp01(t / 0.74);

      MOVES.forEach((m, bi) => {
        const pts: Pt[] = [];
        for (let i = 0; i < N; i++) {
          /* Each point starts a little after the one before it, so the head of
             the bar leads while the tail is still catching up. That is what
             reads as the shape bending rather than sliding. */
          const lead = (i / N) * STAGGER;
          const k = ease(clamp01((move - lead) / (1 - STAGGER)));
          const a = m.from[i];
          const b = m.to[i];
          pts.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
        }
        bars.current[bi]?.setAttribute("d", toPath(pts));
      });

      const o = ease(clamp01((t - 0.62) / 0.38));
      if (ring.current) {
        ring.current.setAttribute("r", (34 + 110 * o).toFixed(1));
        ring.current.style.opacity = String(o);
      }

      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hold]);

  return (
    <Frame viewBox="0 0 970 574" aria-hidden="true">
      <defs>
        <linearGradient id="morph-bar" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="#14F195" />
          <stop offset="100%" stopColor="#9945FF" />
        </linearGradient>
      </defs>

      {MOVES.map((_, i) => (
        <path
          key={i}
          ref={(el) => {
            bars.current[i] = el;
          }}
          fill={hold ? "url(#morph-bar)" : "#FFFFFF"}
        />
      ))}

      {/* The O last, once the triangle has closed — the order the construction
          slide puts it in: the triangle is the union of the bars, and the
          ellipse is added to that. */}
      {!hold && (
        <circle
          ref={ring}
          cx="687.6"
          cy="292"
          r="34"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="112"
          opacity="0"
        />
      )}
    </Frame>
  );
};

export default MarkMorph;

const Frame = styled.svg`
  position: relative;
  z-index: 1;
  width: min(52vw, 38rem);
  height: auto;
  display: block;
  overflow: visible;
`;
