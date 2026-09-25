/**
 * The evaluation's words.
 *
 * Short on purpose: one claim and a sentence or two each, said the way you
 * would say it to the person who has to build it. The long version — every
 * mechanism, every number — lives in the commit history, where it can be
 * argued with line by line.
 */

export interface Finding {
  id: string;
  label: string;
  title: string;
  text: string;
}

/** What we found, and what changed because of it */
export const FINDINGS: Finding[] = [
  {
    id: "frame",
    label: "The frame",
    title: "Every panel heads itself now.",
    text: "The old top bar appeared on some screens and not on others, and nothing quite lined up under it. Each column owns its header now, and every line meets the next one.",
  },
  {
    id: "settings",
    label: "Settings",
    title: "Settings is a place you can leave.",
    text: "It used to slide over your work and keep you there. It's a page now, with the way out right where you'd look for it.",
  },
  {
    id: "bugs",
    label: "Bugs",
    title: "Three bugs, found by looking.",
    text: "Tutorials wouldn't open, the composer's buttons ran into each other, and the step bar shrank to initials for no reason. None of them threw an error. We found them by clicking through every screen.",
  },
  {
    id: "craft",
    label: "Craft",
    title: "A size smaller, a shade calmer.",
    text: "Rows, type and corners were all a step too big, the greys leaned blue, and buttons wore the code font. We matched the feel of the tools people already live in — Linear, Cursor, Claude, Vercel.",
  },
  {
    id: "access",
    label: "Accessibility",
    title: "Measured, including where we fall short.",
    text: "Body text clears WCAG AA with room to spare. The placeholder grey and the accent only pass at large sizes, so we keep them out of sentences.",
  },
];

/** What we think belongs in the design scope next */
export const NEXT = {
  lead: "What we think belongs in the design scope next",
  gamification:
    "Progress you can feel from the first deploy on, and a space the community fills with its own work.",
  agentation: "Design notes pinned to the live product, ready for an agent to build.",
  system:
    "Alongside both: a design system built agent-first — one source that designers, developers and their coding agents all work from.",
};
