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
 * tab the current name no longer says where memory holds the files. A tree
 * with no files says nothing, and the name it was opened under stands in.
 */
const memoryRoot = (): string | undefined => {
  const path = PgExplorer.currentFilePath ?? Object.keys(PgExplorer.files)[0];
  return path?.split("/")[1] || openName;
};

/**
 * What this tab last had on disk for each file of the open workspace: read
 * when it was opened, taken from disk by a reload, or written by this tab.
 *
 * State that differs from it is a change of this tab's own that never
 * reached disk -- an autosave that failed. State equal to it is only old:
 * disk may have moved on since, through another tab, and that is not this
 * tab's to write back. Kept from the explorer's own events rather than read
 * off disk, which is shared, and so cannot say whose a difference is.
 *
 * A write is recorded with the data it wrote, which the event carries: by
 * the time it is heard, state may already hold a later edit, whose own write
 * has yet to land -- or never will. `PgFs` announces a write only once it
 * has landed, so a failed one leaves the old entry in place.
 */
const known = new Map<string, string>();

/** The workspace this tab last opened, by the name it had then */
let openName: string | undefined;

/**
 * And by its id, which a rename elsewhere keeps. Only this tab's own switch
 * changes the current id without the tree having been re-read yet.
 */
let openId: string | undefined;

/**
 * Set once the empty state has been entered for a workspace deleted in
 * another tab, until something is opened again. Nothing else tells "already
 * left" from "open, with no files of its own".
 */
let left = false;

const recordOpen = () => {
  known.clear();
  for (const [path, item] of Object.entries(PgExplorer.files)) {
    if (item.content !== undefined) known.set(path, item.content);
  }
  openName = PgExplorer.currentWorkspaceName;
  openId = PgExplorer.currentWorkspaceId;
  left = false;
};
PgExplorer.onDidSwitchWorkspace(recordOpen);
PgFs.onDidWriteFile((path, data) => known.set(path, data));
// Loaded after the first open, the events above were missed. State then is
// what was read, as far as anything here can tell.
if (PgExplorer.isInitialized && !PgExplorer.isTemporary) recordOpen();

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
 * tab that had not seen this workspace yet -- and that is put right instead.
 */
const leaveDeleted = async (): Promise<ReloadResult> => {
  // Already left. Not a cue to move into whatever a neighbour creates next:
  // the id this tab kept names the deleted workspace, not a wish to be in
  // the next one.
  if (left) return "skipped";

  const old = memoryRoot();
  const id = PgExplorer.currentWorkspaceId;
  if (old && id && (await PgFs.exists(`/${old}`))) {
    return await restore(old, id);
  }

  const next = PgExplorer.allWorkspaceNames?.at(-1);
  if (next) {
    await PgExplorer.switchWorkspace(next);
  } else {
    // What the deleting tab's own `init` does with no workspaces: the tree,
    // tabs and editor are reset, and the gallery opens over the empty state.
    // Not `ON_DID_DELETE_WORKSPACE`, which would have sync delete the
    // project a second time.
    await PgExplorer.init();
    left = true;
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

/**
 * Put this tab's workspace back on a list that lost it.
 *
 * Its directory is still there, so it was not deleted: the list was saved
 * by a tab that had not seen it yet. Left off, the sidebar throws on its
 * next render -- workspaces listed, none current -- and the next save of
 * any tab makes the loss permanent. Registered again under the same name
 * and id, and saved, which tells the other tabs too.
 *
 * `importWorkspace` writes no files for an empty set and dispatches
 * `ON_DID_CREATE_WORKSPACE`. That re-renders the project switcher, and
 * `Flow.tsx` answers it by closing the gallery it opened over an empty
 * browser -- harmless here, where the list was not empty to begin with.
 */
const restore = async (name: string, id: string): Promise<ReloadResult> => {
  report(`reload ${name}: missing from the project list, put back`, null);
  try {
    await PgExplorer.importWorkspace(name, { id, files: {} });
  } catch (e) {
    // The name is taken on the list that lost it; nothing safe to do here
    report(`reload ${name}: put back`, e);
    return "skipped";
  }
  return "unchanged";
};

/**
 * Write what this tab changed under a workspace's old name to its new one.
 *
 * A rename in another tab moves the directory, but this tab's tree, tabs and
 * models are still under the old name -- and every autosave from them now
 * fails, because the directory it writes into is gone. Waiting for those
 * keystrokes to land, as an ordinary re-open does, would wait for writes
 * that never happen, and the re-open after them would lose the text. So
 * they are carried over instead.
 *
 * Only this tab's own changes: an editor's unsaved text, or state that
 * differs from what this tab last had on disk -- an autosave that failed.
 * Anything else in memory is merely old. The other tab may well have edited
 * the file before renaming, and writing this tab's copy would undo that.
 */
const carryRename = async (from: string, to: string) => {
  for (const [path, item] of Object.entries(PgExplorer.files)) {
    if (!path.startsWith(`/${from}/`) || path.endsWith("/")) continue;
    if (item.content === undefined) continue;

    // A file with no record came into this tab's tree since it opened the
    // workspace without a write under that path -- `renameItem` moves it
    // with no write at all. Its first autosave may be the one that failed,
    // so its state is this tab's own.
    const typed = await PgEditorModels.valueOf(path);
    let text: string | undefined;
    if (typed !== null && typed !== item.content) text = typed;
    else if (!known.has(path) || known.get(path) !== item.content) {
      text = item.content;
    }
    if (text === undefined) continue;

    const target = `/${to}/` + path.slice(from.length + 2);
    await PgFs.writeFile(target, text, { createParents: true });
  }
};

const reloadOnce = async (reopen: boolean): Promise<ReloadResult> => {
  if (PgExplorer.isTemporary) return "skipped";

  // The list first: a neighbour may have created, deleted or renamed a
  // workspace, and a re-open below saves this tab's list over the store's.
  // This tab's current one is kept by id, so a rename elsewhere is followed
  // by name, and a delete elsewhere leaves an id that names nothing.
  //
  // Not while this tab has a change of its own to the list in flight: the
  // explorer is between states, and the change's own save and switch finish
  // the job -- announced like any other.
  if (!(await PgExplorer.refreshWorkspaces())) return "skipped";
  const name = PgExplorer.currentWorkspaceName;
  if (!name) {
    return PgExplorer.currentWorkspaceId ? await leaveDeleted() : "skipped";
  }

  // The current id has moved on from the one the tree was opened under:
  // this tab's own switch, half-way -- the new current one is named before
  // its tree is read. Not a rename, and the switch is about to finish what a
  // reload would do. By id, not by name: another tab may rename this
  // workspace and then create a new one under its old name, and by name
  // that reads as a switch and gets stuck.
  const held = memoryRoot();
  const moved = !!held && held !== name;
  const switching =
    openId !== undefined
      ? PgExplorer.currentWorkspaceId !== openId
      : moved && !!PgExplorer.allWorkspaceNames?.includes(held);
  if (switching) return "skipped";

  // Before the read, not after it. An autosave puts the text into state and
  // only then writes it, so one that runs while the store is being read can
  // leave state newer than what the read found. Taken afterwards, that newer
  // state would be compared with the older disk -- and replaced by it.
  const memory = inMemory();

  const disk = await readTree(`/${name}`);
  if (!disk) return "skipped";
  // The user may have switched projects while the store was being read
  if (PgExplorer.currentWorkspaceName !== name) return "skipped";

  // Past that, the same id with the tree under another name is a rename
  // made in another tab
  const renamed = moved;
  if (reopen || renamed || !sameKeys(disk, memory)) {
    // A re-open rebuilds every model from state, so keystrokes autosave has
    // not written yet -- in any file, not only the open one -- would go.
    // Nothing forces this one, so it waits for them to land instead. A forced
    // re-open is `adopt`, where the user has already chosen to discard.
    //
    // Renamed in another tab, there is nothing to wait for: autosave writes
    // under the old name, which is gone. The text is carried across instead.
    if (!reopen && held && renamed) {
      await carryRename(held, name);
      if (PgExplorer.currentWorkspaceName !== name) return "skipped";
    } else if (!reopen) {
      const edited = await PgEditorModels.anyEditedUnder(
        `/${name}/`,
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
    known.set(path, content);
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
// the text the editor holds for the open file, which `.view-lines` shows
// only as far as the view is scrolled. Neither is on screen otherwise.
if (process.env.NODE_ENV !== "production") {
  (
    window as unknown as {
      __pgWorkspace?: {
        id: () => string | null;
        openText: () => Promise<string | null>;
      };
    }
  ).__pgWorkspace = {
    id: () => PgExplorer.currentWorkspaceId ?? null,
    openText: async () => {
      const path = PgExplorer.currentFilePath;
      return path ? await PgEditorModels.valueOf(path) : null;
    },
  };
}
