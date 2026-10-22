import { currentStep, stepNumber } from "./progress";
import { PgLesson } from "./store";
import type { LessonStep } from "./types";
import { helloAnchorGuide } from "./paths/hello-anchor.guide";
import { PgBuildOutput } from "../../sidebar/assistant/bridge/build-output";
import { realBridge } from "../../sidebar/assistant/bridge/playground-bridge";
import { PgAssistant } from "../../sidebar/assistant/store";

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
   * it. Offered once the step's build has failed.
   */
  fix?: { explain: string; patch: GuidePatch };
}

export type LessonGuide = Record<string, StepGuide>;

/** By the tutorial's name, as `TUTORIALS` and the lesson paths name it */
const GUIDES: Record<string, LessonGuide> = {
  "Hello Anchor": helloAnchorGuide,
};

const HINT = /^Hint (\d) of \d/;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    const said = PgAssistant.items.some(
      (i) => i.kind === "assistant" && i.text === at.guide.intro
    );
    if (said) return;
    PgLessonGuide._say(at.guide.intro);
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
    const failed = !!PgBuildOutput.latest?.failed;
    const asks = text.toLowerCase();

    const patch = failed && guide.fix ? guide.fix.patch : guide.patch;
    const hint = text.match(HINT);

    let reply: () => Promise<void>;
    if (
      asks.startsWith("write this change for me") ||
      asks.includes("propose the patch")
    ) {
      if (!patch) return false;
      reply = () => PgLessonGuide._propose(patch);
    } else if (hint) {
      const rung = Number(hint[1]) - 1;
      const said = guide.hints?.[rung];
      if (!said) {
        if (!patch) return false;
        reply = () => PgLessonGuide._propose(patch);
      } else reply = async () => PgLessonGuide._say(said);
    } else if (
      failed &&
      guide.fix &&
      (asks.includes("fail") || asks.includes("fix") || asks.includes("error"))
    ) {
      const fix = guide.fix;
      reply = async () => {
        PgLessonGuide._say(fix.explain);
        await PgLessonGuide._propose(fix.patch);
      };
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

  private static _say(text: string) {
    const id = PgAssistant.startAssistantMessage();
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
    const allowed = await PgAssistant.requestApproval({
      type: "patch",
      path: patch.path,
      before,
      after,
    });
    const approvalId = PgAssistant.lastApprovalId;
    if (!allowed) {
      PgLessonGuide._say(
        "Left it as it was. Write it yourself and press Build, or ask me again."
      );
      return;
    }
    await realBridge.applyPatch({ path: patch.path, content: after });
    if (approvalId) {
      PgAssistant.setApprovalOutcome(approvalId, `wrote ${patch.path}`);
    }
    PgLessonGuide._say(patch.done);
  }
}
