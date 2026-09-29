import { report } from "./diagnostics";
import { baseAfterMerge, planMerge, sameFiles, settleConflicts } from "./merge";
import { buildSnapshot, diffFiles, hashFiles, snapshotOf } from "./snapshot";
import { PgSyncBase } from "./sync-base";
import { PgSyncClient } from "./sync-client";
import { PgSyncMark } from "./sync-mark";
import { PgSession } from "../../auth";
// Deep import for the same reason `snapshot.ts` uses one: the `utils` barrel
// reaches `settings.ts`, which reads a webpack-defined global jest has no
// answer for, and importing it here would make this module untestable
import { PgExplorer } from "../../../utils/explorer/explorer";
import type { Snapshot } from "./snapshot";
import type { Disposable } from "../../../utils/types";

type PushResult = "ok" | "conflict" | "skipped";

/** A project as `/api/projects` lists it */
export interface ServerProject {
  id: string;
  name: string;
  kind: "project" | "tutorial";
  updatedAt: string;
}

/**
 * What kind of question the user is being asked.
 *
 * The first two are about which copy of a project to keep:
 *
 * - `divergent`: both sides moved. Keep this device's copy, or take the other.
 * - `deleted-elsewhere`: the project was deleted on another device, but this
 *   one holds work that never got uploaded. Finish the delete, or keep the
 *   work as a project of its own.
 *
 * The last two are not about versions at all -- the server refused the upload
 * outright, for a reason only the user can clear:
 *
 * - `name-taken`: another live project in this account already holds this
 *   name, which the unique index on `(user_id, name)` will not have twice.
 * - `too-large`: the snapshot is over the size this endpoint accepts.
 *
 * They share the conflict machinery because they need exactly what it gives:
 * pushes for the project stop (there is no point re-uploading every three
 * seconds against a refusal that cannot change on its own), and the banner is
 * the only thing anywhere that says the project has stopped syncing. Before
 * this they were `!response.ok` -- a diagnostics line and silence.
 */
export type ConflictKind =
  | "divergent"
  | "deleted-elsewhere"
  | "name-taken"
  | "too-large";

export interface Conflict {
  projectId: string;
  kind: ConflictKind;
  /**
   * For `divergent`: the files both devices changed in the same place. Every
   * other file has already been merged, so these are all the user is asked
   * about. Absent when the merge could not get that far.
   */
  paths?: string[];
}

/**
 * What the user picked.
 *
 * The first two settle the files of a `divergent` that could not be merged --
 * everything else has merged already, and stays merged whichever is picked.
 * The next two answer `deleted-elsewhere`, and
 * `retry` answers both refusals -- the user has gone and changed the thing
 * that was wrong, and is saying so.
 */
export type Resolution =
  | "keep-local"
  | "take-server"
  | "delete-local"
  | "keep-as-new"
  | "retry";

/**
 * Which question a refusal is actually asking.
 *
 * The server answers two unrelated problems with a 409: a compare-and-swap
 * that missed, and a name another live project already holds. Only the first
 * carries `conflict: true`; the second names itself in `reason`. Branching on
 * the status alone would put "Keep this version / Take the other version" in
 * front of a name collision -- a question about versions, asked about
 * something that is not one, with no answer that does anything.
 *
 * An unreadable body falls back to the older meaning, whose prompt is at least
 * about the right project.
 */
const refusalKind = async (response: Response): Promise<ConflictKind> => {
  let reason: unknown = null;
  try {
    reason = (await response.json())?.reason;
  } catch {
    // A refusal with no readable body is still a refusal
  }

  if (reason === "name-taken") return "name-taken";
  if (reason === "too-large" || response.status === 413) return "too-large";
  return "divergent";
};

/**
 * A merge re-reads the server and tries again when another write lands
 * between its fetch and its upload. Three is generous for one person's
 * devices; past it the user is asked rather than looped.
 */
const MERGE_ATTEMPTS = 3;

/**
 * Mirror project snapshots to Postgres.
 *
 * One user, one project at a time -- this is a playground, not a collaborative
 * editor. The job is that everything you type ends up on the server, and that
 * signing in elsewhere picks up where you left off. Changes from two devices
 * are merged file by file and line by line; the user is asked only about
 * lines both changed (`mergeWithServer`).
 *
 * The concurrency this still has to survive is a *stale writer*: a second tab,
 * or a laptop left open at home. Two things guard against one of those quietly
 * flattening real work:
 *
 * - `PgSyncMark` -- what the server last accepted from this device, persisted,
 *   so a fresh load can tell a local copy that is behind from one that is
 *   ahead. That is the whole of the reconcile decision (`project-restore.ts`).
 * - the server's compare-and-swap on `updated_at`, as a backstop for the race
 *   between deciding and writing. When it refuses, this merges with the
 *   server's copy, and stops pushing that project and asks only when the
 *   merge cannot settle it -- rather than retrying against a token that can
 *   never match again, which is what made a single conflict permanent.
 */
export class PgProjectSync {
  /**
   * Upload the workspace the user is looking at.
   *
   * The counterpart to the reconcile pass: that brings other devices' projects
   * down, and without this there was nothing to bring.
   */
  static async pushCurrent(): Promise<PushResult> {
    const id = PgExplorer.currentWorkspaceId;
    if (!id) return "skipped";

    const snapshot = await buildSnapshot();

    // An empty snapshot for a workspace that is open is not an edit -- it is
    // the explorer mid-re-read. `_initCurrentWorkspace` clears the file map
    // before repopulating it from the store, so a push that lands inside that
    // window sees nothing and uploads nothing, over whatever the server holds.
    //
    // Taking another device's copy re-opens the workspace, which is exactly
    // when a push is most likely to be pending, so this window is reached by
    // the one path where being wrong costs the most: the version the user just
    // asked to keep, replaced by an empty project.
    if (!Object.keys(snapshot.files).length) {
      report(`push project ${id}: refused an empty snapshot`, null);
      return "skipped";
    }

    return await PgProjectSync.push(
      id,
      snapshot,
      PgExplorer.currentWorkspaceName
    );
  }

  /**
   * @param name what to call the project on the server. The local name is
   * authoritative: it is what the user typed, and what they renamed. Without
   * it this fell back to the id, so every project that originated here was
   * stored under its own id -- and a tutorial imported elsewhere as
   * `tut:hello-anchor` is a name `PgTutorial` does not match, so the tutorial
   * read as unstarted on the second device.
   * @param opts -
   * - `immediate`: do not wait on the push gate. Only for `reconcile`, which
   *   runs *inside* the gate it is the point of -- see below.
   * - `merging`: set by the merge's own upload, so a refusal is reported
   *   rather than merged again.
   */
  static async push(
    projectId: string,
    snapshot: Snapshot,
    name?: string,
    opts: { immediate?: boolean; merging?: boolean } = {}
  ): Promise<PushResult> {
    if (!(await PgProjectSync._ready())) return "skipped";
    // Nothing goes up before this browser has reconciled with the account. A
    // push that arrives first carries no token, which the server can only treat
    // as a blind create and refuse -- a "conflict" caused by load order rather
    // than by anything the user did.
    //
    // `reconcile` is the exception, and has to be: the gate is held across the
    // whole pass and released when it returns, so a push issued from inside it
    // that waited here would wait for itself. The gate exists to keep the
    // *editor's* debounced pushes from racing the reconcile, and a push the
    // reconcile decided on is not racing anything.
    if (!opts.immediate) await PgProjectSync._gate;

    const mark = await PgSyncMark.read(projectId);
    const hashes = await hashFiles(snapshot);
    const storedName = name ?? PgProjectSync._names.get(projectId) ?? projectId;
    // Relative to the last agreement, when there is one. Without a mark there
    // is nothing to be relative to.
    const patch = mark ? diffFiles(mark.files, hashes) : null;

    // Before anything that can decline to send. What these files held at the
    // last agreement is the one thing a later merge cannot rebuild, and a
    // project with a question outstanding goes on being edited.
    if (patch) await PgSyncBase.capture(projectId, patch.changed, mark!.files);

    // A project with a question outstanding is not pushed again. This is what
    // turns a conflict from a permanent 409 loop -- the editor's debounce
    // re-firing every few seconds against a token that can never match -- into
    // one refusal and one prompt.
    if (PgProjectSync._conflicts.has(projectId)) {
      return "skipped";
    }

    // Nothing the server does not already have. The name matters as much as
    // the files: a rename changes what the row should say without changing a
    // byte.
    //
    // Deliberately not conditioned on `dirty`. That flag is set by any write
    // at all, including rewriting a workspace file with the content it already
    // had -- which `PgProgramInfo` does on every load -- so letting it force
    // an upload meant every reload bumped the row, and a bumped row is what
    // the *other* browser reads as "this project changed elsewhere".
    if (
      patch &&
      !patch.changed.length &&
      !patch.removed.length &&
      mark!.name === storedName
    ) {
      return "skipped";
    }

    try {
      const response = await fetch("/api/projects", {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          name: storedName,
          kind: projectId.startsWith("tut:") ? "tutorial" : "project",
          ...(patch
            ? {
                changed: Object.fromEntries(
                  patch.changed.map((path) => [path, snapshot.files[path]])
                ),
                removed: patch.removed,
              }
            : { files: snapshot.files }),
          baseUpdatedAt: mark?.updatedAt,
        }),
      });

      // A refusal this device can do nothing about on its own. 413 joins 409
      // here rather than falling through to the silent branch below: a
      // workspace too big to upload is a project that has stopped syncing, and
      // reporting it only to the console meant nothing on screen ever said so.
      if (response.status === 409 || response.status === 413) {
        const kind = await refusalKind(response);
        // A swap that missed: another device wrote since this one last
        // agreed. Fold its changes in rather than asking -- the merge asks
        // only about lines both sides changed. Not from inside a merge,
        // which starts over on its own.
        if (kind === "divergent" && !opts.merging) {
          const local = PgExplorer.workspaceNameOf(projectId);
          if (local) {
            const outcome = await PgProjectSync.mergeWithServer(
              projectId,
              local
            );
            if (outcome === "merged") return "ok";
            if (outcome === "conflict") return "conflict";
            // A merge that could not read the server -- offline since the
            // refusal, or the row tombstoned meanwhile -- raised nothing, and
            // returning without raising would let the next debounce send the
            // same doomed swap. The plain question below is the fallback.
          }
        }
        // Deliberately without recording anything: the upload has not been
        // accepted, and remembering it would make every later attempt look
        // unchanged and strand the project out of sync for good.
        PgProjectSync._raise({ projectId, kind });
        return "conflict";
      }
      if (!response.ok) {
        report(`push project ${projectId}: HTTP ${response.status}`, null);
        return "skipped";
      }

      const body = await response.json();
      await PgSyncMark.write(projectId, {
        files: hashes,
        name: storedName,
        updatedAt: body.updatedAt,
        dirty: false,
      });
      await PgSyncBase.accepted(
        projectId,
        snapshot,
        projectId === PgExplorer.currentWorkspaceId
      );
      PgProjectSync._clear(projectId);
      return "ok";
    } catch (e) {
      report(`push project ${projectId}`, e);
      return "skipped";
    }
  }

  /**
   * What the server holds for this user.
   *
   * @returns the project list, or empty when sync is unavailable -- which is
   * indistinguishable from "no projects" on purpose, so callers have one path
   */
  static async list(): Promise<ServerProject[]> {
    if (!(await PgProjectSync._ready())) return [];

    try {
      const response = await fetch("/api/projects", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        report(`list projects: HTTP ${response.status}`, null);
        return [];
      }
      const body = await response.json();
      return Array.isArray(body?.projects) ? body.projects : [];
    } catch (e) {
      report("list projects", e);
      return [];
    }
  }

  /** Read one project, snapshot included. Records nothing -- callers decide */
  static async fetch(
    projectId: string
  ): Promise<(ServerProject & { snapshot: Snapshot | null }) | null> {
    if (!(await PgProjectSync._ready())) return null;

    try {
      const response = await fetch(
        `/api/projects?id=${encodeURIComponent(projectId)}`,
        { credentials: "include", cache: "no-store" }
      );
      if (!response.ok) {
        report(`fetch project ${projectId}: HTTP ${response.status}`, null);
        return null;
      }

      const { project } = await response.json();
      if (!project) return null;

      PgProjectSync._names.set(project.id, project.name);
      return project;
    } catch (e) {
      report(`fetch project ${projectId}`, e);
      return null;
    }
  }

  /**
   * Tombstone a project.
   *
   * The row stays behind on the server so the *other* devices see "deleted"
   * rather than "missing" and do not push their copy back up. Without this the
   * whole tombstone mechanism was unreachable and deleting a project was undone
   * by the next reload.
   */
  static async remove(projectId: string): Promise<boolean> {
    if (!(await PgProjectSync._ready())) return false;

    try {
      const response = await fetch(
        `/api/projects?id=${encodeURIComponent(projectId)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!response.ok) {
        report(`delete project ${projectId}: HTTP ${response.status}`, null);
        return false;
      }
      return true;
    } catch (e) {
      report(`delete project ${projectId}`, e);
      return false;
    }
  }

  /**
   * Take the server's copy of a project into the local workspace.
   *
   * Only ever called where the local copy is known to be expendable -- either
   * it matches what this device last uploaded, or the user has just said to
   * discard it. `replaceWorkspaceFiles` clears the directory first, so getting
   * that wrong is the data loss this whole design exists to prevent.
   *
   * @returns the local workspace name, or `null` if nothing was taken
   */
  static async adopt(projectId: string): Promise<string | null> {
    const full = await PgProjectSync.fetch(projectId);
    // A snapshot that is not a file map would empty the workspace:
    // `replaceWorkspaceFiles` removes the directory before it discovers it has
    // nothing to write back. The server validates this on the way in as well;
    // this is the half that protects rows written before it did.
    if (!isUsableSnapshot(full?.snapshot)) {
      if (full) report(`adopt ${projectId}: unusable snapshot`, null);
      return null;
    }

    const local = PgExplorer.workspaceNameOf(projectId);
    if (!local) return null;

    await PgExplorer.replaceWorkspaceFiles(local, full!.snapshot!.files);
    await PgSyncMark.write(projectId, {
      files: await hashFiles(full!.snapshot!),
      name: local,
      updatedAt: full!.updatedAt,
      dirty: false,
    });
    // The local copy is now the server's, so nothing kept against the old
    // agreement is a base for anything
    await PgSyncBase.clear(projectId);

    // Only the current workspace is held in memory, and it is now the stale
    // copy -- `replaceWorkspaceFiles` writes to the store and deliberately
    // leaves state alone. Re-opening is what makes the editor re-read it.
    //
    // Done here rather than in the callers because every path that adopts has
    // the same problem: the reconcile's own, the user answering the banner,
    // and a backgrounded tab coming back. The last had no re-read at all, so
    // a tab that adopted on regaining focus kept showing files that were no
    // longer on disk -- and pushed them back up on the next edit.
    // Re-opening is not inert -- `PgProgramInfo` rewrites the keypair file --
    // so the workspace will differ from the snapshot just adopted within a
    // moment. That is why reconcile decides on the mark's per-file hashes,
    // compared on user files only: the user's files are what this cannot
    // change, and the generated ones ride along on the next upload.
    if (local === PgExplorer.currentWorkspaceName) {
      await PgExplorer.switchWorkspace(local);
    }

    return local;
  }

  /**
   * Fold the server's copy into this device's, asking only about the lines
   * both changed.
   *
   * The order of the writes is what makes an interruption harmless. Local
   * files first: a tab closed after that still holds the old agreement, so
   * the next reconcile sees both sides moved and merges again -- converging,
   * because the server's changes are already in. Then the mark and base, which
   * make the server's copy the agreement. Then the upload, which a closed tab
   * leaves to the next reconcile as an ordinary "this device is ahead".
   *
   * @param prefer how to settle the files that cannot be merged. Without it
   * they are raised as a conflict and nothing is written at all.
   */
  static async mergeWithServer(
    projectId: string,
    localName: string,
    prefer?: "local" | "server"
  ): Promise<"merged" | "conflict" | "failed"> {
    // Replacing files under the explorer's in-memory copy leaves a window in
    // which the editor's debounce would upload the stale copy. Reconcile
    // already holds the gate; a merge started from the banner has to.
    const held = !PgProjectSync._release;
    if (held) PgProjectSync.holdPushes();
    let replaced = false;
    // What the workspace holds after an attempt that wrote it. Re-reading
    // instead would be wrong for the current workspace: `snapshotOf` reads it
    // from memory, which `replaceWorkspaceFiles` leaves alone until the
    // re-open below -- so a retry would take the pre-merge copy for local work
    // and undo, silently, the server's changes the first attempt merged in.
    let carried: Record<string, string> | null = null;

    try {
      for (let attempt = 0; attempt < MERGE_ATTEMPTS; attempt++) {
        const full = await PgProjectSync.fetch(projectId);
        if (!full || !isUsableSnapshot(full.snapshot)) return "failed";

        const server = full.snapshot.files;
        const local = carried ?? (await snapshotOf(localName)).files;
        // The same window `pushCurrent` refuses: the explorer mid-re-read
        // reads as a project with every file deleted, and merging that would
        // delete them on the server too
        if (!Object.keys(local).length) {
          report(
            `merge project ${projectId}: refused an empty local copy`,
            null
          );
          return "failed";
        }
        const mark = await PgSyncMark.read(projectId);
        const [localHashes, serverHashes] = await Promise.all([
          hashFiles({ files: local }),
          hashFiles({ files: server }),
        ]);

        const plan = planMerge({
          base: mark?.files ?? {},
          baseContents: await PgSyncBase.read(projectId),
          local,
          localHashes,
          server,
          serverHashes,
        });

        if (plan.conflicts.length && !prefer) {
          PgProjectSync._raise({
            projectId,
            kind: "divergent",
            paths: plan.conflicts,
          });
          return "conflict";
        }

        const merged = settleConflicts(plan, prefer ?? "server", local, server);
        if (!Object.keys(merged).length) {
          report(`merge project ${projectId}: refused an empty result`, null);
          return "failed";
        }

        if (!sameFiles(merged, local)) {
          await PgExplorer.replaceWorkspaceFiles(localName, merged);
          replaced = true;
        }
        await PgSyncMark.write(projectId, {
          files: serverHashes,
          name: full.name,
          updatedAt: full.updatedAt,
          // Clean when the merge came out as the server's copy -- identical
          // copies, or only the server moved. Left set otherwise, so a merge
          // whose upload never lands still reads as work owed.
          dirty: !sameFiles(merged, server),
        });
        await PgSyncBase.replace(
          projectId,
          baseAfterMerge(merged, server, serverHashes)
        );

        // Cleared before uploading: `push` refuses a project with a question
        // outstanding, and this is the answer to it
        PgProjectSync._clear(projectId);
        const result = await PgProjectSync.push(
          projectId,
          { files: merged },
          localName,
          { immediate: true, merging: true }
        );
        // "skipped" is either nothing left to send or no network; both leave
        // a state the next reconcile continues from
        if (result !== "conflict") return "merged";

        // A refusal that is not about versions is the user's to clear
        if (PgProjectSync._conflicts.get(projectId)?.kind !== "divergent") {
          return "conflict";
        }
        // Another write landed between the fetch and the upload. The mark and
        // base above are still an honest record, so start over from it.
        PgProjectSync._clear(projectId);
        carried = merged;
      }

      PgProjectSync._raise({ projectId, kind: "divergent" });
      return "conflict";
    } finally {
      if (held) PgProjectSync.releasePushes();
      // Last, and after releasing: re-opening dispatches a switch, and the
      // effect answers a switch by reconciling, which must not run inside a
      // gate this merge is about to let go of
      if (replaced && localName === PgExplorer.currentWorkspaceName) {
        await PgExplorer.switchWorkspace(localName);
      }
    }
  }

  /**
   * Act on the user's answer to a conflict, and stop asking.
   *
   * @returns whether the conflict is now settled. `false` leaves the prompt up
   * rather than pretending a failed resolution succeeded.
   */
  static async resolve(
    projectId: string,
    resolution: Resolution
  ): Promise<boolean> {
    const name = PgExplorer.workspaceNameOf(projectId);

    try {
      switch (resolution) {
        case "keep-local":
        case "take-server": {
          if (!name) return false;
          // Only the files that could not be merged follow the user's answer;
          // everything that merged stays merged
          const outcome = await PgProjectSync.mergeWithServer(
            projectId,
            name,
            resolution === "keep-local" ? "local" : "server"
          );
          return outcome === "merged";
        }

        case "delete-local": {
          if (name) await PgExplorer.deleteWorkspace(name);
          await PgSyncMark.remove(projectId);
          await PgSyncBase.clear(projectId);
          PgProjectSync._clear(projectId);
          return true;
        }

        case "keep-as-new": {
          if (!name) return false;
          // A new id, because the old one is tombstoned on the server and
          // every push under it would be refused for the life of the account.
          // Imported alongside, then the original is removed -- there is no
          // API for re-keying a workspace in place.
          const snapshot = await snapshotOf(name);
          const fresh = `${name} (kept)`;
          await PgExplorer.importWorkspace(fresh, {
            id: crypto.randomUUID(),
            files: snapshot.files,
          });
          await PgExplorer.deleteWorkspace(name);
          await PgSyncMark.remove(projectId);
          await PgSyncBase.clear(projectId);
          PgProjectSync._clear(projectId);
          await PgExplorer.switchWorkspace(fresh);
          return true;
        }

        case "retry": {
          if (!name) return false;
          // Cleared before pushing, not after: `push` refuses a project that
          // has a question outstanding, and this *is* the answer to it.
          //
          // A push that is refused again raises from inside, so the banner
          // comes back by itself and says which refusal it hit this time --
          // renaming into a *second* taken name keeps the same prompt, and a
          // project that shrank below the size cap only to hit a real
          // divergence gets the version question it now deserves. The one
          // outcome that raises nothing is a push that never reached the
          // server, which is why the original question is put back for it:
          // being offline does not mean the name is free.
          const previous = PgProjectSync._conflicts.get(projectId) ?? null;
          PgProjectSync._clear(projectId);

          const result = await PgProjectSync.push(
            projectId,
            await snapshotOf(name),
            name
          );
          if (result === "ok") return true;

          if (previous && !PgProjectSync._conflicts.has(projectId)) {
            PgProjectSync._raise(previous);
          }
          return false;
        }
      }
    } catch (e) {
      report(`resolve ${projectId} as ${resolution}`, e);
      return false;
    }
  }

  /** Raise a conflict from outside the push path -- reconcile's cases */
  static raise(conflict: Conflict) {
    PgProjectSync._raise(conflict);
  }

  /** Every project currently waiting on an answer */
  static get conflicts(): Conflict[] {
    return [...PgProjectSync._conflicts.values()];
  }

  static conflictFor(projectId: string | null | undefined): Conflict | null {
    if (!projectId) return null;
    return PgProjectSync._conflicts.get(projectId) ?? null;
  }

  /**
   * Fires whenever the set of outstanding conflicts changes, raised *or*
   * settled. The banner had no way to hear the second, so once shown it stayed
   * up for the rest of the session -- including over projects with no conflict.
   */
  static onDidChangeConflicts(cb: () => void): Disposable {
    PgProjectSync._conflictListeners.add(cb);
    return {
      dispose: () => PgProjectSync._conflictListeners.delete(cb),
    };
  }

  /**
   * Whether syncing is possible at all: signed in, against a deployment that
   * has a database.
   *
   * Exposed so callers can bail out *before* doing the work that feeds a
   * request. Every method here already short-circuits, but `push` takes a
   * snapshot as an argument, so a caller that builds one first pays for
   * reading the whole workspace off disk to hand it to a function that will
   * discard it -- once per project, on every reconcile.
   */
  static async isAvailable() {
    return await PgProjectSync._ready();
  }

  /** Remember a name for a project whose workspace may not exist locally yet */
  static rememberName(projectId: string, name: string) {
    PgProjectSync._names.set(projectId, name);
  }

  /**
   * Whether this tab is currently giving the browser back.
   *
   * Sign-out removes this device's copy of projects the account keeps, so the
   * next person here is not shown them. Every one of those removals reaches
   * the explorer as an ordinary delete, and `project-sync` answers a workspace
   * that no longer resolves by tombstoning it -- which is right when the user
   * deleted it and catastrophic when they merely signed out. The two are
   * indistinguishable from the event alone: `onDidDeleteWorkspace` carries no
   * id, and nothing else says who asked.
   *
   * So the sign-out path says so itself, and the effect stops treating its own
   * teardown as user activity. Without it, signing out emptied the account --
   * the rows were tombstoned and their snapshots cleared -- and signing back
   * in restored nothing, because there was nothing left to restore.
   */
  static get isSigningOut() {
    return PgProjectSync._signingOut;
  }

  /**
   * Run the sign-out teardown with this tab's own deletes disowned.
   *
   * A counter rather than a boolean: sign-out hands over conversations and
   * projects independently, and a nested or repeated call must not clear the
   * flag while an outer one is still running.
   */
  static async whileSigningOut<T>(fn: () => Promise<T>): Promise<T> {
    PgProjectSync._signingOut++;
    try {
      return await fn();
    } finally {
      PgProjectSync._signingOut--;
    }
  }

  /**
   * Hold every push until `releasePushes`.
   *
   * Called on load and again whenever a backgrounded tab comes back, before
   * anything can fire. The alternative is a race: the editor's own debounce is
   * a few seconds, the reconcile is several round trips, and whichever wins
   * decides whether the user is accused of a conflict. Holding makes the answer
   * the same every time.
   *
   * Open by default, so a caller that never reconciles -- a test, or any entry
   * point that does not run the session effect -- is not left waiting on
   * something that will never happen.
   */
  static holdPushes() {
    if (PgProjectSync._release) return;
    PgProjectSync._gate = new Promise((resolve) => {
      PgProjectSync._release = resolve;
    });
  }

  /** Let held pushes through. Safe to call more than once. */
  static releasePushes() {
    PgProjectSync._release?.();
    PgProjectSync._release = null;
    PgProjectSync._gate = Promise.resolve();
  }

  /**
   * Drop everything derived from the signed-in account.
   *
   * Called on sign-out as well as from tests. Leaving it behind meant the next
   * user on this browser was shown a conflict banner for a project they had
   * never touched: tutorial ids are derived from the name and so are identical
   * across accounts, and the previous account's token was still in memory.
   */
  static reset() {
    PgProjectSync._names.clear();
    PgProjectSync._conflicts.clear();
    PgProjectSync._conflictListeners.clear();
    PgProjectSync._signingOut = 0;
    PgProjectSync.releasePushes();
  }

  /** Sign-out: the account's state goes, the listeners stay */
  static forgetAccount() {
    PgProjectSync._names.clear();
    const had = PgProjectSync._conflicts.size;
    PgProjectSync._conflicts.clear();
    if (had) PgProjectSync._emit();
  }

  private static _gate: Promise<void> = Promise.resolve();
  private static _release: (() => void) | null = null;
  private static _signingOut = 0;

  private static readonly _names = new Map<string, string>();
  private static readonly _conflicts = new Map<string, Conflict>();
  private static readonly _conflictListeners = new Set<() => void>();

  private static _raise(conflict: Conflict) {
    const existing = PgProjectSync._conflicts.get(conflict.projectId);
    if (
      existing?.kind === conflict.kind &&
      JSON.stringify(existing.paths) === JSON.stringify(conflict.paths)
    ) {
      return;
    }
    PgProjectSync._conflicts.set(conflict.projectId, conflict);
    PgProjectSync._emit();
  }

  private static _clear(projectId: string) {
    if (PgProjectSync._conflicts.delete(projectId)) PgProjectSync._emit();
  }

  private static _emit() {
    for (const cb of PgProjectSync._conflictListeners) cb();
  }

  private static async _ready() {
    return !!PgSession.get() && (await PgSyncClient.available());
  }
}

/**
 * Whether a stored snapshot can be written to a workspace.
 *
 * Exported because reconcile checks it before the same destructive call, and
 * both halves have to agree on what "usable" means.
 */
export const isUsableSnapshot = (
  snapshot: Snapshot | null | undefined
): snapshot is Snapshot => {
  const files = (snapshot as Snapshot | undefined)?.files;
  if (!files || typeof files !== "object" || Array.isArray(files)) return false;
  return Object.values(files).every((content) => typeof content === "string");
};
