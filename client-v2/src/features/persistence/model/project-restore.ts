import { report } from "./diagnostics";
import { isUsableSnapshot, PgProjectSync } from "./project-sync";
import { hashSnapshot, snapshotOf } from "./snapshot";
import { PgSyncMark } from "./sync-mark";
import { PgExplorer } from "../../../utils/explorer/explorer";
import type { Conflict } from "./project-sync";

/** What one reconcile pass did */
export interface SyncResult {
  /** Local names of projects created here for the first time */
  imported: string[];
  /** Local names of projects whose files were taken from the server */
  replaced: string[];
  /** Local names of projects deleted here because they were deleted elsewhere */
  removed: string[];
  /** Local names of projects this device uploaded */
  pushed: string[];
  /** Projects the user now has to answer for */
  conflicts: Conflict[];
  /**
   * Local name of the most recently updated project the server holds, or
   * `null` when it holds none. What to open when the user has just signed in
   * and is looking at nothing in particular.
   */
  latest: string | null;
}

const empty = (): SyncResult => ({
  imported: [],
  replaced: [],
  removed: [],
  pushed: [],
  conflicts: [],
  latest: null,
});

/** Whether the local copy is exactly what this device last handed the server */
const isClean = async (projectId: string, localName: string) => {
  const mark = await PgSyncMark.read(projectId);
  if (!mark) return false;
  if (mark.dirty) return false;
  return mark.hash === (await hashSnapshot(await snapshotOf(localName)));
};

/**
 * Make this browser and the account agree, without merging and without
 * guessing.
 *
 * Runs on sign-in, on load, and whenever a backgrounded tab comes back. Each
 * project lands in one of four cells, decided by two independent questions --
 * has this device changed it since the server last took a copy, and has the
 * server moved since then:
 *
 * |          | server unchanged | server moved |
 * | -------- | ---------------- | ------------ |
 * | clean    | nothing          | take server  |
 * | dirty    | push             | **ask**      |
 *
 * Both questions are answerable only because `PgSyncMark` persists what the
 * server last accepted from *this* device. Without it "local differs from the
 * server" is one undifferentiated state, and the previous version of this
 * function resolved it by always taking the server's copy -- which quietly
 * destroyed anything that had not finished uploading.
 *
 * The bottom-right cell is the only one that asks the user anything, and it is
 * the only one that cannot be decided without them: both copies contain work,
 * and nothing here is entitled to pick.
 *
 * Deletes are the same shape. A project the server no longer lists, for which
 * this device holds a mark, was deleted on another device: if the local copy is
 * clean the delete finishes here, and if it is not the user is asked rather
 * than having unsaved work removed on another device's say-so.
 */
export const reconcile = async (): Promise<SyncResult> => {
  const result = empty();
  const server = await PgProjectSync.list();
  const serverIds = new Set(server.map((project) => project.id));

  // Newest first. The server orders its answer this way already; sorting here
  // means `latest` does not quietly depend on that staying true.
  const newestFirst = [...server].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  const taken = new Set(PgExplorer.allWorkspaceNames ?? []);

  for (const project of newestFirst) {
    PgProjectSync.rememberName(project.id, project.name);
    const local = PgExplorer.workspaceNameOf(project.id);

    try {
      if (!local) {
        const name = await importFresh(project.id, project.name, taken);
        if (name) {
          result.imported.push(name);
          result.latest ??= name;
        }
        continue;
      }

      result.latest ??= local;

      const mark = await PgSyncMark.read(project.id);

      // The cheap path, and the overwhelmingly common one: this device has
      // nothing pending and the row is exactly where it was left. Neither side
      // moved, so there is nothing to compare and no files to read.
      if (mark && !mark.dirty && mark.updatedAt === project.updatedAt) continue;

      const clean = await isClean(project.id, local);
      const serverMoved = !mark || mark.updatedAt !== project.updatedAt;

      if (clean && serverMoved) {
        // Safe by construction: the local copy is byte-for-byte what this
        // device uploaded, so there is nothing here to lose.
        const adopted = await PgProjectSync.adopt(project.id);
        if (adopted) result.replaced.push(adopted);
        continue;
      }

      if (!clean && !serverMoved) {
        // This device is ahead and nothing else has written since. Ordinary
        // catch-up: an edit that was still debounced when the tab closed, or a
        // push that failed while offline.
        if (
          (await PgProjectSync.push(
            project.id,
            await snapshotOf(local),
            local,
            {
              immediate: true,
            }
          )) === "ok"
        ) {
          result.pushed.push(local);
        }
        continue;
      }

      if (!clean && serverMoved) {
        const settled = await settleDivergence(project.id, local, result);
        if (settled) result.conflicts.push(settled);
      }
    } catch (e) {
      // One project that cannot be reconciled must not strand the rest -- but
      // it must not vanish silently either, or it is simply missing with
      // nothing to explain it
      report(`reconcile project ${project.id}`, e);
    }
  }

  await settleDeletes(serverIds, result);
  await pushNeverSynced(serverIds, result);

  return result;
};

/**
 * Decide whether "both sides differ" is really a question for the user.
 *
 * Two cases reach here that look divergent from the marks alone and are not,
 * and asking about either would be asking about nothing:
 *
 * - **The row has no code.** `ensureConversation` creates a `projects` row so
 *   a chat turn has a parent, so a project whose assistant was used before its
 *   first upload already exists server-side with a null snapshot. There is
 *   nothing there to lose, so this device's copy simply goes up.
 * - **The two copies are identical.** A device with no mark for a project it
 *   nonetheless holds -- a tutorial, whose id is derived from its name and so
 *   is minted independently on every browser -- has the same bytes as the
 *   server. Only the token is missing, so recording it is the whole fix.
 *
 * @returns the conflict actually raised, or `null` when it settled itself
 */
const settleDivergence = async (
  projectId: string,
  local: string,
  result: SyncResult
): Promise<Conflict | null> => {
  const full = await PgProjectSync.fetch(projectId);

  if (!full || !isUsableSnapshot(full.snapshot)) {
    if (full?.snapshot)
      report(`reconcile ${projectId}: unusable snapshot`, null);
    if (
      (await PgProjectSync.push(projectId, await snapshotOf(local), local, {
        immediate: true,
      })) === "ok"
    ) {
      result.pushed.push(local);
    }
    return null;
  }

  const serverHash = await hashSnapshot(full.snapshot);
  if (serverHash === (await hashSnapshot(await snapshotOf(local)))) {
    await PgSyncMark.write(projectId, {
      hash: serverHash,
      updatedAt: full.updatedAt,
      dirty: false,
    });
    return null;
  }

  const conflict: Conflict = { projectId, kind: "divergent" };
  PgProjectSync.raise(conflict);
  return conflict;
};

/**
 * Bring down a project this browser has never had.
 *
 * Nothing local is at risk here, so it needs no comparison -- but the snapshot
 * still has to be checked, because `importWorkspace` would otherwise write a
 * workspace whose files are whatever a malformed row happens to hold.
 */
const importFresh = async (
  projectId: string,
  serverName: string,
  taken: Set<string>
): Promise<string | null> => {
  const full = await PgProjectSync.fetch(projectId);
  if (!isUsableSnapshot(full?.snapshot)) {
    // A null snapshot is an ordinary state, not a fault: a chat turn creates
    // the row before the project's first upload. Nothing to import yet.
    if (full?.snapshot) report(`import ${projectId}: unusable snapshot`, null);
    return null;
  }

  let name = serverName;
  while (taken.has(name)) name = `${name} (imported)`;

  await PgExplorer.importWorkspace(name, {
    id: projectId,
    files: full!.snapshot!.files,
  });
  taken.add(name);

  await PgSyncMark.write(projectId, {
    hash: await hashSnapshot(full!.snapshot!),
    updatedAt: full!.updatedAt,
    dirty: false,
  });

  return name;
};

/**
 * Finish deletes that happened on another device.
 *
 * A mark with no server row is the only way to tell "deleted elsewhere" from
 * "never uploaded" -- the list endpoint filters tombstones out, so both look
 * like absence without one.
 */
const settleDeletes = async (serverIds: Set<string>, result: SyncResult) => {
  for (const projectId of await PgSyncMark.projectIds()) {
    if (serverIds.has(projectId)) continue;

    try {
      const local = PgExplorer.workspaceNameOf(projectId);
      if (!local) {
        // Gone from both sides. The mark is the last thing left of it.
        await PgSyncMark.remove(projectId);
        continue;
      }

      if (await isClean(projectId, local)) {
        await PgExplorer.deleteWorkspace(local);
        await PgSyncMark.remove(projectId);
        result.removed.push(local);
        if (result.latest === local) result.latest = null;
        continue;
      }

      const conflict: Conflict = { projectId, kind: "deleted-elsewhere" };
      PgProjectSync.raise(conflict);
      result.conflicts.push(conflict);
    } catch (e) {
      report(`settle delete ${projectId}`, e);
    }
  }
};

/**
 * Hand over projects the account has never seen.
 *
 * Previously this waited for the user to open a project, because the only
 * thing that pushed was the editor's own change handler -- so a project made
 * before signing in, and not touched since, stayed on one device forever. The
 * promise is that everything is saved, not everything that was visited.
 *
 * "Never seen" has to exclude two things that also look unsynced from here: a
 * project deleted on another device, which `settleDeletes` owns, and a project
 * belonging to a different account on this browser. Workspaces are not
 * account-scoped and are not cleared on sign-out, so without the second check
 * the next person to sign in on a shared browser uploads the previous one's
 * work into their own account.
 */
const pushNeverSynced = async (serverIds: Set<string>, result: SyncResult) => {
  for (const name of PgExplorer.allWorkspaceNames ?? []) {
    const id = PgExplorer.workspaceIdOf(name);
    if (!id || serverIds.has(id)) continue;
    if (await PgSyncMark.read(id)) continue;
    if (await PgSyncMark.ownedByAnother(id)) continue;

    try {
      if (
        (await PgProjectSync.push(id, await snapshotOf(name), name, {
          immediate: true,
        })) === "ok"
      ) {
        result.pushed.push(name);
      }
    } catch (e) {
      report(`push new project ${id}`, e);
    }
  }
};
