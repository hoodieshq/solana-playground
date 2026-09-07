# House style for team-facing artifacts

Every page we publish for the team or the customer - the status board,
the digest, a walkthrough, a call-prep page - looks like one system,
and that system is the product's own: `client-v2`'s default theme
(`Solana V2`, dark). The status board is the reference implementation:
https://claude.ai/code/artifact/d7db5420-2295-4698-b0a1-9d9c03056448.
When in doubt, copy from it rather than invent. Decision: D35.

## Why

Three artifacts in three visual systems read as three unrelated
documents, and a reader has to re-learn each. One system means the
board, the digest and whatever comes next read as views of the same
thing - and the thing is the product, so the pages carry its identity
without saying so.

## Tokens - copy this block verbatim

```css
:root {
  --ground: #09080c;      --surface: #121017;     --raised: #1a1721;
  --line: rgba(236, 228, 253, 0.10);
  --line-2: rgba(236, 228, 253, 0.22);
  --ink: #ecebf1;         --ink-2: #a09cae;       --ink-3: #78728a;
  --accent: #9945ff;      --accent-soft: rgba(153, 69, 255, 0.16);
  --done: #14f195;        --review: #80ecff;      --active: #b57bff;
  --next: #8a84a0;        --waiting: #ffd666;     --parked: #5d576e;
  --milestone: #ff4d6a;
  --chrome: "Space Grotesk", -apple-system, BlinkMacSystemFont,
            "Segoe UI", Helvetica, Arial, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo,
          Consolas, monospace;
  --pad: clamp(18px, 4vw, 44px);
  color-scheme: dark;
}
```

Fonts come from Google Fonts (the one host the artifact sandbox
allows): `Space+Grotesk:wght@400;500;700` and
`JetBrains+Mono:wght@400;500;700`.

**One committed dark look.** The product is dark by default, so the
artifacts are too. No light theme, no `prefers-color-scheme` switch -
`color-scheme: dark` and an explicit `background` on `body`, so the
page holds on any host ground.

## Type

- `--chrome` for everything read: body 14.5px / 1.5, `h1`
  `clamp(1.7rem, 3.6vw, 2.5rem)` weight 700 letter-spacing -0.02em,
  `h3` 15px / 600.
- `--mono` for everything looked up: eyebrows, dates, counts, ids,
  chips, footers. Eyebrow: 10.5px, weight 500, letter-spacing 0.14em,
  uppercase, `--ink-3`. Numbers that line up use
  `font-variant-numeric: tabular-nums`.
- Body copy in `--ink-2`; `b` is `--ink` at weight 500, not bold.
  Links are `--review`, no underline until hover.

## Building blocks

- **Section header** - `.rule`: an eyebrow, an optional hint in
  `--ink-3` 12.5px, and a 1px `--line` that fills the rest of the row.
- **Card** - 1px `--line` border, radius 12-14px, `--surface` fill,
  13-16px padding. Cards in a grid use `repeat(auto-fit,
  minmax(290-340px, 1fr))` and 10px gap. `--raised` is for a card
  inside a card or a dashed "queue" note.
- **The lit block** - "where we are now" / "focus now": 1px border
  `rgba(181,123,255,0.55)`, radius 14px, a top-down purple wash
  `linear-gradient(180deg, rgba(153,69,255,0.09),
  rgba(153,69,255,0.02) 60%)` over `--surface`. One per page.
- **Status chips** - pill (radius 999px), mono 10px uppercase,
  letter-spacing 0.08em, a glyph before the word. **State is shape and
  word, never colour alone.** The vocabulary and its glyphs:
  `done` filled green circle · `review` hollow cyan ring · `draft` red
  square · `active` purple square · `next` dashed grey square ·
  `waiting <who>` amber triangle · `parked` dashed border, grey dot.
- **Closed-questions block** - the same shape as the lit block in
  `--done` at 0.4 border / 0.05 fill, with check marks in mono.
- **Footer** - mono 11px `--ink-3`, begins `INTERNAL - for syncs`,
  names the written source.

## Content rules by artifact class

- **The status board** carries everything: decision numbers, PR
  numbers, paths, estimates, owners, the calendar.
- **A digest for the team** carries none of the codes. No `D31`, no
  `#22`, no `/api/build`, no `<code>`. Every item is named by what it
  does, in words a reader outside the repository understands on the
  first pass, with no footnotes and no links needed to follow it.
  Product names (Vercel, GitHub, Solana, Hello Anchor) are words, not
  codes, and stay.
- **Both** are dated in the header (day N of 28, the next checkpoint)
  and regenerated together with `docs/roadmap.md` - the roadmap lists
  their URLs at the top.

## The one exception

A **personal, unshared page** (the private flight deck) departs from
this system on purpose - different faces, a light ground, a steel-blue
accent - so its owner can never mistake it for a page that is safe to
share. That is a feature of the exception, not a lapse in the rule.
