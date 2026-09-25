/**
 * The deck, as data.
 *
 * Follows the Figma's order (node 46:2881), scanned slide by slide: the
 * proposal, what the name is made of, Solana's mark, the new mark arriving on
 * colour and settling into its lockup, the line it says built up over three
 * slides, the brand applied to five things, and then the three signposts that
 * leave the deck for the live thing.
 *
 * Two of the Figma's frames are not here as frames of their own. Its second
 * slide is blank white — a beat for the prototype to dissolve from — and its
 * seventh repeats the sixth exactly, the pair Smart Animate needs to move the
 * mark into the lockup. On the web the carry does both jobs, so each would be
 * a click that changes nothing.
 */

import type { Ground } from "./Atmosphere";

export type { Ground };

export type Exit = "landing" | "product" | "evaluation";

/** What an image slide shows, from the supplied renders */
export type Shot = "keyboard" | "app" | "tutorial" | "tee" | "home";

interface Base {
  id: string;
  ground: Ground;
  /** The brand pattern over the ground, lit by the pointer */
  grid?: boolean;
  /**
   * Move on by itself after this many milliseconds — only when the slide was
   * reached going forward, so stepping back to it never throws you onward.
   */
  auto?: number;
}

export type SlideSpec =
  | (Base & {
      kind: "title";
      lines: string[];
      /** Sets the headline smaller than the deck's default */
      scale?: number;
      weight?: number;
      leading?: number;
      /** Hold the space of this many lines, so a line that is coming later
          does not move the ones already there */
      reserve?: number;
    })
  | (Base & {
      kind: "cards";
      items: Array<{
        glyph: "solana" | "play" | "ground";
        name: string;
        note: string;
      }>;
    })
  /** Solana's three bars, alone — where the mark comes from */
  | (Base & { kind: "solana" })
  /** The ground by itself: the colour arriving before the mark does */
  | (Base & { kind: "blank" })
  | (Base & { kind: "mark" })
  | (Base & { kind: "lockup" })
  | (Base & {
      kind: "image";
      shot: Shot;
      /** What the picture is, for anyone not seeing it */
      alt: string;
      /** Whether the picture is light, so the deck's own chrome can read on it */
      light: boolean;
    })
  | (Base & {
      kind: "signpost";
      lines: string[];
      cta: string;
      exit: Exit;
      note?: string;
      scale?: number;
    });

/* The line, built up over three slides, measured off the renders: 185.6px on
   the 1920 frame, Medium — its stems are 0.137em, and with the deck's -1%
   tracking that is the weight whose widths land within half a percent — on a
   leading of 0.915, baseline to baseline. The same on all three, which is what
   lets the words that stay put travel rather than jump. Two lines are held
   from the start: in the Figma the first line's baseline sits within a couple
   of pixels of where it will be once "Build Onchain" arrives under it, so
   nothing above has to make room. */
const SAY = { scale: 0.85, weight: 500, leading: 0.915, reserve: 2 } as const;

export const SLIDES: SlideSpec[] = [
  {
    id: "proposal",
    kind: "title",
    ground: "paper",
    lines: ["Design", "Proposal"],
  },
  {
    id: "parts",
    kind: "cards",
    ground: "paper",
    items: [
      { glyph: "solana", name: "Solana", note: "Foundation, Future, Forward" },
      { glyph: "play", name: "Play", note: "Fun, Easy, Joyful, Entertaining" },
      { glyph: "ground", name: "Ground", note: "Safe, Big, Onchain" },
    ],
  },
  /* Solana's mark, the colour arriving, the new mark: one move, played
     through without a click, as the prototype's timed transitions do */
  { id: "solana", kind: "solana", ground: "paper", auto: 1700 },
  { id: "colour", kind: "blank", ground: "haze", auto: 1500 },
  { id: "mark", kind: "mark", ground: "deep" },
  { id: "lockup", kind: "lockup", ground: "deep" },
  {
    id: "explore",
    kind: "title",
    ground: "explore",
    grid: true,
    lines: ["Explore"],
    ...SAY,
  },
  {
    id: "learn",
    kind: "title",
    ground: "violet",
    grid: true,
    lines: ["Explore, Learn,"],
    ...SAY,
  },
  {
    id: "build",
    kind: "title",
    ground: "ink",
    grid: true,
    lines: ["Explore, Learn,", "Build Onchain"],
    ...SAY,
  },
  {
    id: "keyboard",
    kind: "image",
    ground: "ink",
    shot: "keyboard",
    alt: "The mark as a sticker on a keyboard, hands at the keys",
    light: true,
  },
  {
    id: "app",
    kind: "image",
    ground: "ink",
    shot: "app",
    alt: "The product's sidebar and assistant, with the lockup in the corner",
    light: false,
  },
  {
    id: "tutorial",
    kind: "image",
    ground: "ink",
    shot: "tutorial",
    alt: "A Start Tutorial button in Solana's gradient, with the mark as its icon",
    light: false,
  },
  {
    id: "tee",
    kind: "image",
    ground: "ink",
    shot: "tee",
    alt: "The mark printed large across the back of a shirt",
    light: true,
  },
  {
    id: "home",
    kind: "image",
    ground: "ink",
    shot: "home",
    alt: "The product's start screen: Where should we begin?",
    light: false,
  },
  {
    id: "landing",
    kind: "signpost",
    ground: "paper",
    lines: ["Landing"],
    cta: "Open the landing",
    exit: "landing",
    note: "What the product says before you are in it.",
  },
  {
    id: "to-product",
    kind: "signpost",
    ground: "paper",
    lines: ["To Product", "From Landing"],
    cta: "Open the product",
    exit: "product",
    scale: 0.66,
    note: "The same build, one click on from the landing.",
  },
  {
    id: "evaluation",
    kind: "signpost",
    ground: "paper",
    lines: ["Extra Materials:", "Our UX Evaluation"],
    cta: "Open the evaluation",
    exit: "evaluation",
    scale: 0.52,
    note: "What it was, what it is, and why each thing moved.",
  },
];

/** Whether a slide's surface is light, so text and chrome on it go dark */
export const isLight = (slide: SlideSpec) =>
  slide.kind === "image" ? slide.light : slide.ground === "paper";
