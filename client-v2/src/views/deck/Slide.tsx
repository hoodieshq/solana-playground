import { FC, memo } from "react";
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
import { useCarry } from "./carry";
import { Headline } from "./Headline";
import Plan, { isPlan } from "./Plan";
import SolanaMark from "./SolanaMark";
import { isLight } from "./slides";
import type { Exit, Shot, SlideSpec } from "./slides";
import { HEADLINE, INK, PAPER } from "./tokens";

/* The deck's line lives in its own file so the roadmap's slides can set their
   headings with it too; the landing still imports it from here */
export { Headline };

/** The five brand renders, so the deck can fetch them before they are needed */
export const SHOTS: Record<Shot, string> = {
  keyboard: keyboardShot,
  app: appShot,
  tutorial: tutorialShot,
  tee: teeShot,
  home: homeShot,
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
    return (
      <Picture src={SHOTS[slide.shot]} alt={slide.alt} draggable={false} />
    );
  }

  /* The roadmap's slides lay themselves out on a frame of their own */
  if (isPlan(slide)) return <Plan slide={slide} light={light} />;

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
          {slide.note && <Note $light={light}>{slide.note}</Note>}
        </Measure>
      )}

      {slide.kind === "cards" && (
        <Cards>
          {slide.items.map((item, i) => (
            <Card
              key={item.name}
              style={{ animationDelay: `${140 + i * 110}ms` }}
            >
              <Figure>
                {item.glyph === "solana" && (
                  <SolanaArt>
                    <SolanaMark />
                  </SolanaArt>
                )}
                {item.glyph === "play" && <PlayArt src={playShot} alt="" />}
                {item.glyph === "ground" && (
                  <GroundArt src={groundShot} alt="" />
                )}
              </Figure>
              <CardText>
                <CardName>{item.name}</CardName>
                <CardNote>{item.note}</CardNote>
              </CardText>
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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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

/* Laid out on the Figma's own numbers (44:552), in one unit of its 1920 ×
   1080 frame, held by whichever of width or height runs out first: three
   pillars 508 wide, 36 apart, the group sitting 72 below the frame's centre.
   There are no strokes — the pictures stand on the white. The hairline boxes
   that were here were ours, not the slide's. */
const Cards = styled.div`
  --u: min(calc(100vw / 1920), calc(100vh / 1080));
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: calc(36 * var(--u));
  margin-top: calc(144 * var(--u));
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(89 * var(--u));
  width: calc(508 * var(--u));
  animation: ${rise} 620ms cubic-bezier(0.22, 0.61, 0.24, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* Each picture's box, 508 × 510. What is in it is placed the way the Figma
   places it rather than fitted to it. */
const Figure = styled.div`
  position: relative;
  width: 100%;
  height: calc(510 * var(--u));
`;

/* Solana's mark as the vector the slide uses, 273 × 244, centred */
const SolanaArt = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(273.318 * var(--u));
  transform: translate(-50%, -50%);

  & > svg {
    width: 100%;
    height: auto;
    display: block;
  }
`;

/* The controller sits 84 above the centre, so its cable runs out of the top
   of the box. The supplied file is that box exported with the overflow — 593
   tall, 83 of them above — so it is placed with its top 83 above the box
   rather than squeezed into it, which is what had shrunk it before. Multiply,
   as on the slide, so its white is the page's white. */
const PlayArt = styled.img`
  position: absolute;
  left: 0;
  top: calc(-83 * var(--u));
  width: 100%;
  height: calc(593 * var(--u));
  display: block;
  mix-blend-mode: multiply;
`;

/* The earth: the supplied box, 508 × 510, with the 337 globe centred in it */
const GroundArt = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
`;

const CardText = styled.div`
  width: 100%;
  font-family: "Inter", ${HEADLINE};
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.06em;
  text-align: center;
`;

const CardName = styled.div`
  font-size: calc(72 * var(--u));
  color: #000000;
`;

const CardNote = styled.div`
  font-size: calc(22 * var(--u));
  color: rgba(0, 0, 0, 0.4);
`;
