/**
 * The design roadmap, as data: the plan to Breakpoint, to the end of Q4 and
 * through Q1 2027, told the way the proposal was.
 *
 * It opens on what exists — the proposal materials — and the four stops, then
 * the two tracks and how the plan keeps step with dev's September release.
 * Each phase gets a chapter on colour and a slide of its work on black, split
 * by track. The ranking, the two sprint boards and the decisions to start
 * come last, and it hands over to the prototype as it stands.
 *
 * The same plan, with the reasoning and the numbers behind every score, is
 * the Q4 design plan doc; the two change together.
 */

import type { SlideSpec } from "./slides";

/* The chapter titles, set like the proposal's "Explore" line but at the
   lighter weight the product settled on */
const CHAPTER = { scale: 0.8, weight: 400, leading: 0.9 } as const;

export const ROADMAP: SlideSpec[] = [
  {
    id: "roadmap",
    kind: "title",
    ground: "paper",
    lines: ["Design", "Roadmap"],
  },
  {
    id: "materials",
    kind: "row",
    ground: "paper",
    title: "Proposal materials",
    note: "What exists today. It sets the direction and still needs polish; the work before Breakpoint turns it into final design.",
    items: [
      {
        name: "Proposal deck",
        note: "The pitch, handing over to the landing and the product",
      },
      { name: "Landing", note: "The Trail landing, live" },
      {
        name: "Product prototype",
        note: "Desktop and phone, from the start screen to a deploy",
      },
      {
        name: "UX evaluation",
        note: "What the old Playground does, and what changes",
      },
      {
        name: "Styleguide v1",
        note: "Logo, colour, type, pattern, motion, components",
      },
    ],
  },
  {
    id: "stops",
    kind: "horizons",
    ground: "paper",
    title: "Today to March",
    note: "Three stops, reached in two-week sprints.",
    stops: [
      {
        date: "Sep 29",
        name: "Today",
        note: "The proposal materials are live, and S0 starts",
      },
      {
        date: "Nov 15",
        name: "Breakpoint",
        note: "The landing, design system v0, the brand guides and the MVP, final by Nov 11",
        key: true,
      },
      {
        date: "Dec 23",
        name: "Q4 closes",
        note: "Sign-in with connected models, profiles, tutorials, mobile without code, Sole",
      },
      {
        date: "Mar 26",
        name: "Q1 closes",
        note: "A learning path for a younger audience",
      },
    ],
  },
  {
    id: "tracks",
    kind: "tracks",
    ground: "paper",
    tracks: [
      {
        track: "brand",
        name: "Brand",
        line: "Branding and guides",
        items: [
          "Final landing",
          "Design system on shadcn and Tailwind",
          "Brand guides and motion",
          "Sole, the agent's brand",
          "Social kit",
        ],
      },
      {
        track: "product",
        name: "Product",
        line: "UX and UI",
        items: [
          "Platform MVP",
          "Sign-in with connected models",
          "Profiles, achievements, gamification",
          "Tutorials, and mobile without code",
          "A learning path for younger learners",
        ],
      },
    ],
  },
  {
    id: "dev",
    kind: "pairs",
    ground: "paper",
    title: "In step with dev",
    note: "Dev's September release sets what the product can do. The design follows it.",
    left: "Dev ships",
    right: "Design delivers",
    rows: [
      {
        a: "Sign-in with GitHub, and history that follows you",
        b: "Signed-in states, and a chat carried on from desktop to phone",
      },
      {
        a: "A hosted AI model that needs no setup",
        b: "The assistant across the IDE, with Claude or Codex connected in one step",
      },
      {
        a: "Kora deploys to devnet and testnet, with 0 SOL",
        b: "Deploy and interact, the 7-day limit, rate limits",
      },
      {
        a: "A phone layout with a read-only editor",
        b: "Phone screens built around the tutor, then mobile without code",
      },
      {
        a: "Tokens and a new default theme",
        b: "Design system v0 on shadcn and Tailwind, its tokens mapped into the theme",
      },
      {
        a: "Sharing through GitHub",
        b: "Share to a gist or a repo, and open one from a link",
      },
    ],
  },
  {
    id: "before",
    kind: "title",
    ground: "explore",
    grid: true,
    lines: ["Before", "Breakpoint"],
    note: "London, Nov 15 to 17. Everything it needs is final by the Nov 11 freeze.",
    ...CHAPTER,
  },
  {
    id: "before-work",
    kind: "goals",
    ground: "ink",
    title: "Before Breakpoint",
    note: "Final by Nov 11: built from design system v0, checked for accessibility, signed off.",
    columns: [
      {
        track: "brand",
        name: "Brand",
        items: [
          {
            name: "Final landing",
            note: "Final copy, share images, analytics, a lighter footer",
          },
          {
            name: "Design system v0",
            note: "On shadcn/ui and Tailwind: tokens, core components, a Figma library",
          },
          {
            name: "Brand guides",
            note: "Styleguide v1 made final, and signed off",
          },
        ],
      },
      {
        track: "product",
        name: "Product",
        items: [
          {
            name: "Platform MVP",
            note: "Deploys through Kora, GitHub sign-in and history, the assistant across the IDE",
          },
          {
            name: "Sharing, first run and status",
            note: "Share through GitHub; one click into a running example",
          },
          {
            name: "Failure and empty states",
            note: "Build errors, paymaster rejections, rate limits, reaped programs",
          },
          {
            name: "Accessibility, bugs, round 1",
            note: "Contrast and keyboard, the four flow bugs, six to eight sessions",
          },
        ],
      },
    ],
  },
  {
    id: "after",
    kind: "title",
    ground: "violet",
    grid: true,
    lines: ["After", "Breakpoint"],
    note: "Nov 18 to Dec 23. From showing Playground to keeping people in it.",
    ...CHAPTER,
  },
  {
    id: "after-work",
    kind: "goals",
    ground: "ink",
    title: "After Breakpoint",
    note: "To Dec 23, with usability round 2 in the last sprint.",
    columns: [
      {
        track: "brand",
        name: "Brand",
        items: [
          {
            name: "Sole, the agent's brand",
            note: "A name check, then character, voice, mark and its states",
          },
          {
            name: "Social kit",
            note: "Posts, stories, carousels, share cards, video end cards",
          },
          {
            name: "Motion guidelines",
            note: "Easing, durations, the letter trail, the still stripes",
          },
          {
            name: "Design system iteration",
            note: "v0.x releases as sign-in, profiles and mobile need them",
          },
        ],
      },
      {
        track: "product",
        name: "Product",
        items: [
          {
            name: "Sign-in and models",
            note: "GitHub sign-in, Claude or Codex connected, no pasted keys",
          },
          {
            name: "Profiles and achievements",
            note: "Projects, deploys and tutorials; real milestones",
          },
          {
            name: "Gamification system",
            note: "XP, levels, streaks, and what can't be gamed",
          },
          {
            name: "Full tutorial pass",
            note: "Every tutorial stepped, on Anchor 1.2, styled to the guides",
          },
          {
            name: "Mobile without code",
            note: "Describe it, adjust it, deploy it from a phone",
          },
        ],
      },
    ],
  },
  {
    id: "sole",
    kind: "title",
    ground: "deep",
    grid: true,
    lines: ["Sole"],
    note: "The Playground agent. A working name, cleared before S4.",
    ...CHAPTER,
  },
  {
    id: "q1",
    kind: "title",
    ground: "explore",
    grid: true,
    lines: ["Q1 2027"],
    note: "A Duolingo-like learning path for a younger audience, with Sole as its guide.",
    ...CHAPTER,
  },
  {
    id: "q1-work",
    kind: "goals",
    ground: "ink",
    title: "Q1 2027",
    note: "Jan 4 to Mar 26: two sprints to learn, two to design, two to test.",
    columns: [
      {
        track: "brand",
        name: "Brand",
        items: [
          {
            name: "Sole for younger learners",
            note: "Character, illustration and tone for that audience",
          },
          {
            name: "Design system v1",
            note: "The shadcn system at v1: XP, streaks, badges, levels, illustration",
          },
        ],
      },
      {
        track: "product",
        name: "Product",
        items: [
          {
            name: "Learning path",
            note: "Short daily lessons, streaks and levels on a phone",
          },
          {
            name: "Sole in the product",
            note: "The agent as the guide in lessons and mobile building",
          },
          {
            name: "Phase 2 surfaces",
            note: "Client generator, seeds on 1.x, mainnet costs, timed to dev",
          },
        ],
      },
    ],
  },
  {
    id: "ranked",
    kind: "ranked",
    ground: "paper",
    title: "How it's ranked",
    note: "MoSCoW sets what Q4 commits to. RICE orders the work inside each group: reach × impact × confidence ÷ effort.",
    groups: [
      {
        name: "Must",
        items: [
          { name: "First run and status", track: "product", score: 160 },
          { name: "Four flow bugs", track: "product", score: 160 },
          { name: "Accessibility pass", track: "product", score: 100 },
          { name: "Deploy and interact", track: "product", score: 96 },
          { name: "Final landing", track: "brand", score: 80 },
          { name: "Signed-in states", track: "product", score: 75 },
          { name: "The assistant in use", track: "product", score: 72 },
          { name: "Brand guides", track: "brand", score: 67 },
          { name: "Failure and empty states", track: "product", score: 67 },
          { name: "Design system v0", track: "brand", score: 53 },
          { name: "Usability round 1", track: "product", score: 53 },
          { name: "Usability round 2", track: "product", score: 53 },
          { name: "Sign-in and models", track: "product", score: 47 },
          { name: "Full tutorial pass", track: "product", score: 43 },
          { name: "Design system iteration", track: "brand", score: 40 },
          { name: "Share through GitHub", track: "product", score: 40 },
        ],
      },
      {
        name: "Should",
        items: [
          { name: "Motion guidelines", track: "brand", score: 50 },
          { name: "Desktop on lighter type", track: "product", score: 40 },
          { name: "Social kit", track: "brand", score: 32 },
          { name: "Profiles and achievements", track: "product", score: 32 },
          { name: "Gamification system", track: "product", score: 30 },
          { name: "Sole, the agent's brand", track: "brand", score: 22 },
          { name: "Mobile without code", track: "product", score: 19 },
        ],
      },
      {
        name: "Could",
        items: [
          { name: "Pattern joins", track: "brand", score: 13 },
          { name: "Tablet and landscape", track: "product", score: 6 },
        ],
      },
      {
        name: "Won't (Q1)",
        items: [
          { name: "Design system v1", track: "brand", score: 27 },
          { name: "Sole in the product", track: "product", score: 23 },
          { name: "Phase 2 surfaces", track: "product", score: 13 },
          { name: "Sole for younger learners", track: "brand", score: 10 },
          { name: "Learning path", track: "product", score: 4 },
        ],
      },
    ],
  },
  {
    id: "q4-sprints",
    kind: "board",
    ground: "paper",
    title: "Q4 in sprints",
    note: "Two weeks each, Monday to Friday. S0 is this week.",
    sprints: [
      { name: "S0", date: "Sep 29" },
      { name: "S1", date: "Oct 5" },
      { name: "S2", date: "Oct 19" },
      { name: "S3", date: "Nov 2" },
      { name: "S4", date: "Nov 16" },
      { name: "S5", date: "Nov 30" },
      { name: "S6", date: "Dec 14" },
    ],
    gates: [
      { at: 3.8, name: "Freeze", note: "Nov 11" },
      {
        at: 4,
        to: 4.2,
        name: "Breakpoint",
        note: "Nov 15 to 17",
        accent: true,
      },
    ],
    /* Packed so that work that never overlaps shares a row; S4 starts on
       the 18th, after the event */
    lanes: [
      {
        track: "brand",
        name: "Brand",
        rows: [
          [
            { name: "Brand guides", from: 0, to: 3 },
            { name: "Motion guidelines", from: 4.2, to: 5 },
            { name: "Sole, the agent's brand", from: 5, to: 7 },
          ],
          [
            { name: "Final landing", from: 1, to: 3.8 },
            { name: "Social kit", from: 4.5, to: 6 },
          ],
          [
            { name: "Design system v0", from: 1, to: 3.8 },
            { name: "Design system iteration", from: 4.2, to: 7 },
          ],
        ],
      },
      {
        track: "product",
        name: "Product",
        rows: [
          [
            { name: "Four flow bugs", from: 0, to: 1 },
            { name: "Deploy and interact", from: 1, to: 3 },
            { name: "Failure and empty states", from: 3, to: 3.8 },
            { name: "Sign-in and models", from: 4.2, to: 5 },
            { name: "Gamification system", from: 5, to: 6 },
            { name: "Usability round 2", from: 6, to: 7 },
          ],
          [
            { name: "Signed-in states", from: 1, to: 2 },
            { name: "The assistant in use", from: 2, to: 3 },
            { name: "Accessibility pass", from: 3, to: 3.8 },
            { name: "Profiles and achievements", from: 4.2, to: 6 },
          ],
          [
            { name: "Usability round 1", from: 1, to: 3 },
            { name: "First run and status", from: 3, to: 3.8 },
            { name: "Full tutorial pass", from: 4.2, to: 7 },
          ],
          [
            { name: "Share through GitHub", from: 2, to: 3 },
            { name: "Desktop on lighter type", from: 3, to: 3.8 },
            { name: "Mobile without code", from: 5, to: 7 },
          ],
        ],
      },
    ],
  },
  {
    id: "q1-sprints",
    kind: "board",
    ground: "paper",
    title: "Q1 in sprints",
    note: "Planned two sprints at a time, from what Q4 teaches.",
    sprints: [
      { name: "S7", date: "Jan 4" },
      { name: "S8", date: "Jan 18" },
      { name: "S9", date: "Feb 1" },
      { name: "S10", date: "Feb 15" },
      { name: "S11", date: "Mar 1" },
      { name: "S12", date: "Mar 15" },
    ],
    lanes: [
      {
        track: "brand",
        name: "Brand",
        rows: [
          [
            { name: "Sole for younger learners", from: 0, to: 2 },
            { name: "Design system v1", from: 2, to: 5 },
          ],
        ],
      },
      {
        track: "product",
        name: "Product",
        rows: [
          [
            { name: "Learning path: research", from: 0, to: 2 },
            { name: "Learning path: design", from: 2, to: 4 },
            { name: "Learning path: testing", from: 4, to: 6 },
          ],
          [
            { name: "Phase 2 surfaces", from: 0, to: 2 },
            { name: "Sole in the product", from: 2, to: 4 },
          ],
        ],
      },
    ],
  },
  {
    id: "specs",
    kind: "row",
    ground: "paper",
    title: "Design specs",
    note: "One per core idea, written the way product writes them: problem, goal, flow, states, and when it is done.",
    perRow: 4,
    items: [
      {
        name: "Design system on shadcn and Tailwind",
        note: "Tokens and components, one library in Figma and code",
      },
      { name: "Final landing", note: "The page Breakpoint visitors arrive on" },
      {
        name: "Deploy and interact",
        note: "0 SOL on devnet through Kora, forms from the IDL",
      },
      {
        name: "First run and status",
        note: "One click into a running example",
      },
      {
        name: "The assistant across the IDE",
        note: "Explain and Fix, every patch reviewed first",
      },
      {
        name: "Sign-in and connected models",
        note: "GitHub, then Claude or Codex, no pasted keys",
      },
      {
        name: "Profiles, achievements, gamification",
        note: "Progress that took real work",
      },
      {
        name: "Full tutorial pass",
        note: "Every tutorial stepped, on Anchor 1.2",
      },
      {
        name: "Mobile without code",
        note: "Describe, adjust and deploy from a phone",
      },
      { name: "Sole", note: "The agent's name, voice and mark" },
      {
        name: "Learning path",
        note: "A lesson a day, for a younger audience",
      },
    ],
  },
  {
    id: "start",
    kind: "goals",
    ground: "paper",
    title: "What we need to start",
    note: "The first this week, in S0; the others before the work that waits on them.",
    columns: [
      {
        items: [
          {
            name: "How Playground shows up at Breakpoint",
            note: "Talk, booth, demo or launch post: it sets the landing's announcement",
          },
          {
            name: "How the design system lands in code",
            note: "shadcn and Tailwind in the product, or its tokens mapped into the theme",
          },
          {
            name: "Sign-off on the mark, lockup and palette",
            note: "Before design system v0 locks them into tokens, in S1",
          },
          {
            name: "What a first-time visitor lands on",
            note: "Dev's Decision 4, the IDE or the learning shell at /, before S3",
          },
        ],
      },
    ],
  },
  {
    id: "today",
    kind: "signpost",
    ground: "paper",
    lines: ["Where It", "Stands Today"],
    cta: "Open the product",
    exit: "product",
    scale: 0.66,
    note: "The prototype going into S1.",
  },
];
