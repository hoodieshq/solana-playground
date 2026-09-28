import { report } from "../../features/persistence/model/diagnostics";
import { reloadCurrentFromDisk } from "../../features/persistence/model/tab-reload";
import { PgFs } from "../../utils/explorer/fs";
// Deep import rather than the `utils` barrel, for the reason
// `project-sync.tsx` gives
import { PgExplorer } from "../../utils/explorer/explorer";
import type { Disposable } from "../../utils/types";

const CHANNEL = "pg-workspace-sync";

/** Long enough that a run of autosaves is one message */
const ANNOUNCE_MS = 250;
/** Long enough that a run of messages is one reload */
const RELOAD_MS = 300;

interface FilesWritten {
  type: "files-written";
  projectId: string;
  from: string;
}

const isFilesWritten = (data: unknown): data is FilesWritten =>
  (data as FilesWritten)?.type === "files-written" &&
  typeof (data as FilesWritten).projectId === "string";

/**
 * An id for this tab, to tell its own announcements from a neighbour's.
 *
 * `crypto.randomUUID` is what every browser this runs in has. jsdom's own
 * `crypto` lacks it in some versions, and `setupTests`'s polyfill only swaps
 * in `webcrypto` when `subtle` is missing -- so a jsdom that has `subtle` but
 * not `randomUUID` would otherwise crash here before any test body runs.
 */
const tabId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/**
 * Which project a written path belongs to, if it is worth announcing.
 *
 * Not only the current one: an import, or an adopt of a project in the
 * background, writes elsewhere -- and the neighbour may have that one open.
 * `metadata.json` is the one file left out. It holds this tab's open tabs and
 * cursor, it is rewritten on every open, and no other tab has any use for it.
 */
const projectOfPath = (path: string): string | null => {
  const name = path.split("/")[1];
  if (!name || !PgExplorer.allWorkspaceNames?.includes(name)) return null;
  if (path === `/${name}/.workspace/metadata.json`) return null;
  return PgExplorer.workspaceIdOf(name) ?? null;
};

/**
 * Keep tabs of one browser from working on each other's old copies.
 *
 * Tabs share the store but not each other's memory, so a tab showing a
 * project another tab has written goes on showing the old text -- and the
 * next autosave in it writes the old text back, file by file, before sync is
 * ever involved. Visibility cannot catch it: two windows side by side are
 * both visible the whole time. So each tab says when it has written, and a
 * tab that has the same project open re-reads it.
 *
 * Deliberately independent of the session. The overwrite on disk needs no
 * account, and neither does the fix.
 *
 * Where the browser has no `BroadcastChannel` this does nothing; the reload
 * at the start of every reconcile still catches up on focus.
 */
export const tabSync = (): Disposable => {
  if (typeof BroadcastChannel !== "function") return { dispose: () => {} };

  const channel = new BroadcastChannel(CHANNEL);
  const self = tabId();

  const pending = new Set<string>();
  let announceTimer: ReturnType<typeof setTimeout> | undefined;
  const announce = (projectId: string | null | undefined) => {
    if (!projectId) return;
    pending.add(projectId);
    if (announceTimer) clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      for (const id of pending) {
        const message: FilesWritten = {
          type: "files-written",
          projectId: id,
          from: self,
        };
        channel.postMessage(message);
      }
      pending.clear();
    }, ANNOUNCE_MS);
  };

  let reloadTimer: ReturnType<typeof setTimeout> | undefined;
  channel.onmessage = ({ data }) => {
    if (!isFilesWritten(data) || data.from === self) return;
    if (data.projectId !== PgExplorer.currentWorkspaceId) return;

    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      reloadCurrentFromDisk().catch((e) => report("reload from tab", e));
    }, RELOAD_MS);
  };

  // Writes cover edits and the three dotfiles. Deletes and renames reach the
  // store without a write, so the tree's own events cover those.
  const current = () => announce(PgExplorer.currentWorkspaceId);
  const subscriptions = [
    PgFs.onDidWriteFile((path) => announce(projectOfPath(path))),
    PgExplorer.onDidDeleteItem(current),
    PgExplorer.onDidRenameItem(current),
  ];

  return {
    dispose: () => {
      if (announceTimer) clearTimeout(announceTimer);
      if (reloadTimer) clearTimeout(reloadTimer);
      for (const sub of subscriptions) sub.dispose();
      channel.close();
    },
  };
};
