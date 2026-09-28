import { PgEditorModels } from "./editor-models";
// Deep imports, not the `utils` barrel, for the reason `snapshot.ts` gives
import { PgCommon } from "../../../utils/common";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgFs } from "../../../utils/explorer/fs";

export type ReloadResult = "skipped" | "unchanged" | "contents" | "reopened";

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
  } catch {
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

const reloadOnce = async (reopen: boolean): Promise<ReloadResult> => {
  const name = PgExplorer.currentWorkspaceName;
  if (!name || PgExplorer.isTemporary) return "skipped";

  const disk = await readTree(`/${name}`);
  if (!disk) return "skipped";
  // The user may have switched projects while the store was being read
  if (PgExplorer.currentWorkspaceName !== name) return "skipped";

  const memory = inMemory();

  if (reopen || !sameKeys(disk, memory)) {
    // The models first: `switchWorkspace` re-reads state from disk, but the
    // editor reuses any model it already has for a path, so without this a
    // file that was open keeps showing the text that was just replaced
    await PgEditorModels.dropUnder(`/${name}/`);
    await PgExplorer.switchWorkspace(name);
    return "reopened";
  }

  const changed: string[] = [];
  for (const [path, content] of Object.entries(disk)) {
    if (memory[path] === content) continue;
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
