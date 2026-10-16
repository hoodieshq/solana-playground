import { useEffect, useReducer, useRef, useState } from "react";

import { createLogger } from "@/shared/lib/logger";
import { PgExplorer, PgTutorial, PgView } from "@/utils";
import {
  foldRecord,
  getLessonPath,
  PgLesson,
  positionLabel,
} from "@/views/flow/lessons";
import {
  DeleteWorkspace,
  ExportWorkspace,
} from "@/views/sidebar/explorer/Component/Modals";
import { copyName } from "../model/copy-name";
import { prunePins, readPins, togglePin, writePins } from "../model/pins";
import type { ProjectAction } from "../model/project-action";
import { listProjects } from "../model/project-entries";
import type { ProjectEntry } from "../model/project-entries";
import { navTelemetry } from "../model/telemetry";
import { readWorkspaceFiles, rebaseFiles } from "../model/workspace-files";
import BaseProjectList from "./BaseProjectList";

const log = createLogger("app-nav:projects");

/** How a failure toast names what did not happen */
const VERB: Record<ProjectAction, string> = {
  open: "open",
  pin: "pin",
  unpin: "unpin",
  rename: "rename",
  duplicate: "duplicate",
  export: "export",
  delete: "delete",
};

const INVALID_NAME = "Use letters, digits, spaces, - and _.";

/**
 * The navigation's project list, connected: the explorer's workspaces, the
 * device's pins, and what each menu item does. A failed action tells the
 * user, is logged for the team, and is counted.
 */
const ProjectList = () => {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [pins, setPins] = useState(readPins);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  // How the rename was asked for: it is counted on commit, with that `via`
  const renameVia = useRef<"click" | "key">("click");

  // A project synced from another device arrives without a switch -- it is
  // deliberately not opened -- so creation is listened to as well
  useEffect(() => {
    const subscriptions = [
      PgExplorer.onDidCreateWorkspace(refresh),
      PgExplorer.onDidRenameWorkspace(refresh),
      PgExplorer.onDidDeleteWorkspace(refresh),
      PgExplorer.onDidSwitchWorkspace(refresh),
      PgLesson.onDidChange(refresh),
    ];
    return () => subscriptions.forEach((s) => s.dispose());
  }, []);

  const names = PgExplorer.allWorkspaceNames ?? [];
  const liveIds = names
    .map((name) => PgExplorer.workspaceIdOf(name))
    .filter((id): id is string => id !== undefined);
  const livePins = prunePins(pins, liveIds);

  // A pin whose workspace is gone (deleted here or on another device) is
  // dropped from storage once the explorer has loaded what it has
  const stale = liveIds.length > 0 && livePins.length !== pins.length;
  useEffect(() => {
    if (!stale) return;
    try {
      writePins(livePins);
      setPins(livePins);
    } catch (e) {
      // Nothing the user did: the dropped pins are only left in storage
      log.warn("stale pins could not be dropped", { context: { e } });
    }
  }, [stale, livePins]);

  const { projects, lessons } = listProjects(
    names,
    {
      idOf: (name) => PgExplorer.workspaceIdOf(name),
      isLesson: (name) => PgTutorial.isWorkspaceTutorial(name),
      progressOf: describeProgress,
    },
    livePins
  );

  const fail = (entry: ProjectEntry, action: ProjectAction, e: unknown) => {
    log.error(e, { report: true, context: { action } });
    navTelemetry.track("nav_project_action_failed", { action });
    PgView.setToast(
      () => (
        <span>
          Could not {VERB[action]} {entry.name}.
        </span>
      ),
      { options: { name: "project-action-failed" } }
    );
  };

  const perform = async (entry: ProjectEntry, action: ProjectAction) => {
    switch (action) {
      case "open":
        if (entry.name === PgExplorer.currentWorkspaceName) return;
        if (entry.isLesson) await PgTutorial.open(entry.name);
        else await PgExplorer.switchWorkspace(entry.name);
        return;
      case "pin":
      case "unpin": {
        if (!entry.id) throw new Error("Workspace has no id yet");
        const next = togglePin(livePins, entry.id);
        writePins(next);
        setPins(next);
        return;
      }
      case "rename":
        setRenameError(null);
        setRenaming(entry.name);
        return;
      case "duplicate": {
        const copy = copyName(entry.name, names);
        const files = await readWorkspaceFiles(entry.name, PgExplorer.fs);
        await PgExplorer.createWorkspace(copy, {
          files: rebaseFiles(files, entry.name, copy),
        });
        return;
      }
      case "export":
        // The dialog owns the export and its own failures; only a failure
        // to open it is this list's
        await PgView.setModal(<ExportWorkspace name={entry.name} />);
        return;
      case "delete":
        await PgView.setModal(
          <DeleteWorkspace name={entry.name} isLesson={entry.isLesson} />
        );
        return;
    }
  };

  const onAction = (
    entry: ProjectEntry,
    action: ProjectAction,
    via: "click" | "key"
  ) => {
    // A rename is counted when it is committed, not when the field opens
    if (action === "rename") renameVia.current = via;
    else navTelemetry.track("nav_project_action", { action, via });
    perform(entry, action).catch((e: unknown) => fail(entry, action, e));
  };

  const onRenameCommit = (entry: ProjectEntry, value: string) => {
    const newName = value.trim();
    if (!PgExplorer.isWorkspaceNameValid(value)) {
      setRenameError(INVALID_NAME);
      return;
    }
    if (newName !== entry.name && names.includes(newName)) {
      setRenameError(`A project named ${newName} already exists.`);
      return;
    }
    if (newName === entry.name) {
      setRenaming(null);
      return;
    }

    navTelemetry.track("nav_project_action", {
      action: "rename",
      via: renameVia.current,
    });
    // Another workspace is renamed where it lies, and announced so sync
    // uploads the new name; the open one is renamed as before
    PgExplorer.renameWorkspace(newName, { from: entry.name, announce: true })
      .then(() => {
        setRenaming(null);
        setRenameError(null);
      })
      .catch((e: unknown) => {
        fail(entry, "rename", e);
        setRenameError(`Could not rename ${entry.name}.`);
      });
  };

  return (
    <BaseProjectList
      projects={projects}
      lessons={lessons}
      current={PgExplorer.currentWorkspaceName ?? null}
      renaming={renaming}
      renameError={renameError}
      onAction={onAction}
      onRenameChange={() => setRenameError(null)}
      onRenameCommit={onRenameCommit}
      onRenameCancel={() => {
        setRenaming(null);
        setRenameError(null);
      }}
    />
  );
};

export default ProjectList;

/**
 * The lesson you are in shows live progress, because `PgLesson` already
 * holds it. Every other lesson shows its length: their progress is on disk
 * in their own workspace, and reading it would mean an async fan-out on
 * every render.
 */
const describeProgress = (name: string) => {
  const path = getLessonPath(name);
  if (!path) return null;

  const lesson = PgLesson.state;
  if (lesson.path?.tutorial === name) {
    return positionLabel(path, foldRecord(path, lesson.record));
  }

  return `${path.steps.length} steps`;
};
