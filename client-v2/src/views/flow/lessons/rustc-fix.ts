import type { BuildDiagnostic } from "../stages/build-report";

/** What rustc's own suggestion changes, applied to the learner's file */
export interface RustcFix {
  /** Relative to the workspace, e.g. `src/lib.rs` */
  path: string;
  /** 1-based */
  line: number;
  /** What rustc asks to add, e.g. `;` */
  insert: string;
  /** The file with the suggestion applied */
  content: string;
}

/**
 * The file a diagnostic points at, relative to the workspace. rustc reports
 * paths from the build's own directory (`../src/lib.rs`), which the explorer
 * does not know.
 */
export const diagnosticPath = (d: BuildDiagnostic) =>
  d.file ? d.file.replace(/^(\.\.?\/)+/, "") : null;

/**
 * rustc's "help: add `X` here" as a patch, when it can be placed exactly.
 *
 * The caret under the source line says where; the source line rustc quotes
 * has to match the file as it is now, or the build is older than the code
 * and the insert would land in the wrong place.
 *
 * @param d the diagnostic
 * @param read reads a file by its workspace-relative path
 * @returns the patched file, or `null` when rustc suggests no such insert
 */
export const rustcFix = (
  d: BuildDiagnostic,
  read: (path: string) => string | null
): RustcFix | null => {
  const path = diagnosticPath(d);
  if (!path) return null;
  const file = read(path);
  if (file === null) return null;

  const excerpt = d.excerpt.split("\n");
  for (let i = 1; i < excerpt.length; i++) {
    const marker = excerpt[i].match(
      /^(\s*\|\s?)(\s*)\^+\s*help: add `([^`]+)` here/
    );
    const source = excerpt[i - 1].match(/^\s*(\d+) \| ?(.*)$/);
    if (!marker || !source) continue;

    const line = Number(source[1]);
    const col = marker[2].length;
    const lines = file.split("\n");
    const now = lines[line - 1];
    if (now === undefined || now.trimEnd() !== source[2].trimEnd()) return null;

    const insert = marker[3];
    lines[line - 1] = now.slice(0, col) + insert + now.slice(col);
    return { path, line, insert, content: lines.join("\n") };
  }
  return null;
};
