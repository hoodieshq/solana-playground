import type { Wrote } from "@/features/tutorial-conversation";

/**
 * How many rows a block must hold, other than blank lines and lone brackets,
 * before its text can name its place: one such row, an applied proposal's
 * `    }` say, matches too many places to follow
 */
const DISTINCT_ROWS = 2;

/** A row that says nothing about where it is: blank, or only brackets */
const isBare = (row: string) => /^[\s{}()[\];,]*$/.test(row);

/**
 * Where a landed block's lines are in the file now, in the order of
 * `wrote.lines`. The block is looked for by its saved text: every row at the
 * same distance from the first as when it landed, at the place nearest the
 * saved one (the upper one on a tie). An identical copy counts as the block.
 * The saved lines stand when the landing has no text, when the text holds
 * fewer than two rows that are neither blank nor bare brackets, and when no
 * place in the file holds the block as written (it was edited or deleted).
 */
export const linesNow = (
  wrote: Wrote,
  content: string | undefined
): number[] => {
  const { lines, text } = wrote;
  if (!text || !lines.length || content === undefined) return lines;
  if (text.filter((row) => !isBare(row)).length < DISTINCT_ROWS) return lines;
  const rows = content.split("\n");
  const first = Math.min(...lines);
  const last = Math.max(...lines);
  const matchesAt = (shift: number) =>
    lines.every((line, i) => rows[line + shift - 1] === text[i]);
  // Every shift that keeps the block inside the file, nearest first
  const up = first - 1;
  const down = rows.length - last;
  for (let distance = 0; distance <= Math.max(up, down); distance++) {
    for (const shift of distance ? [-distance, distance] : [0]) {
      if (-shift <= up && shift <= down && matchesAt(shift)) {
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

    it("follows a block moved up past the file's new length", () => {
      const far: Wrote = {
        file: "src/lib.rs",
        lines: [40, 41, 42],
        text: BLOCK,
      };
      expect(linesNow(far, file("use x;", ...BLOCK))).toEqual([2, 3, 4]);
    });

    it("keeps the saved lines of a block too bare to tell apart", () => {
      // One row, edited: the nearest other `    }` is not the one written
      const brace: Wrote = { file: "src/lib.rs", lines: [3], text: ["    }"] };
      expect(linesNow(brace, file("    }", "x", "    mine", "    }"))).toEqual([
        3,
      ]);
      // One named row is not enough either: `Ok(())` is in many functions
      const ok: Wrote = {
        file: "src/lib.rs",
        lines: [3],
        text: ["    Ok(())"],
      };
      expect(linesNow(ok, file("a", "b", "c", "    Ok(())"))).toEqual([3]);
      const blanks: Wrote = {
        file: "src/lib.rs",
        lines: [2, 3],
        text: ["", "}"],
      };
      expect(linesNow(blanks, file("", "}", "x", "", "}"))).toEqual([2, 3]);
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
