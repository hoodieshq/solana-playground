import type * as monaco from "monaco-editor";

import type { EditorBuffers } from "../../../utils/explorer/types";

/** The part of a Monaco model the buffers need, so tests can stand one in */
export type BufferModel = Pick<
  monaco.editor.ITextModel,
  "uri" | "getValue" | "getFullModelRange" | "pushEditOperations" | "dispose"
>;

/**
 * Monaco's models, as the explorer's `EditorBuffers`.
 *
 * Matched on `uri.path`, the same key the editor's own open-file handler uses
 * to decide whether a model exists already -- which is exactly the reuse that
 * made a rewritten file go on showing its old text.
 *
 * Kept apart from `Monaco.tsx`, and typed against a model's shape rather than
 * the library, so it can be tested without loading Monaco itself.
 */
export const editorBuffersOf = (
  getModels: () => BufferModel[]
): EditorBuffers => {
  const find = (path: string) =>
    getModels().find((model) => model.uri.path === path);

  return {
    read: (path) => find(path)?.getValue(),
    write: (path, content) => {
      const model = find(path);
      if (!model || model.getValue() === content) return;
      // An edit rather than `setValue`, so the user can still undo past it,
      // and so the editor's change listener -- autosave -- sees it and writes
      // the new text rather than a stale one
      model.pushEditOperations(
        [],
        [{ range: model.getFullModelRange(), text: content }],
        () => null
      );
    },
    discard: (path) => find(path)?.dispose(),
  };
};
