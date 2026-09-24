import { FC } from "react";
import styled, { css, keyframes } from "styled-components";

/**
 * How the mark is made: the three bars turn into the three edges of the play
 * triangle, and the O opens beside them.
 *
 * The Figma's own "Logo Creation" sequence (node 51:3065).
 *
 * The pieces *are* the logo. Each one is the real mark drawn through a clip
 * that takes one third of it — the left edge, the upper diagonal, the lower
 * diagonal — so when all three transforms reach identity what is on screen is
 * the mark itself, to the pixel, with no seams and nothing to cross-fade into.
 *
 * Two earlier attempts failed the same way and it is worth naming: both built
 * the end state out of bars *shaped like* the logo's edges and stretched them
 * until the union looked close. Approximate geometry plus a rubber-stretch
 * beat is what read as slop — lumpy corners, visible seams, and a final frame
 * that was not quite the logo used everywhere else in the build.
 *
 * The motion is CSS `rotate()`, which interpolates as an angle. Interpolating
 * points in x and y — which is what the last pass did — drags each one along
 * its chord, so the shape sags through the middle of the turn and recovers at
 * the end. No amount of easing hides that; it is the wrong space to move in.
 */

/** The finished mark */
const MARK =
  "M169.068 0C171.744 8.28719e-06 174.308 1.07233 176.187 2.97656L396.895 226.644C402.571 232.396 412.476 229.392 414.488 221.565C445.766 99.8968 556.196 9.98638 687.625 9.98633C843.369 9.98633 969.625 136.242 969.625 291.986C969.625 447.731 843.369 573.986 687.625 573.986C546.531 573.986 429.639 470.366 408.897 335.073C407.595 326.586 396.984 322.749 390.952 328.861L166.358 556.468C164.478 558.372 161.915 559.444 159.239 559.444H35.3097C34.8665 559.444 34.4341 559.417 34.0138 559.365C33.2106 559.266 32.4071 559.144 31.5978 559.144H10.0001C4.4593 559.144 -0.0253355 554.638 0.000107729 549.098L2.34288 43.1279C2.38427 34.2415 13.1304 29.8197 19.4142 36.1035L107.001 123.69C108.891 125.58 109.945 128.147 109.93 130.819L108.307 411.274C108.239 423.118 103.503 434.458 95.128 442.833L11.215 526.747C10.4339 527.528 10.4339 528.795 11.215 529.576L23.9425 542.304C24.7235 543.085 25.9896 543.085 26.7706 542.304L122.402 446.671C123.322 445.752 124.364 444.958 125.277 444.032L142.842 426.231L193.117 375.957C193.764 375.31 194.048 374.339 194.69 373.688L272.207 295.134C274.086 293.23 276.65 292.157 279.325 292.157H403.255C403.928 292.157 404.577 292.218 405.196 292.335C405.417 292.376 405.625 292.211 405.625 291.986C405.625 287.353 405.738 282.746 405.959 278.167C406.242 272.31 401.652 267.287 395.788 267.287H289.153C286.478 267.287 283.914 266.215 282.035 264.311L38.0206 17.0244C31.7856 10.7058 36.2618 -1.18154e-06 45.1388 0H169.068ZM687.625 119.986C592.632 119.986 515.625 196.993 515.625 291.986C515.625 386.979 592.632 463.986 687.625 463.986C782.618 463.986 859.625 386.979 859.625 291.986C859.625 196.993 782.618 119.986 687.625 119.986Z";

/**
 * Where the mark is cut into three.
 *
 * The seams are a vertical at x = 124 and a horizontal at y = 292, which is
 * the inner corner of the triangle — both fall *inside* the joint where the
 * edges already overlap, so the cuts are invisible once the pieces are home.
 * The fourth region is everything right of the triangle: the O.
 */
const CUTS = {
  /* The three edge cuts stop at x = 430, where the triangle ends and the O
     begins. Running them to the right-hand edge meant every piece carried a
     slice of the O with it, and three thirds of a circle went flying around
     the frame with the bars. */
  top: "M124 -60 H430 V292 H124 Z",
  left: "M-60 -60 H124 V640 H-60 Z",
  bottom: "M124 292 H430 V640 H124 Z",
  ring: "M430 -60 H1040 V640 H430 Z",
};

/**
 * Each edge's own centre, and how far it is wound back before it turns in.
 *
 * It does not start flat. Unwinding all the way to a horizontal stack lays
 * three pieces of very different length and thickness on top of one another —
 * the logo's edges are not three equal bars, so flat they read as a pile
 * rather than as the Solana mark, and no arrangement of them fixes that. They
 * start part-turned and pushed out along their own axis instead: the triangle
 * opened, which is legible at every frame and still arrives by rotation.
 *
 * The Solana mark itself is the slide before this one, where it is exact.
 */
const EDGES = [
  /* Origins are the centre of each clipped region — measured from the cuts and
     the mark's own extents, because getBBox() ignores clip-path and reports the
     whole path for all three. Rotating about anything else swings the piece
     through an arc instead of turning it where it lies. */
  { cut: CUTS.top, ox: 277, oy: 161, spin: -26, dx: 54, dy: -104 },
  { cut: CUTS.left, ox: 62, oy: 280, spin: -20, dx: -104, dy: 0 },
  { cut: CUTS.bottom, ox: 277, oy: 425, spin: 26, dx: 54, dy: 104 },
];

/** The whole sequence */
const RUN = 2600;

interface MarkMorphProps {
  /** Held on the teaser slide: the bars stacked, not turning */
  hold?: boolean;
}

const MarkMorph: FC<MarkMorphProps> = ({ hold }) => (
  <Frame viewBox="0 0 970 574" aria-hidden="true">
    <defs>
      <linearGradient id="morph-bar" x1="0" y1="0" x2="1" y2="0.3">
        <stop offset="0%" stopColor="#14F195" />
        <stop offset="100%" stopColor="#9945FF" />
      </linearGradient>
      {Object.entries(CUTS).map(([k, d]) => (
        <clipPath key={k} id={`morph-cut-${k}`}>
          <path d={d} />
        </clipPath>
      ))}
    </defs>

    {EDGES.map((e, i) => (
      <Edge key={i} clipPath={`url(#morph-cut-${["top", "left", "bottom"][i]})`} $e={e} $hold={!!hold} $i={i}>
        <path d={MARK} fill={hold ? "url(#morph-bar)" : "#FFFFFF"} fillRule="evenodd" />
      </Edge>
    ))}

    {/* The O last, once the triangle has closed — the order the construction
        slide puts it in: the triangle is the union of the edges, and the
        ellipse is added to that. Same path, clipped to its own side. */}
    {!hold && (
      <Ring clipPath="url(#morph-cut-ring)">
        <path d={MARK} fill="#FFFFFF" fillRule="evenodd" />
      </Ring>
    )}
  </Frame>
);

export default MarkMorph;

const unwind = (spin: number, dx: number, dy: number) => keyframes`
  0%   { transform: translate(${dx}px, ${dy}px) rotate(${spin}deg); }
  18%  { transform: translate(${dx}px, ${dy}px) rotate(${spin}deg); }
  100% { transform: none; }
`;

const Edge = styled.g<{
  $e: (typeof EDGES)[number];
  $hold: boolean;
  $i: number;
}>`
  ${({ $e, $hold, $i }) => css`
    transform-box: view-box;
    transform-origin: ${$e.ox}px ${$e.oy}px;
    transform: translate(${$e.dx}px, ${$e.dy}px) rotate(${$e.spin}deg);
    ${!$hold &&
    css`
      /* Staggered, so the three arrive in sequence rather than landing
         together — one object opening, not three things flying. */
      animation: ${unwind($e.spin, $e.dx, $e.dy)} ${RUN}ms
        cubic-bezier(0.68, 0, 0.16, 1) ${$i * 130}ms both;
    `}

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      transform: ${$hold
        ? `translate(${$e.dx}px, ${$e.dy}px) rotate(${$e.spin}deg)`
        : "none"};
    }
  `}
`;

const open = keyframes`
  0%   { opacity: 0; transform: scale(0.72); }
  62%  { opacity: 0; transform: scale(0.72); }
  100% { opacity: 1; transform: scale(1); }
`;

const Ring = styled.g`
  transform-box: view-box;
  transform-origin: 687px 292px;
  animation: ${open} ${RUN + 400}ms cubic-bezier(0.2, 0.75, 0.25, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
    transform: none;
  }
`;

const Frame = styled.svg`
  position: relative;
  z-index: 1;
  width: min(52vw, 38rem);
  height: auto;
  display: block;
  overflow: visible;
`;
