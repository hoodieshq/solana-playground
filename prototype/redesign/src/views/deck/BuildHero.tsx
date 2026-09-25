import { FC, ReactNode, useEffect, useRef, useState } from "react";
import styled from "styled-components";

import Atmosphere from "./Atmosphere";
import type { Ground } from "./Atmosphere";
import { noteCarried } from "./carry";
import { Headline } from "./Slide";

/**
 * A line that builds itself, the way the deck's "Explore, Learn, Build
 * Onchain" does across three slides — but played through on its own, for a
 * page rather than a presenter.
 *
 * It is the deck's machinery, not an imitation of it: the same headline,
 * letters arriving one by one; the same carry, so a word already on screen
 * travels to its next place instead of being set again; the same moving
 * ground under it, the colour sliding from one arrangement into the next and
 * settling into ink. One screen tall, like a slide.
 *
 * Once the last step has landed it can make room: the page is told, and the
 * line rises by as much as the page asks, so what comes next can come up
 * under it.
 */

export interface BuildStep {
  lines: string[];
  ground: Ground;
}

interface BuildHeroProps {
  steps: BuildStep[];
  /** How long each step holds before the next arrives — the last one too */
  hold?: number;
  /** The headline's settings, as the deck's headline takes them */
  scale: number;
  weight: number;
  leading: number;
  tracking?: string;
  /** Told once, when the last step has held as long as the others did */
  onSettled?: () => void;
  /** How far the line rises to make room, as a CSS length */
  lift?: string;
  /** Whether it has — the page's call, so a reader who scrolls early is not
      left waiting on the line */
  lifted?: boolean;
  /** What sits on top of the ground — the page's top bar */
  children?: ReactNode;
  /** Start on the last step, already built — for a page that shows the same
      line again further down */
  settled?: boolean;
  className?: string;
}

type Colour = Exclude<Ground, "paper" | "ink">;
const isColour = (g: Ground): g is Colour => g !== "paper" && g !== "ink";

const BuildHero: FC<BuildHeroProps> = ({
  steps,
  hold = 1500,
  scale,
  weight,
  leading,
  tracking,
  onSettled,
  lift,
  lifted = false,
  children,
  settled: built = false,
  className,
}) => {
  const still =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [at, setAt] = useState(still || built ? steps.length - 1 : 0);
  const text = useRef<HTMLDivElement>(null);

  /* Held in a ref, so a page that passes a fresh function on every render
     does not restart the wait */
  const settled = useRef(onSettled);
  settled.current = onSettled;

  useEffect(() => {
    if (at >= steps.length - 1) {
      const t = window.setTimeout(() => settled.current?.(), still ? 0 : hold);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      /* Measured before the next step replaces this one, so the words it
         keeps can travel from where they are */
      noteCarried(text.current);
      setAt((n) => n + 1);
    }, hold);
    return () => window.clearTimeout(t);
  }, [at, hold, steps.length, still]);

  const step = steps[at];
  const lastColour =
    [...steps.slice(0, at + 1)]
      .reverse()
      .map((s) => s.ground)
      .find(isColour) ??
    steps.map((s) => s.ground).find(isColour) ??
    "haze";
  const reserve = Math.max(...steps.map((s) => s.lines.length));

  return (
    <Frame className={className}>
      <Atmosphere ground={step.ground} lastColour={lastColour} pattern />
      {children}
      <Centre
        ref={text}
        style={
          lift && lifted
            ? { transform: `translate3d(0, calc(-1 * ${lift}), 0)` }
            : undefined
        }
      >
        <Headline
          key={at}
          lines={step.lines}
          light={false}
          scale={scale}
          weight={weight}
          leading={leading}
          tracking={tracking}
          reserve={reserve}
        />
      </Centre>
    </Frame>
  );
};

export default BuildHero;

/* A screen, like a slide — never less than enough room for the line */
const Frame = styled.section`
  position: relative;
  isolation: isolate;
  height: 100vh;
  min-height: 34rem;
  overflow: hidden;
  background: #151515;

  & > :not(:first-child):not(:last-child) {
    position: relative;
    z-index: 2;
  }
`;

const Centre = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1.5rem;
  text-align: center;
  pointer-events: none;
  transition: transform 1300ms cubic-bezier(0.22, 1, 0.36, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
