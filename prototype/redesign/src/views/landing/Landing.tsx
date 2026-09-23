import { FC } from "react";
import styled, { css, keyframes } from "styled-components";

/**
 * The landing.
 *
 * Composed like the reference: one cinematic frame that fills the window, the
 * navigation floating in a pill at the top, the name and the line at the
 * bottom left, the call to action beside it, and the argument in a quiet
 * column on the right. Below the fold, three short sections and a close.
 *
 * The hero image is drawn, not photographed — a horizon with a long arc of
 * light sweeping over it, in Solana's purple and green. A stock photograph
 * would be somebody else's picture, and a screenshot of the product would
 * break the one rule this page has: say what it is for, not what it looks
 * like. Nothing here shows the interface.
 */

interface LandingProps {
  /** Into the product */
  onEnter: () => void;
}

const Landing: FC<LandingProps> = ({ onEnter }) => (
  <Page>
    <Hero>
      <HeroArt aria-hidden="true">
        <Sky />
        <Arcs viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="pg-arc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#9945FF" stopOpacity="0" />
              <stop offset="35%" stopColor="#9945FF" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#14F195" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#14F195" stopOpacity="0" />
            </linearGradient>
            <filter id="pg-soft">
              <feGaussianBlur stdDeviation="1.2" />
            </filter>
            <filter id="pg-grain">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.9"
                numOctaves="3"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>

          {/* Eleven ellipses sharing a centre below the horizon: read together
              they are one long sweep of light coming over the edge. */}
          <g filter="url(#pg-soft)">
            {ARCS.map(({ rx, ry, o, w }, i) => (
              <ellipse
                key={i}
                cx="800"
                cy="540"
                rx={rx}
                ry={ry}
                fill="none"
                stroke="url(#pg-arc)"
                strokeWidth={w}
                opacity={o}
              />
            ))}
          </g>
          <Grain width="1600" height="900" filter="url(#pg-grain)" />
        </Arcs>
        <Horizon />
        <Vignette />
      </HeroArt>

      <Nav aria-label="Main">
        <NavMark aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 4v16M4.9 7.5l14.2 9M19.1 7.5l-14.2 9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </NavMark>
        <NavLinks>
          <NavLink href="#what">What it is</NavLink>
          <NavLink href="#how">How it works</NavLink>
          <NavLink href="#who">Who it's for</NavLink>
          <NavLink href="https://solana.com/docs" target="_blank" rel="noreferrer">
            Docs
          </NavLink>
        </NavLinks>
      </Nav>

      <HeroBody>
        <HeroLead>
          <HeroTitle>Solana Playground</HeroTitle>
          <HeroLine>Where a Solana program begins.</HeroLine>
        </HeroLead>

        <HeroAction>
          <Cta type="button" onClick={onEnter}>
            Open Playground
          </Cta>
        </HeroAction>
      </HeroBody>

      <HeroFoot>
        <FootNote>No install. Nothing leaves your browser until you deploy.</FootNote>
        <FootCopy>Solana Playground</FootCopy>
        <FootArgument>
          <p>
            Writing your first on-chain program usually starts with an
            afternoon of toolchains — Rust, the CLI, a local validator, a
            wallet, a faucet. Most people stop there, and never find out
            whether the idea was any good.
          </p>
          <p>
            Playground is the other order. Open a tab, write the program, build
            it, deploy it to devnet, and call it — with an assistant that can
            read what you are looking at. The setup can wait until you have
            something worth setting up for.
          </p>
        </FootArgument>
      </HeroFoot>
    </Hero>

    <Sections>
      <Section id="what">
        <SectionLabel>What it is</SectionLabel>
        <SectionBody>
          <SectionTitle>
            A complete Solana workbench that happens to be a browser tab.
          </SectionTitle>
          <SectionText>
            An editor, a build server, a wallet, a test validator and a deploy
            pipeline, already wired to each other. Nothing to install and
            nothing to configure — the toolchain that usually takes an
            afternoon is simply already there.
          </SectionText>
        </SectionBody>
      </Section>

      <Section id="how">
        <SectionLabel>How it works</SectionLabel>
        <SectionBody>
          <SectionTitle>Write, build, deploy, interact.</SectionTitle>
          <SectionText>
            Four steps, in that order, with the state of each one visible as you
            go. Start from a blank canvas in Anchor, Native or Seahorse, or open
            one of thirty-four real programs and change it. The assistant reads
            the file you are on and the last error you hit, and proposes patches
            you apply yourself.
          </SectionText>
        </SectionBody>
      </Section>

      <Section id="who">
        <SectionLabel>Who it's for</SectionLabel>
        <SectionBody>
          <SectionTitle>
            Anyone whose first question is whether the idea works.
          </SectionTitle>
          <SectionText>
            People learning Solana, who need the first program to run before the
            enthusiasm runs out. Engineers from another chain who want to try
            the model without adopting the tooling. And anyone who already knows
            all of this and just wants somewhere to test a thought.
          </SectionText>
        </SectionBody>
      </Section>
    </Sections>

    <Close>
      <CloseTitle>Start with the program, not the setup.</CloseTitle>
      <Cta type="button" onClick={onEnter}>
        Open Playground
      </Cta>
    </Close>
  </Page>
);

export default Landing;

/* Radii chosen so the gaps between arcs widen toward the outside — the way
   light spreads as it comes over a horizon rather than banding evenly. */
const ARCS = [
  { rx: 260, ry: 74, o: 0.95, w: 1 },
  { rx: 340, ry: 96, o: 0.9, w: 1 },
  { rx: 430, ry: 122, o: 0.82, w: 1.1 },
  { rx: 530, ry: 152, o: 0.74, w: 1.1 },
  { rx: 640, ry: 186, o: 0.66, w: 1.2 },
  { rx: 760, ry: 224, o: 0.56, w: 1.2 },
  { rx: 890, ry: 266, o: 0.46, w: 1.3 },
  { rx: 1030, ry: 312, o: 0.36, w: 1.3 },
  { rx: 1180, ry: 362, o: 0.27, w: 1.4 },
  { rx: 1340, ry: 416, o: 0.19, w: 1.4 },
  { rx: 1510, ry: 474, o: 0.12, w: 1.5 },
];

const FONT = `"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI",
  Helvetica, Arial, sans-serif`;

const INK = "#07070A";
const TEXT = "#F2F2F3";
const MUTED = "#A0A0A6";

const Page = styled.main`
  min-height: 100vh;
  background: ${INK};
  color: ${TEXT};
  font-family: ${FONT};
  overflow-x: hidden;
`;

/* One frame that fills the window, with everything else laid over it. */
const Hero = styled.header`
  position: relative;
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 1.5rem clamp(1.5rem, 5vw, 5rem) clamp(1.5rem, 3vw, 2.5rem);
  isolation: isolate;
`;

const HeroArt = styled.div`
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
`;

const Sky = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(
      120% 80% at 50% 62%,
      #2a1a52 0%,
      #140f2c 42%,
      ${INK} 78%
    ),
    ${INK};
`;

const drift = keyframes`
  from { transform: translate3d(0, 0, 0) scale(1); }
  to   { transform: translate3d(0, -1.2%, 0) scale(1.03); }
`;

const Arcs = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  animation: ${drift} 24s ease-in-out infinite alternate;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Grain = styled.rect`
  opacity: 0.045;
  mix-blend-mode: overlay;
`;

/* The ground: the lower third goes solid so the type has something to sit on
   without a scrim drawn behind each line. */
const Horizon = styled.div`
  position: absolute;
  inset: auto 0 0 0;
  height: 46%;
  background: linear-gradient(to bottom, transparent, ${INK} 62%);
`;

const Vignette = styled.div`
  position: absolute;
  inset: 0;
  background: radial-gradient(
    120% 90% at 50% 40%,
    transparent 40%,
    rgba(7, 7, 10, 0.55) 100%
  );
`;

const Nav = styled.nav`
  justify-self: center;
  display: flex;
  align-items: center;
  gap: clamp(1rem, 2.5vw, 2rem);
  padding: 0.625rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(12, 12, 18, 0.45);
  backdrop-filter: blur(14px);
`;

const NavMark = styled.span`
  display: flex;
  width: 1.25rem;
  height: 1.25rem;
  color: ${TEXT};

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: clamp(1rem, 2.2vw, 1.75rem);

  @media (max-width: 40rem) {
    display: none;
  }
`;

const NavLink = styled.a`
  color: ${MUTED};
  font-size: 0.9375rem;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s ease;

  &:hover {
    color: ${TEXT};
  }
`;

const HeroBody = styled.div`
  align-self: end;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
  padding-bottom: clamp(1.5rem, 4vw, 3rem);
`;

const HeroLead = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const HeroTitle = styled.h1`
  margin: 0;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 500;
  line-height: 1.02;
  letter-spacing: -0.03em;
`;

const HeroLine = styled.p`
  margin: 0;
  font-size: clamp(1.25rem, 2.4vw, 1.875rem);
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -0.015em;
  color: ${MUTED};
`;

const HeroAction = styled.div`
  padding-bottom: 0.5rem;
`;

/* The gradient lives on the stroke here too, the same rule the product keeps:
   the brand marks the thing you are meant to act on, and nothing else. */
const Cta = styled.button`
  height: 3rem;
  padding: 0 1.75rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: linear-gradient(rgba(12, 12, 18, 0.5), rgba(12, 12, 18, 0.5))
      padding-box,
    linear-gradient(120deg, #9945ff, #14f195) border-box;
  backdrop-filter: blur(14px);
  color: ${TEXT};
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    background: linear-gradient(rgba(28, 28, 40, 0.6), rgba(28, 28, 40, 0.6))
        padding-box,
      linear-gradient(120deg, #9945ff, #14f195) border-box;
  }

  &:focus-visible {
    outline: 2px solid #14f195;
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const HeroFoot = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: start;
  gap: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.9375rem;
  color: ${MUTED};

  @media (max-width: 60rem) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
`;

const FootNote = styled.p`
  margin: 0;
`;

const FootCopy = styled.p`
  margin: 0;
`;

const FootArgument = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 34rem;

  & p {
    margin: 0;
    line-height: 1.55;
  }
`;

const Sections = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 76rem;
  margin: 0 auto;
  padding: clamp(4rem, 12vh, 9rem) clamp(1.5rem, 5vw, 5rem);
`;

/* A label in the left column and the argument in the right, with a hairline
   over each — the spacing does the separating, not boxes. */
const Section = styled.section`
  display: grid;
  grid-template-columns: 14rem 1fr;
  gap: clamp(1.5rem, 5vw, 4rem);
  padding: clamp(2.5rem, 6vh, 4.5rem) 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  &:first-child {
    border-top: none;
    padding-top: 0;
  }

  @media (max-width: 52rem) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const SectionLabel = styled.h2`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 500;
  color: ${MUTED};
`;

const SectionBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
`;

const SectionTitle = styled.p`
  margin: 0;
  font-size: clamp(1.5rem, 3vw, 2.125rem);
  font-weight: 500;
  line-height: 1.22;
  letter-spacing: -0.02em;
`;

const SectionText = styled.p`
  margin: 0;
  font-size: 1.0625rem;
  line-height: 1.6;
  color: ${MUTED};
`;

const Close = styled.footer`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: clamp(4rem, 14vh, 10rem) 1.5rem clamp(5rem, 16vh, 11rem);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
`;

const CloseTitle = styled.p`
  margin: 0;
  max-width: 24ch;
  font-size: clamp(1.75rem, 4vw, 3rem);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -0.025em;
`;
