/**
 * Fence languages that hold a command to run or something to read, never the
 * content of a project file: a reply made only of these proposes no edit.
 */
const NOT_A_FILE = new Set([
  "bash",
  "sh",
  "shell",
  "zsh",
  "console",
  "terminal",
  "text",
  "txt",
  "plaintext",
  "plain",
  "output",
  "log",
]);

/** A fence line: up to three spaces, ``` or ~~~, then its info string's first word */
const FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)/;

/** A first line that is a comment naming a file: `// src/lib.rs`, `# Cargo.toml` */
const NAMES_A_FILE = /^\s*(?:\/\/|#|--|\/\*)\s*[\w./-]+\.\w+\s*(?:\*\/)?\s*$/;

/**
 * Whether a reply proposes a code change, which is what "Make this change"
 * turns into a patch: it holds a fenced block labelled with a language a
 * project file is written in, or an unlabelled one whose first line names the
 * file. An explanation, inline code, a command or any other unlabelled block
 * (an address, an output) has nothing to apply.
 *
 * A block still streaming counts as soon as its language is out.
 */
export const proposesChange = (text: string) => {
  const lines = text.split("\n");
  // The fence that opened the block we are in, or none outside a block
  let open: string | null = null;
  for (const [index, line] of lines.entries()) {
    const fence = FENCE.exec(line);
    if (!fence) continue;
    const [, marks, lang] = fence;
    if (open) {
      // Only a bare fence of the same kind, at least as long, closes it
      if (!lang && marks[0] === open[0] && marks.length >= open.length) {
        // eslint-disable-next-line unicorn/no-null -- `null` is "outside a block", as `open` starts
        open = null;
      }
      continue;
    }
    open = marks;
    const proposes = lang
      ? !NOT_A_FILE.has(lang.toLowerCase())
      : NAMES_A_FILE.test(lines[index + 1] ?? "");
    if (proposes) return true;
  }
  return false;
};
