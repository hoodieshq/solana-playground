import { stripKnownNoise } from "../../sidebar/assistant/bridge/build-output";

/** One rustc diagnostic, parsed out of the compiler's own text */
export interface BuildDiagnostic {
  /** e.g. `E0308`, or `null` for a diagnostic without an error code */
  code: string | null;
  /** The one-line summary rustc prints after `error[...]:` */
  title: string;
  /** Path as rustc reports it, or `null` if the diagnostic has no location */
  file: string | null;
  line: number | null;
  col: number | null;
  /** The `-->` line's source excerpt, with the `|` gutter kept for context */
  excerpt: string;
}

/** The result of parsing one build's `stderr` */
export interface BuildReport {
  diagnostics: BuildDiagnostic[];
  /** `stderr`, after `stripKnownNoise`, for the "show raw output" toggle */
  raw: string;
}

const HEADER = /^error(?:\[(E\d+)\])?: (.+)$/;
const LOCATION = /^\s*--> (.+?):(\d+):(\d+)\s*$/;

/** Split rustc's stderr into one entry per `error` block. */
export const parseBuildReport = (stderr: string): BuildReport => {
  const raw = stripKnownNoise(stderr);
  const lines = raw.split("\n");
  const diagnostics: BuildDiagnostic[] = [];
  let current: BuildDiagnostic | null = null;
  let excerpt: string[] = [];

  const flush = () => {
    if (!current) return;
    current.excerpt = excerpt.join("\n").trim();
    diagnostics.push(current);
    current = null;
    excerpt = [];
  };

  for (const line of lines) {
    const head = line.match(HEADER);
    if (head) {
      flush();
      // The summary line is not a diagnostic
      if (/^could not compile/.test(head[2])) continue;
      current = {
        code: head[1] ?? null,
        title: head[2],
        file: null,
        line: null,
        col: null,
        excerpt: "",
      };
      continue;
    }
    if (!current) continue;
    const loc = line.match(LOCATION);
    if (loc && current.file === null) {
      current.file = loc[1];
      current.line = Number(loc[2]);
      current.col = Number(loc[3]);
      continue;
    }
    if (/^\s*\d+ \|/.test(line) || /^\s*\|/.test(line)) excerpt.push(line);
  }
  flush();

  return { diagnostics, raw };
};
