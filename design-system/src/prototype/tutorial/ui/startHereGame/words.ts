/* The words' steps, shared with the mini game so every state and every mechanic reads the same.
   One family for the three lines under the title, ordered by size, weight and colour: the label
   13px, the title a clear 24px in the headline face, the line 15px in the reading weight. The
   title sits a step under the page's own heading, so the banner never competes with it. Sizes in
   [] so cn keeps them beside a colour. Contrast on the banner's ground, measured where the words
   sit (phone to desktop): periwinkle label 5.9 to 6.4:1, muted label 6.0 to 6.5:1, line 7.6 to
   8.0:1, meta 5.3 to 5.5:1, title 14:1 */
export const WORDS = {
  label: "flex items-center gap-1.5 text-[0.8125rem] leading-[1.125rem]",
  // Balanced, so a hook that needs two lines splits evenly instead of leaving one word below
  title: "mt-1.5 font-heading text-[1.5rem] leading-[1.2] tracking-[-0.015em] text-balance text-foreground",
  // Leading of 20px on 15: tight enough to read as one block with the title, open enough for two lines
  line: "mt-2 font-label text-[0.9375rem] leading-5 text-pretty text-foreground/70",
  // The quietest line, the gallery cards' meta: who, how long, how far
  meta: "text-[0.75rem] leading-4 text-foreground/55 tabular-nums",
}

/** The words inside the play area that aren't code: a fix's label, a choice's meaning, a stop's
 * job, a verdict. The banner's label size, 13px, a step over the 12px code beside it. In [] so cn
 * keeps it next to a colour */
export const PLAY_WORDS = "font-sans text-[0.8125rem] leading-[1.125rem]"
