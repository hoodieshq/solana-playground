/**
 * The deck, as data.
 *
 * Follows the Figma's order (node 46:2881): the proposal, what the product is
 * made of, the mark, what it says, and then the three signposts that leave the
 * deck for the live thing.
 *
 * The Figma's two product-screenshot slides are not here. A screenshot of the
 * product is the weakest possible slide when the product itself is one key
 * away — the three signposts do that job, and do it with the real thing.
 */

export type Ground = "paper" | "ink" | "mesh" | "meshDeep";

export type Exit = "landing" | "product" | "evaluation";

export type SlideSpec =
  | {
      id: string;
      kind: "title";
      ground: Ground;
      grid?: boolean;
      lines: string[];
      /** Sets the headline smaller than the deck's default */
      scale?: number;
    }
  | {
      id: string;
      kind: "cards";
      ground: Ground;
      grid?: boolean;
      items: Array<{ glyph: "solana" | "play" | "ground"; name: string; note: string }>;
    }
  | { id: string; kind: "mark"; ground: Ground; grid?: boolean }
  /** Solana's three bars, held still — where the mark comes from */
  | { id: string; kind: "seed"; ground: Ground; grid?: boolean }
  /** The bars folding into the triangle, and the mark resolving over them */
  | { id: string; kind: "morph"; ground: Ground; grid?: boolean }
  | { id: string; kind: "lockup"; ground: Ground; grid?: boolean }
  | {
      id: string;
      kind: "signpost";
      ground: Ground;
      grid?: boolean;
      lines: string[];
      cta: string;
      exit: Exit;
      note?: string;
      scale?: number;
    };

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
      { glyph: "ground", name: "Ground", note: "Safe, Big, On-chain" },
    ],
  },
  { id: "seed", kind: "seed", ground: "paper" },
  { id: "morph", kind: "morph", ground: "mesh" },
  { id: "lockup", kind: "lockup", ground: "meshDeep" },
  {
    id: "say-mesh",
    kind: "title",
    ground: "mesh",
    lines: ["Play, Build, Create", "Onchain"],
    scale: 0.52,
  },
  {
    id: "say-deep",
    kind: "title",
    ground: "meshDeep",
    grid: true,
    lines: ["Play, Build, Create", "Onchain"],
    scale: 0.52,
  },
  {
    id: "say-ink",
    kind: "title",
    ground: "ink",
    grid: true,
    lines: ["Play, Build, Create", "Onchain"],
    scale: 0.52,
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
    ground: "ink",
    grid: true,
    lines: ["Extra Materials", "our UX evaluation"],
    cta: "Open the evaluation",
    exit: "evaluation",
    scale: 0.52,
    note: "What it was, what it is, and why each thing moved.",
  },
];
