import type { Statement } from "../landing/Statements";

/**
 * The evaluation's words: a claim and one short line each, said the way you
 * would say it to the person who has to build it. The long version — every
 * mechanism, every number — lives in the commit history.
 */
export const FINDINGS: Statement[] = [
  {
    id: "frame",
    title: "Every panel heads itself now.",
    line: "Nothing appears on one screen and vanishes on the next.",
  },
  {
    id: "settings",
    title: "Settings is a place you can leave.",
    line: "A page with a clear way out, not a drawer over your work.",
  },
  {
    id: "bugs",
    title: "Three bugs, found by looking.",
    line: "None of them threw an error. Clicking through every screen did.",
  },
  {
    id: "craft",
    title: "A size smaller, a shade calmer.",
    line: "Tuned to the tools people already live in.",
  },
  {
    id: "access",
    title: "Measured, including where we fall short.",
    line: "Body text passes WCAG AA. Two tones stay out of sentences.",
  },
];

/** The one line the close needs, under its two marks */
export const SYSTEM_LINE =
  "All of it on an agent-first design system, built hand in hand with the devs.";
