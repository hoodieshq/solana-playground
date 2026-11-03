import type {
  ConversationProgress,
  RunRecord,
  RunResult,
  Turn,
} from "@/features/tutorial-conversation";
import type { TutorialDefinition } from "@/entities/tutorial";

export interface TutorialFacts {
  definition: TutorialDefinition;
  progress: ConversationProgress;
  /** The card that acts, or null */
  live: Turn | null;
  /** Workspace paths of the open tabs */
  openFiles: readonly string[];
  /** The tab in front, if any */
  currentFile: string | null;
}

/**
 * The tutorial as the assistant's context: where the learner is, what the
 * step asks, the last result, the files and the docs it may link, and what
 * it may and may not do here. Copy from the definition, facts from the save.
 */
export const describeTutorial = (facts: TutorialFacts): string => {
  const { definition, progress, live } = facts;
  const lines = [
    `The learner is in the tutorial "${definition.name}" in Solana Playground, ` +
      `${definition.steps.length} steps, on devnet.`,
    whereOf(definition, progress),
  ];
  if (live?.kind === "ask" && live.open) {
    lines.push(
      `A question is open: "${textOf(live.ask.question)}". Do not give its ` +
        "answer away; the hint tool posts the lesson's own hint, and the " +
        "skip tool skips it, as its buttons do."
    );
  }
  const last = lastRun(progress);
  if (last) lines.push(`The last result: ${describeRun(last)}.`);
  if (facts.openFiles.length) {
    lines.push(
      `Open files: ${facts.openFiles.join(", ")}` +
        (facts.currentFile ? `; in front: ${facts.currentFile}.` : ".")
    );
  }
  if (definition.docs?.length) {
    lines.push(
      "Docs you may link, one page at most per answer: " +
        definition.docs.map((d) => `${d.title} (${d.url})`).join("; ") +
        "."
    );
  }
  lines.push(
    "In this tutorial you cannot change files, build, deploy or send " +
      "transactions. To change code, propose one line with propose_change; " +
      "the learner applies it or keeps their own. To show the steps, use " +
      "open_menu. You never judge whether a step passed: the lesson does."
  );
  return lines.join("\n");
};

const textOf = (text: string | { text: string }) =>
  typeof text === "string" ? text : text.text;

const whereOf = (
  definition: TutorialDefinition,
  progress: ConversationProgress
): string => {
  const { cursor } = progress;
  if (cursor.kind === "intro") {
    return "They have not started yet: the intro card shows the finished program.";
  }
  if (cursor.kind === "finished") {
    return "They finished every step.";
  }
  const i = definition.steps.findIndex((s) => s.id === cursor.stepId);
  const step = definition.steps[i];
  if (!step) return "They are in a step this tutorial no longer has.";
  const passed = progress.passed.includes(step.id) ? " It has passed." : "";
  return (
    `Step ${i + 1} of ${definition.steps.length}: ${step.title}. ` +
    `Objective: ${step.objective}. The step's file: ${step.file}.${passed}`
  );
};

/** The latest run to start, of any act, that has ended */
const lastRun = (progress: ConversationProgress): RunRecord | null => {
  let last: RunRecord | null = null;
  for (const runs of Object.values(progress.runs)) {
    for (const run of runs) {
      if (run.status === "interrupted" || run.status === "started") continue;
      if (!last || run.at >= last.at) last = run;
    }
  }
  return last;
};

const describeRun = (run: RunRecord): string => {
  if (run.status === "interrupted" || run.status === "started") {
    return "a run that did not end";
  }
  return describeResult(run.result);
};

const describeResult = (r: RunResult): string => {
  if (r.ok) {
    if (r.act === "build") return "the build passed";
    if (r.act === "deploy" || r.act === "buildDeploy") {
      return `the program deployed at ${r.programId}`;
    }
    if (r.act === "run" || r.act === "call") {
      return r.line
        ? `the ${r.act} landed, logging "${r.line}"`
        : `the ${r.act} landed`;
    }
    return "the act landed";
  }
  if (r.act === "build") {
    return r.error
      ? `the build failed: ${r.error.code} at ${r.error.file}:${r.error.line}, ${r.error.message}`
      : "the build failed";
  }
  return `the ${r.act} failed: ${r.message}`;
};

if (import.meta.vitest) {
  const { describe, it, expect, beforeAll } = import.meta.vitest;

  describe("widgets/tutorial-conversation/model/context", () => {
    let hello: TutorialDefinition;
    beforeAll(async () => {
      hello = (await import("../../../tutorials/hello-anchor/tutorial.json"))
        .default as unknown as TutorialDefinition;
    });

    /** A save before Start, named field by field; tests set what they need */
    const freshProgress = (): ConversationProgress => ({
      version: 1,
      passed: [],
      finishedAt: null,
      startedAt: null,
      restartedAt: null,
      cursor: { kind: "intro" },
      beats: {},
      runs: {},
      times: {},
      said: [],
      proposals: [],
    });

    it("says where the learner is, what the step asks and what it may do", () => {
      const progress = freshProgress();
      progress.startedAt = 1000;
      progress.cursor = {
        kind: "step",
        stepId: hello.steps[1].id,
        beat: 0,
        fail: false,
      };
      const text = describeTutorial({
        definition: hello,
        progress,
        live: null,
        openFiles: ["programs/hello/src/lib.rs"],
        currentFile: "programs/hello/src/lib.rs",
      });
      expect(text).toContain(`Step 2 of 4: ${hello.steps[1].title}.`);
      expect(text).toContain(`Objective: ${hello.steps[1].objective}.`);
      expect(text).toContain("in front: programs/hello/src/lib.rs");
      expect(text).toContain("you cannot change files, build, deploy");
    });

    it("names the last result, a failed build with its error", () => {
      const progress = freshProgress();
      progress.cursor = {
        kind: "step",
        stepId: hello.steps[0].id,
        beat: 3,
        fail: true,
      };
      progress.runs = {
        "s1.build": [
          {
            status: "failed",
            at: 2000,
            took: 1000,
            result: {
              act: "build",
              ok: false,
              seconds: 1,
              error: {
                code: "E0412",
                file: "src/lib.rs",
                line: 9,
                column: 32,
                message: "cannot find type `Hello`",
              },
              log: "",
            },
          },
          { status: "interrupted", at: 3000 },
        ],
      };
      expect(
        describeTutorial({
          definition: hello,
          progress,
          live: null,
          openFiles: [],
          currentFile: null,
        })
      ).toContain(
        "The last result: the build failed: E0412 at src/lib.rs:9, cannot find type `Hello`."
      );
    });

    it("before Start and after the finish", () => {
      const facts = (progress: ConversationProgress) =>
        describeTutorial({
          definition: hello,
          progress,
          live: null,
          openFiles: [],
          currentFile: null,
        });
      expect(facts(freshProgress())).toContain("They have not started yet");
      const done = freshProgress();
      done.cursor = { kind: "finished" };
      expect(facts(done)).toContain("They finished every step.");
    });
  });
}
