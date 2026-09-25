import { FC, MouseEvent } from "react";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";

import PlaygroundLogoNext from "../../components/PlaygroundLogoNext";
import PlayRing from "../../components/PlayRing";
import { StillMesh } from "../deck/Atmosphere";
import appShot from "../deck/art/brand-app.png";
import Pattern from "../deck/Pattern";
import { Headline } from "../deck/Slide";
import { HEADLINE, INK } from "../deck/tokens";
import { useReveal } from "./useReveal";

/**
 * The landing, built from the presentation (Figma 53:7077).
 *
 * Not a page that resembles the deck — a page made of its parts. The line is
 * the deck's own headline component, arriving letter by letter the way it
 * does on the slides. The ground is the deck's ink with the deck's pattern,
 * lit by the pointer. The close is the deck's "Explore" gradient, breathing.
 * The button is the one the brand slides show, doing the job it was drawn for.
 * Text is set in Inter, as the presentation sets its text.
 *
 * Everything the old landing had of its own — the slabs, the pixel wipe, the
 * sections pixelating in — is gone. It was a different piece of work, and on
 * the presentation's ink it read as clutter.
 *
 * Sizes in the hero and the close are the Figma's, on its 1920 frame, in one
 * unit (`--u`) that scales with the window up to that width.
 */

interface LandingProps {
  /** Into the product */
  onEnter: () => void;
}

/* In-page links must not touch the URL: the app reads its hash to decide what
   to show, and "#what" would take the reader off the landing entirely. */
const scrollTo = (id: string) => (ev: MouseEvent) => {
  ev.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const Landing: FC<LandingProps> = ({ onEnter }) => (
  <Page id="landing-top">
    <LandingFonts />

    <Hero>
      <Ground aria-hidden="true">
        <Pattern rest={0.2} restMask={HERO_PATTERN_MASK} />
      </Ground>

      <Top>
        <LogoPill href="#landing-top" onClick={scrollTo("landing-top")} aria-label="Solana Playground">
          <PlaygroundLogoNext />
        </LogoPill>
        <NavPill aria-label="Main">
          <NavLink href="#what" onClick={scrollTo("what")}>
            What it is
          </NavLink>
          <NavLink href="#how" onClick={scrollTo("how")}>
            How it works
          </NavLink>
          <NavLink href="#who" onClick={scrollTo("who")}>
            Who it's for
          </NavLink>
          <NavLink href="https://solana.com/docs" target="_blank" rel="noreferrer">
            Docs
          </NavLink>
        </NavPill>
      </Top>

      <Line>
        {/* The deck's line at the Figma's 185.6: 0.86 of the deck's size */}
        <Headline
          lines={["Explore, Learn,", "Build Onchain"]}
          light={false}
          scale={0.86}
          weight={500}
          leading={0.93}
        />
      </Line>

      <Stage>
        <Shot src={appShot} alt="Playground's sidebar and assistant" draggable={false} />
        <Shade />
        <Argument>
          Writing your first onchain program usually starts with an afternoon
          of toolchains — Rust, the CLI, a local validator, a wallet, a faucet.
          Most people stop there and never find out whether the idea was any
          good.
        </Argument>
        <Button type="button" $tone="gradient" onClick={onEnter} data-shot="landing-cta">
          <Label>Open Playground</Label>
          <Icon />
        </Button>
      </Stage>
    </Hero>

    <Sections>
      {SECTIONS.map((section) => (
        <RevealSection key={section.id} {...section} />
      ))}
    </Sections>

    <Close onEnter={onEnter} />
  </Page>
);

export default Landing;

/**
 * One section, rising in as it is reached: the label, the claim and the
 * paragraph each a beat behind the one above — the deck's own entrance.
 */
const RevealSection: FC<SectionCopy> = ({ id, label, title, text }) => {
  const [ref, shown] = useReveal<HTMLElement>();
  return (
    <Section id={id} ref={ref} $shown={shown}>
      <SectionLabel>{label}</SectionLabel>
      <SectionBody>
        <SectionTitle>{title}</SectionTitle>
        <SectionText>{text}</SectionText>
      </SectionBody>
    </Section>
  );
};

/**
 * The close: the deck's "Explore" gradient, pattern and all. Its line is the
 * deck's headline too, and is only put on the page once it is scrolled to, so
 * it arrives letter by letter in front of the reader rather than out of sight.
 */
const Close: FC<{ onEnter: () => void }> = ({ onEnter }) => {
  const [ref, shown] = useReveal<HTMLElement>();
  return (
    <CloseFrame ref={ref}>
      <StillMesh ground="explore" />
      <CloseGrid aria-hidden="true">
        <Pattern />
      </CloseGrid>
      <CloseLine>
        {shown && (
          <Headline
            as="p"
            lines={["Start with the program,", "not the setup."]}
            light={false}
            scale={44.75 / 216}
            weight={400}
            leading={1.2}
          />
        )}
      </CloseLine>
      <CloseAction>
        <Button type="button" $tone="white" onClick={onEnter}>
          <Label>Open Playground</Label>
          <Icon />
        </Button>
      </CloseAction>
    </CloseFrame>
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

/* ── the page ─────────────────────────────────────────────────────────── */

/* Text in Inter, as the presentation sets it — measured off the Figma, where
   it lands within a pixel on every line and Manrope runs four percent wide */
const TEXT_FACE = `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
const ARGUMENT_FACE = `"Stack Sans Text", ${HEADLINE}`;

const TEXT = "#EDF1FF";
const MUTED = "rgba(237, 241, 255, 0.66)";

/* Where the hero's own pattern is: brightest in the top-left corner, still
   there across the top, gone by the foot of the headline. Read off the render
   — the grid round the window's corner lower down is the product shot's own. */
const HERO_PATTERN_MASK =
  "radial-gradient(ellipse 170% 42% at 0% 0%, #000 0%, transparent 100%)";

/** A length on the Figma's 1920 frame, in the window's pixels */
const u = (n: number) => `calc(${n} * var(--u))`;

/* The page's faces, loaded by the page itself — it can be opened straight
   from a link, without the deck having loaded them first. A global rule,
   because an @import nested inside a component's styles is dropped. */
const LandingFonts = createGlobalStyle`
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400&family=Stack+Sans+Headline:wght@400..700&family=Stack+Sans+Text:wght@400..700&display=swap");
`;

const Page = styled.main`
  --u: calc(min(100vw, 1920px) / 1920);
  min-height: 100vh;
  background: ${INK};
  color: ${TEXT};
  font-family: ${TEXT_FACE};
  overflow-x: hidden;
`;

/* The deck's entrance: a short rise on its curve, each thing a beat behind */
const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, 0.9rem, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
`;

const entrance = (delay: number) => css`
  animation: ${rise} 620ms cubic-bezier(0.22, 0.61, 0.24, 1) ${delay}ms both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* ── the hero ─────────────────────────────────────────────────────────── */

const Hero = styled.header`
  position: relative;
  isolation: isolate;
  max-width: 1920px;
  margin: 0 auto;
  padding-top: ${u(54)};
`;

const Ground = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
`;

/* The two pills, pinned to the corners: the lockup on the left, the
   navigation on the right. */
const Top = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${u(58)} 0 ${u(80)};
  ${entrance(120)}
`;

const pill = css`
  display: flex;
  align-items: center;
  height: max(${u(57)}, 2.5rem);
  border-radius: max(${u(20)}, 0.875rem);
  background: #ffffff;
`;

const LogoPill = styled.a`
  ${pill}
  padding: 0 max(${u(24)}, 0.875rem);
  color: ${INK};

  & > svg {
    width: max(${u(189)}, 7.5rem);
    height: auto;
    display: block;
  }

  &:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 3px;
  }
`;

const NavPill = styled.nav`
  ${pill}
  gap: max(${u(31)}, 1rem);
  padding: 0 max(${u(25)}, 1rem);

  @media (max-width: 40rem) {
    display: none;
  }
`;

const NavLink = styled.a`
  color: rgba(11, 11, 22, 0.66);
  font-family: ${HEADLINE};
  font-size: max(${u(22.7)}, 0.9375rem);
  font-weight: 500;
  letter-spacing: -0.01em;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s ease;

  &:hover {
    color: #0b0b16;
  }

  &:focus-visible {
    outline: 2px solid ${INK};
    outline-offset: 4px;
    border-radius: 4px;
  }
`;

/* Where the line sits: its block starts 240 down the frame, so its first
   baseline lands where the Figma's does */
const Line = styled.div`
  position: relative;
  z-index: 1;
  margin-top: ${u(129)};
  text-align: center;
`;

/* The product, the argument over it, and the button across it — one piece,
   laid out on the render's own proportions. */
const Stage = styled.div`
  position: relative;
  z-index: 1;
  width: ${u(1779)};
  margin: 0 auto;
  aspect-ratio: 3840 / 2160;
  ${entrance(520)}

  @media (max-width: 56rem) {
    width: calc(100% - 2rem);
    aspect-ratio: auto;
  }
`;

/* The render from the brand slides, as the Figma places it: 1779 wide, so the
   window's own border lands where the design has it. */
const Shot = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  user-select: none;

  @media (max-width: 56rem) {
    position: relative;
    height: auto;
  }
`;

/* The render goes to ink on the right, where the argument sits over it, and
   into the page at the bottom, below the button. */
const Shade = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
      90deg,
      rgba(21, 21, 21, 0) 50%,
      rgba(21, 21, 21, 0.88) 72%,
      rgba(21, 21, 21, 0.94) 100%
    ),
    linear-gradient(to bottom, rgba(21, 21, 21, 0) 76%, ${INK} 99%);

  @media (max-width: 56rem) {
    display: none;
  }
`;

const Argument = styled.p`
  position: absolute;
  left: ${(930 / 1779) * 100}%;
  top: ${u(234)};
  width: ${u(800)};
  margin: 0;
  font-family: ${ARGUMENT_FACE};
  font-size: ${u(35.8)};
  font-weight: 500;
  line-height: ${u(38)};
  color: rgba(237, 241, 255, 0.72);

  @media (max-width: 56rem) {
    position: static;
    width: auto;
    margin: 1.25rem 0;
    font-size: 1.0625rem;
    line-height: 1.5;
  }
`;

/* ── the button ───────────────────────────────────────────────────────── */

/* The one the brand slides show as "Start Tutorial": Solana's green into its
   purple, sampled off the render, the words in the headline face at 171.6 and
   the mark's own triangle in a ring. The white one closes the page. */
const Button = styled.button<{ $tone: "gradient" | "white" }>`
  ${({ $tone }) => css`
    position: absolute;
    left: 0;
    top: ${u(603)};
    width: 100%;
    height: ${u(298)};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 ${u(75)} 0 ${u(80)};
    border: none;
    border-radius: ${u(70)};
    background: ${$tone === "gradient"
      ? `linear-gradient(0deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0) 55%),
         linear-gradient(90deg, #19C98C 0%, #22AA86 6.8%, #339794 13%, #4685A2 19%,
           #5673B0 25%, #6762BF 31.5%, #794FCD 37.8%, #8542D7 44%, #8845DA 56%,
           #8E4BE0 100%)`
      : "#ffffff"};
    color: ${$tone === "gradient" ? "#ffffff" : INK};
    font-family: ${HEADLINE};
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.22, 0.61, 0.36, 1),
      filter 0.2s ease;

    /* Figma's smoothed corner where the browser can draw one */
    @supports (corner-shape: squircle) {
      border-radius: ${u(96)};
      corner-shape: squircle;
    }

    &:hover {
      transform: translateY(${u(-3)});
      filter: brightness(1.05);
    }

    &:active {
      transform: translateY(0);
    }

    &:focus-visible {
      outline: 3px solid ${$tone === "gradient" ? "#ffffff" : INK};
      outline-offset: ${u(8)};
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }

    @media (max-width: 56rem) {
      position: relative;
      top: auto;
      height: 5.5rem;
      padding: 0 1.25rem 0 1.5rem;
      border-radius: 1.5rem;
    }
  `}
`;

const Label = styled.span`
  font-size: ${u(171.6)};
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.015em;
  white-space: nowrap;

  @media (max-width: 56rem) {
    font-size: 2rem;
  }
`;

const Icon = styled(PlayRing)`
  width: ${u(210)};
  height: ${u(210)};
  flex-shrink: 0;

  @media (max-width: 56rem) {
    width: 3.25rem;
    height: 3.25rem;
  }
`;

/* ── the sections ─────────────────────────────────────────────────────── */

const Sections = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 76rem;
  margin: 0 auto;
  padding: ${u(121)} clamp(1.5rem, 5vw, 5rem) ${u(144)};
`;

/* A label in the left column and the argument in the right, with a hairline
   between each — the spacing does the separating, not boxes. The copy column
   starts at 720 on the 1920 frame. */
const Section = styled.section<{ $shown: boolean }>`
  ${({ $shown }) => css`
    display: grid;
    grid-template-columns: 14rem 1fr;
    gap: 4rem;
    padding: 4.75rem 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);

    &:first-child {
      border-top: none;
      padding-top: 0;
    }

    & > *,
    & > * > * {
      opacity: ${$shown ? 1 : 0};
    }

    ${$shown &&
    css`
      & > h2 {
        ${entrance(0)}
      }
      & > div > :nth-child(1) {
        ${entrance(90)}
      }
      & > div > :nth-child(2) {
        ${entrance(200)}
      }
    `}

    @media (prefers-reduced-motion: reduce) {
      & > *,
      & > * > * {
        opacity: 1;
      }
    }

    @media (max-width: 52rem) {
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 3rem 0;
    }
  `}
`;

const SectionLabel = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.4;
  color: ${MUTED};
`;

const SectionBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 40rem;
`;

const SectionTitle = styled.p`
  margin: 0;
  font-size: clamp(1.625rem, 3vw, 2.28rem);
  font-weight: 300;
  line-height: 1.12;
`;

const SectionText = styled.p`
  margin: 0;
  font-size: 1.175rem;
  line-height: 1.46;
  color: ${MUTED};
`;

/* ── the close ────────────────────────────────────────────────────────── */

/* A full 1920 × 1080 frame on the deck's gradient, with the white button — the
   last thing on the page is the first thing the deck said. */
const CloseFrame = styled.footer`
  position: relative;
  isolation: isolate;
  max-width: 1920px;
  margin: 0 auto;
  aspect-ratio: 16 / 9;
  overflow: hidden;

  @media (max-width: 56rem) {
    aspect-ratio: auto;
    padding: 4rem 1rem 5rem;
  }
`;

const CloseGrid = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

/* The block starts 161 down the frame so its first line's ink lands at 170;
   held open before the line arrives, so nothing below moves when it does */
const CloseLine = styled.div`
  position: relative;
  padding-top: ${u(161)};
  min-height: calc(${u(161)} + ${u(44.75 * 1.2 * 2)});
  text-align: center;
  color: ${TEXT};

  & > p {
    color: ${TEXT};
    letter-spacing: -0.01em;
  }

  @media (max-width: 56rem) {
    padding-top: 0;
    min-height: 0;

    & > p {
      font-size: 1.75rem;
    }
  }
`;

const CloseAction = styled.div`
  position: absolute;
  left: 50%;
  top: 0;
  width: ${u(1779)};
  height: 100%;
  transform: translateX(-50%);
  pointer-events: none;

  & > button {
    top: ${u(391)};
    pointer-events: auto;
  }

  @media (max-width: 56rem) {
    position: relative;
    left: auto;
    width: 100%;
    height: auto;
    margin-top: 2rem;
    transform: none;
  }
`;
