import { isMissing, report } from "./diagnostics";
import { PgEditorModels } from "./editor-models";
// Deep imports, not the `utils` barrel, for the reason `snapshot.ts` gives
import { PgCommon } from "../../../utils/common";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgFs } from "../../../utils/explorer/fs";
import { PgRouter } from "../../../utils/router";

/**
 * - `deferred`: the workspace needs re-opening, but not now -- a re-open would
 *   throw away something of this tab's. The next reload tries again.
 */
export type ReloadResult =
  | "skipped"
  | "unchanged"
  | "contents"
  | "reopened"
  | "deferred";

/**
 * Every file the explorer's in-memory tree could hold, read off the store.
 *
 * Only names `isItemNameValid` accepts: the tree never holds a dotfile, so
 * `.workspace/` and `.tutorial.json` changing -- which `PgProgramInfo` does on
 * every open -- is not a difference this tab can or should act on. That is
 * also what stops two tabs from reloading each other in a loop.
 *
 * @returns full paths to contents, or `null` when the directory is gone
 */
const readTree = async (root: string) => {
  const files: Record<string, string> = {};

  const walk = async (dir: string) => {
    for (const child of await PgFs.readDir(dir)) {
      if (!PgExplorer.isItemNameValid(child)) continue;
      const path = `${dir}/${child}`;
      if ((await PgFs.getMetadata(path)).isDirectory()) await walk(path);
      else files[path] = await PgFs.readToString(path);
    }
  };

  try {
    await walk(root);
  } catch (e) {
    // A directory that is gone is the expected case -- renamed or deleted in
    // another tab. Anything else is a store that failed to read, and a
    // reload that silently does nothing looks exactly like one that found
    // nothing to do.
    if (!isMissing(e)) report(`reload ${root}: read`, e);
    return null;
  }
  return files;
};

/** The current workspace as this tab holds it: files only, not empty dirs */
const inMemory = () => {
  const files: Record<string, string> = {};
  for (const [path, item] of Object.entries(PgExplorer.files)) {
    if (!path.endsWith("/") && item.content !== undefined) {
      files[path] = item.content;
    }
  }
  return files;
};

const sameKeys = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).sort().join("\n") === Object.keys(b).sort().join("\n");

/**
 * The workspace the in-memory tree is under, by the name it was loaded with.
 *
 * Taken from the tree rather than from the current name, because the list
 * may already have been re-read -- and after a rename or delete in another
 * tab the current name no longer says where memory holds the files.
 */
const memoryRoot = (): string | undefined => {
  const path = PgExplorer.currentFilePath ?? Object.keys(PgExplorer.files)[0];
  return path?.split("/")[1] || undefined;
};

/**
 * Leave a workspace another tab deleted, the way that tab did.
 *
 * With workspaces listed and none of them current, the explorer sidebar
 * throws on its next render -- the tree asks for the current workspace's
 * path. So this goes where `deleteWorkspace` sends the tab that deleted it:
 * the last workspace left, or the empty state when there is none.
 *
 * Only when the directory is gone. A delete removes it before the list is
 * saved, so a directory that is still there means the list was written by a
 * tab that had not seen this workspace yet, and walking away from it would
 * leave it on disk with nothing pointing at it.
 */
const leaveDeleted = async (): Promise<ReloadResult> => {
  const old = memoryRoot();
  if (old && (await PgFs.exists(`/${old}`))) {
    report(`reload ${old}: missing from the project list`, null);
    return "skipped";
  }

  const next = PgExplorer.allWorkspaceNames?.at(-1);
  if (next) {
    await PgExplorer.switchWorkspace(next);
  } else {
    // Already left: nothing is held in memory any more
    if (!old) return "skipped";

    // What the deleting tab's own `init` does with no workspaces: the tree,
    // tabs and editor are reset, and the gallery opens over the empty state.
    // Not `ON_DID_DELETE_WORKSPACE`, which would have sync delete the
    // project a second time.
    await PgExplorer.init();
    // A lesson's route stays on the lesson otherwise. Its own handler for a
    // delete sends it home the same way, only when none are left.
    if (PgRouter.location.pathname.startsWith("/tutorials/")) {
      await PgRouter.navigate();
    }
  }

  // The deleted workspace's models would otherwise come back for a project
  // created later under the same name
  if (old) {
    await PgEditorModels.dropUnder(`/${old}/`, () => {
      if (next) {
        PgCommon.createAndDispatchCustomEvent(
          PgExplorer.events.ON_DID_OPEN_FILE,
          PgExplorer.getCurrentFile()
        );
      }
    });
  }
  return "reopened";
};

const reloadOnce = async (reopen: boolean): Promise<ReloadResult> => {
  if (PgExplorer.isTemporary) return "skipped";

  // The list first: a neighbour may have created, deleted or renamed a
  // workspace, and a re-open below saves this tab's list over the store's.
  // This tab's current one is kept by id, so a rename elsewhere is followed
  // by name, and a delete elsewhere leaves an id that names nothing.
  await PgExplorer.refreshWorkspaces();
  const name = PgExplorer.currentWorkspaceName;
  if (!name) {
    return PgExplorer.currentWorkspaceId ? await leaveDeleted() : "skipped";
  }
  const held = memoryRoot();

  // Before the read, not after it. An autosave puts the text into state and
  // only then writes it, so one that runs while the store is being read can
  // leave state newer than what the read found. Taken afterwards, that newer
  // state would be compared with the older disk -- and replaced by it.
  const memory = inMemory();

  const disk = await readTree(`/${name}`);
  if (!disk) return "skipped";
  // The user may have switched projects while the store was being read
  if (PgExplorer.currentWorkspaceName !== name) return "skipped";

  if (reopen || !sameKeys(disk, memory)) {
    // A re-open rebuilds every model from state, so keystrokes autosave has
    // not written yet -- in any file, not only the open one -- would go.
    // Nothing forces this one, so it waits for them to land instead. A forced
    // re-open is `adopt`, where the user has already chosen to discard.
    //
    // Under the name memory holds them by, which is the old one when the
    // workspace was renamed in another tab.
    if (!reopen) {
      const edited = await PgEditorModels.anyEditedUnder(
        `/${held ?? name}/`,
        (path) => PgExplorer.files[path]?.content
      );
      if (edited) return "deferred";
      if (PgExplorer.currentWorkspaceName !== name) return "skipped";
    }

    // The switch first, then the models. `switchWorkspace` re-reads state
    // from disk, but the editor reuses any model it already has for a path,
    // so the stale ones have to go -- and they have to go *after* it. Its
    // saves are real waits, `Monaco.tsx`'s autosave timer can fire during
    // any of them, and with the models already gone that timer saves the
    // empty editor over the open file. Opening the current file straight
    // after the drop, in the same task, leaves no such window at this end.
    await PgExplorer.switchWorkspace(name);
    await PgEditorModels.dropUnder(`/${name}/`, () =>
      PgCommon.createAndDispatchCustomEvent(
        PgExplorer.events.ON_DID_OPEN_FILE,
        PgExplorer.getCurrentFile()
      )
    );
    // Renamed in another tab: the old name's models would otherwise come
    // back for a project created under it later. Last, once the editor is
    // showing the new one's.
    if (held && held !== name) await PgEditorModels.dropUnder(`/${held}/`);
    return "reopened";
  }

  const changed: string[] = [];
  for (const [path, content] of Object.entries(disk)) {
    if (memory[path] === content) continue;
    // Changed in state while the store was being read: an autosave whose
    // write had not landed when this file was read. Its text is newer.
    if (PgExplorer.files[path]?.content !== memory[path]) continue;
    // A model that differs from state holds keystrokes autosave has not
    // written yet. They are this tab's, and newer than anything on disk.
    const typed = await PgEditorModels.valueOf(path);
    if (typed !== null && typed !== memory[path]) continue;

    // Straight into state, not `saveFileToState`: that dispatches the save
    // event, which schedules an upload of what another tab already uploaded
    PgExplorer.files[path].content = content;
    changed.push(path);
  }
  if (!changed.length) return "unchanged";

  await PgEditorModels.drop(changed);
  const open = PgExplorer.getCurrentFile();
  if (open && changed.includes(open.path)) {
    // What `switchWorkspace` does to show a file: `Monaco.tsx` answers by
    // building the model again from state, and restarts its position timer
    // against the new model rather than the disposed one
    PgCommon.createAndDispatchCustomEvent(
      PgExplorer.events.ON_DID_OPEN_FILE,
      open
    );
  }
  return "contents";
};

let queue: Promise<ReloadResult> = Promise.resolve("skipped");

/**
 * Bring the workspace this tab has open back in line with the store.
 *
 * Tabs share IndexedDB but each holds the current workspace in memory, so a
 * tab that another tab has written underneath goes on showing -- and
 * uploading, and autosaving -- the old copy. Disk is the one place both tabs
 * agree on, file by file, because an edit reaches it straight after it
 * reaches state.
 *
 * Contents alone are taken quietly: no switch, no reconcile, no upload. A
 * change in which files exist re-opens the workspace, which is rare and worth
 * its cost.
 *
 * Serialized: a reload asked for while one runs waits for it, then looks
 * again, because what it read may already be out of date.
 *
 * @param opts -
 * - `reopen`: re-open even when only contents differ. `adopt` needs it,
 *   because the adopted snapshot also carries the program keypair, and only
 *   a switch makes `PgProgramInfo` read that again.
 */
export const reloadCurrentFromDisk = (
  opts: { reopen?: boolean } = {}
): Promise<ReloadResult> => {
  const run = () => reloadOnce(opts.reopen === true);
  queue = queue.then(run, run);
  return queue;
};

// Development only, like `__pgSyncDiagnostics`: `craco build` sets NODE_ENV
// to production, so this is dropped from the shipped bundle. The browser
// tests need the open workspace's id -- the one sync uploads it under -- and
// nothing on screen shows it.
if (process.env.NODE_ENV !== "production") {
  (
    window as unknown as { __pgWorkspace?: { id: () => string | null } }
  ).__pgWorkspace = { id: () => PgExplorer.currentWorkspaceId ?? null };
}
