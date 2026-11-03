import type { Act } from "@/entities/tutorial";
import type { WordAction } from "./reducer";
import type { Turn } from "./view";

/** The live actions a composer message can name on its own */
export type Word =
  | "start"
  | "build"
  | "deploy"
  | "run"
  | "call"
  | "next"
  | "explain";

/** Each word as typed, to the action it names; "begin" and "go" start too */
const WORDS: Record<string, Word> = {
  start: "start",
  begin: "start",
  go: "start",
  build: "build",
  deploy: "deploy",
  run: "run",
  call: "call",
  next: "next",
  explain: "explain",
};

/** The acts each word runs: a build-and-deploy card answers both words */
const ACTS: Record<"build" | "deploy" | "run" | "call", readonly Act[]> = {
  build: ["build", "buildDeploy"],
  deploy: ["deploy", "buildDeploy"],
  run: ["run"],
  call: ["call"],
};

/**
 * The word a message is, or null when it is anything else: one action word,
 * alone or with "please" before or after it, in any case, with trailing
 * punctuation. "build it" is not a word; it goes to the assistant.
 */
export const wordOf = (text: string): Word | null => {
  const parts = text
    .trim()
    .toLowerCase()
    .replace(/[.!?,]+$/, "")
    .split(/\s+/)
    .filter((part) => part !== "please" && part !== "");
  if (parts.length !== 1) return null;
  return WORDS[parts[0].replace(/[.!?,]+$/, "")] ?? null;
};

/**
 * Where a composer message goes, in the spec's order: a word whose action
 * is live runs it, a word while a question is open is refused, and anything
 * else is the assistant's. A word with nothing live to run is the
 * assistant's too, so a learner asking "deploy?" on step 1 gets an answer
 * rather than silence. Finish chips are pressed, never matched from text.
 */
export type Route =
  | { kind: "word"; action: WordAction }
  | { kind: "refused" }
  | { kind: "assistant" };

export const route = (text: string, live: Turn | null): Route => {
  const word = wordOf(text);
  if (!word || !live) return { kind: "assistant" };
  if (live.kind === "ask" && live.open) return { kind: "refused" };
  const action = actionFor(word, live);
  return action ? { kind: "word", action } : { kind: "assistant" };
};

const actionFor = (word: Word, live: Turn): WordAction | null => {
  const at = Date.now();
  switch (word) {
    case "start":
      return live.kind === "intro" ? { type: "start", at } : null;
    case "next":
      return live.kind === "win" ? { type: "next", at } : null;
    case "explain":
      return live.kind === "result" && live.open
        ? { type: "explain", beatId: live.beatId, at }
        : null;
    case "build":
    case "deploy":
    case "run":
    case "call": {
      if (live.kind !== "act" || live.state === "running") return null;
      return ACTS[word].includes(live.act.act)
        ? { type: "act", beatId: live.beatId, at }
        : null;
    }
    default: {
      const never: never = word;
      return never;
    }
  }
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("features/tutorial-conversation/model/route", () => {
    /** A turn's common fields, named once */
    const turnOf = (id: string) => ({
      id,
      step: "write-program",
      at: 1,
      whole: false,
    });
    const intro: Turn = {
      id: "intro",
      step: null,
      at: 1,
      whole: false,
      kind: "intro",
    };
    const openAsk: Turn = Object.assign(turnOf("s1.q1"), {
      kind: "ask" as const,
      beatId: "s1.q1",
      ask: {
        kind: "ask" as const,
        id: "s1.q1",
        kicker: "Question" as const,
        question: "Where does msg! print?",
        options: ["a", "b", "c"] as [string, string, string],
        code: false,
        answer: 0 as const,
        right: "Yes.",
        why: [null, "No.", "No."] as [null, string, string],
        hint: "The log.",
      },
      open: true,
      wrong: [],
      hinted: false,
      writeFailed: false,
      outcome: null,
      attempts: 0,
    });
    const act = (name: Exclude<Act, "call">, state: "live" | "running"): Turn =>
      Object.assign(turnOf("s1.build"), {
        kind: "act" as const,
        beatId: "s1.build",
        act: {
          kind: "act" as const,
          id: "s1.build",
          title: "Build",
          context: "",
          button: "Build",
          act: name,
        },
        state,
        note: null,
        stage: null,
        took: null,
      });

    it("reads one action word, with please, any case and a full stop", () => {
      expect(wordOf("build")).toBe("build");
      expect(wordOf("  Please DEPLOY. ")).toBe("deploy");
      expect(wordOf("next please!")).toBe("next");
      expect(wordOf("Go")).toBe("start");
      expect(wordOf("build it")).toBeNull();
      expect(wordOf("what does build do?")).toBeNull();
      expect(wordOf("please")).toBeNull();
      expect(wordOf("")).toBeNull();
    });

    it("runs a word whose action is live", () => {
      expect(route("start", intro)).toMatchObject({
        kind: "word",
        action: { type: "start" },
      });
      expect(route("build", act("build", "live"))).toMatchObject({
        kind: "word",
        action: { type: "act", beatId: "s1.build" },
      });
      expect(route("deploy", act("buildDeploy", "live"))).toMatchObject({
        kind: "word",
        action: { type: "act" },
      });
    });

    it("refuses any word while a question is open, before matching it", () => {
      expect(route("build", openAsk)).toEqual({ kind: "refused" });
      expect(route("next please", openAsk)).toEqual({ kind: "refused" });
    });

    it("sends everything else to the assistant", () => {
      expect(route("I'm stuck", openAsk)).toEqual({ kind: "assistant" });
      expect(route("what does declare_id do?", intro)).toEqual({
        kind: "assistant",
      });
      // A word with nothing live to run
      expect(route("deploy", act("build", "live"))).toEqual({
        kind: "assistant",
      });
      expect(route("build", act("build", "running"))).toEqual({
        kind: "assistant",
      });
      expect(route("next", intro)).toEqual({ kind: "assistant" });
      expect(route("build", null)).toEqual({ kind: "assistant" });
    });
  });
}
