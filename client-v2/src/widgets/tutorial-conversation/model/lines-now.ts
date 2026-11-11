import type { Wrote } from "@/features/tutorial-conversation";

/**
 * Where a landed block's lines are in the file now, in the order of
 * `wrote.lines`: the saved lines moved by as many rows as the learner added
 * or took away above the block. The block is found by its saved text, every
 * row at the same distance from the first as when it landed; of several
 * places that match, the one nearest the saved one wins. Without saved text,
 * or when the file no longer holds the block as written (edited or deleted),
 * these are the saved lines.
 */
export const linesNow = (
  wrote: Wrote,
  content: string | undefined
): number[] => {
  const { lines, text } = wrote;
  if (!text || !lines.length || content === undefined) return lines;
  const rows = content.split("\n");
  const first = Math.min(...lines);
  const matchesAt = (shift: number) =>
    lines.every((line, i) => rows[line + shift - 1] === text[i]);
  // Nearest first: 0, then -1 and +1, -2 and +2, and so on, across the file
  for (let distance = 0; distance < rows.length; distance++) {
    for (const shift of distance ? [-distance, distance] : [0]) {
      if (first + shift >= 1 && matchesAt(shift)) {
        return lines.map((line) => line + shift);
      }
    }
  }
  return lines;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("widgets/tutorial-conversation/model/lines-now", () => {
    const BLOCK = ["fn hello() {", '    msg!("Hi");', "}"];
    const wrote: Wrote = { file: "src/lib.rs", lines: [3, 4, 5], text: BLOCK };
    const file = (...rows: string[]) => rows.join("\n");

    it("keeps the saved lines while the block is where it landed", () => {
      expect(linesNow(wrote, file("use x;", "", ...BLOCK))).toEqual([3, 4, 5]);
    });

    it("follows the block when the learner adds or takes away lines above it", () => {
      expect(
        linesNow(wrote, file("use x;", "use y;", "use z;", "", ...BLOCK))
      ).toEqual([5, 6, 7]);
      expect(linesNow(wrote, file(...BLOCK, "", "// end"))).toEqual([1, 2, 3]);
    });

    it("takes the place nearest the saved one when the block appears twice", () => {
      // Saved at 3 to 5: a copy 2 rows up beats one 4 rows down
      const twice = file(...BLOCK, "", "", "", "", ...BLOCK);
      expect(linesNow(wrote, twice)).toEqual([1, 2, 3]);
      // Saved at 6 to 8: now the lower copy, at 8 to 10, is nearer
      const later: Wrote = {
        file: "src/lib.rs",
        lines: [6, 7, 8],
        text: BLOCK,
      };
      expect(linesNow(later, twice)).toEqual([8, 9, 10]);
    });

    it("keeps the saved lines once the block was edited or deleted", () => {
      expect(
        linesNow(wrote, file("use x;", "", "fn hello() {", "    mine();", "}"))
      ).toEqual([3, 4, 5]);
      // Moved down and edited: its first row alone does not make it the block
      expect(
        linesNow(
          wrote,
          file("use x;", "use y;", "", "fn hello() {", "    mine();", "}")
        )
      ).toEqual([3, 4, 5]);
      expect(linesNow(wrote, file("use x;"))).toEqual([3, 4, 5]);
      expect(linesNow(wrote, undefined)).toEqual([3, 4, 5]);
    });

    it("keeps the saved lines for a landing without text", () => {
      expect(
        linesNow({ file: "src/lib.rs", lines: [3, 4, 5] }, file(...BLOCK))
      ).toEqual([3, 4, 5]);
    });

    it("follows a block whose lines are not one run, keeping their gaps", () => {
      const split: Wrote = {
        file: "src/lib.rs",
        lines: [4, 2],
        text: ["b", "a"],
      };
      expect(linesNow(split, file("x", "y", "a", "kept", "b"))).toEqual([5, 3]);
    });
  });
}
