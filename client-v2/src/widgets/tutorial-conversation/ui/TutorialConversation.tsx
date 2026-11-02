import { useCallback, useEffect, useState } from "react";

import {
  PgConversation,
  judgeGoal,
  realWorkspace,
  unwiredRunner,
} from "@/features/tutorial-conversation";
import type { ConversationState } from "@/features/tutorial-conversation";
import { Spinner } from "@/shared/ui/spinner";
import { PgExplorer } from "@/utils/explorer";
import { barProgress } from "../model/step-bar";
import { tutorialTelemetry } from "../model/telemetry";
import BaseFeed from "./BaseFeed";
import TurnView from "./TurnView";
import type { TurnHandlers } from "./TurnView";

/** How many lines sit above a line the feed shows in the editor */
const LINES_ABOVE = 8;

/** The engine's state, re-rendering on every change */
const useConversationState = (): ConversationState => {
  const [state, setState] = useState(PgConversation.state);
  useEffect(() => PgConversation.onDidChange(setState).dispose, []);
  return state;
};

/** A workspace file's content as the explorer holds it, or null */
const read = (file: string): string | null => {
  try {
    return (
      PgExplorer.getFileContent(PgExplorer.convertToFullPath(file)) ?? null
    );
  } catch {
    // No workspace open yet, or one switching: the card shows no lines
    return null;
  }
};

/**
 * Open a file in the editor with `line` near the top. The editor reads a
 * file's saved position when it opens it, so the position is set first.
 * TODO(tutorial-flow-v2 2.2): a third of the editor's height, the lines lit
 * again, and a file already open moved too, are the editor's (HOO-2349)
 */
const showLine = (file: string, line: number) => {
  const path = PgExplorer.convertToFullPath(file);
  PgExplorer.saveEditorPosition(path, {
    cursor: { from: 0, to: 0 },
    topLineNumber: Math.max(1, line - LINES_ABOVE),
  });
  PgExplorer.openFile(path);
};

const handlers: TurnHandlers = {
  start: () => PgConversation.start(),
  pick: (beatId, option) => PgConversation.pick(beatId, option),
  hint: (beatId) => PgConversation.hint(beatId),
  skip: (beatId) => PgConversation.skip(beatId),
  act: (beatId, args) => PgConversation.act(beatId, args),
  explain: (beatId) => PgConversation.explain(beatId),
  fixMyself: (beatId) => PgConversation.fixMyself(beatId),
  next: () => PgConversation.next(),
  showLine,
};

/** Whether a key press came from a field the learner types in */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * The tutorial conversation in the frame's chat: it starts the engine for the
 * open workspace, draws the feed from the engine's view, and turns each
 * card's press into the engine's action. ⌘↵ presses the live act, or Explain
 * on an open failure, unless the learner is typing.
 */
export const TutorialConversation = () => {
  useEffect(
    () =>
      PgConversation.init({
        workspace: realWorkspace,
        // TODO(tutorial-flow-v2 4.1): the run tickets (4.1 to 4.3) replace
        // the unwired runner; until then every act ends in its failed card
        runner: unwiredRunner,
        judge: judgeGoal,
      }).dispose,
    []
  );
  const state = useConversationState();
  const context = state.context;
  const view = PgConversation.view();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "Enter" || typing(e.target)) {
        return;
      }
      const live = PgConversation.view()?.live;
      if (
        live?.kind === "act" &&
        !(live.act.act === "call" && live.act.call.args?.length)
      ) {
        e.preventDefault();
        PgConversation.act(live.beatId);
      } else if (live?.kind === "result" && live.open) {
        e.preventDefault();
        PgConversation.explain(live.beatId);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const onJump = useCallback(
    (index: number, from: number, via: "bar" | "menu" | "key") => {
      const definition = PgConversation.state.context?.definition;
      const slug = PgConversation.state.context?.slug;
      if (!definition || !slug) return;
      showLine(definition.steps[index].file, 1);
      tutorialTelemetry.track("tutorial_step_jumped", {
        tutorial: slug,
        step: index + 1,
        from: from + 1,
        via,
      });
    },
    []
  );
  const onBack = useCallback((step: number | null) => {
    const slug = PgConversation.state.context?.slug;
    if (!slug) return;
    tutorialTelemetry.track("tutorial_step_back", {
      tutorial: slug,
      step: step === null ? 0 : step + 1,
    });
  }, []);

  if (!context || !view) {
    return (
      <div className="grid flex-1 place-items-center">
        <Spinner aria-label="Loading the tutorial" className="size-5" />
      </div>
    );
  }

  const progress = state.engine.progress;
  const running = view.turns.some(
    (t) => t.kind === "act" && t.state === "running"
  );
  return (
    <BaseFeed
      turns={view.turns}
      live={view.live}
      steps={view.steps}
      progress={barProgress(context.definition, progress)}
      onJump={onJump}
      onBack={onBack}
      renderTurn={(turn, live) => (
        <TurnView
          turn={turn}
          definition={context.definition}
          live={live}
          running={running}
          passed={progress.passed}
          read={read}
          on={handlers}
        />
      )}
    />
  );
};

/** What the frame's head needs from the conversation: Start over, and the steps passed */
export const useConversationStartOver = () => {
  const state = useConversationState();
  if (!state.context) return { onStartOver: undefined, passed: undefined };
  return {
    onStartOver: async () => PgConversation.startOver(),
    passed: state.engine.progress.passed.length,
  };
};
