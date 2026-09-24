import { FC } from "react";
import styled, { css, keyframes } from "styled-components";

import PlaygroundMarkNext from "../../components/PlaygroundMarkNext";

/**
 * Where the mark comes from: Solana's three bars fold into a play triangle,
 * and the triangle becomes the logo.
 *
 * Three bars, not a path morph. The Solana mark and the new one have nothing
 * in common structurally — one is three separate parallelograms, the other a
 * single path with a counter in it — so interpolating between them produces
 * the shapeless middle that every SVG morph of unrelated glyphs produces. The
 * bars are the thing that actually moves, so the bars are what is animated,
 * and the finished mark arrives over the triangle they make.
 *
 * Three beats, on one clock so they cannot drift:
 *   0.0-1.2s  the Solana mark, stacked and level
 *   1.2-2.6s  the bars swing into the triangle
 *   2.4-3.4s  the mark resolves over them
 */

const SOLANA_GREEN = "#14F195";
const SOLANA_PURPLE = "#9945FF";

/** The whole sequence, so every beat is a fraction of one number */
const RUN = 3400;

interface MarkMorphProps {
  /** Paused on the teaser slide, so the bars sit still as the Solana mark */
  hold?: boolean;
}

const MarkMorph: FC<MarkMorphProps> = ({ hold }) => (
  <Frame>
    {/* Each bar carries its own path through the fold. They start as the three
        stacked bars and end lying along the triangle's edges. */}
    <Bar $i={0} $hold={!!hold} />
    <Bar $i={1} $hold={!!hold} />
    <Bar $i={2} $hold={!!hold} />
    {!hold && (
      <Resolved>
        <PlaygroundMarkNext />
      </Resolved>
    )}
  </Frame>
);

export default MarkMorph;

const Frame = styled.div`
  position: relative;
  z-index: 1;
  width: min(46vw, 34rem);
  /* The mark's own ratio, so the resolved logo lands where the bars are */
  aspect-ratio: 970 / 574;
`;

/**
 * Where each bar starts and where it ends.
 *
 * `from` is the Solana mark: three level bars, each sheared, stacked with a
 * gap. `to` lays them along the edges of the play triangle the new mark is
 * built on — two swung out to the diagonals, one left as the bar across the
 * middle, which is the one the finished logo keeps.
 */
const BARS = [
  { top: 16, from: "skewX(-18deg)", to: "translate(6%, 96%) rotate(-59deg) skewX(-10deg) scaleX(1.06)" },
  { top: 40, from: "skewX(-18deg)", to: "translate(2%, 0%) rotate(0deg) skewX(-14deg) scaleX(0.62)" },
  { top: 64, from: "skewX(-18deg)", to: "translate(6%, -96%) rotate(59deg) skewX(10deg) scaleX(1.06)" },
];

const fold = (from: string, to: string) => keyframes`
  0%    { transform: ${from}; opacity: 1; }
  35%   { transform: ${from}; opacity: 1; }
  76%   { transform: ${to}; opacity: 1; }
  /* Handing over: the bars go as the finished mark arrives over them */
  100%  { transform: ${to}; opacity: 0; }
`;

const Bar = styled.div<{ $i: number; $hold: boolean }>`
  ${({ $i, $hold }) => {
    const b = BARS[$i];
    return css`
      position: absolute;
      left: 4%;
      top: ${b.top}%;
      width: 42%;
      height: 13%;
      border-radius: 2px;
      /* Solana's own two, across the three bars */
      background: linear-gradient(
        100deg,
        ${SOLANA_GREEN},
        ${SOLANA_PURPLE}
      );
      transform: ${b.from};
      transform-origin: 0% 50%;
      ${!$hold &&
      css`
        animation: ${fold(b.from, b.to)} ${RUN}ms
          cubic-bezier(0.65, 0, 0.2, 1) both;
      `}

      @media (prefers-reduced-motion: reduce) {
        animation: none;
        opacity: ${$hold ? 1 : 0};
      }
    `;
  }}
`;

const resolve = keyframes`
  0%   { opacity: 0; transform: scale(0.97); }
  66%  { opacity: 0; transform: scale(0.97); }
  100% { opacity: 1; transform: scale(1); }
`;

const Resolved = styled.div`
  position: absolute;
  inset: 0;
  color: #ffffff;
  animation: ${resolve} ${RUN}ms cubic-bezier(0.2, 0.7, 0.3, 1) both;

  & > svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`;
