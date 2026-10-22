import { currentStep, stepNumber } from "./progress";
import { PgLesson } from "./store";
import type { LessonStep } from "./types";
import { helloAnchorGuide } from "./paths/hello-anchor.guide";
import { PgBuildOutput } from "../../sidebar/assistant/bridge/build-output";
import { realBridge } from "../../sidebar/assistant/bridge/playground-bridge";
import { PgAssistant } from "../../sidebar/assistant/store";
import { PgPatchUndo } from "../../sidebar/assistant/patch-undo";
import { parseBuildReport } from "../stages/build-report";
import type { BuildDiagnostic } from "../stages/build-report";
import { humanize } from "../stages/humanize";
import { diagnosticPath, rustcFix } from "./rustc-fix";
import type { RustcFix } from "./rustc-fix";

/** A change the tutorial's own assistant proposes, as a whole new file */
export interface GuidePatch {
  path: string;
  /**
   * The file's new content, or how to make it from what the file holds now.
   * A build writes the program's real id into `declare_id!`, so a fix made
   * after one has to keep it rather than put the placeholder back.
   */
  content: string | ((now: string | null) => string);
  /** Said before the approval card: what the change does, in a line or two */
  say: string;
  /** Said once it is applied: the move that proves it */
  done: string;
  /**
   * A second file the same change needs, proposed as its own card once this
   * one is applied; its `done` is said instead of this one's
   */
  then?: GuidePatch;
}

/** What the tutorial's assistant knows about one step, without a model */
export interface StepGuide {
  /** The first thing said when the step opens: what it does, and the two ways through */
  intro: string;
  /** "Explain this step" */
  explain: string;
  /** The rungs of "I'm stuck", answered rather than sent to a model */
  hints?: [string, string, string?];
  patch?: GuidePatch;
  /**
   * The planned first error: why the build failed, and the patch that fixes
   * it. Offered only when the failed build is that error: any other failure
   * is explained from rustc's own words instead.
   */
  fix?: {
    /** Whether the build's diagnostics are the error this fix is for */
    expects: (diagnostics: BuildDiagnostic[]) => boolean;
    explain: string;
    patch: GuidePatch;
  };
  /**
   * One question before the patch, on a step that brings a new idea. Three
   * answers of the same shape, so the right one is told by what it says;
   * skippable, since it is a check, not a gate.
   */
  check?: {
    question: string;
    options: [string, string, string];
    answer: number;
    /** Said after a right and a wrong answer; the wrong one names the right one */
    right: string;
    wrong: string;
  };
}

export type LessonGuide = Record<string, StepGuide>;

/** By the tutorial's name, as `TUTORIALS` and the lesson paths name it */
const GUIDES: Record<string, LessonGuide> = {
  "Hello Anchor": helloAnchorGuide,
};

const HINT = /^Hint (\d) of \d/;

/** What proves each kind of step, as its button in the band says it */
const PRESS: Record<string, string> = {
  build: "Build",
  deploy: "Deploy to devnet",
  interact: "Run the client",
};

/**
 * Said after a patch is turned down: the way on is still both ways, and the
 * press named is the one this step's band offers
 */
const leftAsItWas = (step: LessonStep | null) =>
  `Left it as it was. Write it yourself and press ${
    PRESS[step?.target ?? "build"] ?? "Build"
  }, or ask me again.`;

/** What the skip under a quick check says, as the learner's own message */
export const SKIP_CHECK = "Skip and show the code";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** How the quick check is put, which is also how the thread is read for it */
const askCheck = (check: NonNullable<StepGuide["check"]>) =>
  `Quick check before the code. ${check.question}`;

/**
 * The tutorial's own assistant, for when no model is connected.
 *
 * A learner on a fresh machine has no key, and the tutorial should not stop
 * at a connect dialog: the steps' patches, the planned first error and its
 * fix are written down, so they can be offered in the same chat, through the
 * same approval card a model's `write_file` lands in. Anything it has no
 * answer for falls through to connecting a model, as before. With a model
 * connected it stands aside entirely.
 */
export class PgLessonGuide {
  /** The guide for the lesson in progress and its current step, if any */
  static current(): {
    step: LessonStep;
    guide: StepGuide;
    chapter: string;
  } | null {
    const state = PgLesson.state;
    if (!state.path) return null;
    const step = currentStep(state.path, state.progress);
    const guide = step && GUIDES[state.path.tutorial]?.[step.id];
    if (!step || !guide) return null;
    const chapter = `Step ${stepNumber(state.path, state.progress)} · ${
      step.objective
    }`;
    return { step, guide, chapter };
  }

  /**
   * Say what the step is about when it opens. Once per step per thread: a
   * restored conversation that already holds the intro is left as it is.
   */
  static greet() {
    const at = PgLessonGuide.current();
    if (!at) return;
    const items = PgAssistant.items;
    const said = items.some(
      (i) => i.kind === "assistant" && i.text === at.guide.intro
    );
    if (!said) {
      PgLessonGuide._say(at.guide.intro, at.chapter);
      return;
    }
    const last = items[items.length - 1];
    // A thread restored while a patch waited: the card comes back declined,
    // since nothing can answer it now, and the turn has to end the way a
    // Reject ends it, with the way on, or the step is left at a dead end
    if (last?.kind === "approval" && last.status === "denied") {
      PgLessonGuide._say(leftAsItWas(PgLessonGuide.current()?.step ?? null));
    }
  }

  /**
   * Answer a message without a model, when the guide has an answer for it.
   *
   * @param text what would have been sent to the model
   * @param shown what the transcript shows for it
   * @returns whether the guide took it; `false` leaves it to a model
   */
  static async answer(text: string, shown: string) {
    const at = PgLessonGuide.current();
    if (!at) return false;
    const { guide, chapter } = at;
    const build = PgBuildOutput.latest;
    const failed = !!build?.failed;
    const asks = text.toLowerCase();
    const diagnostics = failed
      ? parseBuildReport(build!.stderr).diagnostics
      : [];
    // The step's fix answers its own planned error only. A semicolon the
    // learner left out is not that error, and the fix would be an empty patch
    // under an explanation of something else
    const planned = failed && !!guide.fix && guide.fix.expects(diagnostics);
    const other =
      failed && !planned
        ? PgLessonGuide._diagnosticAsked(text, diagnostics)
        : null;
    const suggested = other && rustcFix(other, (p) => realBridge.readFile(p));

    const patch = planned
      ? guide.fix!.patch
      : suggested
      ? PgLessonGuide._suggestionPatch(suggested)
      : guide.patch;
    const hint = text.match(HINT);

    let reply: () => Promise<void>;
    if (
      asks.startsWith("write this change for me") ||
      asks.includes("propose the patch")
    ) {
      if (!patch) return false;
      const check = guide.check;
      // The question comes first, once per step, and never over a fix
      if (check && !failed && !PgLessonGuide._asked(at.step.id, check)) {
        reply = async () => {
          PgLessonGuide._say(askCheck(check));
          PgLessonGuide._open = at.step.id;
        };
      } else reply = () => PgLessonGuide._propose(patch);
    } else if (hint) {
      const rung = Number(hint[1]) - 1;
      const said = guide.hints?.[rung];
      if (!said) {
        if (!patch) return false;
        reply = () => PgLessonGuide._propose(patch);
      } else reply = async () => PgLessonGuide._say(said);
    } else if (
      failed &&
      (asks.includes("fail") || asks.includes("fix") || asks.includes("error"))
    ) {
      if (planned) {
        const fix = guide.fix!;
        reply = async () => {
          PgLessonGuide._say(fix.explain);
          await PgLessonGuide._propose(fix.patch);
        };
      } else if (other) {
        reply = async () => {
          PgLessonGuide._say(PgLessonGuide._explainOther(other, !!suggested));
          if (suggested) {
            await PgLessonGuide._propose(
              PgLessonGuide._suggestionPatch(suggested)
            );
          }
        };
      } else return false;
    } else if (asks.includes("hint") && guide.hints) {
      const first = guide.hints[0];
      reply = async () => PgLessonGuide._say(first);
    } else if (
      asks.includes("explain") ||
      asks.includes("this step") ||
      asks.includes("this program")
    ) {
      reply = async () => PgLessonGuide._say(guide.explain);
    } else return false;

    PgAssistant.addUserMessage(shown, chapter);
    PgAssistant.setStatus("running");
    try {
      // A beat before the answer, so it reads as a reply rather than a page
      await pause(450);
      await reply();
    } finally {
      PgAssistant.setStatus("idle");
    }
    return true;
  }

  /**
   * The quick check waiting on an answer, for the chat to offer its three
   * answers under the question, or `null`
   */
  static get openCheck() {
    const at = PgLessonGuide.current();
    const check = at?.guide.check;
    if (!at || !check) return null;
    if (PgLessonGuide._open === at.step.id) return check;
    // A restored thread that ends on the question is still waiting for its
    // answer, so the answers come back under it after a reload
    const items = PgAssistant.items;
    const last = items[items.length - 1];
    const waiting =
      last?.kind === "assistant" &&
      last.text === askCheck(check) &&
      !PgLessonGuide._checked.has(at.step.id);
    return waiting ? check : null;
  }

  /**
   * Answer the open quick check, or skip it, and go on to the patch.
   *
   * @param choice the answer's index, or `null` to skip
   */
  static async choose(choice: number | null) {
    const at = PgLessonGuide.current();
    const check = PgLessonGuide.openCheck;
    if (!at || !check || PgAssistant.status !== "idle") return;
    PgLessonGuide._open = null;
    PgLessonGuide._checked.add(at.step.id);
    PgAssistant.addUserMessage(
      choice === null ? SKIP_CHECK : check.options[choice],
      at.chapter
    );
    PgAssistant.setStatus("running");
    try {
      await pause(450);
      if (choice !== null) {
        PgLessonGuide._say(choice === check.answer ? check.right : check.wrong);
      }
      if (at.guide.patch) await PgLessonGuide._propose(at.guide.patch);
    } finally {
      PgAssistant.setStatus("idle");
    }
  }

  /**
   * Whether "Write it for me" has a patch behind it on this step: the step's
   * own, or the fix once its build failed. Without one the press would only
   * open Connect a model.
   */
  static get canWrite() {
    const at = PgLessonGuide.current();
    if (!at) return false;
    return !!(
      at.guide.patch ||
      (PgBuildOutput.latest?.failed && at.guide.fix)
    );
  }

  /** Say something the tutorial did, such as the client's run, in the chat */
  static tell(text: string) {
    PgLessonGuide._say(text);
  }

  /** Steps whose quick check is behind the learner, answered or skipped */
  private static readonly _checked = new Set<string>();

  /**
   * Whether the step's check was already put to the learner. Read from the
   * thread too, so a reload does not ask it again: the question is in the
   * conversation, and so is what came after it.
   */
  private static _asked(
    stepId: string,
    check: NonNullable<StepGuide["check"]>
  ) {
    if (PgLessonGuide._checked.has(stepId)) return true;
    const asked = PgAssistant.items.some(
      (i) => i.kind === "assistant" && i.text === askCheck(check)
    );
    if (asked) PgLessonGuide._checked.add(stepId);
    return asked;
  }
  /** The step whose quick check is asked and not yet answered */
  private static _open: string | null = null;

  /**
   * The diagnostic a message is about: "Fix with assistant" names the file
   * and line of the card it was pressed on, anything else gets the first
   */
  private static _diagnosticAsked(
    text: string,
    diagnostics: BuildDiagnostic[]
  ) {
    return (
      diagnostics.find(
        (d) => d.file && d.line && text.includes(`${d.file}:${d.line}`)
      ) ??
      diagnostics[0] ??
      null
    );
  }

  /** A failure the guide did not plan, told in rustc's own words */
  private static _explainOther(d: BuildDiagnostic, hasFix: boolean) {
    const path = diagnosticPath(d);
    const where = path && d.line ? ` at \`${path}\` line ${d.line}` : "";
    const { explanation } = humanize(d.code, d.title);
    const help = d.excerpt.match(/help: (.+)$/m)?.[1];
    return [
      `The build stopped${where}: ${d.title}.`,
      explanation,
      help && `rustc's hint: ${help}.`,
      hasFix ? "" : "Fix that line and press **Rebuild**.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  /** rustc's own suggestion as a card: only the one insert, nothing else */
  private static _suggestionPatch(fix: RustcFix): GuidePatch {
    return {
      path: fix.path,
      content: fix.content,
      say: `Here is that change: \`${fix.insert}\` on line ${fix.line}, as rustc suggests.`,
      done: "Applied. Press **Rebuild**.",
    };
  }

  private static _say(text: string, chapter?: string) {
    const id = PgAssistant.startAssistantMessage(chapter);
    PgAssistant.appendToAssistantMessage(id, text);
  }

  /** The same path a model's `write_file` takes: a card, then the write */
  private static async _propose(patch: GuidePatch) {
    PgLessonGuide._say(patch.say);
    const before = realBridge.readFile(patch.path);
    const after =
      typeof patch.content === "function"
        ? patch.content(before)
        : patch.content;
    // A card that changes nothing is a dead end: Apply does nothing and the
    // learner is left looking for the change
    if (after === before) {
      PgLessonGuide._say(`\`${patch.path}\` already has that change.`);
      return;
    }
    const allowed = await PgAssistant.requestApproval({
      type: "patch",
      path: patch.path,
      before,
      after,
    });
    const approvalId = PgAssistant.lastApprovalId;
    if (!allowed) {
      PgLessonGuide._say(leftAsItWas(PgLessonGuide.current()?.step ?? null));
      return;
    }
    await realBridge.applyPatch({ path: patch.path, content: after });
    if (approvalId) {
      PgAssistant.setApprovalOutcome(approvalId, `wrote ${patch.path}`);
    }
    PgPatchUndo.wrote(approvalId);
    if (patch.then) await PgLessonGuide._propose(patch.then);
    else PgLessonGuide._say(patch.done);
  }
}
