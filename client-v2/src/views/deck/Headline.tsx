import { FC, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import { MAKE_ROOM_MS, useCarry, willCarry } from "./carry";
import {
  HEADLINE,
  HEADLINE_LEADING,
  HEADLINE_SIZE,
  HEADLINE_TRACKING,
  INK,
  PAPER,
} from "./tokens";

/**
 * A line, one letter at a time — and, word by word, carried.
 *
 * Words are kept whole so the line still wraps on word boundaries, and the
 * spaces carry the same beat as a letter, which stops the second word starting
 * before the first has landed. 22ms a letter is quick: the point is that the
 * line reads as arriving rather than as a queue.
 *
 * Every word is also a carry target, named for what it says. A word the last
 * slide already had does not drop in again — it travels from where it was.
 * That is the whole of how "Explore" becomes "Explore, Learn," becomes the
 * full line: nothing is re-typed, only the new words arrive. Trailing
 * punctuation is its own target, so the comma that joins "Explore" on the
 * second slide arrives as a new thing while the word it follows moves.
 */
const STEP = 22;

const keyOf = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

const Carried: FC<{ name: string; children: React.ReactNode }> = ({
  name,
  children,
}) => {
  const ref = useCarry<HTMLSpanElement>();
  return (
    <Piece ref={ref} data-carry={name}>
      {children}
    </Piece>
  );
};

/* Exported: the landing sets its line with this same component, so the page
   and the presentation arrive the same way. */
export const Headline: FC<{
  lines: string[];
  light: boolean;
  scale?: number;
  weight?: number;
  leading?: number;
  reserve?: number;
  /** The element it is set in, when it is not the page's heading */
  as?: "h1" | "h2" | "p";
  /** Letter-spacing, where a design sets it tighter than the deck's -1% */
  tracking?: string;
  /**
   * A size of its own in place of the deck's, for a heading laid out on a
   * frame rather than across the whole window — the roadmap's slides
   */
  size?: string;
}> = ({
  lines,
  light,
  scale,
  weight,
  leading,
  reserve = 0,
  as,
  tracking,
  size,
}) => {
  /* Name every piece first, so we know before drawing a letter whether any of
     them is arriving from the last slide */
  const taken = new Map<string, number>();
  const words = lines.map((line) =>
    line.split(" ").map((word, w) => {
      const core = word.replace(/[^\p{L}\p{N}]+$/u, "");
      const tail = word.slice(core.length);
      const base = keyOf(core) || `w${w}`;
      const seen = taken.get(base) ?? 0;
      taken.set(base, seen + 1);
      const name = seen ? `${base}-${seen}` : base;
      return { word, core, tail, name };
    })
  );
  /* Decided once, on arrival. The map changes as the next slide is noted, and
     a slide that is already on its way out must not re-time its own letters */
  const [carrying] = useState(() =>
    words.flat().some((w) => willCarry(w.name))
  );

  /* New letters wait for carried words to clear the space they land in */
  let n = 0;
  const start = carrying ? MAKE_ROOM_MS : 90;
  const letters = (text: string) =>
    [...text].map((ch, i) => (
      <Ch key={i} style={{ animationDelay: `${n++ * STEP + start}ms` }}>
        {ch}
      </Ch>
    ));

  return (
    <Title
      as={as}
      $light={light}
      $scale={scale}
      $weight={weight}
      $leading={leading}
      $tracking={tracking}
      $size={size}
    >
      {words.map((line, l) => (
        <Line key={`${lines[l]}-${l}`}>
          {line.map(({ word, core, tail, name }, w) => (
            <Word key={`${word}-${w}`}>
              <Carried name={name}>{letters(core)}</Carried>
              {tail && (
                <Carried name={`${name}${tail}`}>{letters(tail)}</Carried>
              )}
              {w < line.length - 1 && <Ch>{" "}</Ch>}
            </Word>
          ))}
        </Line>
      ))}
      {Array.from({ length: Math.max(0, reserve - lines.length) }, (_, i) => (
        <Line key={`held-${i}`} aria-hidden="true">
          {" "}
        </Line>
      ))}
    </Title>
  );
};

/* ── type ─────────────────────────────────────────────────────────────── */

const Title = styled.h1<{
  $light: boolean;
  $scale?: number;
  $weight?: number;
  $leading?: number;
  $tracking?: string;
  $size?: string;
}>`
  ${({
    $light,
    $scale = 1,
    $weight = 400,
    $leading = HEADLINE_LEADING,
    $tracking = HEADLINE_TRACKING,
    $size,
  }) => css`
    margin: 0;
    font-family: ${HEADLINE};
    font-weight: ${$weight};
    font-size: ${$size ?? `calc(${HEADLINE_SIZE} * ${$scale})`};
    line-height: ${$leading};
    letter-spacing: ${$tracking};
    color: ${$light ? INK : PAPER};
  `}
`;

const Line = styled.span`
  display: block;
`;

/* Kept whole so the line breaks between words and never inside one */
const Word = styled.span`
  display: inline-block;
  white-space: pre;
`;

/* What travels: inline-block, because a transform does nothing to an inline
   box, and a carried word is moved by one */
const Piece = styled.span`
  display: inline-block;
`;

/* The playful part: each letter drops in with a little overshoot rather than
   fading, so the line has a bounce to it at speed. */
const pop = keyframes`
  0%   { opacity: 0; transform: translate3d(0, 0.5em, 0) scale(0.86); }
  62%  { opacity: 1; transform: translate3d(0, -0.045em, 0) scale(1.015); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
`;

const Ch = styled.span`
  display: inline-block;
  animation: ${pop} 440ms cubic-bezier(0.2, 0.8, 0.3, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
