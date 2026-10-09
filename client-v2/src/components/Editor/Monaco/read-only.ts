import type * as monaco from "monaco-editor";

import { createLogger } from "../../../shared/lib/logger";
import { PgEditor } from "../../../utils/editor";

const log = createLogger("editor:read-only");

/** Monaco's message controller; its built-in read-only text is replaced by ours */
const MESSAGE_CONTROLLER_ID = "editor.contrib.messageController";

/**
 * Monaco's built-in read-only listener. Contributions start lazily, so asking
 * for it here starts it, and its listener is then registered before ours and
 * runs first, leaving our message shown last.
 */
const BUILT_IN_READ_ONLY_ID = "editor.contrib.readOnlyMessageController";

/**
 * Not in monaco-editor's public typings (only the contribution id is), so the
 * one method used is declared here.
 */
interface MessageController {
  showMessage(message: string, position: monaco.IPosition): void;
}

/** What a phone user sees on trying to type */
export const READ_ONLY_MESSAGE = "Editing works on screens 600 px and wider";

/** The parts of the editor's layout the anchor reads, declared structurally */
interface EditorLayout {
  getVisibleRanges(): { startLineNumber: number }[];
  getModel(): { getLineCount(): number } | null;
}

/**
 * The message is anchored two lines below the first visible line, not at the
 * cursor: the widget shows above its anchor, so a cursor on line 1 would put
 * it above the editor, under the tab bar. Two lines because the widget is
 * taller than one line of text. Capped at the last line.
 */
const anchorOf = (editor: EditorLayout): monaco.IPosition => {
  const first = editor.getVisibleRanges()[0]?.startLineNumber ?? 1;
  const lineCount = editor.getModel()?.getLineCount() ?? 1;
  return { lineNumber: Math.min(first + 2, lineCount), column: 1 };
};

/**
 * Sets the editor read-only or editable, and on each attempt to type while
 * read-only shows `READ_ONLY_MESSAGE` and announces it as
 * `PgEditor.events.READ_ONLY_EDIT` so the layout shell can count it.
 *
 * The message goes through Monaco's message controller because 0.37 has no
 * `readOnlyMessage` option.
 */
export const applyReadOnly = (
  editor: EditorLayout &
    Pick<
      monaco.editor.IStandaloneCodeEditor,
      "updateOptions" | "onDidAttemptReadOnlyEdit"
    > & {
      getContribution(id: string): monaco.editor.IEditorContribution | null;
    },
  readOnly: boolean
): monaco.IDisposable => {
  editor.updateOptions({ readOnly });

  // Must come before our listener: see BUILT_IN_READ_ONLY_ID
  editor.getContribution(BUILT_IN_READ_ONLY_ID);

  return editor.onDidAttemptReadOnlyEdit(() => {
    const controller = editor.getContribution(
      MESSAGE_CONTROLLER_ID
    ) as MessageController | null;
    if (controller) {
      controller.showMessage(READ_ONLY_MESSAGE, anchorOf(editor));
    } else {
      log.debug("Message controller is missing; read-only text not shown");
    }

    document.dispatchEvent(new CustomEvent(PgEditor.events.READ_ONLY_EDIT));
  });
};
