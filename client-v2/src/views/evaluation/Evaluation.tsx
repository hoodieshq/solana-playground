import { FC } from "react";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";

import PlaygroundLogoNext from "../../components/PlaygroundLogoNext";
import BuildHero from "../deck/BuildHero";
import type { BuildStep } from "../deck/BuildHero";
import Pattern from "../deck/Pattern";
import { HEADLINE, INK } from "../deck/tokens";
import {
  LogoPill,
  NavButton,
  NavPill,
  TopBar,
  frameUnit,
  u,
} from "../landing/chrome";
import Statements from "../landing/Statements";
import { useReveal } from "../landing/useReveal";
import agent from "./art/agent.svg";
import magnifier from "./art/magnifier.svg";
import medal from "./art/medal.svg";
import screen from "./art/screen.png";
import { DESIGN_SUMMARY, FINDINGS, SYSTEM_LINE } from "./findings";

/**
 * The UX evaluation and what comes next, as the presentation would say it
 * (Figma 55:9358).
 *
 * The title builds the way the deck's slides 7 to 9 build their line, played
 * through on its own: "UX Evaluation" on the mark's violet, then "& Next
 * Steps" arriving as the ground settles into ink. Then the product under a
 * magnifying glass drawn from the mark's own edge; five findings, a claim and
 * a line each, most of a screen apiece; and a close on the brand gradient
 * with what we think the design scope should hold next.
 */

interface EvaluationProps {
  onBack: () => void;
  onProduct: () => void;
}

const STEPS: BuildStep[] = [
  { lines: ["UX Evaluation"], ground: "deep" },
  { lines: ["UX Evaluation", "& Next Steps"], ground: "ink" },
];

const Evaluation: FC<EvaluationProps> = ({ onBack, onProduct }) => (
  <Page>
    <EvalFonts />

    {/* The Figma's title: Stack Sans SemiBold at 188 on the 1920 frame, -2% */}
    <Hero
      steps={STEPS}
      hold={1700}
      scale={188.115 / 216}
      weight={600}
      leading={0.9}
      tracking="-0.02em"
    >
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
    </Hero>

    <Inspect />

    <Summary />

    <Statements items={FINDINGS} />

    <Next />
  </Page>
);

export default Evaluation;

/**
 * The product under the glass, rising in as it is reached. The lens blurs
 * what it sits on, so the magnifier reads as looking at the product rather
 * than lying on top of it.
 */
const Inspect: FC = () => {
  const [ref, shown] = useReveal<HTMLDivElement>();
  return (
    <InspectFrame ref={ref} aria-hidden="true">
      <Shot $shown={shown}>
        <img src={screen} alt="" draggable={false} />
      </Shot>
      <Lens $shown={shown} />
      <Glass $shown={shown} src={magnifier} alt="" draggable={false} />
    </InspectFrame>
  );
};

/**
 * What was done, in two plain paragraphs — the page's one stretch of reading,
 * set like a letter rather than a slide, rising in once it is reached.
 */
const Summary: FC = () => {
  const [ref, shown] = useReveal<HTMLElement>();
  return (
    <SummaryFrame ref={ref} aria-labelledby="design-summary">
      <SummaryTitle id="design-summary" $shown={shown}>
        What we have done
      </SummaryTitle>
      {DESIGN_SUMMARY.map((paragraph, i) => (
        <SummaryText key={i} $shown={shown} $delay={160 + i * 140}>
          {paragraph}
        </SummaryText>
      ))}
    </SummaryFrame>
  );
};

/**
 * The close: the two marks the Figma draws — a medal and a figure, both cut
 * from the mark's own shapes — and one line naming what both stand on.
 */
const Next: FC = () => {
  const [ref, shown] = useReveal<HTMLElement>();
  return (
    <Close ref={ref} $shown={shown}>
      <CloseGrid aria-hidden="true">
        <Pattern />
      </CloseGrid>

      <MedalBox aria-hidden="true">
        <img src={medal} alt="" draggable={false} />
      </MedalBox>
      <Word style={{ left: u(88), top: u(707.56) }}>Gamification</Word>

      <Figure src={agent} alt="" aria-hidden="true" draggable={false} />
      <Word style={{ left: u(1084.68), top: u(707.56) }}>Agentation</Word>
      <Sub>Sole</Sub>

      <SystemLine>{SYSTEM_LINE}</SystemLine>
    </Close>
  );
};

/* ── the page ─────────────────────────────────────────────────────────── */

const TEXT = "#EDF1FF";

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
  font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
`;

const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, 1.5rem, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
`;

const arrive = (delay: number) => css`
  animation: ${rise} 760ms cubic-bezier(0.22, 0.61, 0.24, 1) ${delay}ms both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* ── the hero ─────────────────────────────────────────────────────────── */

const Hero = styled(BuildHero)`
  padding-top: ${u(54)};
`;

const Top = styled(TopBar)`
  ${arrive(120)}
`;

/* ── the product, looked at ───────────────────────────────────────────── */

/* The Figma's composition, given a screen of its own: the screenshot framed
   to the sidebar, the glass over it. Positions are the Figma's, lifted up
   the frame by the height the title used to share with them. */
const InspectFrame = styled.div`
  position: relative;
  max-width: 1920px;
  height: ${u(1000)};
  margin: ${u(80)} auto 0;
  overflow: hidden;

  @media (max-width: 56rem) {
    display: none;
  }
`;

/* Hidden until reached, then risen in — each piece on its own beat */
const reveal = (shown: boolean, delay: number) => css`
  opacity: ${shown ? 1 : 0};
  ${shown && arrive(delay)}

  @media (prefers-reduced-motion: reduce) {
    opacity: 1;
  }
`;

/* The full-width screenshot at 471% inside a 1314 × 796 window with a
   hairline edge, so only the sidebar shows */
const Shot = styled.div<{ $shown: boolean }>`
  ${({ $shown }) => reveal($shown, 0)}
  position: absolute;
  left: ${u(606)};
  top: ${u(110)};
  width: ${u(1314)};
  height: ${u(796)};
  border: ${u(1.31)} solid rgba(255, 255, 255, 0.5);
  border-radius: ${u(26.207)};
  overflow: hidden;

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
`;

const Lens = styled.div<{ $shown: boolean }>`
  ${({ $shown }) => reveal($shown, 260)}
  position: absolute;
  left: ${u(653 + 207.398)};
  top: ${u(44 + 88.887)};
  width: ${u(317.194)};
  height: ${u(317.194)};
  border-radius: 50%;
  background: rgba(217, 217, 217, 0.02);
  backdrop-filter: blur(${u(9)});
  -webkit-backdrop-filter: blur(${u(9)});
`;

const float = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
  50%      { transform: translate3d(0, -0.6%, 0) rotate(-1.2deg); }
`;

const Glass = styled.img<{ $shown: boolean }>`
  ${({ $shown }) => css`
    position: absolute;
    left: ${u(653)};
    top: ${u(44)};
    width: ${u(613.811)};
    height: ${u(779.732)};
    display: block;
    user-select: none;
    transform-origin: 60% 32%;
    opacity: ${$shown ? 1 : 0};

    /* It rises in with the lens, then hovers — a glass held, not placed */
    ${$shown &&
    css`
      animation: ${rise} 760ms cubic-bezier(0.22, 0.61, 0.24, 1) 260ms both,
        ${float} 7s ease-in-out 1.4s infinite;
    `}

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      opacity: 1;
    }
  `}
`;

/* ── what was done ────────────────────────────────────────────────────── */

const SummaryFrame = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  width: min(44rem, calc(100% - 3rem));
  margin: 0 auto;
  padding: clamp(5rem, 12vh, 9rem) 0 clamp(3rem, 8vh, 6rem);
`;

const SummaryTitle = styled.h2<{ $shown: boolean }>`
  ${({ $shown }) => css`
    margin: 0 0 0.5rem;
    font-family: ${HEADLINE};
    font-size: clamp(1.75rem, 3vw, 2.75rem);
    font-weight: 500;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: #ffffff;
    ${reveal($shown, 0)}
  `}
`;

const SummaryText = styled.p<{ $shown: boolean; $delay: number }>`
  ${({ $shown, $delay }) => css`
    margin: 0;
    font-size: clamp(1rem, 1.2vw, 1.1875rem);
    font-weight: 300;
    line-height: 1.7;
    color: rgba(237, 241, 255, 0.78);
    ${reveal($shown, $delay)}
  `}
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
      & > :nth-child(2),
      & > :nth-child(4) {
        ${arrive(0)}
      }
      & > :nth-child(3),
      & > :nth-child(5),
      & > :nth-child(6) {
        ${arrive(180)}
      }
      & > :nth-child(7) {
        ${arrive(420)}
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
      align-items: center;
      gap: 1.5rem;
      padding: 3rem 1.25rem 4rem;
      text-align: center;

      & > :not(:first-child) {
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

const SystemLine = styled.p`
  position: absolute;
  left: 0;
  right: 0;
  top: ${u(990)};
  margin: 0;
  padding: 0 ${u(120)};
  font-size: max(${u(24)}, 0.9375rem);
  line-height: 1.45;
  text-align: center;
  color: rgba(255, 255, 255, 0.85);
`;
