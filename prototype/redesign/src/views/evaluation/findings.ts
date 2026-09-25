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

/**
 * What the design work amounted to, said plainly — two paragraphs, the way
 * you would tell someone who missed the meetings.
 */
export const DESIGN_SUMMARY = [
  "We started with the brand, because the product did not have one of its own. " +
    "The new mark folds a play shape out of the Solana symbol and sets it beside " +
    "a circle — Playground as the place where things run. Around it we built a " +
    "lockup, a tile pattern, a palette taken from Solana's own green and purple, " +
    "and one type family, Stack Sans, for headlines and interface alike. The " +
    "presentation, the landing and a short narrated walkthrough all speak that " +
    "language, so the story someone hears is the product they then open.",
  "Inside the product we kept the structure people already understand and " +
    "changed how it feels to work in. The assistant now behaves like the tools " +
    "developers use every day: model and effort sit on the composer, there is no " +
    "separate setup screen, replies read as prose with code you can copy or open " +
    "beside the editor, and a tutorial conversation is split into chapters by " +
    "step. The sidebar folds to a rail and has real menus for projects and the " +
    "account, a short checklist gets a newcomer set up, files sit next to the " +
    "code, the stages became one switch, and empty screens, dialogs and the " +
    "terminal share the same calm surface — with four sample projects waiting, " +
    "so there is something real to open on the first visit.",
];
