/**
 * A conversation tutorial as `src/tutorials/<slug>/tutorial.json` holds it.
 * `src/tutorials/tutorial.schema.json` is the source of truth; these types
 * mirror its shape, not every limit (lengths, counts, patterns), and
 * `checkDefinition` is what makes a parsed file one.
 */

/** Inline Markdown, or that text with a shorter phone variant */
export type Text = string | { text: string; phone: string };

/** Whole file contents by workspace path */
export type Files = Record<string, string>;

/** A quiet button after an answer; it only opens or shows something */
export type Follow =
  | "openTest"
  | "showMenu"
  | "showFix"
  | "writeClient"
  | "nextTutorial";

export interface Chip {
  label: string;
  answer: Text;
  follow?: Follow;
  /** The subject the chip answers when typed in other words, as a regex */
  pattern?: string;
}

/** A scripted answer to a question typed in the composer */
export interface Match {
  pattern: string;
  answer: Text;
  follow?: Follow;
  /** Answers only on its own step */
  local?: boolean;
}

/** Code written into a file; it appears in its step's target for that file */
export interface Block {
  file: string;
  block: string;
}

export interface Quote {
  file: string;
  line: number;
  mark?: string;
  tone: "lit" | "error";
}

export interface SayBeat {
  kind: "say";
  id: string;
  text: Text;
  quote?: Quote;
}

export interface WriteBeat {
  kind: "write";
  id: string;
  text: Text;
  writes: Block | { create: string };
}

export interface Ask {
  kind: "ask";
  id: string;
  kicker: "Question" | "Fix it";
  question: Text;
  options: [string, string, string];
  code: boolean;
  answer: 0 | 1 | 2;
  right: Text;
  /** Why each option is wrong, by index; null for the right one */
  why: [string | null, string | null, string | null];
  hint: Text;
  writes?: Block;
  skipped?: Text;
  key?: string;
  typed?: Text;
}

export type Act = "build" | "deploy" | "buildDeploy" | "run" | "call";

interface ActBase {
  kind: "act";
  id: string;
  say?: Text;
  title: string;
  context: string;
  button: string;
}

/** An act card; only a `call` act names its instruction, and it must */
export type ActBeat =
  | (ActBase & {
      act: "call";
      call: { instruction: string; args?: string[] };
    })
  | (ActBase & { act: Exclude<Act, "call">; call?: never });

export type Beat = SayBeat | WriteBeat | Ask | ActBeat;

/** What passes a step, checked on the real result */
export type Goal =
  | { kind: "build"; instructions?: string[] }
  | { kind: "deploy" }
  | { kind: "call"; instruction: string; args?: string[]; log?: string };

export interface Win {
  id: string;
  headline: Text;
  line: Text;
  callPanelLine?: Text;
  stats: {
    icon: "hammer" | "braces" | "clock" | "rocket" | "coins" | "cpu" | "timer";
    text: string;
  }[];
  extra?: "openTest";
}

/** A planned build failure: its card's line and the beats after it, both or neither */
type PlannedFailure =
  | { planned: Text; onFail: Beat[] }
  | { planned?: never; onFail?: never };

export type Step = PlannedFailure & {
  id: string;
  title: string;
  short: string;
  objective: string;
  learned: string;
  file: string;
  start: Files;
  target: Files;
  beats: Beat[];
  goal: Goal;
  win: Win;
  explain: Text;
  chips: Chip[];
  errorChips?: Chip[];
  matches?: Match[];
};

export interface TutorialDefinition {
  $schema?: string;
  version: 1;
  name: string;
  description: string;
  authors: { name: string; link?: string }[];
  level: "Beginner" | "Intermediate" | "Advanced";
  framework: "Anchor" | "Native" | "Seahorse";
  languages: ("JavaScript" | "Python" | "Rust" | "TypeScript")[];
  categories?: string[];
  thumbnail: string;
  minutes: number;
  intro: { lead: Text; prints: string; files: Files };
  steps: Step[];
  finish: {
    headline: Text;
    line: Text;
    learned: string[];
    chips: Chip[];
    next: string | null;
  };
}

/** One problem in a definition, at its JSON path (`steps[1].beats[3].why[2]`) */
export interface DefinitionError {
  path: string;
  /** What was expected and what was found */
  message: string;
}
