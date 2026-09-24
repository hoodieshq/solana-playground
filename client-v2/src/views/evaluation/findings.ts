/**
 * The evaluation's content.
 *
 * Every entry describes a change that shipped in this build, and every "Was"
 * is a thing the interface actually did — not a straw man. Where a change
 * turned up a defect rather than a preference, `bug` marks it, because that is
 * the part of a design pass people do not expect and it is worth counting.
 */

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
    is: "No spanning bar at all. Every column heads itself: the sidebar with the wordmark and the account, the assistant with its own title, the workspace with the project's name. Two shared metrics decide the heights, so the rules line up across all three.",
    why: "Two different bars pretending to be one is what made the chrome read as half-dynamic. Once each panel owns its own head, there is no state in which a bar can appear or vanish.",
  },
  {
    id: "rules",
    area: "Structure",
    title: "Five head heights, none of them aligned",
    was: "The sidebar's brand row was 2.125rem plus padding, the assistant's title 2.75rem with no rule under it, the stage rail 2.875rem, the work head 2.75rem, and the start screen's bar 3.5rem. Four horizontal rules, none at the same height.",
    is: "Two constants — one for every column's first row, one for the second row in the panels that have one. Measured in the browser: in a project the rules land at 44/44/44 and 82/82; on the start screen at 44/44.",
    why: "A rule that nearly lines up is worse than no rule. The eye reads the misalignment as an accident before it reads anything else on the screen.",
  },
  {
    id: "settings",
    area: "Navigation",
    title: "Settings was a drawer over the thing you left",
    was: "A 22rem panel sliding out of the right edge, pinned at top: 3.5rem — below a bar that no longer existed. It showed you half the product and let you touch none of it. Setting descriptions were tooltips behind a question mark.",
    is: "A page you go to. The whole window becomes settings, the categories take the column the navigation had, and one 40rem measure of rows takes the rest. Each row is its name, its description underneath, and its control at the right.",
    why: "Linear, Cursor and Vercel all treat settings as a destination. A drawer is the worst of a page and a panel at once — and the only way to learn what a setting did was to hover every one of them in turn.",
  },
  {
    id: "tutorials",
    area: "Navigation",
    title: "Tutorials did not open",
    was: "Clicking Open on a tutorial card did nothing. No error, no console warning, and the URL did change — so the router was working and the screen simply never moved.",
    is: "The route brings the view with it. Opening a tutorial from the start screen lands on its page, and a tutorial you have not started yet no longer needs a workspace to exist before it can render.",
    why: "A tutorial's pages are drawn by a component only the project layout mounts, and the handshake that asks for it retries every 100ms forever. The failure had no sound. Found by clicking through the screens, not by a test.",
    bug: true,
  },
  {
    id: "composer",
    area: "Detail",
    title: "The composer's controls collided",
    was: "In the assistant pane the two control groups ran into each other — the word Assistant printed over the word Model — and pushed the send button off the end of the row.",
    is: "Below 384px the labels give way and their glyphs stay. The pane is resizable from 288px, so the switch follows the pane's own width rather than the window's.",
    why: "Measured with a ResizeObserver rather than asked with a CSS container query: this project's styled-components version ships a compiler that turns a container query into a block with no selector — valid-looking source, silently dead CSS.",
    bug: true,
  },
  {
    id: "stepper",
    area: "Detail",
    title: "The loop abbreviated itself for no reason",
    was: "Write, Build, Deploy and Interact rendered as W, B, D and I at any window under 1280px — including one where each tab was 147px wide with nothing else in the row.",
    is: "The rail measures itself. Full names when there is room, initials when there genuinely is not, and the full name stays in each control's label either way.",
    why: "The collapse was a viewport media query, and it was correct when it was written — the stepper lived in the top bar then and shared that row. Moving it to a rail of its own made the window's width meaningless, and the old rule stayed behind.",
    bug: true,
  },
  {
    id: "sidebar",
    area: "Navigation",
    title: "Destinations were switches in a bar",
    was: "Start, Tutorials and Programs were tabs in the start screen's own bar, where Start was a second name for Home. Search sat in the middle of that bar, offering to search a page that had no list on it.",
    is: "They are rows in the sidebar with the other destinations, and Home is the one that was Start. Search sits on the list it filters. What is left in the head is the name of what you are looking at.",
    why: "A control's place should say what it governs. A search field that spans the window implies it searches the window.",
  },
  {
    id: "density",
    area: "Craft",
    title: "Everything was a size too big",
    was: "Navigation rows at 34px and 14px type, 8px radii, a 248px column, and the current row marked with a gradient outline.",
    is: "Rows at 28px and 13px, 6px radii, a 232px column, and the current row marked with a flat tint. Measured against Linear, Claude, Cursor and Vercel, which agree with each other more than any of them agreed with the old build.",
    why: "On a list of projects, an outline that bright made every selection look like an alert. All four references mark the current row with a tint, and none of them shout.",
  },
  {
    id: "type",
    area: "Craft",
    title: "Typewriter type in the interface",
    was: "Cluster, wallet and account controls were set in the code font. Monospace in chrome that is not code.",
    is: "One family across the interface, with the code face kept for code. Weights capped so nothing in the chrome goes heavier than medium.",
    why: "A monospace control reads as output rather than as something you can press, and it makes a product look like a terminal wearing a coat.",
  },
  {
    id: "colour",
    area: "Craft",
    title: "Grey that was not grey",
    was: "The neutral palette carried a blue cast — greys whose channels were not equal, so every surface leaned cold and the accent had nothing to sit against.",
    is: "Equal-channel neutrals from the page ground up, with one raised surface and one hover state. Depth became one decision rather than a different answer per component.",
    why: "A tinted neutral competes with whatever colour you put on it. Taking the tint out is what let the brand colour mean something when it appears.",
  },
];
