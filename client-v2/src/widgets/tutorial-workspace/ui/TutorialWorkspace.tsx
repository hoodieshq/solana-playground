import { useEffect, useMemo, useRef, useState } from "react";
import type { FC, ReactNode } from "react";

import { EditorTabsShown } from "@/components/EditorWithTabs";
import { useRenderOnChange } from "@/hooks";
import { createLogger } from "@/shared/lib/logger";
import { PgCommon, PgExplorer, PgTutorial } from "@/utils";
import { PgFlow } from "@/views/flow/state/stage";
import { NO_MARKS } from "../model/lines";
import type { LineMarks } from "../model/lines";
import { autoOpenReason } from "../model/terminal";
import { tutorialWorkspaceTelemetry } from "../model/telemetry";
import type { TreeSource } from "../model/telemetry";
import { createdIn, tabsOf, treeRows, tutorialFiles } from "../model/tree";
import BaseDockedTree from "./BaseDockedTree";
import BaseWorkspaceHead from "./BaseWorkspaceHead";
import { firstDiagnostic } from "./use-terminal-facts";
import { useEditorLines } from "./use-editor-lines";

const log = createLogger("tutorial-workspace:workspace");

/** The workspace is wide enough to dock the tree beside the editor from here */
export const DOCK_MIN_PX = 1100;

/** The tutorials whose tree is docked, by name: one small list per device */
const DOCKED_KEY = "tutorial-workspace.docked";

const readDocked = (): string[] => {
  try {
    const raw = localStorage.getItem(DOCKED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((n): n is string => typeof n === "string")
      : [];
  } catch (error) {
    // A broken or blocked store reads as nothing docked; the tree still opens
    log.warn("could not read the docked trees", { context: { error } });
    return [];
  }
};

const writeDocked = (name: string, docked: boolean) => {
  const names = readDocked().filter((n) => n !== name);
  try {
    localStorage.setItem(
      DOCKED_KEY,
      JSON.stringify(docked ? [...names, name] : names)
    );
  } catch (error) {
    // The dock still holds for the visit; only the next one forgets it
    log.warn("could not save the docked tree", { context: { error } });
  }
};

/** A full explorer path as the tutorial names it, from the project root */
const relOf = (full: string | null) => {
  if (!full) return null;
  const root = PgCommon.appendSlash(PgExplorer.getProjectRootPath());
  return full.startsWith(root) ? full.slice(root.length) : full;
};

/** The shell's console as the stage sees it (`LayoutShellProps.stage`) */
export interface WorkspaceConsole {
  open: boolean;
  setOpen: (open: boolean, via: "button" | "auto") => void;
}

export interface TutorialWorkspaceProps {
  /**
   * The frame shows. Off, the wrapper still renders, with no head and no
   * tree, so the stage under it never remounts on the way in or out
   */
  active: boolean;
  /** The shell's console, which the head's Terminal and the auto-open drive */
  console: WorkspaceConsole;
  /** The Files and Terminal keys as the tips show them ("⌘E", "⌘J") */
  keys: { files: string; terminal: string };
  /**
   * The written, arriving and landing lines of a file, from the feed (task
   * 3.3) and the question card; none until they pass it
   */
  marks?: (file: string) => Partial<LineMarks>;
  /** The Call button, once the program is deployed (task 4.4) */
  call?: ReactNode;
  /** The stage: the editor, under the head and beside the docked tree */
  children: ReactNode;
}

/**
 * A tutorial's workspace (`tutorial-flow-v2` 2.2): the head over the stage,
 * the tree docked beside it, the editor's line states, and the terminal's
 * auto-open. Mounted by the view in the frame's stage while a tutorial with
 * a definition is open; the upstream tab row is not drawn under it.
 */
const TutorialWorkspace: FC<TutorialWorkspaceProps> = ({
  active: frame,
  console: terminal,
  keys,
  marks,
  call,
  children,
}) => {
  useRenderOnChange(PgTutorial.onDidChange);
  useRenderOnChange(PgExplorer.onDidOpenFile);
  useRenderOnChange(PgExplorer.onDidCreateItem);
  useRenderOnChange(PgExplorer.onDidDeleteItem);
  const tutorial = PgTutorial.current;
  const definition = frame ? tutorial?.definition : undefined;
  const active = definition !== undefined;
  const name = tutorial?.name ?? "";

  const files = useMemo(
    () => (definition ? tutorialFiles(definition) : []),
    [definition]
  );
  const present = new Set(
    files.filter((f) => PgExplorer.files[PgExplorer.convertToFullPath(f)])
  );
  const open = relOf(PgExplorer.currentFilePath);
  const page = PgTutorial.pageNumber;
  const live =
    definition && page ? definition.steps[page - 1]?.file ?? null : null;
  const rows = treeRows({
    files,
    present,
    open,
    live,
    createdIn: (path) => (definition ? createdIn(definition, path) : null),
  });

  const box = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setWide(entry.contentRect.width >= DOCK_MIN_PX)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [treeOpen, setTreeOpen] = useState(false);
  const [docked, setDocked] = useState(() => readDocked().includes(name));
  useEffect(() => setDocked(readDocked().includes(name)), [name]);
  const dockedShown = docked && wide;

  const dock = (next: boolean) => {
    setDocked(next);
    setTreeOpen(false);
    writeDocked(name, next);
    tutorialWorkspaceTelemetry.track("tutorial_workspace_tree_docked", {
      docked: next,
    });
  };
  const toggleTree = (via: TreeSource) => {
    if (dockedShown) return dock(false);
    if (!treeOpen) {
      tutorialWorkspaceTelemetry.track("tutorial_workspace_tree_opened", {
        via,
      });
    }
    setTreeOpen(!treeOpen);
  };
  const openFile = (path: string, via: "tab" | "tree") => {
    setTreeOpen(false);
    if (path === open) return;
    PgExplorer.openFile(PgExplorer.convertToFullPath(path));
    tutorialWorkspaceTelemetry.track("tutorial_workspace_file_opened", { via });
  };

  // ⌘E, even from the editor or a field: Monaco's own ⌘E (find with the
  // selection) loses to it here, as the spec lists it among the keys that
  // fire from a text field
  const toggleNow = useRef(toggleTree);
  toggleNow.current = toggleTree;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() !== "e") return;
      e.preventDefault();
      e.stopPropagation();
      toggleNow.current("key");
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [active]);

  // The drawer opens by itself on a failed build and the first deploy
  const terminalNow = useRef(terminal);
  terminalNow.current = terminal;
  useEffect(() => {
    if (!active) return;
    let prev = PgFlow.state;
    let deployedBefore = prev.deploy === "done";
    const sub = PgFlow.onDidChange((next) => {
      const reason = autoOpenReason(prev, next, deployedBefore);
      if (next.deploy === "done") deployedBefore = true;
      prev = next;
      if (!reason) return;
      tutorialWorkspaceTelemetry.track("tutorial_workspace_terminal_opened", {
        reason,
      });
      if (!terminalNow.current.open) terminalNow.current.setOpen(true, "auto");
    });
    return () => sub.dispose();
  }, [active, name]);

  // The line states of the open file
  useRenderOnChange(PgFlow.onDidChange);
  const flow = PgFlow.state;
  const busy = flow.build === "running" || flow.deploy === "running";
  const diagnostic = flow.build === "failed" ? firstDiagnostic() : null;
  const given = open && marks ? marks(open) : {};
  const lineMarks: LineMarks = {
    written: given.written ?? NO_MARKS.written,
    arriving: given.arriving ?? NO_MARKS.arriving,
    landing: given.landing ?? NO_MARKS.landing,
    error:
      diagnostic && diagnostic.file === open && diagnostic.line !== null
        ? { line: diagnostic.line, column: diagnostic.col, span: null }
        : given.error ?? NO_MARKS.error,
  };
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  useEditorLines({ root: active ? stage : null, marks: lineMarks, busy });

  return (
    <div
      ref={box}
      data-testid={active ? "tutorial-workspace" : undefined}
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      {active && (
        <BaseWorkspaceHead
          tabs={tabsOf(files, present)}
          active={open}
          onOpen={(path) => openFile(path, "tab")}
          tree={{
            open: treeOpen,
            docked: dockedShown,
            canDock: wide,
            rows,
            onToggle: toggleTree,
            onClose: () => setTreeOpen(false),
            onPick: (path) => openFile(path, "tree"),
            onDock: () => dock(true),
          }}
          call={call}
          terminal={{
            open: terminal.open,
            onToggle: () => terminal.setOpen(!terminal.open, "button"),
          }}
          filesKey={keys.files}
          terminalKey={keys.terminal}
        />
      )}
      <div className="flex min-h-0 flex-1">
        {active && wide && (
          <BaseDockedTree
            open={dockedShown}
            rows={rows}
            onPick={(path) => openFile(path, "tree")}
            onUndock={() => dock(false)}
          />
        )}
        <div ref={setStage} className="flex min-h-0 min-w-0 flex-1 flex-col">
          <EditorTabsShown.Provider value={!active}>
            {children}
          </EditorTabsShown.Provider>
        </div>
      </div>
    </div>
  );
};

export default TutorialWorkspace;
