/**
 * The evaluation's content.
 *
 * Three parts, in the order an evaluation is actually useful: how the styling
 * was approached and against what, what the numbers say, and then the changes
 * themselves as evidence.
 *
 * Nothing here is a claim I have not checked. The contrast figures are
 * computed from the shipped theme, and the two that fall short are listed as
 * falling short — an evaluation that reports a clean sweep is not an
 * evaluation.
 */

/* ── how it was approached ────────────────────────────────────────────── */

export interface Principle {
  id: string;
  title: string;
  body: string;
  /** What it is measured against — a standard, a heuristic, or a product */
  source: string;
}

export const PRINCIPLES: Principle[] = [
  {
    id: "conventions",
    title: "Borrow the conventions people already have",
    body: "Density, row heights, type sizes and the way a current item is marked were taken from four products this audience uses daily — Linear, Claude, Cursor and Vercel. They agree with each other far more than any of them agreed with the old build: rows at 26–28px, labels at 13px, radii of 6–8px, and the selected row marked with a flat tint rather than an outline.",
    source: "Jakob's Law · NN/g — people spend most of their time on other products",
  },
  {
    id: "recognition",
    title: "Show, rather than make people remember",
    body: "Setting descriptions were tooltips behind a question mark, so the only way to learn what a setting did was to hover every one in turn. They are visible text under each label now. The same reasoning moved search onto the list it filters and the stage loop onto the workspace it belongs to.",
    source: "NN/g heuristic 6 — recognition rather than recall",
  },
  {
    id: "freedom",
    title: "Always leave a way back",
    body: "Settings was a drawer you could get stuck in, and the assistant's backend picker had a Back control that only rendered when you were not using it. Settings is a page with a marked exit; the picker always offers the way out; the sidebar and the assistant can be collapsed and reopened from the panel beside them.",
    source: "NN/g heuristic 3 — user control and freedom",
  },
  {
    id: "consistency",
    title: "One answer per question",
    body: "Depth is one decision — a page ground, one raised surface, one hover state — instead of a different answer per component. Heads are one height across every column, so the rules meet. Two shared constants decide those heights, which is why they cannot drift apart again.",
    source: "NN/g heuristic 4 — consistency and standards",
  },
  {
    id: "type",
    title: "A face for reading, a face for headlines",
    body: "Interface chrome was partly set in the code font — monospace on controls that are not code, which reads as output rather than as something you can press. One family carries the interface, the code face is kept for code, and headlines take the proposal's display face. Weights are capped so nothing in the chrome goes heavier than medium.",
    source: "WCAG 1.4.12 · legible defaults",
  },
  {
    id: "colour",
    title: "Neutral that is actually neutral",
    body: "The greys carried a blue cast — channels that were not equal — so every surface leaned cold and an accent had nothing to sit against. They are equal-channel now, which is what lets the brand colour mean something when it does appear.",
    source: "WCAG 1.4.1 — colour is never the only signal",
  },
];

/* ── what the numbers say ─────────────────────────────────────────────── */

export interface Contrast {
  pair: string;
  ratio: number;
  /** Where it is used, so a shortfall can be judged rather than just counted */
  use: string;
  verdict: "AAA" | "AA" | "AA large only";
}

/**
 * Computed from the shipped theme against the page ground (#101011) at the
 * time of writing. WCAG 2.2 wants 4.5:1 for body text and 3:1 for large text
 * and interface components.
 */
export const CONTRAST: Contrast[] = [
  {
    pair: "Primary text",
    ratio: 17.0,
    use: "Every label and every line you read",
    verdict: "AAA",
  },
  {
    pair: "Secondary text",
    ratio: 7.31,
    use: "Descriptions, notes, the second line of a card",
    verdict: "AAA",
  },
  {
    pair: "Secondary on a raised surface",
    ratio: 6.54,
    use: "The same text inside a card or the composer",
    verdict: "AA",
  },
  {
    pair: "Disabled and placeholder",
    ratio: 3.6,
    use: "Group headings and placeholder text",
    verdict: "AA large only",
  },
  {
    pair: "Accent blue",
    ratio: 3.68,
    use: "The send button's fill and focus rings",
    verdict: "AA large only",
  },
];

/**
 * The honest footnote. Two of the five do not reach 4.5:1, and saying so is
 * the point of measuring.
 */
export const CONTRAST_NOTE =
  "Three of these clear AA for body text and two do not. The disabled grey is used for group headings and placeholders, and the accent only ever carries a fill or a ring — both are large-text or component uses, where 3:1 is the bar and both clear it. Neither should be used for a sentence, and if either ever is, it needs to get lighter first.";

/* ── the changes themselves ───────────────────────────────────────────── */

export interface Finding {
  id: string;
  area: string;
  title: string;
  was: string;
  is: string;
  why: string;
  /** Surfaced as a defect by the design pass rather than by testing */
  bug?: boolean;
}

export const FINDINGS: Finding[] = [
  {
    id: "header",
    area: "Structure",
    title: "A bar that only existed half the time",
    was: "A header spanned the whole window inside a project, and did not exist on the start screen — where the start screen drew a second bar of its own. The brand sat in it while navigation sat in the sidebar underneath, and it carried the write/build/deploy/interact stepper from two columns away from the workspace that owns it.",
    is: "No spanning bar at all. Every column heads itself: the sidebar with the wordmark and the account, the assistant with its own title, the workspace with the project's name.",
    why: "Two different bars pretending to be one is what made the chrome read as half-dynamic. Once each panel owns its head, there is no state in which a bar can appear or vanish.",
  },
  {
    id: "rules",
    area: "Structure",
    title: "Five head heights, none of them aligned",
    was: "The sidebar's brand row was 2.125rem plus padding, the assistant's title 2.75rem with no rule under it, the stage rail 2.875rem, the work head 2.75rem, and the start screen's bar 3.5rem.",
    is: "Two constants decide every head. Measured in the browser: in a project the rules land at 44/44/44 and 82/82; on the start screen at 44/44.",
    why: "A rule that nearly lines up is worse than no rule. The eye reads the misalignment as an accident before it reads anything on the screen.",
  },
  {
    id: "settings",
    area: "Navigation",
    title: "Settings was a drawer over the thing you left",
    was: "A 22rem panel sliding out of the right edge, pinned below a bar that no longer existed. It showed you half the product and let you touch none of it, and every description was a tooltip.",
    is: "A page you go to, with the categories in the navigation's column and one 40rem measure of rows. Each row is its name, its description underneath, and its control at the right.",
    why: "Linear, Cursor and Vercel all treat settings as a destination. A drawer is the worst of a page and a panel at once.",
  },
  {
    id: "tutorials",
    area: "Navigation",
    title: "Tutorials did not open",
    was: "Clicking Open on a tutorial card did nothing. No error, no console warning, and the URL did change — so the router was working and the screen simply never moved.",
    is: "The route brings the view with it, and a tutorial you have not started no longer needs a workspace to exist before it can render.",
    why: "The handshake that asks for the view retries every 100ms forever, so the failure had no sound. Found by clicking through the screens, not by a test.",
    bug: true,
  },
  {
    id: "composer",
    area: "Detail",
    title: "The composer's controls collided",
    was: "In the assistant pane the two control groups ran into each other — the word Assistant printed over the word Model — and pushed the send button off the end of the row.",
    is: "Below 384px the labels give way and their glyphs stay, following the pane's own width rather than the window's.",
    why: "Measured rather than asked with a container query: this project's styled-components version compiles one into a block with no selector — valid-looking source, silently dead CSS.",
    bug: true,
  },
  {
    id: "stepper",
    area: "Detail",
    title: "The loop abbreviated itself for no reason",
    was: "Write, Build, Deploy and Interact rendered as W, B, D and I at any window under 1280px — including one where each tab was 147px wide with nothing else in the row.",
    is: "The rail measures itself. Full names when there is room, initials when there genuinely is not, and the full name stays in each control's label either way.",
    why: "The collapse was a viewport media query, correct when the stepper shared the top bar. Moving it to its own rail made the window's width meaningless and the rule stayed behind.",
    bug: true,
  },
  {
    id: "sidebar",
    area: "Navigation",
    title: "Destinations were switches in a bar",
    was: "Start, Tutorials and Programs were tabs in the start screen's own bar, where Start was a second name for Home. Search sat in the middle of that bar, offering to search a page that had no list on it.",
    is: "They are rows in the sidebar with the other destinations, and Home is the one that was Start. Search sits on the list it filters.",
    why: "A control's place should say what it governs. A search field that spans the window implies it searches the window.",
  },
  {
    id: "density",
    area: "Craft",
    title: "Everything was a size too big",
    was: "Navigation rows at 34px and 14px type, 8px radii, a 248px column, and the current row marked with a gradient outline.",
    is: "Rows at 28px and 13px, 6px radii, a 232px column, and the current row marked with a flat tint.",
    why: "On a list of projects, an outline that bright made every selection look like an alert. All four reference products mark the current row with a tint, and none of them shout.",
  },
];
