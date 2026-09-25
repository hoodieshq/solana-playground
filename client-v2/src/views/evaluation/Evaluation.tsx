import { FC } from "react";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";

import PlaygroundLogoNext from "../../components/PlaygroundLogoNext";
import Pattern from "../deck/Pattern";
import { Headline } from "../deck/Slide";
import { HEADLINE, INK } from "../deck/tokens";
import { LogoPill, NavButton, NavPill, TopBar, frameUnit, u } from "../landing/chrome";
import Rows from "../landing/Rows";
import { useReveal } from "../landing/useReveal";
import agent from "./art/agent.svg";
import magnifier from "./art/magnifier.svg";
import medal from "./art/medal.svg";
import screen from "./art/screen.png";
import { FINDINGS, NEXT } from "./findings";

/**
 * The UX evaluation and what comes next, in the presentation's own style
 * (Figma 55:9358).
 *
 * Three parts, as the Figma sets them. A hero on the deck's ink and pattern:
 * the title arriving letter by letter, the product under a magnifying glass
 * drawn from the mark's own edge. Then the findings, in the rows the landing
 * uses, short — one claim and a sentence or two each. Then a close on the
 * brand gradient naming what we think the design scope should hold next:
 * gamification, agentation, and a design system built agent-first.
 *
 * Sizes in the hero and the close are the Figma's, on its 1920 frame.
 */

interface EvaluationProps {
  onBack: () => void;
  onProduct: () => void;
}

const Evaluation: FC<EvaluationProps> = ({ onBack, onProduct }) => (
  <Page>
    <EvalFonts />

    <Hero>
      <Ground aria-hidden="true">
        <Pattern rest={0.2} restMask={HERO_PATTERN_MASK} />
      </Ground>

      <Top>
        <LogoPill as="div" role="img" aria-label="Solana Playground">
          <PlaygroundLogoNext />
        </LogoPill>
        <NavPill aria-label="Evaluation">
          <NavButton type="button" onClick={onBack}>
            Back to the deck
          </NavButton>
          <NavButton type="button" onClick={onProduct}>
            Open the product
          </NavButton>
        </NavPill>
      </Top>

      <Title>
        <Headline
          lines={["UX Evaluation", "& Next Steps"]}
          light={false}
          scale={188.115 / 216}
          weight={600}
          leading={0.9}
          tracking="-0.02em"
        />
      </Title>

      <Shot aria-hidden="true">
        <img src={screen} alt="" draggable={false} />
      </Shot>
      <Lens aria-hidden="true" />
      <Glass src={magnifier} alt="" aria-hidden="true" draggable={false} />
    </Hero>

    <Findings rows={FINDINGS} />

    <Next />
  </Page>
);

export default Evaluation;

/**
 * The close. The two big marks the Figma draws — a medal and a figure, both
 * cut from the mark's own shapes — each with one line saying what it is, and
 * the design system named above them as what both would stand on.
 */
const Next: FC = () => {
  const [ref, shown] = useReveal<HTMLElement>();
  return (
    <Close ref={ref} $shown={shown}>
      <CloseGrid aria-hidden="true">
        <Pattern fade={0.5} />
      </CloseGrid>

      <Lead>
        <LeadTitle>{NEXT.lead}</LeadTitle>
        <LeadText>{NEXT.system}</LeadText>
      </Lead>

      <MedalBox aria-hidden="true">
        <img src={medal} alt="" draggable={false} />
      </MedalBox>
      <Word style={{ left: u(88), top: u(707.56) }}>Gamification</Word>
      <Caption style={{ left: u(88), top: u(968) }}>{NEXT.gamification}</Caption>

      <Figure src={agent} alt="" aria-hidden="true" draggable={false} />
      <Word style={{ left: u(1084.68), top: u(707.56) }}>Agentation</Word>
      <Sub>Sole</Sub>
      <Caption style={{ left: u(1084.68), top: u(968) }}>{NEXT.agentation}</Caption>
    </Close>
  );
};

/* ── the page ─────────────────────────────────────────────────────────── */

const FACE = `"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
const TEXT = "#EDF1FF";

/* The hero's pattern: across the whole frame, easing off toward the bottom
   where the screenshot takes over */
const HERO_PATTERN_MASK =
  "linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0.7) 45%, rgba(0, 0, 0, 0.25) 100%)";

/* Its faces, loaded by the page itself — it can be opened from a link */
const EvalFonts = createGlobalStyle`
  @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@300;400&family=Stack+Sans+Headline:wght@400..700&display=swap");
`;

const Page = styled.div`
  ${frameUnit}
  position: fixed;
  inset: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: ${INK};
  color: ${TEXT};
  font-family: ${FACE};
`;

const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, 1.25rem, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
`;

const entrance = (delay: number) => css`
  animation: ${rise} 700ms cubic-bezier(0.22, 0.61, 0.24, 1) ${delay}ms both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* ── the hero ─────────────────────────────────────────────────────────── */

const Hero = styled.header`
  position: relative;
  isolation: isolate;
  max-width: 1920px;
  height: ${u(1461)};
  margin: 0 auto;
  padding-top: ${u(54)};
  overflow: hidden;

  @media (max-width: 56rem) {
    height: auto;
    padding-bottom: 3rem;
  }
`;

const Ground = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
`;

const Top = styled(TopBar)`
  ${entrance(120)}
`;

/* The title's block starts 243 down the frame, as the Figma sets it */
const Title = styled.div`
  position: relative;
  z-index: 1;
  margin-top: ${u(131)};
  text-align: center;

  @media (max-width: 56rem) {
    margin-top: 3rem;
  }
`;

/* The product, cropped to its sidebar as the Figma frames it: the full-width
   screenshot at 471% inside a 1314 × 796 window with a hairline edge */
const Shot = styled.div`
  position: absolute;
  z-index: 1;
  left: ${u(606)};
  top: ${u(703)};
  width: ${u(1314)};
  height: ${u(796)};
  border: ${u(1.31)} solid rgba(255, 255, 255, 0.5);
  border-radius: ${u(26.207)};
  overflow: hidden;
  ${entrance(420)}

  & > img {
    position: absolute;
    left: 0;
    top: -18.14%;
    width: 470.93%;
    height: 353.86%;
    max-width: none;
    display: block;
    user-select: none;
  }

  @media (max-width: 56rem) {
    display: none;
  }
`;

/* The glass: a disc that blurs what is under it, exactly where the drawing's
   lens is — so the magnifier reads as looking at the product, not lying on it */
const Lens = styled.div`
  position: absolute;
  z-index: 2;
  left: ${u(653 + 207.398)};
  top: ${u(637 + 88.887)};
  width: ${u(317.194)};
  height: ${u(317.194)};
  border-radius: 50%;
  background: rgba(217, 217, 217, 0.02);
  backdrop-filter: blur(${u(9)});
  -webkit-backdrop-filter: blur(${u(9)});
  ${entrance(640)}

  @media (max-width: 56rem) {
    display: none;
  }
`;

const float = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
  50%      { transform: translate3d(0, -0.6%, 0) rotate(-1.2deg); }
`;

const Glass = styled.img`
  position: absolute;
  z-index: 3;
  left: ${u(653)};
  top: ${u(637)};
  width: ${u(613.811)};
  height: ${u(779.732)};
  display: block;
  user-select: none;
  transform-origin: 60% 32%;
  animation: ${rise} 700ms cubic-bezier(0.22, 0.61, 0.24, 1) 640ms both,
    ${float} 7s ease-in-out 1.4s infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 56rem) {
    display: none;
  }
`;

/* ── the findings ─────────────────────────────────────────────────────── */

const Findings = styled(Rows)`
  padding-top: 9rem;
  padding-bottom: 9rem;
`;

/* ── the close ────────────────────────────────────────────────────────── */

/* The brand gradient as the Figma draws it: periwinkle falling to indigo,
   with Solana's purple pouring in from the top-right corner */
const Close = styled.footer<{ $shown: boolean }>`
  ${({ $shown }) => css`
    position: relative;
    isolation: isolate;
    max-width: 1920px;
    margin: 0 auto;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: radial-gradient(
        ellipse 115% 125% at 100% 0%,
        #9945ff 0%,
        rgba(153, 69, 255, 0.55) 35%,
        rgba(153, 69, 255, 0) 75%
      ),
      linear-gradient(180deg, #95acfa 0%, #1d2072 100%);

    & > :not(:first-child) {
      opacity: ${$shown ? 1 : 0};
    }

    ${$shown &&
    css`
      & > :nth-child(2) {
        ${entrance(0)}
      }
      & > :nth-child(3),
      & > :nth-child(6) {
        ${entrance(120)}
      }
      & > :nth-child(4),
      & > :nth-child(7),
      & > :nth-child(8) {
        ${entrance(260)}
      }
      & > :nth-child(5),
      & > :nth-child(9) {
        ${entrance(380)}
      }
    `}

    @media (prefers-reduced-motion: reduce) {
      & > * {
        opacity: 1;
      }
    }

    @media (max-width: 56rem) {
      aspect-ratio: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 3rem 1.25rem 4rem;

      & > * {
        position: relative !important;
        left: auto !important;
        top: auto !important;
      }
    }
  `}
`;

const CloseGrid = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const Lead = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: ${u(44)};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${u(10)};
  padding: 0 ${u(120)};
  text-align: center;
`;

const LeadTitle = styled.p`
  margin: 0;
  font-family: ${HEADLINE};
  font-size: max(${u(34)}, 1.25rem);
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #ffffff;
`;

const LeadText = styled.p`
  margin: 0;
  max-width: ${u(1500)};
  font-size: max(${u(22)}, 0.9375rem);
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.82);
`;

/* The medal is drawn lying on its side and stood up, as in the Figma */
const MedalBox = styled.div`
  position: absolute;
  left: ${u(316.76)};
  top: ${u(191.56)};
  width: ${u(284.191)};
  height: ${u(488.58)};
  display: flex;
  align-items: center;
  justify-content: center;

  & > img {
    flex: none;
    width: ${u(488.58)};
    height: ${u(284.191)};
    transform: rotate(90deg);
    display: block;
  }
`;

const Figure = styled.img`
  position: absolute;
  left: ${u(1294.3)};
  top: ${u(191.56)};
  width: ${u(284.191)};
  height: ${u(488.58)};
  display: block;
`;

/* Stack Sans at 139 with the Figma's -5% — "normal" leading, which for this
   face is its own 1.3 */
const Word = styled.p`
  position: absolute;
  margin: 0;
  font-family: ${HEADLINE};
  font-size: max(${u(139.072)}, 2.5rem);
  font-weight: 400;
  line-height: 1.3;
  letter-spacing: -0.05em;
  color: #ffffff;
  white-space: nowrap;
`;

const Sub = styled(Word)`
  left: ${u(1348)};
  top: ${u(846.56)};
  font-size: max(${u(84.056)}, 1.5rem);
`;

const Caption = styled.p`
  position: absolute;
  width: ${u(700)};
  margin: 0;
  font-size: max(${u(24)}, 0.9375rem);
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.85);

  @media (max-width: 56rem) {
    width: auto;
  }
`;
