import { FC } from "react";
import styled, { css, keyframes } from "styled-components";

import type { Ground } from "./slides";
import { DEEP, GREEN, INK, PAPER, PURPLE, STEEL, TEAL, VIOLET } from "./tokens";

/**
 * The deck's ground: a mesh that drifts, and a lattice over it.
 *
 * The first pass had both wrong. The gradient was one linear ramp corner to
 * corner, which is a ramp and not a mesh — the Figma's colour moves in several
 * directions at once and cannot be reduced to a single angle. And the lattice
 * was hairlines on a 44px grid, when the slides actually show *rounded tiles*:
 * the light is in the gaps between them, so every intersection opens into a
 * four-point star. That star is the whole character of the pattern and a
 * crosshatch has none of it.
 *
 * Both are built from layered gradients rather than an image, so they scale to
 * any frame and cost nothing to ship.
 */

interface BackdropProps {
  ground: Ground;
  lattice?: boolean;
}

const Backdrop: FC<BackdropProps> = ({ ground, lattice }) => (
  <Fill $ground={ground}>
    {(ground === "mesh" || ground === "meshDeep") && (
      <>
        <Blob $c={GREEN} $i={0} />
        <Blob $c={TEAL} $i={1} />
        <Blob $c={STEEL} $i={2} />
        <Blob $c={VIOLET} $i={3} />
        <Blob $c={PURPLE} $i={4} />
        <Blob $c={DEEP} $i={5} />
      </>
    )}
    {lattice && <Lattice $dark={ground === "ink"} />}
  </Fill>
);

export default Backdrop;

/* The bed the blobs sit on. Mid-violet, so a gap between them is still the
   right family rather than a hole. */
const BEDS: Record<Ground, string> = {
  paper: PAPER,
  ink: INK,
  mesh: "#5A63C8",
  meshDeep: "#5B3BB8",
};

const Fill = styled.div<{ $ground: Ground }>`
  ${({ $ground }) => css`
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: ${BEDS[$ground]};
  `}
`;

/**
 * Six blobs on six different paths at six different speeds. Nothing lines up,
 * so the mesh never visibly repeats — which is what "smoothly transitioning in
 * multiple directions" has to mean in practice.
 */
const DRIFTS = [
  { from: "6% 84%", to: "22% 66%", size: 48, secs: 34 },
  { from: "18% 30%", to: "34% 14%", size: 44, secs: 41 },
  { from: "44% 62%", to: "26% 44%", size: 52, secs: 47 },
  { from: "66% 26%", to: "50% 48%", size: 46, secs: 38 },
  { from: "92% 58%", to: "76% 78%", size: 50, secs: 44 },
  { from: "98% 10%", to: "84% 30%", size: 42, secs: 52 },
];

const drift = (from: string, to: string) => keyframes`
  0%   { background-position: ${from}; }
  50%  { background-position: ${to}; }
  100% { background-position: ${from}; }
`;

const Blob = styled.div<{ $c: string; $i: number }>`
  ${({ $c, $i }) => {
    const d = DRIFTS[$i % DRIFTS.length];
    return css`
      position: absolute;
      /* Bleeding past the edges keeps a blob's falloff off-frame, so the
         corners never show where one ends. */
      inset: -35%;
      background-image: radial-gradient(
        circle at center,
        ${$c} 0%,
        ${$c}00 ${d.size}%
      );
      background-repeat: no-repeat;
      background-size: 115% 115%;
      background-position: ${d.from};
      /* No screen blend. Six lightening layers over a mid bed saturate
         straight to white — the green vanished and the whole mesh went
         pastel. Normal blending with the blobs' own alpha falloff is what a
         mesh gradient actually is. */
      opacity: 0.9;
      animation: ${drift(d.from, d.to)} ${d.secs}s ease-in-out infinite;

      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `;
  }}
`;

/**
 * The lattice: rounded tiles, seen as the light between them.
 *
 * Two mortar lines give the grid, and a radial at the cell's corner opens each
 * intersection into the star the rounded corners make. The whole thing is
 * masked so it arrives across the frame rather than sitting evenly on it,
 * which is what the slides do.
 */
const TILE = "68px";

const Lattice = styled.div<{ $dark: boolean }>`
  ${({ $dark }) => {
    const mortar = $dark ? 0.05 : 0.085;
    const star = $dark ? 0.1 : 0.16;
    return css`
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image: radial-gradient(
          circle at 0 0,
          rgba(255, 255, 255, ${star}) 0,
          rgba(255, 255, 255, 0) 11px
        ),
        linear-gradient(
          to right,
          rgba(255, 255, 255, ${mortar}) 0 1.5px,
          rgba(255, 255, 255, 0) 1.5px
        ),
        linear-gradient(
          to bottom,
          rgba(255, 255, 255, ${mortar}) 0 1.5px,
          rgba(255, 255, 255, 0) 1.5px
        );
      background-size: ${TILE} ${TILE};
      -webkit-mask-image: linear-gradient(
        105deg,
        transparent 4%,
        rgba(0, 0, 0, 0.55) 44%,
        #000 88%
      );
      mask-image: linear-gradient(
        105deg,
        transparent 4%,
        rgba(0, 0, 0, 0.55) 44%,
        #000 88%
      );
    `;
  }}
`;
