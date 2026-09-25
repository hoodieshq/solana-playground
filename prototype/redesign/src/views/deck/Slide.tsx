import { FC, memo, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import PlaygroundLogoNext, {
  LOCKUP_BOX,
  LOCKUP_MARK,
} from "../../components/PlaygroundLogoNext";
import PlaygroundMarkNext from "../../components/PlaygroundMarkNext";
/* Imported rather than referenced by path: `public/` in this repo is mirrored
   from the static-assets submodule by `make update-static`, so anything put
   there is wiped on the next build and never committed. Through the bundler
   they are content-hashed and actually ship. */
import appShot from "./art/brand-app.png";
import homeShot from "./art/brand-home.png";
import keyboardShot from "./art/brand-keyboard.png";
import teeShot from "./art/brand-tee.png";
import tutorialShot from "./art/brand-tutorial.png";
import groundShot from "./art/ground.png";
import playShot from "./art/play.png";
import solanaShot from "./art/solana.png";
import { MAKE_ROOM_MS, useCarry, willCarry } from "./carry";
import SolanaMark from "./SolanaMark";
import { isLight } from "./slides";
import type { Exit, Shot, SlideSpec } from "./slides";
import {
  HEADLINE,
  HEADLINE_LEADING,
  HEADLINE_SIZE,
  HEADLINE_TRACKING,
  INK,
  PAPER,
} from "./tokens";

/** The five brand renders, so the deck can fetch them before they are needed */
export const SHOTS: Record<Shot, string> = {
  keyboard: keyboardShot,
  app: appShot,
  tutorial: tutorialShot,
  tee: teeShot,
  home: homeShot,
};

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

const Headline: FC<{
  lines: string[];
  light: boolean;
  scale?: number;
  weight?: number;
  leading?: number;
  reserve?: number;
}> = ({ lines, light, scale, weight, leading, reserve = 0 }) => {
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
  const [carrying] = useState(() => words.flat().some((w) => willCarry(w.name)));

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
    <Title $light={light} $scale={scale} $weight={weight} $leading={leading}>
      {words.map((line, l) => (
        <Line key={`${lines[l]}-${l}`}>
          {line.map(({ word, core, tail, name }, w) => (
            <Word key={`${word}-${w}`}>
              <Carried name={name}>{letters(core)}</Carried>
              {tail && <Carried name={`${name}${tail}`}>{letters(tail)}</Carried>}
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

/** The mark alone, carried into the lockup on the next slide */
const Mark: FC = () => {
  const ref = useCarry<HTMLDivElement>();
  return (
    <BigMark ref={ref} data-carry="symbol">
      <PlaygroundMarkNext />
    </BigMark>
  );
};

/**
 * The lockup: the supplied Logo, with its mark lifted out as its own element
 * so the mark from the slide before can travel into the exact place it
 * occupies in the logo. The words are the logo's own, drawn around it.
 */
const Lockup: FC = () => {
  const ref = useCarry<HTMLDivElement>();
  return (
    <LockupBox>
      <LockupWords part="words" />
      <LockupMark ref={ref} data-carry="symbol">
        <PlaygroundMarkNext />
      </LockupMark>
    </LockupBox>
  );
};

/** One slide's content. The ground under it belongs to the deck. */

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
  const light = isLight(slide);

  if (slide.kind === "image") {
    return <Picture src={SHOTS[slide.shot]} alt={slide.alt} draggable={false} />;
  }

  return (
    <Content>
      {slide.kind === "title" && (
        <Measure>
          <Headline
            lines={slide.lines}
            light={light}
            scale={slide.scale}
            weight={slide.weight}
            leading={slide.leading}
            reserve={slide.reserve}
          />
        </Measure>
      )}

      {slide.kind === "cards" && (
        <Cards>
          {slide.items.map((item, i) => (
            <Card key={item.name} style={{ animationDelay: `${140 + i * 110}ms` }}>
              <Plate>
                <Art src={ART[item.glyph]} alt="" />
              </Plate>
              <CardName>{item.name}</CardName>
              <CardNote>{item.note}</CardNote>
            </Card>
          ))}
        </Cards>
      )}

      {slide.kind === "solana" && (
        <SolanaBox>
          <SolanaMark />
        </SolanaBox>
      )}

      {slide.kind === "mark" && <Mark />}
      {slide.kind === "lockup" && <Lockup />}

      {slide.kind === "signpost" && (
        <Measure>
          <Headline lines={slide.lines} light={light} scale={slide.scale} />
          {slide.note && <Note $light={light}>{slide.note}</Note>}
          <Cta type="button" onClick={exits[slide.exit]} $light={light}>
            {slide.cta}
            <CtaArrow aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h13M12.5 5.5 19 12l-6.5 6.5" />
              </svg>
            </CtaArrow>
          </Cta>
        </Measure>
      )}
    </Content>
  );
};

/* Memoised: an outgoing slide is re-rendered by the deck when its role
   changes, and there is nothing in it that should change with it */
export default memo(Slide);

/* ── the frame ────────────────────────────────────────────────────────── */

const Content = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1.5rem, 5vw, 5.5rem);
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

const Title = styled.h1<{
  $light: boolean;
  $scale?: number;
  $weight?: number;
  $leading?: number;
}>`
  ${({ $light, $scale = 1, $weight = 400, $leading = HEADLINE_LEADING }) => css`
    margin: 0;
    font-family: ${HEADLINE};
    font-weight: ${$weight};
    font-size: calc(${HEADLINE_SIZE} * ${$scale});
    line-height: ${$leading};
    letter-spacing: ${HEADLINE_TRACKING};
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

const Note = styled.p<{ $light: boolean }>`
  ${({ $light }) => css`
    margin: clamp(1.25rem, 2.5vw, 2rem) 0 0;
    max-width: 34rem;
    font-size: clamp(0.875rem, 1.15vw, 1.0625rem);
    font-weight: 300;
    line-height: 1.5;
    color: ${$light ? "rgba(0, 0, 0, 0.55)" : "rgba(255, 255, 255, 0.66)"};
    animation: ${rise} 620ms 320ms cubic-bezier(0.22, 0.61, 0.24, 1) both;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

const Cta = styled.button<{ $light: boolean }>`
  ${({ $light }) => css`
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: clamp(1.5rem, 3vw, 2.5rem);
    padding: 0.8125rem 1.375rem;
    border: none;
    border-radius: 999px;
    background: ${$light ? INK : PAPER};
    color: ${$light ? PAPER : INK};
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
      outline: 2px solid ${$light ? INK : PAPER};
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

/* ── the marks ────────────────────────────────────────────────────────── */

const draw = keyframes`
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
`;

const arriving = css`
  animation: ${draw} 760ms cubic-bezier(0.22, 0.61, 0.24, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* Sizes are the Figma's, as a share of the 1920 × 1080 frame, and held by
   whichever of width or height runs out first so a narrow window never crops
   them. Solana's mark is 470 wide there. */
const SolanaBox = styled.div`
  width: min(24.48vw, 43.55vh);
  ${arriving}

  & > svg {
    width: 100%;
    height: auto;
    display: block;
  }
`;

/* The mark at the size the Figma sets it — its own 970, on a 1920 frame */
const BigMark = styled.div`
  width: min(50.52vw, 89.8vh);
  color: ${PAPER};
  ${arriving}

  & > svg {
    width: 100%;
    height: auto;
    display: block;
  }
`;

/* 901 wide on the 1920 frame. Its proportions are the logo's own box, and the
   mark inside it is placed by the logo's own numbers, so the two parts sit
   exactly as the supplied file draws them. */
const LockupBox = styled.div`
  position: relative;
  width: min(46.93vw, 82.3vh);
  aspect-ratio: ${LOCKUP_BOX.width} / ${LOCKUP_BOX.height};
  color: ${PAPER};
`;

/* The words follow the mark — they rise once it has nearly arrived */
const LockupWords = styled(PlaygroundLogoNext)`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  animation: ${rise} 620ms 480ms cubic-bezier(0.2, 0.8, 0.3, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const LockupMark = styled.div`
  position: absolute;
  left: ${(LOCKUP_MARK.x / LOCKUP_BOX.width) * 100}%;
  top: ${(LOCKUP_MARK.y / LOCKUP_BOX.height) * 100}%;
  width: ${(LOCKUP_MARK.width / LOCKUP_BOX.width) * 100}%;
  ${arriving}

  & > svg {
    width: 100%;
    height: auto;
    display: block;
  }
`;

/* ── the brand, applied ───────────────────────────────────────────────── */

const settle = keyframes`
  from { opacity: 0; transform: scale(1.018); }
  to   { opacity: 1; transform: scale(1); }
`;

/* The supplied renders, full bleed. Each one is a finished slide, so it is
   shown whole rather than rebuilt: the photographs and the mock-ups are the
   point, and a reconstruction of them would be a worse copy of a file we
   have. */
const Picture = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
  animation: ${settle} 760ms cubic-bezier(0.22, 0.61, 0.24, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
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

/* The supplied artwork for each part — Solana's mark, the controller, the
   earth — exactly as exported. */
const ART: Record<"solana" | "play" | "ground", string> = {
  solana: solanaShot,
  play: playShot,
  ground: groundShot,
};

const Art = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
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
