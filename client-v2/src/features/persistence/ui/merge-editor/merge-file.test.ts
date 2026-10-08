import { merge3 } from "../../model/merge";
import { FOLD_CONTEXT, MergeFile } from "./merge-file";
import type { FileConflict } from "../../model/merge";
import type { TextEdit } from "./merge-file";

/**
 * The result's editor, reduced to its text: every edit the file hands out is
 * applied here, and the two must agree after each step. That is the contract
 * the Monaco controller relies on when it mirrors edits into its model.
 */
const fakeModel = (text: string) => {
  const model = {
    value: text,
    apply(edit: TextEdit | null) {
      if (!edit) return;
      model.value =
        model.value.slice(0, edit.start) +
        edit.text +
        model.value.slice(edit.end);
    },
  };
  return model;
};

/** A file of numbered lines, `line 1` to `line n`, with no final newline */
const numbered = (n: number) =>
  Array.from({ length: n }, (_, i) => `line ${i + 1}`).join("\n");

/** `text` with 1-based line `at` replaced */
const withLine = (text: string, at: number, line: string) =>
  text
    .split("\n")
    .map((l, i) => (i === at - 1 ? line : l))
    .join("\n");

/** A `lines` conflict made by the real merge, as the sync model makes it */
const linesConflict = (
  base: string,
  ours: string,
  theirs: string,
  path = "src/lib.rs"
): FileConflict => {
  const merged = merge3(base, ours, theirs);
  if (merged.kind !== "conflict") throw new Error("expected a conflict");
  return {
    kind: "lines",
    path,
    chunks: merged.chunks,
    localHash: "local-hash",
    serverHash: "server-hash",
  };
};

const BASE = numbered(20);
/** Both devices changed line 12; the other device also changed line 3 */
const OURS = withLine(BASE, 12, "line 12 here");
const THEIRS = withLine(withLine(BASE, 3, "line 3 there"), 12, "line 12 there");

const openFile = () => {
  const file = MergeFile.from(linesConflict(BASE, OURS, THEIRS));
  return { file, model: fakeModel(file.result) };
};

describe("MergeFile panes", () => {
  it("joins the chunks into each pane, the result starting from the base", () => {
    const { file } = openFile();
    expect(file.left).toBe(withLine(OURS, 3, "line 3 there"));
    expect(file.right).toBe(THEIRS);
    // Line 3 merged on its own; line 12 is the question
    expect(file.result).toBe(withLine(BASE, 3, "line 3 there"));
    expect(file.hunks).toHaveLength(1);
    expect(file.unresolved).toBe(1);
  });

  it("keeps \\r\\n and a missing final newline byte for byte", () => {
    const crlf = (s: string) => s.split("\n").join("\r\n");
    const file = MergeFile.from(
      linesConflict(crlf(BASE), crlf(OURS), crlf(THEIRS))
    );
    expect(file.right).toBe(crlf(THEIRS));
    expect(file.result.endsWith("line 20")).toBe(true);
  });
});

describe("MergeFile hunk state", () => {
  it("takes both sides, this device's lines first, whichever is taken first", () => {
    for (const order of [
      ["left", "right"],
      ["right", "left"],
    ] as const) {
      const { file, model } = openFile();
      for (const side of order) {
        model.apply(file.take(0, side));
        expect(model.value).toBe(file.result);
      }
      expect(file.result.split("\n").slice(10, 14)).toEqual([
        "line 11",
        "line 12 here",
        "line 12 there",
        "line 13",
      ]);
      expect(file.unresolved).toBe(0);
    }
  });

  it("is unresolved while one side is still pending", () => {
    const { file, model } = openFile();
    model.apply(file.take(0, "left"));
    expect(file.result).toBe(withLine(file.left, 12, "line 12 here"));
    expect(file.unresolved).toBe(1);
    model.apply(file.dismiss(0, "right"));
    expect(model.value).toBe(file.result);
    expect(file.result).toBe(file.left);
    expect(file.unresolved).toBe(0);
  });

  it("keeps the base when both sides are dismissed", () => {
    const { file, model } = openFile();
    const before = file.result;
    model.apply(file.dismiss(0, "left"));
    model.apply(file.dismiss(0, "right"));
    expect(model.value).toBe(before);
    expect(file.result).toBe(before);
    expect(file.unresolved).toBe(0);
  });

  it("goes back to a snapshot, the hunk open to decide again", () => {
    const { file } = openFile();
    const before = file.snapshot();
    const hunk = file.hunks[0].hunk;
    file.take(0, "left");
    file.dismiss(0, "right");
    const after = file.snapshot();

    file.restore(before);
    expect(file.result).toBe(withLine(BASE, 3, "line 3 there"));
    expect(file.unresolved).toBe(1);
    // The same hunk, so a lookup made before the undo still finds it
    expect(file.hunks[0].hunk).toBe(hunk);
    expect(file.take(0, "right")).not.toBeNull();

    file.restore(after);
    expect(file.result).toBe(file.left);
    expect(file.unresolved).toBe(0);
  });

  it("ignores a second answer for a side already decided", () => {
    const { file } = openFile();
    file.take(0, "left");
    expect(file.take(0, "left")).toBeNull();
    expect(file.dismiss(0, "left")).toBeNull();
    expect(file.hunks[0].hunk.left).toBe("taken");
  });

  it("counts a hunk typed over as resolved, and takes nothing into it after", () => {
    const { file, model } = openFile();
    model.value = withLine(model.value, 12, "typed by hand");
    file.userEdit(model.value);
    expect(file.hunks[0].hunk.edited).toBe(true);
    expect(file.unresolved).toBe(0);
    expect(file.take(0, "right")).toBeNull();
    expect(file.result).toBe(model.value);
  });

  it("does not count an edit elsewhere as answering the hunk", () => {
    const { file, model } = openFile();
    model.value = withLine(model.value, 1, "line 1, edited");
    file.userEdit(model.value);
    expect(file.hunks[0].hunk.edited).toBe(false);
    expect(file.unresolved).toBe(1);
    // ...and the hunk is still where it was, so taking still lands on it
    model.apply(file.take(0, "left"));
    expect(model.value).toBe(file.result);
    expect(file.result.split("\n")[11]).toBe("line 12 here");
  });

  it("follows lines added above a hunk", () => {
    const { file, model } = openFile();
    model.value = `added 1\nadded 2\n${model.value}`;
    file.userEdit(model.value);
    expect(file.starts("result").starts[file.hunks[0].segment]).toBe(13);
    model.apply(file.take(0, "right"));
    expect(model.value).toBe(file.result);
    expect(file.result.split("\n")[13]).toBe("line 12 there");
  });

  it("counts a line typed right after the hunk as editing it", () => {
    const { file, model } = openFile();
    const lines = model.value.split("\n");
    lines.splice(12, 0, "a new line");
    model.value = lines.join("\n");
    file.userEdit(model.value);
    expect(file.hunks[0].hunk.edited).toBe(true);
    expect(file.hunks[0].hunk.lines.result).toBe(2);
  });
});

describe("MergeFile without hunks", () => {
  it("deletes the file when the side that deleted it is taken", () => {
    const file = MergeFile.from({
      kind: "whole",
      path: "src/old.rs",
      local: "edited here\n",
      localHash: "l",
    });
    const model = fakeModel(file.result);
    expect(file.deleted).toEqual({ left: false, right: true });
    expect(file.result).toBe("edited here\n");

    model.apply(file.take(0, "right"));
    expect(model.value).toBe("");
    // One of two files, not lines to add: the other side is left out
    expect(file.hunks[0].hunk.left).toBe("dismissed");
    expect(file.unresolved).toBe(0);
    expect(file.resolved()).toEqual({ content: null, localHash: "l" });
  });

  it("starts empty when this device deleted it, and keeps it when taken", () => {
    const file = MergeFile.from({
      kind: "whole",
      path: "src/old.rs",
      server: "edited there",
      serverHash: "s",
    });
    const model = fakeModel(file.result);
    expect(file.result).toBe("");
    model.apply(file.take(0, "right"));
    expect(model.value).toBe("edited there");
    expect(file.resolved()).toEqual({
      content: "edited there",
      serverHash: "s",
    });
  });

  it("starts from this device's copy when both have one", () => {
    const file = MergeFile.from({
      kind: "whole",
      path: "src/lib.rs",
      local: "mine",
      server: "theirs",
      localHash: "l",
      serverHash: "s",
    });
    expect(file.result).toBe("mine");
    file.take(0, "left");
    expect(file.unresolved).toBe(1);
    file.take(0, "right");
    expect(file.result).toBe("mine\ntheirs");
    expect(file.resolved()).toEqual({
      content: "mine\ntheirs",
      localHash: "l",
      serverHash: "s",
    });
  });
});

describe("MergeFile folds", () => {
  it("folds the lines far from a conflict deep in a long file", () => {
    const base = numbered(300);
    const file = MergeFile.from(
      linesConflict(
        base,
        withLine(base, 200, "line 200 here"),
        withLine(base, 200, "line 200 there")
      )
    );
    const folds = file.folds();
    expect(folds.map((f) => [f.start.result, f.count])).toEqual([
      [0, 199 - FOLD_CONTEXT],
      // The last line stays, for the fold's control to sit above
      [200 + FOLD_CONTEXT, 100 - FOLD_CONTEXT - 1],
    ]);
  });

  it("leaves a settled run whole once its result is edited", () => {
    const base = numbered(300);
    const file = MergeFile.from(
      linesConflict(
        base,
        withLine(base, 200, "line 200 here"),
        withLine(base, 200, "line 200 there")
      )
    );
    file.userEdit(`new first line\n${file.result}`);
    expect(file.folds()).toHaveLength(1);
  });
});
