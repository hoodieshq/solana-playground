import { diffArrays } from "diff";

import { isUserFile } from "./snapshot";
import type { FileHashes } from "./snapshot";

/**
 * The content a file had at the last agreement, for the files this device has
 * changed since. Keyed with its hash so a merge can check it belongs to the
 * agreement the mark describes, rather than trusting whichever copy was kept.
 */
export type BaseContents = Record<string, { hash: string; content: string }>;

/** `base[start, end)` is replaced by `lines` on one side */
interface Hunk {
  start: number;
  end: number;
  lines: string[];
  side: "ours" | "theirs";
}

const hunksOf = (
  base: string[],
  other: string[],
  side: Hunk["side"]
): Hunk[] => {
  const hunks: Hunk[] = [];
  let at = 0;
  let open: Hunk | null = null;

  for (const part of diffArrays(base, other)) {
    if (!part.added && !part.removed) {
      if (open) hunks.push(open);
      open = null;
      at += part.value.length;
      continue;
    }
    open ??= { start: at, end: at, lines: [], side };
    if (part.removed) {
      at += part.value.length;
      open.end = at;
    } else {
      open.lines.push(...(part.value as string[]));
    }
  }
  if (open) hunks.push(open);
  return hunks;
};

/**
 * Merge two edits of one file against the version both started from.
 *
 * Line-based diff3. Split on `\n` alone, so a `\r` stays part of its line and
 * a file without a trailing newline stays without one: everything outside the
 * changed lines comes back byte for byte.
 *
 * Changes that overlap *or touch* are a conflict, the way git treats them. Two
 * edits on adjacent lines of a program are not safely independent -- a
 * condition and the line it guards, say -- and a wrong merge is worse than a
 * question.
 *
 * @returns the merged text, or `null` when both sides changed the same region
 */
export const merge3 = (
  base: string,
  ours: string,
  theirs: string
): string | null => {
  if (ours === theirs) return ours;
  if (ours === base) return theirs;
  if (theirs === base) return ours;

  const b = base.split("\n");
  const hunks = [
    ...hunksOf(b, ours.split("\n"), "ours"),
    ...hunksOf(b, theirs.split("\n"), "theirs"),
  ].sort((x, y) => x.start - y.start || x.end - y.end);

  const out: string[] = [];
  let at = 0;

  for (let i = 0; i < hunks.length; ) {
    // One group: every hunk that overlaps or touches the region so far. Two
    // hunks from the same side never do -- a diff separates them by at least
    // one unchanged line -- so a group with one side in it is just that edit.
    const group = [hunks[i]];
    let end = hunks[i].end;
    for (i++; i < hunks.length && hunks[i].start <= end; i++) {
      group.push(hunks[i]);
      end = Math.max(end, hunks[i].end);
    }
    const start = group[0].start;

    /** `base[start, end)` with one side's hunks applied */
    const render = (side: Hunk["side"]) => {
      const result: string[] = [];
      let pos = start;
      for (const hunk of group.filter((h) => h.side === side)) {
        result.push(...b.slice(pos, hunk.start), ...hunk.lines);
        pos = hunk.end;
      }
      result.push(...b.slice(pos, end));
      return result;
    };

    out.push(...b.slice(at, start));
    const sides = new Set(group.map((h) => h.side));
    if (sides.size === 1) {
      out.push(...render(group[0].side));
    } else {
      const mine = render("ours");
      // Both sides made the same change: nothing to decide
      if (mine.join("\n") !== render("theirs").join("\n")) return null;
      out.push(...mine);
    }
    at = end;
  }

  out.push(...b.slice(at));
  return out.join("\n");
};

export interface MergeInput {
  /** The mark's `files`: what both sides last agreed on */
  base: FileHashes;
  baseContents: BaseContents;
  local: Record<string, string>;
  localHashes: FileHashes;
  server: Record<string, string>;
  serverHashes: FileHashes;
}

export interface MergePlan {
  /** Every path that settled on its own, with the content it settled on */
  files: Record<string, string>;
  /** Paths both sides changed in a way nothing here is entitled to decide */
  conflicts: string[];
}

/**
 * Decide, file by file, what a project should hold once both sides' changes
 * are in.
 *
 * The base is what makes this possible. Comparing two copies says only *that*
 * a file differs; the base says which side changed it, and a file only one
 * side changed has an obvious answer.
 *
 * The generated workspace files are never merged and never asked about. Nobody
 * types them: the keypair is regenerated on open and the tutorial files follow
 * the reader. When both sides changed one, the account's copy wins, which
 * keeps the program at the address the account already deploys to.
 */
export const planMerge = (input: MergeInput): MergePlan => {
  const { base, baseContents, local, localHashes, server, serverHashes } =
    input;
  const files: Record<string, string> = {};
  const conflicts: string[] = [];

  const paths = new Set([
    ...Object.keys(base),
    ...Object.keys(localHashes),
    ...Object.keys(serverHashes),
  ]);

  for (const path of [...paths].sort()) {
    const b = base[path];
    const l = localHashes[path];
    const s = serverHashes[path];
    // `undefined` is "absent", so a delete is just another value here
    const take = (from: Record<string, string>) => {
      if (path in from) files[path] = from[path];
    };

    if (l === s) take(local);
    else if (l === b) take(server);
    else if (s === b) take(local);
    else if (!isUserFile(path)) take(path in server ? server : local);
    else {
      const ancestor = baseContents[path];
      const merged =
        b !== undefined &&
        ancestor?.hash === b &&
        path in local &&
        path in server
          ? merge3(ancestor.content, local[path], server[path])
          : null;
      if (merged === null) conflicts.push(path);
      else files[path] = merged;
    }
  }

  return { files, conflicts };
};

/** A plan's settled files, plus each conflicted file from the side picked */
export const settleConflicts = (
  plan: MergePlan,
  prefer: "local" | "server",
  local: Record<string, string>,
  server: Record<string, string>
) => {
  const files = { ...plan.files };
  const from = prefer === "local" ? local : server;
  for (const path of plan.conflicts) {
    if (path in from) files[path] = from[path];
  }
  return files;
};

/**
 * The base store once a merge has adopted the server's copy as the new
 * agreement.
 *
 * Every user file where the merged result still differs from the server is,
 * from here on, a local change against the server's version -- so the server's
 * version is its base, and is what a merge would need if the server moves
 * again before this device's upload lands.
 */
export const baseAfterMerge = (
  merged: Record<string, string>,
  server: Record<string, string>,
  serverHashes: FileHashes
): BaseContents =>
  Object.fromEntries(
    Object.keys(server)
      .filter((path) => isUserFile(path) && merged[path] !== server[path])
      .map((path) => [
        path,
        { hash: serverHashes[path], content: server[path] },
      ])
  );

/** Whether two file maps hold exactly the same paths and contents */
export const sameFiles = (
  a: Record<string, string>,
  b: Record<string, string>
) => {
  const paths = Object.keys(a);
  return (
    paths.length === Object.keys(b).length &&
    paths.every((path) => path in b && a[path] === b[path])
  );
};
