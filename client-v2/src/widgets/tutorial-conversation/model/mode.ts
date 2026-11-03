import { PgConversation } from "@/features/tutorial-conversation";
import type { ToolInput } from "@/shared/lib/ai";
import { uuid } from "@/shared/lib/ids";
import { createLogger } from "@/shared/lib/logger";
import { PgExplorer } from "@/utils/explorer";
import { PgAssistant } from "@/views/sidebar/assistant/store";
import type { AssistantMode } from "@/views/sidebar/assistant/store";
import { describeTutorial } from "./context";

const log = createLogger("tutorial-conversation:mode");

/**
 * The assistant's own tools that may run in a tutorial: reading only. The
 * skill tools read the ecosystem's guidance; writing, building and deploying
 * stay the lesson's (spec "One composer; free questions go to the live
 * assistant").
 */
const ALLOWED = new Set([
  "list_files",
  "read_file",
  "get_build_error",
  "list_skills",
  "load_skill",
  "read_skill_reference",
]);

/** A string argument the model supplied, or "" */
const str = (input: ToolInput, key: string) => {
  const value = input[key];
  return typeof value === "string" ? value : "";
};

const NO_PARAMS = {
  type: "object" as const,
  properties: {},
  additionalProperties: false as const,
};

/** The open question's beat id, or null */
const openQuestion = (): string | null => {
  const live = PgConversation.view()?.live;
  return live?.kind === "ask" && live.open ? live.beatId : null;
};

/**
 * The tutorial's mode for the live assistant (`PgAssistant.setMode`): the
 * lesson's context (`describeTutorial`), the read-only tools, and four
 * tools that only show or offer something: the menu, the question's Hint
 * and Skip as their buttons do, and a one-line change the learner applies
 * or keeps.
 *
 * @param openMenu opens the frame's navigation, which another widget owns
 */
export const tutorialMode = ({
  openMenu,
}: {
  openMenu: () => void;
}): AssistantMode => ({
  name: "tutorial",
  allows: (name) => ALLOWED.has(name),
  refusal:
    "In a tutorial you cannot change files, build, deploy or send " +
    "transactions: the lesson does those. Tell the learner which button or " +
    "step does it, or offer a change with propose_change.",
  context: () => {
    const { context, engine } = PgConversation.state;
    if (!context) return "The learner is not in a tutorial right now.";
    return describeTutorial({
      definition: context.definition,
      progress: engine.progress,
      live: PgConversation.view()?.live ?? null,
      openFiles: PgExplorer.tabs.map((tab) => PgExplorer.getRelativePath(tab)),
      currentFile: PgExplorer.currentFilePath
        ? PgExplorer.getRelativePath(PgExplorer.currentFilePath)
        : null,
    });
  },
  tools: [
    {
      name: "open_menu",
      description:
        "Open the tutorial's navigation menu, with its steps and the other " +
        "tutorials. Use it when the learner asks for the menu.",
      schema: NO_PARAMS,
      run: () => {
        PgAssistant.addToolCall("opened the menu");
        openMenu();
        return "The menu is open.";
      },
    },
    {
      name: "hint",
      description:
        "Post the open question's own hint under it, as its Hint button " +
        "does. Use it when the learner is stuck on the question.",
      schema: NO_PARAMS,
      run: () => {
        const beatId = openQuestion();
        if (!beatId) return "No question is open, so there is no hint to post.";
        PgAssistant.addToolCall("posted the hint");
        PgConversation.hint(beatId, { byAssistant: true });
        return "The hint is posted under the question. Do not repeat it.";
      },
    },
    {
      name: "skip",
      description:
        "Skip the open question, as its Skip button does: the lesson writes " +
        "its answer's code. Use it only when the learner asks you to do it " +
        "for them.",
      schema: NO_PARAMS,
      run: () => {
        const beatId = openQuestion();
        if (!beatId) return "No question is open, so there is nothing to skip.";
        PgAssistant.addToolCall("skipped the question");
        PgConversation.skip(beatId);
        return "Skipped: the lesson wrote the answer's code.";
      },
    },
    {
      name: "propose_change",
      description:
        "Propose changing one line of a file. The learner sees the line's " +
        "diff with Apply and Keep it; nothing changes until they press " +
        "Apply. Read the file first, and send the whole new line.",
      schema: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description:
              "Path relative to the project root, e.g. programs/hello/src/lib.rs",
          },
          line: { type: "number", description: "1-based line number" },
          after: { type: "string", description: "The whole new line" },
        },
        required: ["file", "line", "after"],
        additionalProperties: false,
      },
      run: (input) => {
        const file = str(input, "file");
        const line = input.line;
        if (typeof line !== "number" || !Number.isInteger(line) || line < 1) {
          return "The line must be a whole number from 1.";
        }
        const content = readFile(file);
        if (content === null) return `There is no file at ${file}.`;
        const before = content.split("\n")[line - 1];
        if (before === undefined) return `${file} has no line ${line}.`;
        const after = input.after;
        if (typeof after !== "string")
          return "Send the whole new line as `after`.";
        if (/[\r\n]/.test(after)) {
          return "Propose one line at a time: `after` must not break the line.";
        }
        if (before === after) return "That line already reads so.";
        PgAssistant.addToolCall(`proposed a change to ${file}`);
        PgConversation.propose({ id: uuid(), file, line, before, after });
        return (
          "The change is posted as a card; the learner decides. Do not " +
          "propose it again."
        );
      },
    },
  ],
});

const readFile = (file: string): string | null => {
  try {
    return (
      PgExplorer.getFileContent(PgExplorer.convertToFullPath(file)) ?? null
    );
  } catch (e) {
    // A missing file reads as undefined; a throw is the explorer failing
    log.error(e, { report: true, context: { file, what: "assistant read" } });
    return null;
  }
};
