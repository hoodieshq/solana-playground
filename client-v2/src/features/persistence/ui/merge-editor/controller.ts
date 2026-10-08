import * as monaco from "monaco-editor";

import { mergeHunkVariants } from "@/shared/ui/merge";
import { canHideLines, setHiddenLines } from "./hidden-areas";
import { hunkLineClass } from "./hunk-class";
import type { MergeBand } from "@/shared/ui/merge";
import type { Fold, MergeFile, MergePane, TextEdit } from "./merge-file";
import type { Disposable } from "../../../../utils/types";

/** The scheme of the resolve view's models -- see `uriOf` */
export const MERGE_SCHEME = "pg-merge";

/** A fold's height, as `MergeFold` draws it */
const FOLD_PX = 24;

const PANES: readonly MergePane[] = ["left", "result", "right"];

/**
 * A pane's model's address: `pg-merge:left/src/lib.rs`.
 *
 * Its own scheme, so Monaco's registry never confuses it with the
 * explorer's `Uri.parse(path)` model of the same file. And no leading slash:
 * the explorer, `editor-buffers` and `PgEditorModels` find their models by
 * `uri.path` alone, and every explorer path starts with `/` -- so no lookup
 * of theirs can reach one of these, whatever a workspace is called.
 */
export const uriOf = (pane: MergePane, path: string) =>
  monaco.Uri.from({
    scheme: MERGE_SCHEME,
    path: `${pane}/${path.replace(/^\/+/, "")}`,
  });

/** Where the panes' editors go; a side that deleted the file has none */
export interface MergeHosts {
  left: HTMLElement | null;
  result: HTMLElement;
  right: HTMLElement | null;
}

export interface MergeEditorOptions {
  /** One pane at a time (phone width): no spacers, every control in Result */
  single: boolean;
  /** Every fold opened */
  showAll: boolean;
  fontFamily?: string;
}

/** A hunk's top in each pane, in px from the top of the pane's body */
export interface HunkPlace {
  index: number;
  top: Record<MergePane, number | null>;
}

/** A fold, and where its control goes in each pane, in px from the top */
export interface FoldPlace {
  segment: number;
  count: number;
  top: Record<MergePane, number | null>;
}

/** What the React side draws over and between the editors */
export interface MergeLayout {
  /** Nodes laid over each editor, for the hunk controls */
  overlays: Record<MergePane, HTMLElement | null>;
  /** Where each editor's gutter ends and its line decorations begin, in px */
  gutters: Record<MergePane, number>;
  hunks: HunkPlace[];
  bands: { left: MergeBand[]; right: MergeBand[] };
  folds: FoldPlace[];
  /** Whether lines can be folded at all -- see `hidden-areas.ts` */
  canFold: boolean;
}

/** The three editors of one file, kept aligned and scrolled together */
export interface MergeEditor {
  readonly layout: MergeLayout;
  /** Scrolled, resized or re-laid out: the overlays and ribbons move */
  onDidChangeLayout(cb: () => void): Disposable;
  /** The user typed into the result; the file's state has taken it */
  onDidEditResult(cb: () => void): Disposable;
  /** Mirror an edit the file made (a take or a dismiss) into the result */
  apply(edit: TextEdit | null): void;
  update(options: Partial<MergeEditorOptions>): void;
  /** Open one fold */
  unfold(segment: number): void;
  /** Scroll a hunk into view */
  reveal(hunk: number): void;
  dispose(): void;
}

export const createMergeEditor = (
  file: MergeFile,
  hosts: MergeHosts,
  options: MergeEditorOptions
): MergeEditor => new MonacoMergeEditor(file, hosts, options);

type Editors = Partial<Record<MergePane, monaco.editor.IStandaloneCodeEditor>>;

/** Stop Monaco's own mouse handling from reaching a control drawn over it */
const insulate = (node: HTMLElement) => {
  node.addEventListener("mousedown", (e) => e.stopPropagation());
  return node;
};

class MonacoMergeEditor implements MergeEditor {
  private readonly _file: MergeFile;
  private _options: MergeEditorOptions;
  private readonly _editors: Editors = {};
  private readonly _models: monaco.editor.ITextModel[] = [];
  private readonly _overlays: Record<MergePane, HTMLElement | null> = {
    left: null,
    result: null,
    right: null,
  };
  private readonly _decorations: Partial<Record<MergePane, string[]>> = {};
  private readonly _zones: Partial<Record<MergePane, string[]>> = {};
  private _zoneKey = "";
  private _folds: Fold[] = [];
  private readonly _opened = new Set<number>();
  private readonly _disposables: monaco.IDisposable[] = [];
  private readonly _layoutListeners = new Set<() => void>();
  private readonly _editListeners = new Set<() => void>();
  /** Set while this writes to the result, so its own edit is not the user's */
  private _applying = false;
  private _syncing = false;
  private _frame: number | null = null;
  private _layout: MergeLayout;

  constructor(file: MergeFile, hosts: MergeHosts, options: MergeEditorOptions) {
    this._file = file;
    this._options = options;

    const text: Record<MergePane, string> = {
      left: file.left,
      result: file.result,
      right: file.right,
    };
    for (const pane of PANES) {
      const host = hosts[pane];
      if (!host) continue;
      const uri = uriOf(pane, file.path);
      // Left over from a view that never closed cleanly: a second model at
      // the same address would throw
      monaco.editor.getModel(uri)?.dispose();
      const model = monaco.editor.createModel(text[pane], undefined, uri);
      this._models.push(model);

      const editor = monaco.editor.create(host, {
        model,
        readOnly: pane !== "result",
        domReadOnly: pane !== "result",
        automaticLayout: true,
        fontLigatures: true,
        fontFamily: options.fontFamily,
        minimap: { enabled: false },
        folding: false,
        glyphMargin: false,
        lineNumbersMinChars: 3,
        // Room in the right pane's gutter for its side's controls
        lineDecorationsWidth: pane === "right" ? 44 : 10,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        renderLineHighlight: pane === "result" ? "line" : "none",
        scrollBeyondLastLine: false,
        contextmenu: pane === "result",
        fixedOverflowWidgets: true,
      });
      this._editors[pane] = editor;

      const overlay = insulate(document.createElement("div"));
      overlay.dataset.mergeOverlay = pane;
      overlay.style.cssText =
        "position:absolute;top:0;left:0;pointer-events:none;";
      editor.addOverlayWidget({
        getId: () => `pg-merge.overlay.${pane}`,
        getDomNode: () => overlay,
        getPosition: () => null,
      });
      this._overlays[pane] = overlay;
      const size = () => {
        const info = editor.getLayoutInfo();
        overlay.style.width = `${info.width - info.verticalScrollbarWidth}px`;
        overlay.style.height = `${info.height}px`;
      };
      size();

      this._disposables.push(
        editor.onDidLayoutChange(() => {
          size();
          this._emit();
        }),
        editor.onDidScrollChange((e) => {
          if (e.scrollTopChanged && !this._syncing) {
            this._syncing = true;
            for (const other of Object.values(this._editors)) {
              if (other !== editor) other.setScrollTop(e.scrollTop);
            }
            this._syncing = false;
          }
          this._emit();
        })
      );
    }

    const result = this._editors.result!;
    this._disposables.push(
      result.getModel()!.onDidChangeContent(() => {
        if (this._applying) return;
        this._file.userEdit(result.getModel()!.getValue());
        this._refresh();
        for (const cb of this._editListeners) cb();
      })
    );

    this._layout = this._measure();
    this._refresh();
  }

  get layout() {
    return this._layout;
  }

  onDidChangeLayout(cb: () => void): Disposable {
    this._layoutListeners.add(cb);
    return { dispose: () => this._layoutListeners.delete(cb) };
  }

  onDidEditResult(cb: () => void): Disposable {
    this._editListeners.add(cb);
    return { dispose: () => this._editListeners.delete(cb) };
  }

  apply(edit: TextEdit | null) {
    const model = this._editors.result?.getModel();
    if (model && edit) {
      this._applying = true;
      try {
        const from = model.getPositionAt(edit.start);
        const to = model.getPositionAt(edit.end);
        model.pushEditOperations(
          [],
          [
            {
              range: monaco.Range.fromPositions(from, to),
              text: edit.text,
            },
          ],
          () => null
        );
        // The file's text is the truth. The model normalises line breaks to
        // one kind, so a file that mixed them reads back differently: it is
        // set whole rather than left to disagree with the hunk positions.
        if (model.getValue() !== this._file.result) {
          model.setValue(this._file.result);
        }
      } finally {
        this._applying = false;
      }
    }
    this._refresh();
  }

  update(options: Partial<MergeEditorOptions>) {
    this._options = { ...this._options, ...options };
    if (options.fontFamily !== undefined) {
      for (const editor of Object.values(this._editors)) {
        editor.updateOptions({ fontFamily: options.fontFamily });
      }
    }
    this._refresh();
  }

  unfold(segment: number) {
    this._opened.add(segment);
    this._refresh();
  }

  reveal(hunk: number) {
    const found = this._file.hunks[hunk];
    const editor = this._editors.result;
    if (!found || !editor) return;
    const start = this._file.starts("result").starts[found.segment];
    editor.revealLineInCenter(start + 1);
  }

  dispose() {
    if (this._frame !== null) cancelAnimationFrame(this._frame);
    for (const d of this._disposables) d.dispose();
    for (const editor of Object.values(this._editors)) editor.dispose();
    for (const model of this._models) model.dispose();
    this._layoutListeners.clear();
    this._editListeners.clear();
  }

  /** The folds in force: none when showing everything or unable to hide */
  private _activeFolds(): Fold[] {
    if (this._options.showAll || !this._canFold()) return [];
    return this._file.folds().filter((f) => !this._opened.has(f.segment));
  }

  private _canFold() {
    const editor = this._editors.result;
    return !!editor && canHideLines(editor);
  }

  /** Decorations, spacers, folds: everything that follows the file's state */
  private _refresh() {
    const file = this._file;
    const folds = this._activeFolds();

    for (const pane of PANES) {
      const editor = this._editors[pane];
      if (!editor) continue;
      const { starts } = file.starts(pane);
      const decorations: monaco.editor.IModelDeltaDecoration[] = [];
      for (const { hunk, segment } of file.hunks) {
        const count = hunk.lines[pane];
        if (!count) continue;
        const start = starts[segment];
        decorations.push({
          range: new monaco.Range(start + 1, 1, start + count, 1),
          options: {
            isWholeLine: true,
            className: hunkLineClass(file.look(hunk, pane)),
          },
        });
      }
      this._decorations[pane] = editor.deltaDecorations(
        this._decorations[pane] ?? [],
        decorations
      );
    }

    // Zones and hidden lines are rebuilt only when they would change:
    // rebuilding them re-lays out the editor, and a keystroke in a settled
    // line changes neither
    const spacers = this._options.single ? [] : this._spacers();
    const key = JSON.stringify([
      spacers.map(({ pane, after, lines, look }) => [pane, after, lines, look]),
      folds.map((f) => [f.segment, f.start, f.count]),
    ]);
    if (key !== this._zoneKey) {
      this._zoneKey = key;
      this._rebuildZones(spacers, folds);
    }
    this._emit();
  }

  /**
   * The blank lines that keep a run the same height in all three panes: the
   * tallest pane's count, less this pane's, after the run's last line.
   */
  private _spacers() {
    const file = this._file;
    const starts = Object.fromEntries(
      PANES.map((pane) => [pane, file.starts(pane).starts])
    ) as Record<MergePane, number[]>;
    const spacers: Array<{
      pane: MergePane;
      after: number;
      lines: number;
      look: string | null;
    }> = [];
    file.segments.forEach((segment, i) => {
      const tallest = Math.max(...PANES.map((p) => segment.lines[p]));
      for (const pane of PANES) {
        const lines = tallest - segment.lines[pane];
        if (!lines || !this._editors[pane]) continue;
        spacers.push({
          pane,
          after: starts[pane][i] + segment.lines[pane],
          lines,
          look:
            segment.kind === "hunk"
              ? mergeHunkVariants({ state: file.look(segment, pane) })
              : null,
        });
      }
    });
    return spacers;
  }

  private _rebuildZones(
    spacers: ReturnType<MonacoMergeEditor["_spacers"]>,
    folds: Fold[]
  ) {
    for (const pane of PANES) {
      const editor = this._editors[pane];
      if (!editor) continue;
      editor.changeViewZones((zones) => {
        for (const id of this._zones[pane] ?? []) zones.removeZone(id);
        const ids: string[] = [];
        for (const spacer of spacers.filter((s) => s.pane === pane)) {
          const node = document.createElement("div");
          node.dataset.mergeSpacer = "";
          if (spacer.look) node.className = spacer.look;
          ids.push(
            zones.addZone({
              afterLineNumber: spacer.after,
              heightInLines: spacer.lines,
              domNode: node,
            })
          );
        }
        // A fold's room: its control is drawn over it, in the overlay, since
        // Monaco hides its view zones from assistive technology. After the
        // last line it hides, so the line after it -- shown -- keeps it
        // visible; at the top, before the first line.
        for (const fold of folds) {
          const node = document.createElement("div");
          node.dataset.mergeFold = "";
          const first = fold.start[pane];
          ids.push(
            zones.addZone({
              afterLineNumber: first === 0 ? 0 : first + fold.count,
              heightInPx: FOLD_PX,
              domNode: node,
            })
          );
        }
        this._zones[pane] = ids;
      });
      setHiddenLines(
        editor,
        folds.map(
          (f) =>
            new monaco.Range(f.start[pane] + 1, 1, f.start[pane] + f.count, 1)
        )
      );
    }
    this._folds = folds;
  }

  /** Re-measure on the next frame, once, however many events asked */
  private _emit() {
    if (this._frame !== null) return;
    this._frame = requestAnimationFrame(() => {
      this._frame = null;
      this._layout = this._measure();
      for (const cb of this._layoutListeners) cb();
    });
  }

  /** Where each hunk is on screen now, and the ribbons between the panes */
  private _measure(): MergeLayout {
    const file = this._file;
    const starts = Object.fromEntries(
      PANES.map((pane) => [pane, file.starts(pane)])
    ) as Record<MergePane, { starts: number[]; total: number }>;

    /** The top of 1-based `line` in a pane, scrolled; past the end, the bottom */
    const topOf = (pane: MergePane, line: number) => {
      const editor = this._editors[pane]!;
      const model = editor.getModel()!;
      const scroll = editor.getScrollTop();
      if (line <= model.getLineCount()) {
        return editor.getTopForLineNumber(line) - scroll;
      }
      const last = model.getLineCount();
      return (
        editor.getTopForLineNumber(last) +
        editor.getOption(monaco.editor.EditorOption.lineHeight) -
        scroll
      );
    };

    const lineHeight =
      this._editors.result?.getOption(monaco.editor.EditorOption.lineHeight) ??
      19;
    const hunks: HunkPlace[] = [];
    const bands: MergeLayout["bands"] = { left: [], right: [] };

    for (const { hunk, segment, index } of file.hunks) {
      // Side by side, a run starts at the same height in every pane, so it is
      // read from a pane where it has lines; alone, the result is all there is
      const from = this._options.single
        ? "result"
        : PANES.find((p) => this._editors[p] && hunk.lines[p] > 0) ?? "result";
      const y = topOf(from, starts[from].starts[segment] + 1);
      const top = Object.fromEntries(
        PANES.map((p) => [p, this._editors[p] ? y : null])
      ) as Record<MergePane, number | null>;
      hunks.push({ index, top });

      const span = (pane: MergePane) => y + hunk.lines[pane] * lineHeight;
      bands.left.push({
        fromTop: y,
        fromBottom: span("left"),
        toTop: y,
        toBottom: span("result"),
        state: file.look(hunk, "left"),
      });
      bands.right.push({
        fromTop: y,
        fromBottom: span("result"),
        toTop: y,
        toBottom: span("right"),
        state: file.look(hunk, "right"),
      });
    }

    // A fold's room sits right above the first line shown after it
    const folds = this._folds.map((fold) => ({
      segment: fold.segment,
      count: fold.count,
      top: Object.fromEntries(
        PANES.map((p) => [
          p,
          this._editors[p]
            ? topOf(p, fold.start[p] + fold.count + 1) - FOLD_PX
            : null,
        ])
      ) as Record<MergePane, number | null>,
    }));

    const gutter = (pane: MergePane) =>
      this._editors[pane]?.getLayoutInfo().decorationsLeft ?? 0;
    return {
      overlays: { ...this._overlays },
      gutters: {
        left: gutter("left"),
        result: gutter("result"),
        right: gutter("right"),
      },
      hunks,
      bands,
      folds,
      canFold: this._canFold(),
    };
  }
}
