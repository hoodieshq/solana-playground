import { PgChatStorage } from "../../features/persistence/model/chat-storage";
import { report } from "../../features/persistence/model/diagnostics";
import { PgProjectSync } from "../../features/persistence/model/project-sync";
import { reconcile } from "../../features/persistence/model/project-restore";
import { PgSyncMark } from "../../features/persistence/model/sync-mark";
// Deep import rather than the `utils` barrel, which reaches `settings.ts` and
// a webpack-defined global jest has no answer for. Same workaround as
// `snapshot.ts`; here it is what makes this effect testable at all, and what
// this effect subscribes to is exactly what was wrong before.
import { PgExplorer } from "../../utils/explorer/explorer";
import type { Disposable } from "../../utils/types";

/** Long enough that typing is one upload, short enough to survive a crash */
const DEBOUNCE_MS = 3000;

const isVisible = () =>
  typeof document === "undefined" || document.visibilityState === "visible";

/**
 * Mirror the current workspace to Postgres as it changes, and keep this tab
 * from writing anything stale.
 *
 * An app-level effect for the same reason `chatThread` is one: the explorer
 * panel can be collapsed, and whether the user's code is backed up must not
 * depend on whether anyone is looking at the file tree.
 *
 * ## Why visibility matters
 *
 * Only one person uses a playground, but that person can still have more than
 * one writer open -- a second tab, or a laptop left open at home. `PgExplorer`
 * is backed by IndexedDB, which tabs share, but the *current* workspace is held
 * in memory per tab. So a tab that has been in the background for a day holds a
 * snapshot of files that have since moved on, and the moment anything nudges it
 * that snapshot is what it uploads.
 *
 * Hence the two rules here: a tab only pushes while it is visible, and a tab
 * that has just become visible reconciles before it is allowed to push again.
 * The push gate that already existed for page load is what enforces the second.
 */
export const projectSync = (): Disposable => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const push = () => PgProjectSync.pushCurrent();

  /**
   * Record the intent to upload before the upload is attempted.
   *
   * Written now rather than when the push fails, so that a tab closed or
   * crashed between the keystroke and the request still reads as having
   * unsaved work on the next load -- which is what stops the reconcile there
   * taking the server's older copy over it.
   */
  const flag = () => {
    const id = PgExplorer.currentWorkspaceId;
    if (id) void PgSyncMark.markDirty(id).catch((e) => report("mark dirty", e));
  };

  const schedule = () => {
    flag();
    if (timer) clearTimeout(timer);
    // A hidden tab records the change and leaves it there. Whatever is visible
    // owns the upload, and this tab reconciles before it pushes again.
    if (!isVisible()) return;
    timer = setTimeout(() => void push(), DEBOUNCE_MS);
  };

  const flush = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = undefined;
    void push();
  };

  // Contents, then the shape of the tree. A rename or delete changes what the
  // snapshot should contain just as much as an edit does.
  //
  // The switch is not an edit, and is subscribed anyway: this effect mirrors
  // whichever workspace is current, so opening one is the moment it becomes
  // this effect's business. Without it a project only ever reached the server
  // by being typed in, and simply visiting one left it stranded on this
  // device. `push` is a no-op for a snapshot the server already has, so
  // switching back and forth costs nothing.
  const subscriptions = [
    PgExplorer.onDidSaveFile(schedule),
    PgExplorer.onDidCreateItem(schedule),
    PgExplorer.onDidRenameItem(schedule),
    PgExplorer.onDidDeleteItem(schedule),
    PgExplorer.onDidRenameWorkspace(schedule),
    // Flushed, not scheduled: the debounce belongs to the workspace being
    // left, and `pushCurrent` reads whichever one is current when it runs. A
    // switch mid-debounce used to upload the *incoming* project under the
    // outgoing one's pending timer, so the outgoing one's edits were simply
    // dropped.
    PgExplorer.onDidSwitchWorkspace(() => {
      flush();
      schedule();
    }),
    PgExplorer.onDidDeleteWorkspace(() => void settleLocalDeletes()),
  ];

  /**
   * Tell the server about a workspace deleted here.
   *
   * `onDidDeleteWorkspace` carries no id, so the deleted project is found by
   * elimination: a sync mark whose id no longer resolves to a workspace. That
   * is also exactly the set whose chat threads are now orphaned.
   *
   * Without the DELETE the tombstone machinery on the server was unreachable,
   * and the next reconcile re-imported the project from a row that was still
   * live -- deleting a project was undone by a reload.
   */
  const settleLocalDeletes = async () => {
    try {
      for (const projectId of await PgSyncMark.projectIds()) {
        if (PgExplorer.workspaceNameOf(projectId)) continue;

        await PgProjectSync.remove(projectId);
        await PgSyncMark.remove(projectId);
        // A tutorial's id is derived from its name, so deleting and restarting
        // one produces the same id -- and without this the previous run's
        // conversation reappears inside the new one.
        await PgChatStorage.remove(projectId);
      }
    } catch (e) {
      report("settle local deletes", e);
    }
  };

  /**
   * Coming back to a tab is the same problem as loading the page.
   *
   * Both start from state that may be arbitrarily out of date, and in both the
   * safe order is: stop pushing, find out what the account holds, then resume.
   */
  const onVisibilityChange = () => {
    if (!isVisible()) return flush();

    PgProjectSync.holdPushes();
    void reconcile()
      .catch((e) => report("reconcile on focus", e))
      .finally(() => PgProjectSync.releasePushes());
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  // `pagehide` rather than `beforeunload`: browsers cancel in-flight
  // non-`keepalive` fetches when the document unloads, so the old flush there
  // saved nothing in practice. `pagehide` fires for the bfcache case too, and
  // the `hidden` transition above covers an ordinary tab close -- at which
  // point the document is still alive and a normal fetch completes.
  window.addEventListener("pagehide", flush);

  return {
    dispose: () => {
      if (timer) clearTimeout(timer);
      for (const sub of subscriptions) sub.dispose();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
    },
  };
};
