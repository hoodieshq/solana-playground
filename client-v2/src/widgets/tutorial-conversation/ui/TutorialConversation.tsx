import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import {
  PgConversation,
  judgeGoal,
  realWorkspace,
  tutorialRunner,
} from "@/features/tutorial-conversation";
import type { ConversationState } from "@/features/tutorial-conversation";
import { slugOf } from "@/entities/tutorial";
import type { StepJumpVia } from "@/entities/tutorial";
import { createLogger } from "@/shared/lib/logger";
import {
  markUnavailableHere,
  reportButtonFailure,
} from "@/shared/lib/report-button-failure";
import { Spinner } from "@/shared/ui/spinner";
import { PgEditor } from "@/utils/editor";
import { PgExplorer } from "@/utils/explorer";
import { marksOf } from "../model/marks";
import type { FeedMarks } from "../model/marks";
import { PgTutorial } from "@/utils/tutorial";
import { tutorialTelemetry } from "../model/telemetry";
import BaseFeed from "./BaseFeed";
import TurnView from "./TurnView";
import type { TurnHandlers } from "./TurnView";
import { typing } from "./keys";

const log = createLogger("tutorial-conversation:feed");

/** How many lines sit above a line the feed shows in the editor */
const LINES_ABOVE = 8;
/**
 * How long typing rests before the engine reads the file for a question's
 * key line: the explorer announces every keystroke, and the engine needs only
 * where the typing stopped
 */
const EDIT_REST_MS = 300;

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

/** Files whose read failed, so a card re-rendering logs it once, not per render */
const unreadable = new Set<string>();

/**
 * A workspace file's content as the explorer holds it, or null when there is
 * no such file or no workspace yet. Called while rendering, so it never
 * throws: a read that fails anyway is logged once per file and draws no lines.
 */
const read = (file: string): string | null => {
  if (!PgExplorer.currentWorkspaceName) return null;
  try {
    return (
      PgExplorer.getFileContent(PgExplorer.convertToFullPath(file)) ?? null
    );
  } catch (e) {
    if (!unreadable.has(file)) {
      unreadable.add(file);
      log.warn("could not read a file a card shows", {
        context: { file, error: e instanceof Error ? e.message : String(e) },
      });
    }
    return null;
  }
};

/** Where a file opens with a line in view, before the editor can scroll it */
const savePosition = (path: string, line: number) =>
  PgExplorer.saveEditorPosition(path, {
    cursor: { from: 0, to: 0 },
    topLineNumber: Math.max(1, line - LINES_ABOVE),
  });

/**
 * Show a file's `line` in the editor. The file already open scrolls the line
 * to a third of its height (`PgEditor.revealLine`); a file being opened reads
 * its saved position, set first, with eight lines above the line. A file the
 * workspace does not hold, or no workspace at all, is refused with a toast
 * (`reportButtonFailure`), never a throw out of the click.
 * TODO(tutorial-flow-v2 2.2): lighting the lines again is the editor's
 * (HOO-2349)
 *
 * @returns where the line is: `shown` in the open editor, `opening` while
 * the file opens, or null when it was refused
 */
const showLine = (file: string, line: number): "shown" | "opening" | null => {
  const refuse = reportButtonFailure(`open ${file}`);
  try {
    const path = PgExplorer.convertToFullPath(file);
    // A compiler's location, or a quote, can name a file the workspace does
    // not hold; saving a position for it would throw
    if (!PgExplorer.getFile(path)) {
      const missing = new Error(`${file} is not in this workspace`);
      markUnavailableHere(missing, "it is not in this project");
      refuse(missing);
      return null;
    }
    // Saved too for the open file: an editor not mounted yet reads it later
    savePosition(path, line);
    if (PgExplorer.currentFilePath === path) {
      PgEditor.revealLine(path, line);
      return "shown";
    }
    PgExplorer.openFile(path);
    return "opening";
  } catch (e) {
    // No workspace current (one switching), or the explorer refused the open
    refuse(e);
    return null;
  }
};

/**
 * A step's file at its top, after a jump to the step. The jump already moved
 * the feed; a step whose file is gone (renamed, or replaced by a later step's
 * start) leaves the editor as it is rather than raising a failure for it.
 */
const showStepFile = (file: string) => {
  let there: boolean;
  try {
    there = !!PgExplorer.getFile(PgExplorer.convertToFullPath(file));
  } catch (e) {
    // No workspace current, one switching: the feed moved; the editor waits
    log.debug("no workspace to open a jumped-to step's file in", {
      context: { file, error: e instanceof Error ? e.message : String(e) },
    });
    return;
  }
  if (!there) {
    log.debug("a jumped-to step's file is not in the workspace", {
      context: { file },
    });
    return;
  }
  showLine(file, 1);
};

/**
 * Open `file` in the editor now, and again once a later create in the
 * workspace leaves it there. Entering a step writes its start files after
 * the engine's state has moved on (the store drains its effects), and on
 * Start the preview's tab did not survive step 1's start files being written
 * over it (seen in the browser, 2 Nov 2026), so opening once at the move was
 * not enough.
 *
 * @returns a disposer for the subscription
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
 * cursor of each load (`ConversationState.loadedAt`) is not an entry: the
 * store reads the save after the first render, and a reload restores the
 * workspace's own tabs.
 */
const useOpenEnteredStep = (state: ConversationState) => {
  const cursor = state.engine.progress.cursor;
  const stepId = cursor.kind === "step" ? cursor.stepId : null;
  const { context, loadedAt } = state;
  const seen = useRef<{ loadedAt: number; stepId: string | null } | null>(null);
  useEffect(() => {
    const before = seen.current;
    seen.current = { loadedAt, stepId };
    // No save yet, or a load: nothing was entered
    if (!context || !before || before.loadedAt !== loadedAt) return;
    if (!stepId || stepId === before.stepId) return;
    const step = context.definition.steps.find((s) => s.id === stepId);
    return step ? openWhenWritten(step.file) : undefined;
  }, [stepId, loadedAt, context]);
};

/**
 * The finished program beside the intro card is a preview, read only as the
 * spec's "A tutorial opens on its intro card" has it: the editor refuses
 * typing until Start, and again after Start over. Leaving the tutorial
 * unlocks it.
 */
const useLockedPreview = (state: ConversationState) => {
  const onIntro =
    !!state.context && state.engine.progress.cursor.kind === "intro";
  useEffect(() => {
    if (!onIntro) return;
    PgEditor.setReadOnly(true);
    return () => PgEditor.setReadOnly(false);
  }, [onIntro]);
};

/** Marks that failed to compute, by message, so a re-render logs each once */
const unmarked = new Set<string>();

/**
 * The feed's marks for a file of the open tutorial, or null outside one.
 * Computed while the frame renders, so it never throws: marks are
 * decoration, and a failure here draws no lines rather than taking the
 * workspace down.
 */
const marksNow = (file: string): FeedMarks | null => {
  try {
    const context = PgConversation.state.context;
    const view = PgConversation.view();
    if (!context || !view) return null;
    return marksOf(context.definition, view, read)(file);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!unmarked.has(message)) {
      unmarked.add(message);
      log.error(e, { report: true, context: { file, what: "line marks" } });
    }
    return null;
  }
};

/**
 * Hands the engine a file the learner changed, as the explorer holds it.
 * The engine reads it for an open question's key line and ignores a file no
 * question writes to.
 */
const sendEdit = (path: string) => {
  try {
    if (!PgConversation.state.context || !PgExplorer.currentWorkspaceName) {
      return;
    }
    const content = PgExplorer.getFileContent(path);
    if (content === undefined) {
      // Renamed or deleted while the typing rested: nothing left to read
      log.debug("an edited file is gone before the engine read it", {
        context: { path },
      });
      return;
    }
    PgConversation.edit(PgExplorer.getRelativePath(path), content);
  } catch (e) {
    // A workspace switching under the timer; the next change sends again
    log.warn("could not hand the engine an edit", {
      context: { path, error: e instanceof Error ? e.message : String(e) },
    });
  }
};

/**
 * The editor and the engine, both ways. A change to the open file reaches
 * the engine (`edit`) once the typing rests, so a question's key line typed
 * by hand resolves it; the file is taken when it changes, and a change to
 * another file first sends the pending one, so a quick tab switch never
 * sends the wrong file. The engine's request for the caret ("Type it
 * myself", "I'll fix it myself") opens the file at the line, the landing as
 * the feed draws it, and focuses the editor unless the open was refused.
 */
const useEditorLink = () => {
  useEffect(() => {
    let pending: { path: string; timer: number } | null = null;
    const flush = () => {
      if (!pending) return;
      window.clearTimeout(pending.timer);
      const { path } = pending;
      pending = null;
      sendEdit(path);
    };
    const saved = PgExplorer.onDidSaveFile(() => {
      const path = PgExplorer.currentFilePath;
      if (!path) return;
      if (pending && pending.path !== path) flush();
      if (pending) window.clearTimeout(pending.timer);
      pending = { path, timer: window.setTimeout(flush, EDIT_REST_MS) };
    });

    const focus = PgConversation.onDidRequestFocus(({ file, line }) => {
      const at =
        line === "landing" ? marksNow(file)?.landing?.lines[0] ?? 1 : line;
      const shown = showLine(file, at);
      if (shown === "shown") PgEditor.focus();
      // The editor stays mounted and swaps its file as the open lands: it
      // takes focus a frame later. A refused open leaves the focus alone
      if (shown === "opening") requestAnimationFrame(() => PgEditor.focus());
    });
    return () => {
      if (pending) window.clearTimeout(pending.timer);
      saved.dispose();
      focus.dispose();
    };
  }, []);
};

/**
 * The feed's line marks for the workspace's editor (`TutorialWorkspace`'s
 * `marks`). They refresh on each notification of the conversation, so the
 * landing follows the lesson and the typing once it has rested, not each
 * keystroke.
 */
export const useConversationMarks = () => {
  useConversationState();
  return (file: string) => {
    const marks = marksNow(file);
    if (!marks) return {};
    return {
      written: [...marks.written],
      arriving: marks.arriving,
      landing: marks.landing,
    };
  };
};

/** Where a copy the clipboard refused is told */
const copyFailed = reportButtonFailure("copy it");

export interface TutorialConversationProps {
  /** Open the catalog's Tutorials page */
  onAllTutorials: () => void;
}

/**
 * The handlers that read no prop and no definition; `TutorialConversation`
 * adds the ones that do (the next tutorial, All tutorials) and Copy
 * receipt's count
 */
const handlers: Omit<
  TurnHandlers,
  "openNextTutorial" | "allTutorials" | "copyReceipt"
> = {
  start: () => PgConversation.start(),
  pick: (beatId, option) => PgConversation.pick(beatId, option),
  hint: (beatId) => PgConversation.hint(beatId),
  skip: (beatId) => PgConversation.skip(beatId),
  typeIt: (beatId) => PgConversation.typeIt(beatId),
  act: (beatId, args) => PgConversation.act(beatId, args),
  explain: (beatId) => PgConversation.explain(beatId),
  fixMyself: (beatId) => PgConversation.fixMyself(beatId),
  next: () => PgConversation.next(),
  restartStep: () => PgConversation.restartStep(),
  showLine,
  // TODO(tutorial-flow-v2 4.4): the Call panel's opener; until it exists the
  // win card shows no "Open Call"
  openCall: undefined,
  copyFailed: (error) => copyFailed(error),
};

/**
 * The tutorial a definition's `finish.next` names, by its slug among the
 * listed ones, or null. The loader drops a definition whose `next` names no
 * known tutorial, so a set `next` almost always finds one; it finds none
 * when it names a definition that was itself left out.
 */
const nextTutorialOf = (next: string | null): string | null =>
  next === null
    ? null
    : PgTutorial.all.find((t) => slugOf(t.name) === next)?.name ?? null;

/**
 * The tutorial conversation in the frame's chat: it starts the engine for the
 * open workspace, draws the feed from the engine's view, and turns each
 * card's press into the engine's action. ⌘↵ presses the live act, or Explain
 * on an open failure, unless the learner is typing; a call act with arguments
 * waits for its own fields, where Enter sends. The finish card's "All
 * tutorials" opens the catalog, another widget's, so the frame passes it in.
 */
export const TutorialConversation = ({
  onAllTutorials,
}: TutorialConversationProps) => {
  useEffect(
    () =>
      PgConversation.init({
        workspace: realWorkspace,
        // TODO(tutorial-flow-v2 4.1): the build act answers "not wired yet"
        // until its runner lands; deploy, run and call are real
        runner: tutorialRunner,
        judge: judgeGoal,
      }).dispose,
    []
  );
  const state = useConversationState();
  const context = state.context;
  useOpenEnteredStep(state);
  useLockedPreview(state);
  useEditorLink();
  const view = PgConversation.view();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "Enter" || typing(e.target)) {
        return;
      }
      const live = PgConversation.view()?.live;
      // A call with a field to fill waits for it, where Enter sends
      const fields =
        live?.kind === "act" && live.act.act === "call"
          ? (live.act.call.args ?? []).filter((a) => typeof a === "string")
          : [];
      if (live?.kind === "act" && !fields.length) {
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
    (index: number, from: number, via: StepJumpVia) => {
      const definition = PgConversation.state.context?.definition;
      const slug = PgConversation.state.context?.slug;
      if (!definition || !slug) return;
      tutorialTelemetry.track("tutorial_step_jumped", {
        tutorial: slug,
        step: index + 1,
        from: from + 1,
        via,
      });
      showStepFile(definition.steps[index].file);
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

  const next = context?.definition.finish.next ?? null;
  // Read each render: the tutorial list is the app's, not this component's
  const nextTutorial = nextTutorialOf(next);
  const on = useMemo<TurnHandlers>(
    () => ({
      ...handlers,
      openNextTutorial: () => {
        const slug = PgConversation.state.context?.slug;
        if (!nextTutorial || !next || !slug) {
          // The button only shows with a next tutorial; a context gone
          // mid-switch is the one way here
          log.warn("Next on the finish card had nothing to open", {
            context: { next, slug: slug ?? null },
          });
          return;
        }
        // Counted once it opened: a failed open is the toast's, not a learner
        // going on
        PgTutorial.open(nextTutorial)
          .then(() =>
            tutorialTelemetry.track("tutorial_next_opened", {
              tutorial: slug,
              next,
            })
          )
          .catch(reportButtonFailure(`open ${nextTutorial}`));
      },
      allTutorials: onAllTutorials,
      copyReceipt: () => {
        const slug = PgConversation.state.context?.slug;
        if (slug) {
          tutorialTelemetry.track("tutorial_receipt_copied", {
            tutorial: slug,
          });
        }
      },
    }),
    [next, nextTutorial, onAllTutorials]
  );

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
          nextTutorial={nextTutorial}
          on={on}
        />
      )}
    />
  );
};

/**
 * Whether the learner has pressed Start on `name`'s intro card. False while
 * the conversation holds another tutorial or none, as on a cold load before
 * the save is read: the intro offers nothing but Start until then.
 */
export const useConversationStarted = (name: string): boolean => {
  const state = useConversationState();
  return (
    state.context?.definition.name === name &&
    state.engine.progress.startedAt !== null
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
