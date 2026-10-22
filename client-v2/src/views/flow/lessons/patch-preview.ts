import * as monaco from "monaco-editor";

import { PgAssistant } from "../../sidebar/assistant/store";
import type { PatchApproval } from "../../sidebar/assistant/store";
import { BRAND } from "../tokens";
import type { Disposable } from "../../../utils";

const STYLE_ID = "pg-patch-preview";

/* Removed lines struck through on red, added ones in a zone of green under
   them: the same reading as the approval card's diff, laid into the file */
const CSS = `
.pg-patch-removed { background: rgba(255, 92, 92, 0.12); }
.pg-patch-removed-text { text-decoration: line-through; opacity: 0.6; }
.pg-patch-gutter-removed { border-left: 2px solid rgba(255, 92, 92, 0.7); }
.pg-patch-zone {
  background: ${BRAND.green}14;
  border-left: 2px solid ${BRAND.green}b3;
  box-sizing: border-box;
  overflow: hidden;
}
.pg-patch-zone > div {
  white-space: pre;
  color: inherit;
  opacity: 0.92;
}
`;

/**
 * The pending patch, shown in the file it changes.
 *
 * The approval card in the chat holds the diff, but the learner's eyes are
 * on the code. While a patch to the open file waits for Apply or Reject, the
 * editor shows it in place: the lines it takes out struck through, the lines
 * it brings in on green right where they will land. Reviewers of the first
 * prototype asked to keep exactly this. Nothing is written: Apply in the
 * card is still the only way the file changes, and the preview clears the
 * moment the card is answered.
 */
export class PgPatchPreview {
  static init(): Disposable {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    const sync = () => PgPatchPreview._sync();
    const store = PgAssistant.onDidChange(sync);
    const editors = monaco.editor.onDidCreateEditor((e) => {
      e.onDidChangeModel(sync);
    });
    // The open file can change under a waiting card
    const models = monaco.editor
      .getEditors()
      .map((e) => e.onDidChangeModel(sync));
    sync();

    return {
      dispose: () => {
        store.dispose();
        editors.dispose();
        models.forEach((m) => m.dispose());
        PgPatchPreview._clear();
      },
    };
  }

  private static _shown: {
    editor: monaco.editor.ICodeEditor;
    decorations: string[];
    zone: string | null;
  } | null = null;

  private static _sync() {
    const pending = [...PgAssistant.items]
      .reverse()
      .find(
        (i) =>
          i.kind === "approval" &&
          i.status === "pending" &&
          i.request.type === "patch"
      );
    const patch =
      pending?.kind === "approval" && pending.request.type === "patch"
        ? pending.request
        : null;

    PgPatchPreview._clear();
    if (!patch) return;

    const editor = monaco.editor.getEditors()[0];
    const model = editor?.getModel();
    if (!editor || !model || !sameFile(model.uri.path, patch.path)) return;
    PgPatchPreview._show(editor, model, patch);
  }

  private static _show(
    editor: monaco.editor.ICodeEditor,
    model: monaco.editor.ITextModel,
    patch: PatchApproval
  ) {
    const before = model.getValue().split("\n");
    const after = patch.after.split("\n");
    const { start, removedEnd, addedEnd } = changedRange(before, after);
    const added = after.slice(start, addedEnd);

    const decorations = editor.deltaDecorations(
      [],
      before.slice(start, removedEnd).map((_, i) => ({
        range: new monaco.Range(start + i + 1, 1, start + i + 1, 1),
        options: {
          isWholeLine: true,
          className: "pg-patch-removed",
          inlineClassName: "pg-patch-removed-text",
          linesDecorationsClassName: "pg-patch-gutter-removed",
        },
      }))
    );

    let zone: string | null = null;
    if (added.length) {
      const node = document.createElement("div");
      node.className = "pg-patch-zone";
      const font = editor.getOption(monaco.editor.EditorOption.fontInfo);
      node.style.fontFamily = font.fontFamily;
      node.style.fontSize = `${font.fontSize}px`;
      node.style.lineHeight = `${font.lineHeight}px`;
      for (const line of added) {
        const row = document.createElement("div");
        row.textContent = line || " ";
        node.appendChild(row);
      }
      editor.changeViewZones((zones) => {
        zone = zones.addZone({
          // Under the last line taken out, or where the new lines go in
          afterLineNumber: removedEnd > start ? removedEnd : start,
          heightInLines: added.length,
          domNode: node,
        });
      });
      editor.revealLineInCenterIfOutsideViewport(Math.max(start, 1));
    }

    PgPatchPreview._shown = { editor, decorations, zone };
  }

  private static _clear() {
    const shown = PgPatchPreview._shown;
    if (!shown) return;
    shown.editor.deltaDecorations(shown.decorations, []);
    const { zone } = shown;
    if (zone) shown.editor.changeViewZones((zones) => zones.removeZone(zone));
    PgPatchPreview._shown = null;
  }
}

/** Whether an editor model's path is the patch's, which is project-relative */
const sameFile = (modelPath: string, patchPath: string) =>
  modelPath === `/${patchPath}` || modelPath.endsWith(`/${patchPath}`);

/**
 * The part of a file a patch changes: the common head and tail trimmed, the
 * rest taken out and put in. Exact for a small edit, "the middle changed" for
 * a rewrite, like the approval card's own diff.
 */
const changedRange = (before: string[], after: string[]) => {
  let start = 0;
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  ) {
    start++;
  }
  let removedEnd = before.length;
  let addedEnd = after.length;
  while (
    removedEnd > start &&
    addedEnd > start &&
    before[removedEnd - 1] === after[addedEnd - 1]
  ) {
    removedEnd--;
    addedEnd--;
  }
  return { start, removedEnd, addedEnd };
};
