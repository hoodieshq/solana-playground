import { PgCommon } from "./common";

export class PgEditor {
  /** All editor event names */
  static readonly events = {
    FOCUS: "editorfocus",
    FORMAT: "editorformat",
    REVEAL_LINE: "editorrevealline",
  };

  /** Focus the editor. */
  static focus() {
    PgCommon.createAndDispatchCustomEvent(PgEditor.events.FOCUS);
  }

  /**
   * Scroll the open file so `line` sits a third of the way down the editor,
   * with the caret at its start. Only the file already open moves: a file
   * being opened reads its saved position instead.
   *
   * @param line 1-based line number
   */
  static revealLine(line: number) {
    PgCommon.createAndDispatchCustomEvent(PgEditor.events.REVEAL_LINE, {
      line,
    });
  }
}
