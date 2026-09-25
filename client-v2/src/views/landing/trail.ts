import { css, keyframes } from "styled-components";

/**
 * The trail: what the second version of the landing adds to the first.
 *
 * Solana's colours, as a light cools behind something moving fast — green
 * nearest the head, then teal, then purple, then violet, and then nothing.
 * The CTA's light, the trailing headlines and the claims that fly at the
 * reader all draw from this one ramp, in this one order, so the three read
 * as one idea rather than three effects.
 */

/** Nearest the head first: green, the deck's teal, purple, violet */
export const RAMP = ["#14F195", "#2DCEA9", "#9945FF", "#5A3FD9"] as const;

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** 0 before `a`, 1 after `b`, and an eased step between */
export const smoothstep = (a: number, b: number, n: number) => {
  const t = clamp01((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Park–Miller: the same sequence every time, so a field of lines or rays
    is the same field on every visit */
export const seeded = (seed: number) => {
  /* Spread first: from a small seed the first draw would be nearly zero */
  let s = (seed * 2654435761) % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

/** A ramp colour at an alpha — for the canvas, and for shadow lists */
export const rgba = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  const a = Math.round(clamp01(alpha) * 1000) / 1000;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/* ── the headline's letters ─────────────────────────────────────────── */

/*
 * Each letter comes in from below and to the right of its place, fast, and
 * settles. Behind it it leaves copies of itself in the ramp — a stack, the
 * extruded look — that is as long as the letter is fast: long as it sets
 * off, collapsing into the letterform as it slows, gone when it lands. The
 * copies further back are softer and fainter, so the trail blurs out into
 * the ground rather than ending.
 *
 * The stack is four chained drop-shadows. Each one shadows everything before
 * it, so four equal offsets make four evenly spaced copies, each a little
 * blurrier than the last. It is a filter, so it is drawn by the compositor
 * over a letter painted once — nothing is repainted per frame.
 *
 * Down and to the right, because the copies are painted with their letter:
 * a trail pointing that way falls behind the *next* letter, which is painted
 * after it and covers it, exactly as the faces of an extruded word cover its
 * depth. Pointing left, each letter's trail would be laid over the one before.
 */

/* Where the letter sets off from, in em from its place */
const FROM_X = 0.26;
const FROM_Y = 0.37;

/* The gap between one copy and the next: where the letter was this long
   ago, as a share of its run */
const LAG = 0.05;

/* The copies' strength, nearest first — the stack fades as it goes back */
const ALPHA = [0.95, 0.9, 0.88, 0.8];

/* Denser where the motion is fastest */
const SAMPLES = [0, 0.05, 0.1, 0.16, 0.24, 0.34, 0.46, 0.6, 0.76, 0.9, 1];

/** How much of the way the letter still has to go, easing out */
const away = (t: number) => Math.pow(1 - clamp01(t), 3);

const em = (n: number) => `${Math.round(n * 10000) / 10000}em`;

const frameAt = (t: number) => {
  const left = away(t);
  /* One copy's offset: where the letter was one lag ago, from where it is */
  const step = away(t - LAG) - left;
  const dx = FROM_X * step;
  const dy = FROM_Y * step;
  const spread = Math.hypot(dx, dy);
  /* Gone by the time the letter lands, halos and all, so it rests crisp */
  const fade = 1 - smoothstep(0.5, 0.92, t);
  const stack = RAMP.map(
    (colour, i) =>
      `drop-shadow(${em(dx)} ${em(dy)} ${em(spread * (0.12 + 0.2 * i))} ${rgba(
        colour,
        ALPHA[i] * fade
      )})`
  ).join(" ");

  return `${Math.round(t * 1000) / 10}% {
    opacity: ${Math.round(smoothstep(0, 0.18, t) * 1000) / 1000};
    transform: translate3d(${em(FROM_X * left)}, ${em(FROM_Y * left)}, 0);
    filter: ${stack};
  }`;
};

/* Sampled rather than eased: the copies follow the letter's own path, so the
   path has to be known at every step. The last frame is the letter at rest
   with no trail, which is what it returns to when the animation lets go. */
const sweep = keyframes`${SAMPLES.map(frameAt).join("\n")}`;

/** Well under the ~1.2s a line may take, stagger included */
export const TRAIL_MS = 760;

/**
 * Re-times the deck's own headline, rather than forking it.
 *
 * `Headline` sets every letter as a span inside a `[data-carry]` piece and
 * gives each its own delay inline, so this only swaps the entrance those
 * letters play: the order, the stagger, the carry — words already on screen
 * travelling instead of arriving again — all stay the deck's. Scoped to the
 * given heading so nothing else on the page is touched. The inline delay
 * outranks the shorthand's, which is what keeps the stagger.
 */
export const trailLetters = (heading: "h1" | "h2" | "p") => css`
  ${heading} [data-carry] > span {
    animation: ${sweep} ${TRAIL_MS}ms linear backwards;
  }

  @media (prefers-reduced-motion: reduce) {
    ${heading} [data-carry] > span {
      animation: none;
    }
  }
`;
