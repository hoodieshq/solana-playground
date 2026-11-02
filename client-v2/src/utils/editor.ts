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
   * Scroll the editor so `line` sits a third of the way down, with the caret
   * at its start, if the file open in it is `path`; another file stays where
   * it is. A file being opened reads its saved position instead.
   *
   * @param path full path of the file the line is in
   * @param line 1-based line number
   */
  static revealLine(path: string, line: number) {
    PgCommon.createAndDispatchCustomEvent(PgEditor.events.REVEAL_LINE, {
      path,
      line,
    });
  }
}
