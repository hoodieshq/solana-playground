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

describe("editorBuffersOf", () => {
  it("reads the model the editor would reuse for a path", () => {
    const models = [modelAt("/p/src/lib.rs", "old")];
    const buffers = editorBuffersOf(() => models);

    expect(buffers.read("/p/src/lib.rs")).toBe("old");
    expect(buffers.read("/p/src/other.rs")).toBeUndefined();
  });

  it("replaces a model's text as one undoable edit over the whole file", () => {
    // Not `setValue`, which would also throw away the undo stack
    const model = modelAt("/p/src/lib.rs", "old");
    const buffers = editorBuffersOf(() => [model]);

    buffers.write("/p/src/lib.rs", "new");

    expect(model.getValue()).toBe("new");
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      [],
      [{ range: { whole: "/p/src/lib.rs" }, text: "new" }],
      expect.any(Function)
    );
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
