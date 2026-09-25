import {
  FC,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";

import PlaygroundLogoNext from "../../components/PlaygroundLogoNext";
import PlayRing from "../../components/PlayRing";
import { StillMesh } from "../deck/Atmosphere";
/* The product as it is now, shot from the build itself and framed on the
   brand render's geometry, so the crop below still lands on its window */
import productShot from "./art/product-closeup.jpg";
import BuildHero from "../deck/BuildHero";
import type { BuildStep } from "../deck/BuildHero";
import Pattern from "../deck/Pattern";
import { Headline } from "../deck/Slide";
import { HEADLINE, HEADLINE_SIZE, INK } from "../deck/tokens";
import Flight from "./Flight";
import Light, { LIGHT_BELOW } from "./Light";
import Statements from "./Statements";
import type { Statement } from "./Statements";
import VersionSwitch from "./VersionSwitch";
import type { Variant } from "./VersionSwitch";
import { LogoPill, NavLink, NavPill, TopBar, frameUnit, u } from "./chrome";
import { trailLetters } from "./trail";
import { useReveal } from "./useReveal";

/**
 * The landing, as the presentation would say it (Figma 53:7077).
 *
 * It opens the way the deck's slides 7 to 9 do — "Explore", then "Learn,",
 * then "Build Onchain" arriving, words already on screen travelling to make
 * room, the gradient sliding from green to violet and settling into ink — but
 * played through on its own, a screen tall. Once the line has landed it rises
 * a little, the product comes up from the bottom of the screen into the room
 * it leaves, and the button arrives last, cut by the bottom edge so the page
 * plainly goes on. Then three claims, each given most of a screen, and the
 * close on the deck's gradient.
 *
 * Built from the deck's own parts rather than made to resemble them, and kept
 * short: a claim and one quiet line wherever there used to be a paragraph.
 *
 * Two versions, one page. The classic is the above. The trail version keeps
 * every part of it and changes three things: the headline's letters arrive
 * trailing copies of themselves in Solana's ramp; the button is light — the
 * northern lights in the brand's colours — rather than a slab; and the
 * claims, instead of waiting in tall sections, fly at the reader out of depth
 * as they scroll. Everything else — the hero's steps, the product, the close —
 * is literally the same code, so the two cannot drift apart.
 */

interface LandingProps {
  /** Into the product */
  onEnter: () => void;
  /** Which version: the deck's own, or the one whose headlines trail light */
  variant?: Variant;
  /** Switch versions — the switch is shown when this is given */
  onVariant?: (next: Variant) => void;
}

/* The deck's three steps, with its three grounds */
const STEPS: BuildStep[] = [
  { lines: ["Explore"], ground: "explore" },
  { lines: ["Explore, Learn,"], ground: "violet" },
  { lines: ["Explore, Learn,", "Build Onchain"], ground: "ink" },
];

const STATEMENTS: Statement[] = [
  {
    id: "what",
    title: "A complete Solana workbench that happens to be a browser tab.",
    line: "Editor, build server, wallet and test validator — already wired together.",
  },
  {
    id: "how",
    title: "Write, build, deploy, interact.",
    line: "Four steps, in that order, with each one visible as you go.",
  },
  {
    id: "who",
    title: "Anyone whose first question is whether the idea works.",
    line: "People learning Solana, engineers from other chains, anyone testing a thought.",
  },
];

/* In-page links must not touch the URL: the app reads its hash to decide what
   to show, and "#what" would take the reader off the landing entirely. */
const scrollTo = (id: string) => (ev: MouseEvent) => {
  ev.preventDefault();
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
};

/* The first screen, as the hero measures it */
const SCREEN = "max(100vh, 34rem)";

/* How much of the product the first screen shows once it is up: the lower 48%,
   so the render's top sits just past halfway down */
const PEEK = `calc(${SCREEN} * 0.48)`;

/* The line: the deck's, at the Figma's 185.6, two rows of 0.93 */
const LINE = `calc(${HEADLINE_SIZE} * 0.86)`;

/* Clear of the top bar: 54 down, a pill of 57 (never under 2.5rem), and 40 */
const CLEAR = `max(${u(151)}, calc(${u(94)} + 2.5rem))`;

/* How far the line rises once it has landed — enough that its lower row
   clears the product's window by 70 on the 1920 frame (never less than 1.5rem;
   the window starts 64 into the render), and never so far that it runs into
   the top bar */
const LIFT =
  `max(0px, min(calc(0.93 * ${LINE} - 0.02 * ${SCREEN} + max(${u(
    70
  )}, 1.5rem) - ${u(64)}),` +
  ` calc((${SCREEN} - 1.86 * ${LINE}) / 2 - ${CLEAR})))`;

const Landing: FC<LandingProps> = ({
  onEnter,
  variant = "classic",
  onVariant,
}) => {
  const trail = variant === "trail";
  const [up, setUp] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const rise = useCallback(() => setUp(true), []);

  /* A reader who scrolls before the line has finished should find the product
     there, not an empty stage still waiting on the animation */
  useEffect(() => {
    if (up) return;
    const opts = { capture: true, passive: true } as const;
    const events = ["scroll", "wheel", "touchmove"] as const;
    events.forEach((e) => window.addEventListener(e, rise, opts));
    return () =>
      events.forEach((e) => window.removeEventListener(e, rise, opts));
  }, [up, rise]);

  return (
    <Page id="landing-top">
      <LandingFonts />

      {/* The deck's line at the Figma's 185.6: 0.86 of the deck's size */}
      <Hero
        steps={STEPS}
        scale={0.86}
        weight={500}
        leading={0.93}
        onSettled={rise}
        lift={LIFT}
        lifted={up}
        $trail={trail}
      >
        <Top>
          <LogoPill
            href="#landing-top"
            onClick={scrollTo("landing-top")}
            aria-label="Solana Playground"
          >
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
            <NavLink
              href="https://solana.com/docs"
              target="_blank"
              rel="noreferrer"
            >
              Docs
            </NavLink>
          </NavPill>
        </Top>
      </Hero>

      <Product onEnter={onEnter} up={up} trail={trail} />

      {trail ? (
        <Flight items={STATEMENTS} />
      ) : (
        <Statements items={STATEMENTS} />
      )}

      <Close onEnter={onEnter} />

      {onVariant && <VersionSwitch value={variant} onChange={onVariant} />}
    </Page>
  );
};

export default Landing;

/**
 * The product, and the button across it. It waits below the first screen
 * until the line has landed, then comes up into the room the line leaves; the
 * button follows it, held against the bottom edge until scrolling brings it
 * to its place across the render.
 *
 * On the classic, the button is the brand slides' gradient slab, part of it
 * showing — cut by the edge, so the page plainly goes on. On the trail
 * version it is the same words on a cone of light, held whole just above the
 * edge, the light standing on it.
 */
const Product: FC<{ onEnter: () => void; up: boolean; trail: boolean }> = ({
  onEnter,
  up,
  trail,
}) => {
  /* The trail version's light bends round the window and lights its edge */
  const windowRef = useRef<HTMLDivElement>(null);
  return (
    <ProductFrame>
      <Stage $up={up}>
        <Window ref={windowRef}>
          <View>
            <Shot
              src={productShot}
              alt="Playground up close, with the Counter sample open: the sidebar, the assistant and the code"
              draggable={false}
            />
          </View>
        </Window>
        <Shade />
        <Place />
        {trail ? (
          <LightCta
            type="button"
            $up={up}
            onClick={onEnter}
            data-shot="landing-cta"
          >
            <Light on={up} frame={windowRef} />
            <Label>Open Playground</Label>
            <Icon />
          </LightCta>
        ) : (
          <Cta
            type="button"
            $tone="gradient"
            $up={up}
            onClick={onEnter}
            data-shot="landing-cta"
          >
            <Label>Open Playground</Label>
            <Icon />
          </Cta>
        )}
      </Stage>
    </ProductFrame>
  );
};

/**
 * The close: the deck's "Explore" gradient, pattern and all. Its line is the
 * deck's headline too, put on the page once it is scrolled to, so it arrives
 * letter by letter in front of the reader.
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

/* ── the page ─────────────────────────────────────────────────────────── */

const TEXT = "#EDF1FF";

/* The page's faces, loaded by the page itself — it can be opened straight
   from a link, without the deck having loaded them first. A global rule,
   because an @import nested inside a component's styles is dropped. */
const LandingFonts = createGlobalStyle`
  @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@300;400&family=Stack+Sans+Headline:wght@400..700&display=swap");
`;

const Page = styled.main`
  ${frameUnit}
  min-height: 100vh;
  background: ${INK};
  color: ${TEXT};
  font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  /* Clip, not hidden: hidden would make the page its own scroller, and the
     button's hold on the bottom edge would be against the page, not the
     window */
  overflow-x: clip;
`;

const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, 1.5rem, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
`;

/* ── the hero ─────────────────────────────────────────────────────────── */

/* The trail version re-times the headline's letters and nothing else */
const Hero = styled(BuildHero)<{ $trail?: boolean }>`
  padding-top: ${u(54)};
  ${({ $trail }) => $trail && trailLetters("h1")}
`;

const Top = styled(TopBar)`
  animation: ${rise} 620ms cubic-bezier(0.22, 0.61, 0.24, 1) 120ms both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* ── the product ──────────────────────────────────────────────────────── */

/* Pulled up into the first screen by as much of it as the product takes, and
   laid over the hero's ground rather than on a band of its own */
const ProductFrame = styled.section`
  position: relative;
  z-index: 3;
  max-width: 1920px;
  margin: calc(-1 * ${PEEK}) auto 0;
  padding: 0 0 ${u(120)};

  @media (max-width: 56rem) {
    padding: 0 0 4rem;
  }
`;

/* The same curve the line rises on, so the two read as one movement */
const COME_UP = "1300ms cubic-bezier(0.22, 1, 0.36, 1)";

/* The render and the button across it, on the render's own proportions —
   below the first screen until the line has landed */
const Stage = styled.div<{ $up: boolean }>`
  ${({ $up }) => css`
    position: relative;
    width: ${u(1779)};
    margin: 0 auto;
    aspect-ratio: 3840 / 2160;
    opacity: ${$up ? 1 : 0};
    transform: ${$up ? "none" : `translate3d(0, calc(${PEEK} + 12vh), 0)`};
    transition: transform ${COME_UP} 60ms, opacity 600ms ease 60ms;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }

    @media (max-width: 56rem) {
      width: calc(100% - 2rem);
      aspect-ratio: auto;
    }
  `}
`;

/* The window's edge: one line of the ramp, radiating from the middle of its
   top edge — where the headline stands over it — and gone before the far
   sides, where the page's shade takes over. Over it, two lights, green and
   purple, that the trail version's light runs up the window's sides and over
   its top on its own clock (`Light.tsx`); standing, they rest on the top
   edge. The custom properties are theirs: where they are, how bright, and how
   bright the edge is. */
const OUTLINE = `radial-gradient(
    12% 18% at var(--ax, 22%) var(--ay, 0%),
    rgba(20, 241, 149, var(--lit, 0.5)),
    rgba(20, 241, 149, 0) 100%
  ),
  radial-gradient(
    12% 18% at var(--bx, 78%) var(--ay, 0%),
    rgba(153, 69, 255, var(--lit, 0.5)),
    rgba(153, 69, 255, 0) 100%
  ),
  radial-gradient(
    ellipse 64% 130% at 46% 0%,
    rgba(20, 241, 149, calc(0.95 * var(--edge, 0.8))) 0%,
    rgba(45, 206, 169, calc(0.8 * var(--edge, 0.8))) 18%,
    rgba(98, 104, 240, calc(0.62 * var(--edge, 0.8))) 40%,
    rgba(153, 69, 255, calc(0.45 * var(--edge, 0.8))) 62%,
    rgba(153, 69, 255, 0) 88%
  ),
  rgba(98, 104, 240, 0.14)`;

/* The product up close: the top left of Playground at half as large again as
   the brand slides show it — the sidebar, the assistant and the start of the
   code, near enough to read. In a window where the slides' render has its
   corner, rounded as that is; the window is its edge's colour, and one pixel
   of it shows round the view */
const Window = styled.div`
  position: absolute;
  top: ${(138 / 2160) * 100}%;
  left: ${(150 / 3840) * 100}%;
  right: 0;
  bottom: 0;
  padding: 1px;
  border-radius: ${u(18)} 0 0 0;
  background: ${OUTLINE};

  @media (max-width: 56rem) {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    bottom: auto;
    border-radius: 1rem;
  }
`;

const View = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: calc(${u(18)} - 1px) 0 0 0;
  background: #101011;

  @media (max-width: 56rem) {
    border-radius: calc(1rem - 1px);
  }
`;

const Shot = styled.img`
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
`;

/* The render eases into the page on the right and at the bottom */
const Shade = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
      90deg,
      rgba(21, 21, 21, 0) 60%,
      rgba(21, 21, 21, 0.7) 100%
    ),
    linear-gradient(to bottom, rgba(21, 21, 21, 0) 72%, ${INK} 99%);

  @media (max-width: 56rem) {
    display: none;
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
      margin-top: 1.25rem;
      padding: 0 1.25rem 0 1.5rem;
      border-radius: 1.5rem;
    }
  `}
`;

const peek = keyframes`
  from { opacity: 0; transform: translate3d(0, ${u(64)}, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
`;

/* The button's place, the Figma's: 603 into the render. A block of its own
   rather than a margin on the button — a margin would fold through the render
   into the page's pull-up, and would fence the button out of the room it
   needs to hold against the bottom edge. */
const Place = styled.div`
  height: ${u(603)};

  @media (max-width: 56rem) {
    display: none;
  }
`;

/* The product's button. It holds against the bottom edge with 240 of its 298
   showing until the page is scrolled far enough to bring it to its place — so
   the first screen ends on it, cut, and the page plainly goes on. It arrives
   after the render has come up; the entrance fills backwards only, so the
   hover lift still works after. */
const Cta = styled(Button)<{ $up: boolean }>`
  ${({ $up }) => css`
    position: sticky;
    left: auto;
    top: auto;
    bottom: ${u(240 - 298)};
    opacity: ${$up ? 1 : 0};
    ${$up &&
    css`
      animation: ${peek} 800ms cubic-bezier(0.22, 1, 0.36, 1) 1000ms backwards;
    `}

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }

    @media (max-width: 56rem) {
      position: relative;
      bottom: auto;
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
    font-size: clamp(1.375rem, 6.4vw, 2rem);
  }
`;

const Icon = styled(PlayRing)`
  width: ${u(212)};
  height: ${u(212)};
  flex-shrink: 0;

  @media (max-width: 56rem) {
    width: clamp(2.5rem, 11vw, 3.25rem);
    height: clamp(2.5rem, 11vw, 3.25rem);
  }
`;

/* ── the trail version's button ───────────────────────────────────────── */

/* How far above the fold the trail version's button rests while it is held
   there: exactly as far as its light runs on below it, so the light stands
   on the edge of the screen */
const FLOAT = 298 * LIGHT_BELOW;

const lightPeek = keyframes`
  from { opacity: 0; transform: translate3d(0, ${u(48)}, 0); }
`;

/* The same words and icon, in white, on the northern lights instead of on a
   slab — the light is `Light`, drawn under them. The button itself is
   transparent, but it is still the whole row you press, focus and hover, on
   the Figma's 1779 × 298 and 603 into the render.

   It holds at the bottom of the screen, whole, its light rising out of the
   edge, until scrolling brings it to its place. The light comes up first and
   the words rise into it; both entrances fill backwards only, so the hover
   lift still works after. */
const LightCta = styled.button<{ $up: boolean }>`
  ${({ $up }) => css`
    position: sticky;
    bottom: ${u(FLOAT)};
    isolation: isolate;
    width: 100%;
    height: ${u(298)};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 ${u(75)} 0 ${u(80)};
    border: none;
    border-radius: ${u(70)};
    background: none;
    color: #ffffff;
    font-family: ${HEADLINE};
    cursor: pointer;
    opacity: ${$up ? 1 : 0};
    -webkit-tap-highlight-color: transparent;

    & > ${Label}, & > ${Icon} {
      position: relative;
      transition: transform 480ms cubic-bezier(0.22, 0.61, 0.36, 1);
      ${$up &&
      css`
        animation: ${lightPeek} 900ms cubic-bezier(0.22, 1, 0.36, 1) 1150ms
          backwards;
      `}
    }

    /* Legible on the brightest of the light: a soft shade close under the
       letters, never an outline */
    & > ${Label} {
      text-shadow: 0 0 ${u(34)} rgba(14, 10, 40, 0.42),
        0 ${u(2)} ${u(5)} rgba(14, 10, 40, 0.3);
    }

    & > ${Icon} {
      filter: drop-shadow(0 0 ${u(26)} rgba(14, 10, 40, 0.4));
    }

    &:hover > ${Label}, &:hover > ${Icon} {
      transform: translate3d(0, ${u(-4)}, 0);
    }

    &:active > ${Label}, &:active > ${Icon} {
      transform: translate3d(0, 0, 0);
      transition-duration: 160ms;
    }

    &:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.92);
      outline-offset: ${u(10)};
    }

    @media (prefers-reduced-motion: reduce) {
      & > ${Label}, & > ${Icon} {
        animation: none;
        transition: none;
      }
    }

    @media (max-width: 56rem) {
      position: relative;
      bottom: auto;
      height: 5.5rem;
      margin-top: 1.25rem;
      padding: 0 1.25rem 0 1.5rem;
      border-radius: 1.5rem;
    }
  `}
`;

/* ── the close ────────────────────────────────────────────────────────── */

/* A full 1920 × 1080 frame on the deck's gradient, with the white button — the
   last thing on the page is the first thing the deck said */
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
