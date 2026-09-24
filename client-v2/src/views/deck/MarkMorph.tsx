import { FC } from "react";
import styled, { css, keyframes } from "styled-components";

/**
 * How the mark is made: Solana's three bars turn into the three edges of the
 * play triangle, and the O joins them.
 *
 * This is the Figma's own "Logo Creation" sequence (node 51:3065) — nine
 * slides in which the Solana mark is zoomed into, its bars are rotated apart,
 * and they close into the triangle the finished logo is built on. The last
 * slide there is a boolean: three rectangles and an ellipse unioned, with a
 * rounded rectangle taken out of the corner.
 *
 * Drawn in the finished mark's own 970 x 574 viewBox, so a bar's end position
 * *is* an edge of the real logo rather than an approximation of one. Each bar
 * is a parallelogram centred on its own origin, which is what lets a single
 * translate-and-rotate carry it from the stack to the edge.
 */

/** The finished mark, for the sequence to land on */
const MARK =
  "M169.068 0C171.744 8.28719e-06 174.308 1.07233 176.187 2.97656L396.895 226.644C402.571 232.396 412.476 229.392 414.488 221.565C445.766 99.8968 556.196 9.98638 687.625 9.98633C843.369 9.98633 969.625 136.242 969.625 291.986C969.625 447.731 843.369 573.986 687.625 573.986C546.531 573.986 429.639 470.366 408.897 335.073C407.595 326.586 396.984 322.749 390.952 328.861L166.358 556.468C164.478 558.372 161.915 559.444 159.239 559.444H35.3097C34.8665 559.444 34.4341 559.417 34.0138 559.365C33.2106 559.266 32.4071 559.144 31.5978 559.144H10.0001C4.4593 559.144 -0.0253355 554.638 0.000107729 549.098L2.34288 43.1279C2.38427 34.2415 13.1304 29.8197 19.4142 36.1035L107.001 123.69C108.891 125.58 109.945 128.147 109.93 130.819L108.307 411.274C108.239 423.118 103.503 434.458 95.128 442.833L11.215 526.747C10.4339 527.528 10.4339 528.795 11.215 529.576L23.9425 542.304C24.7235 543.085 25.9896 543.085 26.7706 542.304L122.402 446.671C123.322 445.752 124.364 444.958 125.277 444.032L142.842 426.231L193.117 375.957C193.764 375.31 194.048 374.339 194.69 373.688L272.207 295.134C274.086 293.23 276.65 292.157 279.325 292.157H403.255C403.928 292.157 404.577 292.218 405.196 292.335C405.417 292.376 405.625 292.211 405.625 291.986C405.625 287.353 405.738 282.746 405.959 278.167C406.242 272.31 401.652 267.287 395.788 267.287H289.153C286.478 267.287 283.914 266.215 282.035 264.311L38.0206 17.0244C31.7856 10.7058 36.2618 -1.18154e-06 45.1388 0H169.068ZM687.625 119.986C592.632 119.986 515.625 196.993 515.625 291.986C515.625 386.979 592.632 463.986 687.625 463.986C782.618 463.986 859.625 386.979 859.625 291.986C859.625 196.993 782.618 119.986 687.625 119.986Z";

/** One parallelogram, centred on (0,0) — Solana's bar shape */
const BAR = "M -170 -30 L 170 -30 L 138 30 L -202 30 Z";

/** The whole sequence. Every beat below is a fraction of this. */
const RUN = 4200;

/**
 * Where each bar starts and where it ends.
 *
 * The stack is centred; the edges are the triangle's own. The middle bar
 * becomes the vertical on the left, and the outer two swing out to the
 * diagonals — which is the order the Figma moves them in, and the only order
 * in which none of the three crosses another on the way.
 */
/* CSS transform syntax, not SVG's. `translate(232 152)` is valid as an SVG
   attribute and invalid as a CSS value, so the whole declaration is dropped
   and every bar sits unmoved on top of the others — which is exactly what
   happened. With `transform-box: view-box` a CSS px here is one viewBox unit. */
const BARS = [
  {
    /* top of the stack -> the upper diagonal */
    from: "translate(430px, 168px)",
    loose: "translate(300px, 150px) rotate(22deg)",
    to: "translate(232px, 152px) rotate(35deg) scaleX(1.22)",
  },
  {
    /* middle -> the vertical on the left */
    from: "translate(430px, 287px)",
    loose: "translate(180px, 287px) rotate(60deg)",
    to: "translate(58px, 285px) rotate(90deg) scaleX(1.4)",
  },
  {
    /* bottom -> the lower diagonal */
    from: "translate(430px, 406px)",
    loose: "translate(300px, 424px) rotate(-22deg)",
    to: "translate(232px, 422px) rotate(-35deg) scaleX(1.22)",
  },
];

interface MarkMorphProps {
  /** Held on the teaser slide: the Solana mark, still */
  hold?: boolean;
}

const MarkMorph: FC<MarkMorphProps> = ({ hold }) => (
  <Frame viewBox="0 0 970 574" aria-hidden="true">
    <defs>
      <linearGradient id="morph-bar" x1="0" y1="0" x2="1" y2="0.3">
        <stop offset="0%" stopColor="#14F195" />
        <stop offset="100%" stopColor="#9945FF" />
      </linearGradient>
    </defs>

    {BARS.map((b, i) => (
      <Bar
        key={i}
        d={BAR}
        $from={b.from}
        $loose={b.loose}
        $to={b.to}
        $hold={!!hold}
        fill={hold ? "url(#morph-bar)" : "#FFFFFF"}
      />
    ))}

    {/* The O arrives last, once the triangle has closed — which is the order
        the construction slide puts it in: the triangle is a union of the bars,
        and the ellipse is added to that. */}
    {!hold && <Ring cx="687.6" cy="292" r="144" />}

    {/* And then the drawing becomes the logo. The bars and the ring are the
        construction; the mark is one filled path with the corner taken out of
        it, which is what the Figma's last slide resolves the booleans to. */}
    {!hold && <Solid d={MARK} />}
  </Frame>
);

export default MarkMorph;

const Frame = styled.svg`
  position: relative;
  z-index: 1;
  width: min(52vw, 38rem);
  height: auto;
  display: block;
  overflow: visible;
`;

const swing = (from: string, loose: string, to: string) => keyframes`
  0%   { transform: ${from}; opacity: 1; }
  26%  { transform: ${from}; opacity: 1; }
  /* apart first, then closed — the Figma spends three slides on the loose
     arrangement, and going straight to the triangle loses the whole idea */
  58%  { transform: ${loose}; opacity: 1; }
  80%  { transform: ${to}; opacity: 1; }
  88%  { transform: ${to}; opacity: 1; }
  100% { transform: ${to}; opacity: 0; }
`;

const Bar = styled.path<{
  $from: string;
  $loose: string;
  $to: string;
  $hold: boolean;
}>`
  ${({ $from, $loose, $to, $hold }) => css`
    transform: ${$hold ? $from : $to};
    /* SVG transforms are in user units, not the CSS box */
    transform-box: view-box;
    transform-origin: 0 0;
    ${!$hold &&
    css`
      animation: ${swing($from, $loose, $to)} ${RUN}ms
        cubic-bezier(0.62, 0, 0.16, 1) both;
    `}

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      transform: ${$hold ? $from : $to};
    }
  `}
`;

const open = keyframes`
  0%   { opacity: 0; transform: scale(0.2); }
  70%  { opacity: 0; transform: scale(0.2); }
  88%  { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1); }
`;

/* Stroked rather than filled, because the counter is the point — a filled
   circle here would read as a dot beside the triangle. */
const land = keyframes`
  0%   { opacity: 0; }
  86%  { opacity: 0; }
  100% { opacity: 1; }
`;

const Solid = styled.path`
  fill: #ffffff;
  animation: ${land} ${RUN}ms ease-out both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`;

const Ring = styled.circle`
  fill: none;
  stroke: #ffffff;
  stroke-width: 56;
  transform-box: fill-box;
  transform-origin: center;
  animation: ${open} ${RUN}ms cubic-bezier(0.2, 0.8, 0.25, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
    transform: none;
  }
`;
