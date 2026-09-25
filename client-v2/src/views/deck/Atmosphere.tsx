import { FC } from "react";
import styled, { css, keyframes } from "styled-components";

import Pattern from "./Pattern";
import { INK, PAPER } from "./tokens";

/**
 * The ground under the whole deck — one layer that stays, and changes.
 *
 * In the Figma the gradient does not cut between slides, it moves: the colour
 * slides from one arrangement into the next. So the ground is not part of a
 * slide here. It is seven soft fields of colour under every slide at once, and
 * each slide only says where the fields should be, what colour, and how big.
 * Everything between two slides is a transition on those three things, so a
 * change of slide is the gradient travelling to its next place rather than
 * one picture replacing another.
 *
 * The seven fields keep their roles from one arrangement to the next — the
 * corner that is teal in one is the corner that turns green, then purple, in
 * the next — which is what makes the movement read as one surface shifting
 * rather than seven blobs swapping.
 *
 * White and ink are arrangements too: every field fades out and the bed turns
 * to paper or to near-black, so the gradient blooms out of a white slide and
 * settles into the black one instead of switching on and off.
 */

export type Ground = "paper" | "haze" | "deep" | "explore" | "violet" | "ink";

/** One field: a colour, where its centre sits (% of the frame), and its size */
interface Field {
  c: string;
  x: number;
  y: number;
  s: number;
  o?: number;
}

/* Sampled from the Figma renders on a seven-by-five grid and placed where each
   colour peaks. Seven roles, in this order everywhere: top-right, bottom-left,
   the centre, top-left, right, bottom, top. */
const FIELDS: Record<Exclude<Ground, "paper" | "ink">, Field[]> = {
  /* The first colour after white — pale lilac, teal in two corners */
  haze: [
    { c: "#2DCEA9", x: 104, y: -6, s: 0.62 },
    { c: "#5FD5C1", x: -4, y: 106, s: 0.62 },
    { c: "#D2B0FF", x: 36, y: 44, s: 1.05 },
    { c: "#ACBCEC", x: -6, y: 8, s: 0.6 },
    { c: "#7F87E5", x: 92, y: 58, s: 0.66 },
    { c: "#AA8FF4", x: 62, y: 96, s: 0.66 },
    { c: "#C0A6F9", x: 30, y: -4, s: 0.6 },
  ],
  /* Where the mark lives — deep violet, the teal corners kept */
  deep: [
    { c: "#2DCEA9", x: 104, y: -6, s: 0.58 },
    { c: "#2B9C9E", x: -4, y: 106, s: 0.58 },
    { c: "#6A4AD4", x: 46, y: 56, s: 1.0 },
    { c: "#7D90E8", x: -6, y: 4, s: 0.6 },
    { c: "#5595CB", x: 104, y: 62, s: 0.6 },
    { c: "#4A4AAF", x: 38, y: 108, s: 0.66 },
    { c: "#8F78F6", x: 34, y: -6, s: 0.6 },
  ],
  /* "Explore" — the right-hand teal turns to Solana's green */
  explore: [
    { c: "#14F195", x: 104, y: 14, s: 0.66 },
    { c: "#3D95AC", x: -4, y: 86, s: 0.6 },
    { c: "#7456D9", x: 44, y: 56, s: 0.9 },
    { c: "#33CFAE", x: -6, y: -4, s: 0.58 },
    { c: "#16EE97", x: 104, y: 88, s: 0.7 },
    { c: "#4A48AD", x: 28, y: 108, s: 0.62 },
    { c: "#8C6EF5", x: 44, y: -6, s: 0.6 },
  ],
  /* "Explore, Learn," — the green gives way to Solana's purple, and the
     bottom-left sinks to navy */
  violet: [
    { c: "#9945FF", x: 104, y: -6, s: 0.8 },
    { c: "#1E2173", x: -4, y: 106, s: 0.78 },
    { c: "#7A56DA", x: 46, y: 52, s: 0.9 },
    { c: "#9496F9", x: -6, y: -6, s: 0.66 },
    { c: "#8A4AF0", x: 104, y: 58, s: 0.6 },
    { c: "#3A2893", x: 36, y: 108, s: 0.66 },
    { c: "#957BFB", x: 40, y: -6, s: 0.6 },
  ],
};

/* The colour a field sits on, so a gap between two of them is still the right
   family rather than a hole */
const BEDS: Record<Ground, string> = {
  paper: PAPER,
  haze: "#B8A6F5",
  deep: "#6858D2",
  explore: "#6A63CD",
  violet: "#6A4BCF",
  ink: INK,
};

/* How strong the pattern is on each ground, and how much of the asset's fade
   it takes — measured off the renders rather than assumed. On the two colour
   slides it is the asset exactly: 0.2 at the right edge, gone at the left. On
   black it is about a third of that and nearly even across the frame; at full
   strength white on near-black is a table, not a texture. */
const PATTERNS: Partial<Record<Ground, { strength: number; fade: number }>> = {
  explore: { strength: 1, fade: 1 },
  violet: { strength: 1, fade: 1 },
  ink: { strength: 0.36, fade: 0.4 },
};
const PATTERN_DEFAULT = { strength: 1, fade: 1 };

/* On white and on black the fields keep their last place and colour and only
   fade, so they leave from where they were rather than drifting to nowhere */
const fieldsFor = (ground: Ground, last: Field[]): Field[] =>
  ground === "paper" || ground === "ink"
    ? last.map((f) => ({ ...f, o: 0 }))
    : FIELDS[ground];

interface AtmosphereProps {
  ground: Ground;
  /** The last coloured arrangement, for the fields to fade out from */
  lastColour: Exclude<Ground, "paper" | "ink">;
  pattern: boolean;
}

const Atmosphere: FC<AtmosphereProps> = ({ ground, lastColour, pattern }) => {
  const p = PATTERNS[ground] ?? PATTERN_DEFAULT;
  return (
    <Bed style={{ backgroundColor: BEDS[ground] }} aria-hidden="true">
      {fieldsFor(ground, FIELDS[lastColour]).map((f, i) => (
        <Spot
          key={i}
          style={{
            color: f.c,
            opacity: f.o ?? 0.94,
            transform: `translate3d(${f.x}vw, ${f.y}vh, 0) translate(-50%, -50%) scale(${f.s})`,
          }}
        >
          <Drift $i={i} />
        </Spot>
      ))}
      <PatternLayer style={{ opacity: pattern ? 1 : 0 }}>
        <Pattern fade={p.fade} strength={p.strength} />
      </PatternLayer>
    </Bed>
  );
};

export default Atmosphere;

/**
 * One arrangement, held, inside whatever box it is put in — for a band on a
 * page rather than a whole screen. Same fields, same breathing; placed and
 * sized against the box instead of the viewport, so it can scroll.
 */
export const StillMesh: FC<{ ground: Exclude<Ground, "paper" | "ink"> }> = ({
  ground,
}) => (
  <Box style={{ backgroundColor: BEDS[ground] }} aria-hidden="true">
    {FIELDS[ground].map((f, i) => (
      <BoxSpot
        key={i}
        style={{
          color: f.c,
          opacity: f.o ?? 0.94,
          left: `${f.x}%`,
          top: `${f.y}%`,
          transform: `translate(-50%, -50%) scale(${f.s})`,
        }}
      >
        <Drift $i={i} />
      </BoxSpot>
    ))}
  </Box>
);

const Box = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
`;

/* As wide as the box, and square — the viewport version is 100vmax, which on
   a landscape screen is the same thing */
const BoxSpot = styled.div`
  position: absolute;
  width: 100%;
  aspect-ratio: 1;
`;

/* Long enough to watch the colour travel, short enough that a presenter who
   clicks twice is not left waiting on the first */
const MOVE = "1400ms cubic-bezier(0.45, 0, 0.2, 1)";

const Bed = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  transition: background-color ${MOVE};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Spot = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 100vmax;
  height: 100vmax;
  transition: transform ${MOVE}, color ${MOVE}, opacity ${MOVE};
  will-change: transform;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* Each field also breathes on its own slow loop, so a slide held on screen is
   never a still picture. Small, so every arrangement still matches its slide. */
const breathe = (dx: number, dy: number) => keyframes`
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  50%  { transform: translate3d(${dx}%, ${dy}%, 0) scale(1.06); }
  100% { transform: translate3d(0, 0, 0) scale(1); }
`;

const LOOPS = [
  { dx: -4, dy: 3, s: 23 },
  { dx: 3, dy: -4, s: 29 },
  { dx: -3, dy: -2, s: 34 },
  { dx: 4, dy: 3, s: 26 },
  { dx: -3, dy: 4, s: 31 },
  { dx: 3, dy: -3, s: 37 },
  { dx: -2, dy: 4, s: 27 },
];

/* The colour is `currentColor`, so a change of colour on the field is a plain
   `color` transition — which interpolates — rather than a change of gradient,
   which does not. */
const Drift = styled.div<{ $i: number }>`
  ${({ $i }) => {
    const l = LOOPS[$i % LOOPS.length];
    return css`
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(
        closest-side,
        currentColor 0%,
        color-mix(in srgb, currentColor 72%, transparent) 30%,
        color-mix(in srgb, currentColor 34%, transparent) 60%,
        color-mix(in srgb, currentColor 10%, transparent) 82%,
        transparent 100%
      );
      animation: ${breathe(l.dx, l.dy)} ${l.s}s ease-in-out infinite;

      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `;
  }}
`;

const PatternLayer = styled.div`
  position: absolute;
  inset: 0;
  transition: opacity ${MOVE};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
