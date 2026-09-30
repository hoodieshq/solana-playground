import { editorBuffersOf } from "./editor-buffers";
import type { BufferModel } from "./editor-buffers";

/** A model with just enough of Monaco's surface to be edited and read back */
const modelAt = (path: string, text: string) => {
  let value = text;
  const model = {
    uri: { path },
    getValue: () => value,
    getFullModelRange: () => ({ whole: path }),
    pushEditOperations: jest.fn(
      (_selections: unknown, edits: Array<{ text: string }>) => {
        value = edits[0].text;
        return null;
      }
    ),
    dispose: jest.fn(),
  };
  return model as unknown as BufferModel & typeof model;
};

interface Position {
  lineNumber: number;
  column: number;
}
interface Edit {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  text: string;
}

/**
 * A model that applies edits the way Monaco does, caret included: an edit
 * wholly before the caret shifts it, and one that covers it leaves it at the
 * edit's end -- which, for a whole-file replace, is the end of the file.
 */
const editableModel = (path: string, text: string) => {
  let value = text;
  const offsetAt = ({ lineNumber, column }: Position) => {
    const lines = value.split("\n");
    let offset = 0;
    for (let i = 0; i < lineNumber - 1; i++) offset += lines[i].length + 1;
    return offset + column - 1;
  };
  const model = {
    uri: { path },
    caret: 0,
    getValue: () => value,
    getPositionAt: (offset: number): Position => {
      const lines = value.slice(0, offset).split("\n");
      return {
        lineNumber: lines.length,
        column: lines[lines.length - 1].length + 1,
      };
    },
    getFullModelRange: () => {
      const lines = value.split("\n");
      return {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: lines.length,
        endColumn: lines[lines.length - 1].length + 1,
      };
    },
    pushEditOperations: jest.fn((_selections: unknown, edits: Edit[]) => {
      const spans = edits
        .map((edit) => ({
          start: offsetAt({
            lineNumber: edit.range.startLineNumber,
            column: edit.range.startColumn,
          }),
          end: offsetAt({
            lineNumber: edit.range.endLineNumber,
            column: edit.range.endColumn,
          }),
          text: edit.text,
        }))
        .sort((a, b) => b.start - a.start);
      let caret = model.caret;
      for (const { start, end, text } of spans) {
        value = value.slice(0, start) + text + value.slice(end);
        if (caret >= end) caret += text.length - (end - start);
        else if (caret > start) caret = start + text.length;
      }
      model.caret = caret;
      return null;
    }),
    dispose: jest.fn(),
  };
  return model as unknown as BufferModel & typeof model;
};

describe("editorBuffersOf", () => {
  it("reads the model the editor would reuse for a path", () => {
    const models = [modelAt("/p/src/lib.rs", "old")];
    const buffers = editorBuffersOf(() => models);

    expect(buffers.read("/p/src/lib.rs")).toBe("old");
    expect(buffers.read("/p/src/other.rs")).toBeUndefined();
  });

  it("replaces a model's text as undoable edits", () => {
    // Not `setValue`, which would also throw away the undo stack
    const model = editableModel("/p/src/lib.rs", "old");
    const buffers = editorBuffersOf(() => [model]);

    buffers.write("/p/src/lib.rs", "new");

    expect(model.getValue()).toBe("new");
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      [],
      expect.any(Array),
      expect.any(Function)
    );
  });

  it("keeps the caret where it was when the other device's lines are elsewhere", () => {
    // Sync folds what the user is typing into the other device's copy while
    // they type. Replacing the whole model collapsed the caret to the end of
    // the file, so the next keystrokes landed there -- and were autosaved and
    // uploaded there.
    const before = "one\ntwo\nthree typing|\nfour\nfive\n";
    const after = "ONE\ntwo\nthree typing|\nfour\nFIVE\n";
    const model = editableModel("/p/src/lib.rs", before);
    model.caret = before.indexOf("|");

    editorBuffersOf(() => [model]).write("/p/src/lib.rs", after);

    expect(model.getValue()).toBe(after);
    expect(model.caret).toBe(after.indexOf("|"));
    // Still edits, so they stay on the undo stack -- and one per change
    expect(model.pushEditOperations).toHaveBeenCalledTimes(1);
    expect(model.pushEditOperations.mock.calls[0][1]).toHaveLength(2);
  });

  it("rewrites a file whose ends changed, byte for byte", () => {
    const model = editableModel("/p/a", "a\nb\nc");
    const buffers = editorBuffersOf(() => [model]);

    buffers.write("/p/a", "a\nb\nc\n");
    expect(model.getValue()).toBe("a\nb\nc\n");
    buffers.write("/p/a", "x\r\nb\n");
    expect(model.getValue()).toBe("x\r\nb\n");
    buffers.write("/p/a", "");
    expect(model.getValue()).toBe("");
    buffers.write("/p/a", "new\nfile");
    expect(model.getValue()).toBe("new\nfile");
  });

  it("leaves a model that already holds the text alone", () => {
    // An edit fires the editor's change listener, and so an autosave
    const model = modelAt("/p/src/lib.rs", "same");
    editorBuffersOf(() => [model]).write("/p/src/lib.rs", "same");

    expect(model.pushEditOperations).not.toHaveBeenCalled();
  });

  it("disposes the model of a file that is gone", () => {
    const model = modelAt("/p/src/gone.rs", "x");
    editorBuffersOf(() => [model]).discard("/p/src/gone.rs");

    expect(model.dispose).toHaveBeenCalled();
  });
});
