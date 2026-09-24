import { FC } from "react";
import styled, { css, keyframes } from "styled-components";

import type { Ground } from "./slides";
import {
  DEEP,
  GREEN,
  INK,
  LATTICE_FADE,
  LATTICE_PITCH,
  PAPER,
  PURPLE,
  STEEL,
  TEAL,
  VIOLET,
  latticeTiles,
} from "./tokens";

/**
 * The deck's ground: a mesh that drifts, and a lattice over it.
 *
 * The gradient's first pass was one linear ramp corner to corner, which is a
 * ramp and not a mesh — the Figma's colour moves in several directions at once
 * and cannot be reduced to a single angle. It is six drifting blobs now.
 *
 * The lattice is the supplied asset rather than my reading of it, and the two
 * disagreed on the most basic point: I had drawn the light in the *gaps*, as a
 * crosshatch with a star at each intersection. In the asset the light is the
 * tiles and the gaps are the ground showing through. Everything else followed
 * from that mistake, so none of the old numbers survive.
 *
 * Both are built from gradients and one repeated tile rather than a 180 KB
 * path, so they scale to any frame and cost nothing to ship.
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
    {lattice && <Lattice />}
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

/** The supplied pattern at its own weight, faded the way the asset fades it */
const Lattice = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: ${latticeTiles()};
  background-size: ${LATTICE_PITCH} ${LATTICE_PITCH};
  ${LATTICE_FADE}
`;
