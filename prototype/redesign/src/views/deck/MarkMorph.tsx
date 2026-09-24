import { FC, useEffect, useRef } from "react";
import styled from "styled-components";

/**
 * How the mark is made: Solana's three bars rotate into the three edges of the
 * play triangle, settle, and the O opens beside them.
 *
 * The Figma's own "Logo Creation" sequence (node 51:3065).
 *
 * The bars are the real Solana mark, not a parallelogram that looks like one.
 * Its path is split into its three subpaths and each is sampled along its own
 * length with `getPointAtLength`, so the starting shape is exactly the logo —
 * angled ends, true proportions and all — instead of my approximation of it.
 *
 * And the move is a rotation, not a tween. Every point is held in polar
 * coordinates about its own bar's centre, and what is interpolated is the
 * centre, the angle and the radius — so a bar turns through the arc a real
 * rotation would take. Lerping the points in x and y instead pulls each one
 * along its chord, which makes the shape shrink through the middle of the
 * move and puff back out at the end. That is the tell, and it is why the
 * previous pass never looked like anything was turning.
 *
 * Three beats: rotate into place, adjust to close the corners, then the O.
 */

/** Points sampled per bar */
const N = 96;
/** The whole sequence */
const RUN = 3800;

type Pt = { x: number; y: number };
/** A point as the rotation sees it: distance and angle from the bar's centre */
type Polar = { r: number; a: number };

/** The Solana mark, 448 x 400 — three bars in one path */
const SOLANA =
  "M444.899 315.321L371.082 394.476C369.455 396.168 367.567 397.535 365.419 398.511C363.271 399.423 360.928 399.943 358.584 399.943H8.57381C6.88137 399.943 5.25401 399.423 3.88704 398.511C2.52007 397.6 1.41347 396.298 0.762532 394.801C0.111592 393.304 -0.083691 391.611 0.176685 389.919C0.437061 388.292 1.21819 386.729 2.32479 385.493L76.0763 306.338C77.7036 304.646 79.5913 303.279 81.7394 302.303C83.8875 301.391 86.2309 300.87 88.5743 300.87H438.585C440.277 300.87 441.904 301.326 443.336 302.237C444.769 303.149 445.875 304.451 446.591 306.013C447.242 307.575 447.503 309.268 447.177 310.895C446.852 312.522 446.136 314.085 444.964 315.321H444.899ZM371.082 155.841C369.455 154.149 367.567 152.782 365.419 151.805C363.271 150.894 360.928 150.373 358.584 150.373H8.57381C6.88137 150.373 5.25401 150.894 3.88704 151.74C2.52007 152.651 1.41347 153.953 0.697436 155.516C0.0464964 157.078 -0.148786 158.77 0.11159 160.398C0.371965 162.025 1.15309 163.587 2.25969 164.759L76.0112 243.978C77.6385 245.671 79.5262 247.038 81.6743 248.014C83.8224 248.925 86.1658 249.446 88.5092 249.446H438.52C440.212 249.446 441.839 248.925 443.206 248.014C444.573 247.103 445.68 245.801 446.331 244.239C446.982 242.742 447.177 241.049 446.917 239.422C446.656 237.794 445.875 236.232 444.769 235.06L371.082 155.841ZM8.57381 99.0141H358.584C360.928 99.0141 363.271 98.4933 365.419 97.582C367.567 96.6707 369.52 95.3037 371.082 93.5462L444.899 14.3919C445.745 13.4806 446.396 12.374 446.786 11.2023C447.177 10.0306 447.307 8.72871 447.112 7.49192C446.982 6.25514 446.526 5.01835 445.875 3.97684C445.224 2.93534 444.313 2.02402 443.271 1.30799C441.839 0.396675 440.212 -0.0589753 438.52 0.00611863H88.5092C86.1658 0.00611863 83.8224 0.526866 81.6743 1.43818C79.5262 2.3495 77.5734 3.71648 76.0112 5.47401L2.25969 84.6283C1.15309 85.8651 0.371965 87.3622 0.11159 89.0547C-0.148786 90.7471 0.0464964 92.3745 0.697436 93.9367C1.34838 95.4339 2.45497 96.7358 3.88704 97.7122C5.25401 98.6235 6.94647 99.1442 8.57381 99.1442V99.0141Z";

/* Placing the 448 x 400 mark inside the finished logo's 970 x 574 box */
const S = 0.94;
const OX = 485 - (448 * S) / 2;
const OY = 287 - (400 * S) / 2;

/**
 * Where each bar goes, top of the stack first.
 *
 * Turn is the rotation in degrees; `to` is where its centre lands; `grow`
 * stretches it along its own length so the corners overlap and close, which is
 * the "slight adjustment" after the turn. Measured off the finished mark: its
 * left edge runs x 0-110 between y 43 and 549, and the diagonals meet it near
 * (400, 292).
 */
const TARGETS = [
  { turn: 37.5, to: { x: 238, y: 142 }, grow: 1.22 },
  { turn: 90, to: { x: 58, y: 292 }, grow: 1.34 },
  { turn: -35, to: { x: 234, y: 436 }, grow: 1.2 },
];

const ease = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Split a path on its subpaths — the three bars are three `M` commands */
const subpaths = (d: string) =>
  d.split(/(?=M)/g).filter((p) => p.trim().length > 1);

interface MarkMorphProps {
  /** Held on the teaser slide: the Solana mark, still */
  hold?: boolean;
}

const MarkMorph: FC<MarkMorphProps> = ({ hold }) => {
  const bars = useRef<Array<SVGPathElement | null>>([null, null, null]);
  const ring = useRef<SVGCircleElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = svg.current;
    if (!root) return;

    /* Sample the real path. A detached <path> has no length in any engine, so
       the ruler is parked inside this SVG and hidden rather than built off-
       document. */
    const ruler = document.createElementNS("http://www.w3.org/2000/svg", "path");
    ruler.setAttribute("visibility", "hidden");
    root.appendChild(ruler);

    const sampled = subpaths(SOLANA).map((d) => {
      ruler.setAttribute("d", d);
      const len = ruler.getTotalLength();
      const pts: Pt[] = [];
      for (let i = 0; i < N; i++) {
        const p = ruler.getPointAtLength((i / N) * len);
        pts.push({ x: OX + p.x * S, y: OY + p.y * S });
      }
      return pts;
    });
    ruler.remove();

    // Top bar first, whichever order the path happened to list them in
    sampled.sort(
      (a, b) =>
        a.reduce((t, p) => t + p.y, 0) / a.length -
        b.reduce((t, p) => t + p.y, 0) / b.length
    );

    const rigs = sampled.map((pts) => {
      const cx = pts.reduce((t, p) => t + p.x, 0) / pts.length;
      const cy = pts.reduce((t, p) => t + p.y, 0) / pts.length;
      const polar: Polar[] = pts.map((p) => ({
        r: Math.hypot(p.x - cx, p.y - cy),
        a: Math.atan2(p.y - cy, p.x - cx),
      }));
      return { from: { x: cx, y: cy }, polar };
    });

    const draw = (k: number, adjust: number) => {
      rigs.forEach((rig, i) => {
        const t = TARGETS[i];
        const cx = rig.from.x + (t.to.x - rig.from.x) * k;
        const cy = rig.from.y + (t.to.y - rig.from.y) * k;
        const turn = (t.turn * Math.PI) / 180 * k;
        const grow = 1 + (t.grow - 1) * adjust;
        let d = "";
        for (let j = 0; j < N; j++) {
          const p = rig.polar[j];
          const a = p.a + turn;
          d +=
            (j ? "L" : "M") +
            (cx + Math.cos(a) * p.r * grow).toFixed(1) +
            " " +
            (cy + Math.sin(a) * p.r * grow).toFixed(1);
        }
        bars.current[i]?.setAttribute("d", d + "Z");
      });
    };

    if (hold) {
      draw(0, 0);
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      draw(1, 1);
      ring.current?.setAttribute("r", "144");
      if (ring.current) ring.current.style.opacity = "1";
      return;
    }

    let frame = 0;
    let started = 0;
    const tick = (now: number) => {
      if (!started) started = now;
      const t = clamp01((now - started) / RUN);
      /* Turn first, settle second, and they overlap a little so the adjustment
         starts while the last of the rotation is still running. */
      draw(ease(clamp01(t / 0.62)), ease(clamp01((t - 0.48) / 0.34)));

      const o = ease(clamp01((t - 0.66) / 0.34));
      if (ring.current) {
        ring.current.setAttribute("r", (38 + 106 * o).toFixed(1));
        ring.current.style.opacity = String(o);
      }
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hold]);

  return (
    <Frame ref={svg} viewBox="0 0 970 574" aria-hidden="true">
      <defs>
        <linearGradient id="morph-bar" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="#14F195" />
          <stop offset="100%" stopColor="#9945FF" />
        </linearGradient>
      </defs>

      {[0, 1, 2].map((i) => (
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
          r="38"
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
