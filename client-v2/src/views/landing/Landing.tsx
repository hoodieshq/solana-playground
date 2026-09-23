import { FC } from "react";
import styled, { css, keyframes } from "styled-components";

import HeroCanvas from "./HeroCanvas";
import PixelIn from "./PixelIn";
import PixelReveal from "./PixelReveal";
import PlaygroundMark from "../../components/PlaygroundMark";
import { useReveal } from "./useReveal";

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

const Landing: FC<LandingProps> = ({ onEnter }) => {
  return (
  <Page>
    <Hero>
      {/* Sky and pieces share one canvas so the dither lands on both. It takes
          the pointer: the pieces are meant to be shoved around. */}
      <HeroArt>
        <HeroCanvas />
        <Grid />
        <Fade />
      </HeroArt>
      <PixelReveal />

      <Nav aria-label="Main">
        <NavMark aria-hidden="true">
          <PlaygroundMark />
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
          <Cta type="button" onClick={onEnter} data-shot="landing-cta">
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
      {SECTIONS.map((section) => (
        <RevealSection key={section.id} {...section} />
      ))}
    </Sections>

    <Close>
      <CloseTitle>Start with the program, not the setup.</CloseTitle>
      <CtaOutline type="button" onClick={onEnter}>
        Open Playground
      </CtaOutline>
    </Close>
  </Page>
  );
};

export default Landing;

/**
 * One section, arriving as it is scrolled to: the label, the claim and the
 * paragraph each a beat behind the one above, so the eye is led down the
 * column rather than handed the whole block at once.
 */
const RevealSection: FC<SectionCopy> = ({ id, label, title, text }) => {
  const [ref, shown] = useReveal<HTMLElement>();
  return (
    <Section id={id} ref={ref}>
      <PixelIn active={shown} block={10}>
        <SectionLabel>{label}</SectionLabel>
      </PixelIn>
      <SectionBody>
        <PixelIn active={shown} delay={0.08} block={16}>
          <SectionTitle>{title}</SectionTitle>
        </PixelIn>
        <PixelIn active={shown} delay={0.2} block={11}>
          <SectionText>{text}</SectionText>
        </PixelIn>
      </SectionBody>
    </Section>
  );
};

interface SectionCopy {
  id: string;
  label: string;
  title: string;
  text: string;
}

const SECTIONS: SectionCopy[] = [
  {
    id: "what",
    label: "What it is",
    title: "A complete Solana workbench that happens to be a browser tab.",
    text: "An editor, a build server, a wallet, a test validator and a deploy pipeline, already wired to each other. Nothing to install and nothing to configure — the toolchain that usually takes an afternoon is simply already there.",
  },
  {
    id: "how",
    label: "How it works",
    title: "Write, build, deploy, interact.",
    text: "Four steps, in that order, with the state of each one visible as you go. Start from a blank canvas in Anchor, Native or Seahorse, or open one of thirty-four real programs and change it. The assistant reads the file you are on and the last error you hit, and proposes patches you apply yourself.",
  },
  {
    id: "who",
    label: "Who it's for",
    title: "Anyone whose first question is whether the idea works.",
    text: "People learning Solana, who need the first program to run before the enthusiasm runs out. Engineers from another chain who want to try the model without adopting the tooling. And anyone who already knows all of this and just wants somewhere to test a thought.",
  },
];

const FONT = `"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI",
  Helvetica, Arial, sans-serif`;

/* Read off the poster: an ice periwinkle at the top falling to a deep indigo,
   on a black page. The same four the brand board carries. */
const INK = "#050507";
const ICE = "#C9D4FB";
const INDIGO = "#1E1B8C";
const TEXT = "#EDF1FF";
const MUTED = "rgba(237, 241, 255, 0.66)";

const Page = styled.main`
  min-height: 100vh;
  background: ${INK};
  color: ${TEXT};
  font-family: ${FONT};
  overflow-x: hidden;
`;

/* One frame that fills the window, with everything else laid over it. */
/* Everything arrives after the wipe has opened the middle of the frame, in
   reading order, each a beat behind the last. */
const rise = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
`;

const entrance = (delay: number) => css`
  opacity: 0;
  animation: ${rise} 0.7s cubic-bezier(0.22, 0.61, 0.36, 1) ${delay}s both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`;

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
  z-index: 0;
  overflow: hidden;
  background: ${INK};
`;

/* A surveyor's grid, not a graph: long faint rules with a tick where they
   cross, which is the thing that makes the poster read as a record of
   something rather than a wallpaper. */
const Grid = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.22;
  background-image: linear-gradient(
      to right,
      rgba(255, 255, 255, 0.5) 1px,
      transparent 1px
    ),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.5) 1px, transparent 1px);
  background-size: 11.5% 15%;
  mask-image: radial-gradient(120% 90% at 50% 40%, #000 30%, transparent 85%);
`;

/* The bottom of the frame goes to the page colour, so the hero ends rather
   than being cut off by the fold — and on the way it gives the headline and
   the argument ground to sit on. Without it the glyphs drift straight through
   the body copy, which looks like a poster and reads like nothing. It falls to
   indigo before black, so the colour survives the protection. */
const Fade = styled.div`
  position: absolute;
  inset: auto 0 0 0;
  pointer-events: none;
  height: 58%;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(12, 10, 58, 0.55) 34%,
    rgba(7, 6, 32, 0.88) 62%,
    ${INK} 100%
  );
`;

const Nav = styled.nav`
  position: relative;
  z-index: 2;
  ${entrance(0.55)}
  justify-self: center;
  display: flex;
  align-items: center;
  gap: clamp(1rem, 2.5vw, 2rem);
  padding: 0.625rem 1.5rem;
  border: none;
  border-radius: 999px;
  background: #ffffff;
  color: #0b0b16;
`;

const NavMark = styled.span`
  display: flex;
  /* The mark is 342×184, so it takes its width and finds its own height */
  width: 1.75rem;
  color: #0b0b16;

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
  color: rgba(11, 11, 22, 0.66);
  font-size: 0.9375rem;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s ease;

  &:hover {
    color: #0b0b16;
  }
`;

const HeroBody = styled.div`
  position: relative;
  z-index: 2;
  /* The pieces live under this and are meant to be picked up; a full-width
     text container over them would swallow every drag. Only what is actually
     interactive takes the pointer back. */
  pointer-events: none;

  & button,
  & a {
    pointer-events: auto;
  }
  align-self: end;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
  padding-bottom: clamp(1.5rem, 4vw, 3rem);
`;

const HeroLead = styled.div`
  ${entrance(0.72)}
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const HeroTitle = styled.h1`
  margin: 0;
  font-size: clamp(2.5rem, 6vw, 4.75rem);
  font-weight: 300;
  line-height: 1.02;
  letter-spacing: -0.03em;
`;

const HeroLine = styled.p`
  margin: 0;
  font-size: clamp(1.25rem, 2.4vw, 1.875rem);
  font-weight: 300;
  line-height: 1.2;
  letter-spacing: -0.015em;
  color: ${MUTED};
`;

const HeroAction = styled.div`
  ${entrance(0.86)}
  padding-bottom: 0.5rem;
`;

/* White. It is the one thing on the page to press, and on a blue field the
   brightest thing is the one you press. */
const Cta = styled.button`
  height: 3rem;
  padding: 0 1.75rem;
  border: none;
  border-radius: 999px;
  background: #ffffff;
  color: #0b0b16;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    background: #eef1ff;
  }

  &:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* The closing one is the same shape drawn in outline — the gradient on the
   stroke, the way the product marks what is current. A second solid white
   button at the end of the page would read as a second first choice. */
const CtaOutline = styled.button`
  height: 3rem;
  padding: 0 1.75rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: linear-gradient(${INK}, ${INK}) padding-box,
    linear-gradient(120deg, #9945ff, #14f195) border-box;
  color: ${TEXT};
  font-family: inherit;
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    background: linear-gradient(#14131f, #14131f) padding-box,
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
  position: relative;
  z-index: 2;
  /* The pieces live under this and are meant to be picked up; a full-width
     text container over them would swallow every drag. Only what is actually
     interactive takes the pointer back. */
  pointer-events: none;

  & button,
  & a {
    pointer-events: auto;
  }
  ${entrance(0.98)}
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
  font-weight: 400;
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
  font-weight: 300;
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
  font-weight: 300;
  line-height: 1.12;
  letter-spacing: -0.025em;
`;
