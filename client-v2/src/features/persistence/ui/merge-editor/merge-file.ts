import { diffArrays } from "diff";

import type { Chunk, FileConflict, ResolvedFiles } from "../../model/merge";

/** The three panes of the resolve view, by the design system's names */
export type MergePane = "left" | "result" | "right";

/** The two sides a hunk can be taken from */
export type HunkSide = "left" | "right";

/** Where one side of a hunk stands */
export type SideState = "pending" | "taken" | "dismissed";

/** A hunk's colour in one pane, by `mergeHunkVariants`' names */
export type HunkLook = "conflict" | "resolved" | "dismissed";

/** Lines per pane */
type Counts = Record<MergePane, number>;

/**
 * A run of lines of the file, in the three panes at once.
 *
 * - `settled`: the same in every pane once merged. The result's copy can be
 *   edited, so its count may drift from the sides'.
 * - `hunk`: lines both devices changed differently. `left` and `right` are
 *   where each side stands; `edited` is the user typing into the hunk's lines
 *   in the result, which answers it whatever the sides say.
 */
export type Segment =
  | { kind: "settled"; lines: Counts }
  | {
      kind: "hunk";
      lines: Counts;
      base: string[];
      ours: string[];
      theirs: string[];
      left: SideState;
      right: SideState;
      edited: boolean;
    };

export type Hunk = Extract<Segment, { kind: "hunk" }>;

/** Replace `text[start, end)` with `text`, offsets into the result's text */
export interface TextEdit {
  start: number;
  end: number;
  text: string;
}

/** A run of settled lines folded away, as line indices in each pane */
export interface Fold {
  /** The segment it is in */
  segment: number;
  /** The first hidden line in each pane, 0-based */
  start: Counts;
  count: number;
}

/** Lines of context kept visible around a hunk when folding */
export const FOLD_CONTEXT = 3;
/**
 * The fewest lines worth a fold. A handful hidden saves no scrolling and
 * costs the reader the context around a hunk, lines one device changed on
 * its own included (the settled runs do not say which those are).
 */
const FOLD_MIN = 10;

/**
 * A pane's lines, the file split on `\n` alone as `merge3` splits it, so a
 * join gives the text back byte for byte. No file is no lines.
 */
const linesOf = (text: string | undefined) =>
  text === undefined ? [] : text.split("\n");

/** The edit that turns `from` into `to`: their common ends left alone */
const editBetween = (from: string, to: string): TextEdit | null => {
  if (from === to) return null;
  let start = 0;
  const shorter = Math.min(from.length, to.length);
  while (start < shorter && from[start] === to[start]) start++;
  let tail = 0;
  while (
    tail < shorter - start &&
    from[from.length - 1 - tail] === to[to.length - 1 - tail]
  ) {
    tail++;
  }
  return {
    start,
    end: from.length - tail,
    text: to.slice(start, to.length - tail),
  };
};

/** What a hunk holds in the result, for where its sides stand */
const contentOf = (hunk: Hunk) => {
  if (hunk.left !== "taken" && hunk.right !== "taken") return hunk.base;
  // This device's lines always before the other's
  return [
    ...(hunk.left === "taken" ? hunk.ours : []),
    ...(hunk.right === "taken" ? hunk.theirs : []),
  ];
};

const LOOK: Record<SideState, HunkLook> = {
  pending: "conflict",
  taken: "resolved",
  dismissed: "dismissed",
};

/**
 * One conflicted file in the resolve view: the three panes' text, its hunks
 * and where each stands, and the result as the user is making it.
 *
 * Plain data over no editor, so the rules -- what taking a side writes, when
 * a hunk counts as answered, which lines a keystroke belongs to -- are tested
 * on their own; the Monaco controller only mirrors this into its models. The
 * result's text here is the truth: the controller hands every edit of the
 * user's to `userEdit`, and applies every `TextEdit` this returns.
 */
export class MergeFile {
  readonly conflict: FileConflict;
  readonly path: string;
  /** This device's lines, read-only */
  readonly left: string;
  /** The other device's lines, read-only */
  readonly right: string;
  /** Which side, if either, deleted the file */
  readonly deleted: { left: boolean; right: boolean };
  readonly segments: Segment[];
  private _lines: string[];

  private constructor(conflict: FileConflict) {
    this.conflict = conflict;
    this.path = conflict.path;

    if (conflict.kind === "lines") {
      this.deleted = { left: false, right: false };
      this.segments = conflict.chunks.map((chunk): Segment => {
        if (chunk.kind === "settled") {
          const n = chunk.lines.length;
          return { kind: "settled", lines: { left: n, result: n, right: n } };
        }
        return {
          kind: "hunk",
          lines: {
            left: chunk.ours.length,
            result: chunk.base.length,
            right: chunk.theirs.length,
          },
          base: chunk.base,
          ours: chunk.ours,
          theirs: chunk.theirs,
          left: "pending",
          right: "pending",
          edited: false,
        };
      });
      const { chunks } = conflict;
      /** A pane: the settled lines, and one side's lines of each conflict */
      const join = (
        pick: (chunk: Extract<Chunk, { kind: "conflict" }>) => string[]
      ) => chunks.flatMap((c) => (c.kind === "settled" ? c.lines : pick(c)));
      this.left = join((c) => c.ours).join("\n");
      this.right = join((c) => c.theirs).join("\n");
      this._lines = join((c) => c.base);
    } else {
      // No hunks to be had: the whole file is one, and the result starts as
      // this device's copy -- empty when this device deleted it
      const ours = linesOf(conflict.local);
      const theirs = linesOf(conflict.server);
      this.deleted = {
        left: conflict.local === undefined,
        right: conflict.server === undefined,
      };
      this.segments = [
        {
          kind: "hunk",
          lines: {
            left: ours.length,
            result: ours.length,
            right: theirs.length,
          },
          base: ours,
          ours,
          theirs,
          left: "pending",
          right: "pending",
          edited: false,
        },
      ];
      this.left = conflict.local ?? "";
      this.right = conflict.server ?? "";
      this._lines = [...ours];
    }
  }

  static from(conflict: FileConflict) {
    return new MergeFile(conflict);
  }

  /** The result as it stands */
  get result() {
    return this._lines.join("\n");
  }

  get hunks(): Array<{ hunk: Hunk; segment: number; index: number }> {
    const found: Array<{ hunk: Hunk; segment: number; index: number }> = [];
    this.segments.forEach((segment, i) => {
      if (segment.kind === "hunk") {
        found.push({ hunk: segment, segment: i, index: found.length });
      }
    });
    return found;
  }

  static isResolved(hunk: Hunk) {
    return hunk.edited || (hunk.left !== "pending" && hunk.right !== "pending");
  }

  /** Hunks with a side still to decide */
  get unresolved() {
    return this.hunks.filter(({ hunk }) => !MergeFile.isResolved(hunk)).length;
  }

  /** The first line of each segment in a pane, 0-based, and the line count */
  starts(pane: MergePane) {
    const starts: number[] = [];
    let at = 0;
    for (const segment of this.segments) {
      starts.push(at);
      at += segment.lines[pane];
    }
    return { starts, total: at };
  }

  /** A hunk's colour in a pane */
  look(hunk: Hunk, pane: MergePane): HunkLook {
    if (pane === "result") {
      return MergeFile.isResolved(hunk) ? "resolved" : "conflict";
    }
    const side = hunk[pane];
    // Typed over: a side never taken is left out of what was typed
    if (hunk.edited && side === "pending") return "dismissed";
    return LOOK[side];
  }

  /**
   * Take one side's lines into the result, after this device's when both
   * are taken.
   *
   * Where a side deleted the file, the answer is one of two files, not lines
   * to add to each other: taking either side leaves the other out.
   *
   * @returns the edit to the result's text, or `null` when there is nothing
   * to change -- the side was decided already, or the hunk typed over
   */
  take(index: number, side: HunkSide): TextEdit | null {
    const hunk = this._pending(index, side);
    if (!hunk) return null;
    hunk[side] = "taken";
    if (this.deleted.left || this.deleted.right) {
      const other: HunkSide = side === "left" ? "right" : "left";
      hunk[other] = "dismissed";
    }
    return this._rewrite(hunk);
  }

  /** Leave one side's lines out of the result */
  dismiss(index: number, side: HunkSide): TextEdit | null {
    const hunk = this._pending(index, side);
    if (!hunk) return null;
    hunk[side] = "dismissed";
    return this._rewrite(hunk);
  }

  /**
   * Take the user's own edit of the result.
   *
   * Lines are matched by a line diff of the old text against the new, so a
   * change lands in the run it was made in however the editor reported it. A
   * change that overlaps or touches a hunk's lines in the result answers the
   * hunk (`edited`), and the lines it adds are the hunk's; elsewhere they are
   * the settled run's they were typed into.
   */
  userEdit(text: string) {
    if (text === this.result) return;
    const next = text.split("\n");
    const { starts, total } = this.starts("result");
    const ends = this.segments.map((s, i) => starts[i] + s.lines.result);
    const delta = this.segments.map(() => 0);

    /** Old lines `[a, b)` became `added` new ones */
    const change = (a: number, b: number, added: number) => {
      let target = -1;
      this.segments.forEach((segment, i) => {
        // Lines removed from each run they were in
        delta[i] -= Math.max(0, Math.min(b, ends[i]) - Math.max(a, starts[i]));
        if (segment.kind === "hunk" && a <= ends[i] && b >= starts[i]) {
          segment.edited = true;
          if (target < 0) target = i;
        }
      });
      if (target < 0) {
        // The settled run the change starts in; at the very end, the last
        target = this.segments.findIndex(
          (_, i) => a >= starts[i] && a < ends[i]
        );
        if (target < 0) target = this.segments.length - 1;
      }
      delta[target] += added;
    };

    let at = 0;
    let open: { a: number; b: number; added: number } | null = null;
    for (const part of diffArrays(this._lines, next)) {
      const n = part.value.length;
      if (!part.added && !part.removed) {
        if (open) change(open.a, open.b, open.added);
        open = null;
        at += n;
        continue;
      }
      open ??= { a: at, b: at, added: 0 };
      if (part.removed) {
        at += n;
        open.b = at;
      } else {
        open.added += n;
      }
    }
    if (open) change(open.a, open.b, open.added);

    this.segments.forEach((segment, i) => {
      segment.lines.result += delta[i];
    });
    this._lines = next;
    // An empty text is one empty line to the editor and none to a deleted
    // file; whichever it is, the counts must add up to what is there
    const drift = next.length - (total + delta.reduce((x, y) => x + y, 0));
    if (drift) this.segments[this.segments.length - 1].lines.result += drift;
  }

  /**
   * Runs of settled lines to fold away, with `FOLD_CONTEXT` lines kept next
   * to each hunk. The file's last line is never folded: Monaco shows a view
   * zone only when the line after it is visible, and the fold's control is
   * one. A run whose result was edited is left whole, since its
   * lines no longer line up across the panes.
   */
  folds(): Fold[] {
    const panes = (["left", "result", "right"] as const).map((pane) => [
      pane,
      this.starts(pane).starts,
    ]) as Array<[MergePane, number[]]>;
    const last = this.segments.length - 1;
    const folds: Fold[] = [];
    this.segments.forEach((segment, i) => {
      if (segment.kind !== "settled") return;
      const { left, result, right } = segment.lines;
      if (left !== result || right !== result) return;
      const before = i === 0 ? 0 : FOLD_CONTEXT;
      const after = i === last ? 1 : FOLD_CONTEXT;
      const count = result - before - after;
      if (count < FOLD_MIN) return;
      const start = Object.fromEntries(
        panes.map(([pane, starts]) => [pane, starts[i] + before])
      ) as Counts;
      folds.push({ segment: i, start, count });
    });
    return folds;
  }

  /**
   * The answer for this file: the result, pinned to the two copies the view
   * was shown. An empty result where a side deleted the file deletes it.
   */
  resolved(): ResolvedFiles[string] {
    const { conflict } = this;
    const deletes =
      conflict.kind === "whole" &&
      (conflict.local === undefined || conflict.server === undefined) &&
      this.result === "";
    return {
      content: deletes ? null : this.result,
      ...(conflict.localHash !== undefined
        ? { localHash: conflict.localHash }
        : {}),
      ...(conflict.serverHash !== undefined
        ? { serverHash: conflict.serverHash }
        : {}),
    };
  }

  /** The hunk, if this side of it is still to decide */
  private _pending(index: number, side: HunkSide) {
    const found = this.hunks[index]?.hunk;
    if (!found || found.edited || found[side] !== "pending") return null;
    return found;
  }

  /** Put the hunk's content for its sides into the result */
  private _rewrite(hunk: Hunk): TextEdit | null {
    const i = this.segments.indexOf(hunk);
    const start = this.starts("result").starts[i];
    const before = this.result;
    const content = contentOf(hunk);
    this._lines.splice(start, hunk.lines.result, ...content);
    hunk.lines.result = content.length;
    return editBetween(before, this.result);
  }
}

/**
 * What identifies a conflicted file's question: the two copies it was read
 * from. A refresh with a different key is a new question about that file.
 */
export const conflictKey = (file: FileConflict) =>
  JSON.stringify([file.kind, file.localHash ?? null, file.serverHash ?? null]);

/** Every file's answer, keyed by path, for `PgProjectSync.resolve` */
export const resolvedFiles = (files: readonly MergeFile[]): ResolvedFiles =>
  Object.fromEntries(files.map((file) => [file.path, file.resolved()]));
