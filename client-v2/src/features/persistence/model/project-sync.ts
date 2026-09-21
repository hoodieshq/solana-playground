import { report } from "./diagnostics";
import { buildSnapshot, hashSnapshot, snapshotOf } from "./snapshot";
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
 * - `divergent`: both sides moved. Keep this device's copy, or take the other.
 * - `deleted-elsewhere`: the project was deleted on another device, but this
 *   one holds work that never got uploaded. Finish the delete, or keep the
 *   work as a project of its own.
 */
export type ConflictKind = "divergent" | "deleted-elsewhere";

export interface Conflict {
  projectId: string;
  kind: ConflictKind;
}

/** What the user picked. The first two answer `divergent`, the rest the other */
export type Resolution =
  | "keep-local"
  | "take-server"
  | "delete-local"
  | "keep-as-new";

/**
 * Mirror project snapshots to Postgres.
 *
 * One user, one project at a time -- this is a playground, not a collaborative
 * editor. The job is that everything you type ends up on the server, and that
 * signing in elsewhere picks up where you left off. Nothing is ever merged.
 *
 * The concurrency this still has to survive is a *stale writer*: a second tab,
 * or a laptop left open at home. Two things guard against one of those quietly
 * flattening real work:
 *
 * - `PgSyncMark` -- what the server last accepted from this device, persisted,
 *   so a fresh load can tell a local copy that is behind from one that is
 *   ahead. That is the whole of the reconcile decision (`project-restore.ts`).
 * - the server's compare-and-swap on `updated_at`, as a backstop for the race
 *   between deciding and writing. When it refuses, this stops pushing that
 *   project and asks -- rather than retrying against a token that can never
 *   match again, which is what made a single conflict permanent.
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

    return await PgProjectSync.push(
      id,
      await buildSnapshot(),
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
   * - `force`: overwrite whatever the server holds, without comparing. Only
   *   ever set by `resolve`, after the user has chosen.
   * - `immediate`: do not wait on the push gate. Only for `reconcile`, which
   *   runs *inside* the gate it is the point of -- see below.
   */
  static async push(
    projectId: string,
    snapshot: Snapshot,
    name?: string,
    opts: { force?: boolean; immediate?: boolean } = {}
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

    // A project with a question outstanding is not pushed again. This is what
    // turns a conflict from a permanent 409 loop -- the editor's debounce
    // re-firing every few seconds against a token that can never match -- into
    // one refusal and one prompt.
    if (!opts.force && PgProjectSync._conflicts.has(projectId)) {
      return "skipped";
    }

    const mark = await PgSyncMark.read(projectId);
    const hash = await hashSnapshot(snapshot);

    // Unchanged since the server took it, and nothing pending. `dirty` is
    // checked as well as the hash because an edit that was undone leaves the
    // content identical while the upload it scheduled is still owed.
    if (!opts.force && mark && !mark.dirty && mark.hash === hash) {
      return "skipped";
    }

    try {
      const response = await fetch("/api/projects", {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          name: name ?? PgProjectSync._names.get(projectId) ?? projectId,
          kind: projectId.startsWith("tut:") ? "tutorial" : "project",
          snapshot,
          // Omitted under `force`: the server reads the two as separate doors,
          // and sending a token alongside would be asking it to check
          // something the user has already overruled.
          baseUpdatedAt: opts.force ? undefined : mark?.updatedAt,
          force: opts.force === true,
        }),
      });

      if (response.status === 409) {
        // Deliberately without recording the hash or clearing `dirty`: the
        // snapshot has not been accepted, and remembering it would make every
        // later attempt look unchanged and strand the project out of sync for
        // good.
        PgProjectSync._raise({ projectId, kind: "divergent" });
        return "conflict";
      }
      if (!response.ok) {
        report(`push project ${projectId}: HTTP ${response.status}`, null);
        return "skipped";
      }

      const body = await response.json();
      await PgSyncMark.write(projectId, {
        hash,
        updatedAt: body.updatedAt,
        dirty: false,
      });
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
      hash: await hashSnapshot(full!.snapshot!),
      updatedAt: full!.updatedAt,
      dirty: false,
    });
    return local;
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
        case "keep-local": {
          if (!name) return false;
          const result = await PgProjectSync.push(
            projectId,
            await snapshotOf(name),
            name,
            { force: true }
          );
          return result === "ok";
        }

        case "take-server": {
          const local = await PgProjectSync.adopt(projectId);
          if (!local) return false;
          PgProjectSync._clear(projectId);
          // Only the current workspace is held in memory, so it is the only
          // one whose files changing underneath leaves the editor showing
          // something that is no longer on disk.
          if (local === PgExplorer.currentWorkspaceName) {
            await PgExplorer.switchWorkspace(local);
          }
          return true;
        }

        case "delete-local": {
          if (name) await PgExplorer.deleteWorkspace(name);
          await PgSyncMark.remove(projectId);
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
          PgProjectSync._clear(projectId);
          await PgExplorer.switchWorkspace(fresh);
          return true;
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

  /** Remember a name for a project whose workspace may not exist locally yet */
  static rememberName(projectId: string, name: string) {
    PgProjectSync._names.set(projectId, name);
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

  private static readonly _names = new Map<string, string>();
  private static readonly _conflicts = new Map<string, Conflict>();
  private static readonly _conflictListeners = new Set<() => void>();

  private static _raise(conflict: Conflict) {
    const existing = PgProjectSync._conflicts.get(conflict.projectId);
    if (existing?.kind === conflict.kind) return;
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
