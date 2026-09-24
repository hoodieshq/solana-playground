import { FC } from "react";
import styled, { css, keyframes } from "styled-components";

import PlaygroundMarkNext from "../../components/PlaygroundMarkNext";
import Backdrop from "./Backdrop";
import type { Exit, Ground, SlideSpec } from "./slides";
import {
  GRID_PITCH,
  HEADLINE,
  HEADLINE_LEADING,
  HEADLINE_SIZE,
  HEADLINE_TRACKING,
  INK,
  MESH,
  MESH_DEEP,
  PAPER,
  grid,
} from "./tokens";

/**
 * A line, one letter at a time.
 *
 * Words are kept whole so the line still wraps on word boundaries, and the
 * spaces between them carry the same beat as a letter — which is what stops
 * the second word starting before the first has landed. 22ms a letter is
 * quick: the whole of "Play, Build, Create" is under half a second, and the
 * point is that it reads as arriving rather than as a queue.
 */
const STEP = 22;

const Letters: FC<{ text: string; from: number }> = ({ text, from }) => {
  let n = from;
  return (
    <>
      {text.split(" ").map((word, w, all) => (
        <Word key={`${word}-${w}`}>
          {[...word].map((ch, i) => (
            <Ch key={i} style={{ animationDelay: `${(n++ * STEP) + 90}ms` }}>
              {ch}
            </Ch>
          ))}
          {w < all.length - 1 && <Ch key="sp">&nbsp;</Ch>}
        </Word>
      ))}
    </>
  );
};

/** One slide. Which one is decided by the spec; how it looks is decided here. */

interface SlideProps {
  slide: SlideSpec;
  onLanding: () => void;
  onProduct: () => void;
  onEvaluation: () => void;
}

const Slide: FC<SlideProps> = ({
  slide,
  onLanding,
  onProduct,
  onEvaluation,
}) => {
  const exits: Record<Exit, () => void> = {
    landing: onLanding,
    product: onProduct,
    evaluation: onEvaluation,
  };
  const dark = slide.ground !== "paper";

  return (
    <Surface $paper={slide.ground === "paper"}>
      <Backdrop ground={slide.ground} lattice={!!slide.grid} />
      {slide.kind === "title" && (
        <Measure>
          <Headline $dark={dark} $scale={slide.scale}>
            {slide.lines.map((line, i) => (
              <Line key={line}>
                <Letters text={line} from={i * 9} />
              </Line>
            ))}
          </Headline>
        </Measure>
      )}

      {slide.kind === "cards" && (
        <Cards>
          {slide.items.map((item, i) => (
            <Card key={item.name} style={{ animationDelay: `${140 + i * 110}ms` }}>
              <Plate>
                <Glyph aria-hidden="true">{GLYPHS[item.glyph]}</Glyph>
              </Plate>
              <CardName>{item.name}</CardName>
              <CardNote>{item.note}</CardNote>
            </Card>
          ))}
        </Cards>
      )}

      {slide.kind === "mark" && (
        <BigMark>
          <PlaygroundMarkNext />
        </BigMark>
      )}

      {slide.kind === "lockup" && (
        <Lockup>
          <LockMark>
            <PlaygroundMarkNext />
          </LockMark>
          <Wordmark>
            Solana
            <br />
            Playground
          </Wordmark>
        </Lockup>
      )}

      {slide.kind === "signpost" && (
        <Measure>
          <Headline $dark={dark} $scale={slide.scale}>
            {slide.lines.map((line, i) => (
              <Line key={line}>
                <Letters text={line} from={i * 9} />
              </Line>
            ))}
          </Headline>
          {slide.note && <Note $dark={dark}>{slide.note}</Note>}
          <Cta type="button" onClick={exits[slide.exit]} $dark={dark}>
            {slide.cta}
            <CtaArrow aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h13M12.5 5.5 19 12l-6.5 6.5" />
              </svg>
            </CtaArrow>
          </Cta>
        </Measure>
      )}
    </Surface>
  );
};

export default Slide;

/* ── the grounds ──────────────────────────────────────────────────────── */

const Surface = styled.div<{ $paper: boolean }>`
  ${({ $paper }) => css`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(1.5rem, 5vw, 5.5rem);
    background: ${$paper ? PAPER : INK};
  `}
`;

/* ── type ─────────────────────────────────────────────────────────────── */

const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, 0.38em, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
`;

const Measure = styled.div`
  position: relative;
  z-index: 1;
  width: min(84rem, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const Headline = styled.h1<{ $dark: boolean; $scale?: number }>`
  ${({ $dark, $scale = 1 }) => css`
    margin: 0;
    font-family: ${HEADLINE};
    font-weight: 400;
    font-size: calc(${HEADLINE_SIZE} * ${$scale});
    line-height: ${HEADLINE_LEADING};
    letter-spacing: ${HEADLINE_TRACKING};
    color: ${$dark ? PAPER : INK};
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
  will-change: transform, opacity;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Note = styled.p<{ $dark: boolean }>`
  ${({ $dark }) => css`
    margin: clamp(1.25rem, 2.5vw, 2rem) 0 0;
    max-width: 34rem;
    font-size: clamp(0.875rem, 1.15vw, 1.0625rem);
    font-weight: 300;
    line-height: 1.5;
    color: ${$dark ? "rgba(255, 255, 255, 0.66)" : "rgba(0, 0, 0, 0.55)"};
    animation: ${rise} 620ms 320ms cubic-bezier(0.22, 0.61, 0.24, 1) both;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

const Cta = styled.button<{ $dark: boolean }>`
  ${({ $dark }) => css`
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: clamp(1.5rem, 3vw, 2.5rem);
    padding: 0.8125rem 1.375rem;
    border: none;
    border-radius: 999px;
    background: ${$dark ? PAPER : INK};
    color: ${$dark ? INK : PAPER};
    font-family: inherit;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    animation: ${rise} 620ms 420ms cubic-bezier(0.22, 0.61, 0.24, 1) both;
    transition: transform 160ms ease;

    &:hover {
      transform: translateY(-1px);
    }

    &:focus-visible {
      outline: 2px solid ${$dark ? PAPER : INK};
      outline-offset: 3px;
    }

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      transition: none;
    }
  `}
`;

const CtaArrow = styled.span`
  display: flex;
  width: 1rem;
  height: 1rem;

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

/* ── the mark ─────────────────────────────────────────────────────────── */

const draw = keyframes`
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
`;

const BigMark = styled.div`
  position: relative;
  z-index: 1;
  width: min(46vw, 34rem);
  color: ${PAPER};
  animation: ${draw} 760ms cubic-bezier(0.22, 0.61, 0.24, 1) both;

  & > svg {
    width: 100%;
    height: auto;
    display: block;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Lockup = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: clamp(1rem, 2.6vw, 2.5rem);
  color: ${PAPER};
  animation: ${draw} 760ms cubic-bezier(0.22, 0.61, 0.24, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const LockMark = styled.div`
  width: min(22vw, 15rem);
  flex-shrink: 0;

  & > svg {
    width: 100%;
    height: auto;
    display: block;
  }
`;

const Wordmark = styled.div`
  font-family: ${HEADLINE};
  font-weight: 600;
  font-size: clamp(1.75rem, 7vw, 6.5rem);
  line-height: 0.92;
  letter-spacing: -0.015em;
  text-align: left;
`;

/* ── the three parts ──────────────────────────────────────────────────── */

const Cards = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(1rem, 3vw, 3rem);
  width: min(72rem, 100%);

  @media (max-width: 40rem) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: ${rise} 620ms cubic-bezier(0.22, 0.61, 0.24, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* A plain square with a hairline, as on the slide — the glyph is the thing,
   not the container. */
const Plate = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  width: 100%;
  margin-bottom: clamp(0.75rem, 1.6vw, 1.5rem);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
`;

const Glyph = styled.div`
  display: flex;
  width: 46%;
  color: ${INK};

  & > svg {
    width: 100%;
    height: auto;
  }
`;

const CardName = styled.div`
  font-family: ${HEADLINE};
  font-size: clamp(1.125rem, 2.1vw, 2rem);
  font-weight: 400;
  color: ${INK};
`;

const CardNote = styled.div`
  margin-top: 0.3rem;
  font-size: clamp(0.6875rem, 0.95vw, 0.875rem);
  font-weight: 300;
  color: rgba(0, 0, 0, 0.5);
`;

/* Solana's three bars, a controller, and a globe — drawn rather than
   photographed, so the row reads as one set. The Figma uses a product shot of
   a gamepad and a NASA earth; three stroke glyphs at one weight say the same
   thing and do not drag two licensed images into the build. */
const GLYPHS: Record<"solana" | "play" | "ground", JSX.Element> = {
  solana: (
    <svg viewBox="0 0 100 78" fill="currentColor">
      <path d="M17.2 58.6a3.4 3.4 0 0 1 2.4-1H98c1.5 0 2.3 1.8 1.2 2.9L82.8 77a3.4 3.4 0 0 1-2.4 1H2c-1.5 0-2.3-1.9-1.2-3z" />
      <path d="M17.2 1a3.4 3.4 0 0 1 2.4-1H98c1.5 0 2.3 1.8 1.2 2.9L82.8 19.4a3.4 3.4 0 0 1-2.4 1H2C.5 20.4-.3 18.5.8 17.4z" />
      <path d="M82.8 29.6a3.4 3.4 0 0 0-2.4-1H2c-1.5 0-2.3 1.9-1.2 3l16.4 16.5a3.4 3.4 0 0 0 2.4 1H98c1.5 0 2.3-1.9 1.2-3z" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.6 7h10.8a4 4 0 0 1 3.9 3.1l1.2 5.4a2.6 2.6 0 0 1-4.7 2l-1.6-2.2a2 2 0 0 0-1.6-.8H9.4a2 2 0 0 0-1.6.8l-1.6 2.2a2.6 2.6 0 0 1-4.7-2l1.2-5.4A4 4 0 0 1 6.6 7Z" />
      <path d="M7 11.4v1.8M6.1 12.3h1.8M16.4 11.6h.01M18.2 13.2h.01" />
    </svg>
  ),
  ground: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M2.8 12h18.4" />
      <path d="M12 2.8c2.6 2.7 4 5.8 4 9.2s-1.4 6.5-4 9.2c-2.6-2.7-4-5.8-4-9.2s1.4-6.5 4-9.2Z" />
    </svg>
  ),
};
