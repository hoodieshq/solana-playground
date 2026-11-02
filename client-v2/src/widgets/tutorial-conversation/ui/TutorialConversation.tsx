import { useCallback, useEffect, useReducer, useRef } from "react";

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

/**
 * The engine's state, re-rendering on every notification. Counted rather
 * than stored: when a turn falls due, the store's timer announces the same
 * state object (`_set` in `PgConversation`), and the view it then answers is
 * what moved; React would skip a `setState` of an object it already holds.
 */
const useConversationState = (): ConversationState => {
  const [, render] = useReducer((n: number) => n + 1, 0);
  useEffect(() => PgConversation.onDidChange(render).dispose, []);
  return PgConversation.state;
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

/**
 * Open `file` in the editor now, and again on its first write after this
 * call. Entering a step writes its start files after the engine's state has
 * moved on (the store drains its effects), and overwriting the open file
 * closes its tab (`PgExplorer.createItem` with `override`), so the file
 * that exists at the move is not yet the one that stays.
 *
 * @returns the subscription still waiting for that write
 */
const openWhenWritten = (file: string): (() => void) => {
  const path = PgExplorer.convertToFullPath(file);
  if (PgExplorer.getFile(path)) PgExplorer.openFile(path);
  const created = PgExplorer.onDidCreateItem(() => {
    if (!PgExplorer.getFile(path)) return;
    created.dispose();
    PgExplorer.openFile(path);
  });
  return () => created.dispose();
};

/**
 * The step the lesson enters opens its main file, as the spec's "the
 * workspace swaps the preview for the step's start files" reads. The first
 * render is a load, where the workspace restores its own tabs.
 */
const useOpenEnteredStep = (state: ConversationState) => {
  const cursor = state.engine.progress.cursor;
  const stepId = cursor.kind === "step" ? cursor.stepId : null;
  const definition = state.context?.definition;
  const seen = useRef<{ stepId: string | null } | null>(null);
  useEffect(() => {
    const before = seen.current;
    seen.current = { stepId };
    if (!before || !stepId || stepId === before.stepId) return;
    const step = definition?.steps.find((s) => s.id === stepId);
    return step ? openWhenWritten(step.file) : undefined;
  }, [stepId, definition]);
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
  useOpenEnteredStep(state);
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
