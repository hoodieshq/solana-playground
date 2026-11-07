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

/** An opening code fence: up to three spaces, ``` or ~~~, then its info string */
const FENCE = /^ {0,3}(?:`{3,}|~{3,})[ \t]*([^\s`]*)/gm;

/**
 * Whether a reply proposes a code change, which is what "Make this change"
 * turns into a patch: it holds a fenced block labelled with a language a
 * project file is written in. An explanation, inline code, a command or an
 * unlabelled block (an address, an output) has nothing to apply.
 *
 * Reads the opening fences only, so a block still streaming counts as soon as
 * its language is out.
 */
export const proposesChange = (text: string) => {
  for (const [, lang] of text.matchAll(FENCE)) {
    if (lang && !NOT_A_FILE.has(lang.toLowerCase())) return true;
  }
  return false;
};
