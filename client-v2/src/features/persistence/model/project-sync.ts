import { report } from "./diagnostics";
import {
  baseAfterMerge,
  merge3,
  planMerge,
  sameFiles,
  settleConflicts,
  withLocalKeypair,
} from "./merge";
import {
  buildSnapshot,
  diffFiles,
  hashFiles,
  sameUserFiles,
  snapshotOf,
} from "./snapshot";
import { PgSyncBase } from "./sync-base";
import { PgSyncClient } from "./sync-client";
import { legacyContentHash, PgSyncMark } from "./sync-mark";
import { PgSession } from "../../auth";
// Deep import for the same reason `snapshot.ts` uses one: the `utils` barrel
// reaches `settings.ts`, which reads a webpack-defined global jest has no
// answer for, and importing it here would make this module untestable
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgFs } from "../../../utils/explorer/fs";
import type { Snapshot } from "./snapshot";
import type { LegacySyncMark, SyncMark } from "./sync-mark";
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
    // Waited on before anything is read, not only before sending. The gate is
    // held while a merge or an adoption rewrites the workspace, and a snapshot
    // taken before that and sent after it is the pre-merge copy: patched
    // against the merged mark, it passes the server's swap and silently
    // reverts every line the other device contributed.
    await PgProjectSync._gate;

    const id = PgExplorer.currentWorkspaceId;
    if (!id) return "skipped";

    // Read before the snapshot, so a rewrite that starts while it is being
    // built is still caught before anything is sent
    const generation = PgProjectSync._generationOf(id);
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
      PgExplorer.currentWorkspaceName,
      { generation }
    );
  }

  /**
   * How many times this project's local files have been rewritten by sync.
   *
   * A snapshot is only as current as the files it was read from. Pass this,
   * read before building one, as `push`'s `generation`, and a rewrite that
   * lands in between makes the push stand down instead of uploading a copy
   * the rewrite has already replaced.
   */
  static generationOf(projectId: string) {
    return PgProjectSync._generationOf(projectId);
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
   * - `generation`: `generationOf(projectId)` as it was when `snapshot` was
   *   read. A snapshot older than the latest rewrite is not sent; whatever
   *   rewrote the files already uploaded them, or left them to the next
   *   reconcile.
   */
  static async push(
    projectId: string,
    snapshot: Snapshot,
    name?: string,
    opts: { immediate?: boolean; merging?: boolean; generation?: number } = {}
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

    // After the last await before sending, so a rewrite anywhere since the
    // snapshot was read is seen. Measured against the mark that rewrite left,
    // this snapshot would read as this device undoing it.
    if (
      opts.generation !== undefined &&
      opts.generation !== PgProjectSync._generationOf(projectId)
    ) {
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
            // refusal -- raised nothing, and returning without raising would
            // let the next debounce send the same doomed swap. The plain
            // question below is the fallback. A row that is gone is not this
            // case: the merge has asked about the delete already.
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
   * @returns the project list, or `null` when it could not be read -- sync
   * unavailable, offline, a refused session, a failing server. Never empty for
   * those: reconcile reads a project missing from the list as deleted on
   * another device, so an unreadable list passed off as an empty one deleted
   * every clean synced project on this browser, and tombstoned their rows.
   */
  static async list(): Promise<ServerProject[] | null> {
    if (!(await PgProjectSync._ready())) return null;

    try {
      const response = await fetch("/api/projects", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        report(`list projects: HTTP ${response.status}`, null);
        return null;
      }
      const body = await response.json();
      if (!Array.isArray(body?.projects)) {
        report("list projects: malformed", null);
        return null;
      }
      return body.projects;
    } catch (e) {
      report("list projects", e);
      return null;
    }
  }

  /** Read one project, snapshot included. Records nothing -- callers decide */
  static async fetch(
    projectId: string
  ): Promise<(ServerProject & { snapshot: Snapshot | null }) | null> {
    const found = await PgProjectSync.read(projectId);
    if (found === "gone") {
      report(`fetch project ${projectId}: HTTP 404`, null);
      return null;
    }
    return found;
  }

  /**
   * `fetch`, telling a row that is not there from a read that did not happen.
   *
   * The two call for different questions. A row tombstoned or never stored
   * is a project deleted elsewhere, which the user can settle; a network
   * failure is a project whose state is simply unknown. Folded into one
   * `null`, a push refused on a deleted row asked the version question, and
   * both of its answers merge against a server with nothing to merge with.
   *
   * @returns the project, `"gone"` for a 404, or `null` for anything else
   * that did not produce one
   */
  static async read(
    projectId: string
  ): Promise<(ServerProject & { snapshot: Snapshot | null }) | "gone" | null> {
    if (!(await PgProjectSync._ready())) return null;

    try {
      const response = await fetch(
        `/api/projects?id=${encodeURIComponent(projectId)}`,
        { credentials: "include", cache: "no-store" }
      );
      if (response.status === 404) return "gone";
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
   * Only ever takes it over a local copy that is expendable: one whose user
   * files are exactly what the mark says this device last agreed with the
   * server. That is checked here, inside the project's queue, rather than
   * trusted from the caller -- `replaceWorkspaceFiles` clears the directory
   * first, so taking it over anything else is the data loss this whole design
   * exists to prevent. A copy that is not clean is left alone, and nothing is
   * written.
   *
   * @returns the local workspace name, or `null` if nothing was taken
   */
  static adopt(projectId: string): Promise<string | null> {
    return PgProjectSync._exclusive(projectId, () =>
      PgProjectSync._adopt(projectId)
    );
  }

  private static async _adopt(projectId: string): Promise<string | null> {
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

    // Held and counted for the same reasons as a merge's -- see there
    PgProjectSync.holdPushes();
    let bumped = false;
    try {
      // The caller found the local copy expendable, but that was before the
      // fetch above, and possibly before this queued behind a merge. Typing
      // that autosave stored during the round trip, or work a merge left
      // unsent, is in the local copy now and in no other. So it is asked
      // again, here, every time -- and the copy read to answer it is the one
      // the editor is measured against below: any keystroke after this read
      // is folded in rather than overwritten.
      //
      // Declining returns rather than merging in place. The work is already
      // owed to the server, so the editor's next push meets the swap and
      // merges through the ordinary path, and a reconcile that runs first
      // finds the copy dirty and merges it there. Merging here instead would
      // be a second route to the same result with its own ordering to get
      // right.
      //
      // A mark from before per-file hashes is asked too, as a whole: reconcile
      // adopts over one whose user files still match it, because it says
      // nothing about the generated files and the account's copy is the only
      // one known to be the agreement. Declining leaves it untouched, and the
      // next pass decides again from it.
      const before = (await snapshotOf(local)).files;
      const mark = await PgSyncMark.inspect(projectId);
      if (!(await isCleanAgainst(mark, local, before))) return null;

      // Only once the copy is known to be expendable: a push already reading
      // this copy is carrying work, and stopping it would leave that work to
      // wait for whatever runs next
      PgProjectSync._bump(projectId);
      bumped = true;
      // The account's copy, except for a keypair only this device holds: a
      // device that built before generated files were uploaded has the one
      // keypair its program was deployed with, and dropping it here made the
      // next build mint a new address
      const files = withLocalKeypair(full!.snapshot!.files, before);
      await PgExplorer.replaceWorkspaceFiles(local, files);
      // Still the server's hashes, carried keypair or not. That is what makes
      // the keypair read as a local change, which the next push uploads: the
      // write event the rewrite fires for the file schedules it for the open
      // project, and opening any other one rewrites the file and does the same.
      const agreed = await hashFiles(full!.snapshot!);
      await PgSyncMark.write(projectId, {
        files: agreed,
        name: local,
        updatedAt: full!.updatedAt,
        dirty: false,
      });
      // The local copy is now the server's, so nothing kept against the old
      // agreement is a base for anything
      await PgSyncBase.clear(projectId);

      // Done here rather than in the callers because every path that adopts
      // has the same problem: the reconcile's own, and a backgrounded tab
      // coming back. The latter had no re-read at all, so a tab that adopted
      // on regaining focus kept showing files that were no longer on disk --
      // and pushed them back up on the next edit.
      //
      // Re-opening is not inert -- `PgProgramInfo` rewrites the keypair file
      // -- so the workspace will differ from the snapshot just adopted within
      // a moment. That is why reconcile decides on the mark's per-file hashes,
      // compared on user files only: the user's files are what this cannot
      // change, and the generated ones ride along on the next upload.
      const owed = await PgProjectSync._catchUp(local, before, files);
      // The account's copy of a file typed into is its base from here on --
      // see `PgSyncBase`. Kept now, while it is known: the re-open above
      // re-took the shadow from the folded copy.
      await PgSyncBase.capture(projectId, owed, agreed, files);
      // Typing folded into the server's copy is on this device alone. After
      // the mark above, which said the copy was exactly the server's, or the
      // cheap path in reconcile would skip the project until the next edit. A
      // carried keypair is owed too, and flagged for the same honesty, though
      // what uploads it is the push described above rather than reconcile.
      if (owed.length || files !== full!.snapshot!.files) {
        await PgSyncMark.markDirty(projectId);
      }
    } finally {
      if (bumped) PgProjectSync._bump(projectId);
      PgProjectSync.releasePushes();
    }

    return local;
  }

  /**
   * Bring every other copy of a workspace's files level with the store, once
   * sync has rewritten it: the editor's buffers, then -- for the current
   * workspace -- the explorer's memory.
   *
   * `replaceWorkspaceFiles` writes the store and nothing else. The explorer
   * re-reads on a re-open, but Monaco keeps a model per path and reuses it on
   * the next open rather than taking the file's new content, and its autosave
   * writes `editor.getValue()` back half a second after any keystroke. Left
   * alone, the open file went on showing the pre-merge text and the next
   * keystroke saved it over the merged one -- on every merge of an open file.
   *
   * Runs inside the push gate, so nothing uploads before memory and editor
   * agree with the store.
   *
   * @param before what the caller read as the local copy before rewriting.
   * A buffer that no longer matches it was typed into since, and is folded
   * into the new content rather than overwritten.
   * @returns the paths something was folded into: the store holds content
   * for them that is not `after`, which is all the caller has recorded or
   * uploaded
   */
  private static async _catchUp(
    localName: string,
    before: Record<string, string>,
    after: Record<string, string>
  ): Promise<string[]> {
    const buffers = PgExplorer.editorBuffers;
    const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
    const folded: string[] = [];

    for (const path of buffers ? [...paths].sort() : []) {
      const full = `/${localName}/${path}`;
      let content: string | undefined;
      try {
        // Read and written with nothing awaited in between, so a keystroke
        // cannot land after the read and be overwritten by the write
        const buffer = buffers!.read(full);
        if (buffer === undefined) continue;
        const read = before[path];

        if (!(path in after)) {
          if (buffer !== read) {
            report(
              `catch up ${localName}: ${path} was edited here while sync removed it; the edit was discarded`,
              null
            );
          }
          buffers!.discard(full);
          continue;
        }

        content = after[path];
        if (read !== undefined && buffer !== read && buffer !== content) {
          const merged = merge3(read, buffer, content);
          if (merged === null) {
            report(
              `catch up ${localName}: what was typed in ${path} during sync overlaps what sync wrote; the synced copy was kept`,
              null
            );
          } else {
            content = merged;
            if (content !== after[path]) folded.push(path);
          }
        }
        if (buffer !== content) buffers!.write(full, content);
        // Nothing more to do when the buffer was already the new content and
        // nobody typed: the store has it. Otherwise the store is written too,
        // after any autosave that fired during the rewrite with the old text,
        // so the re-read below finds what the editor now shows.
        if (content === after[path] && buffer === read) continue;
      } catch (e) {
        report(`catch up ${localName}: editor buffer ${path}`, e);
        continue;
      }

      try {
        await PgFs.writeFile(full, content, { createParents: true });
      } catch (e) {
        report(`catch up ${localName}: write ${path}`, e);
      }
    }

    // Only the current workspace is held in memory. Re-opening it inside the
    // gate is safe now the gate is counted: the reconcile its switch starts
    // takes a hold of its own, and skips this project while a merge of it is
    // still running.
    if (localName === PgExplorer.currentWorkspaceName) {
      await PgExplorer.switchWorkspace(localName);
    }

    return folded;
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
   * @param asked the files the user was shown when they picked `prefer`. The
   * answer covers those and no others: when the server has moved since and
   * something else now overlaps too, the question is asked again, with the
   * new set, rather than answered on the user's behalf. Absent when the
   * question was about the whole project.
   */
  static mergeWithServer(
    projectId: string,
    localName: string,
    prefer?: "local" | "server",
    asked?: readonly string[]
  ): Promise<"merged" | "conflict" | "failed"> {
    return PgProjectSync._exclusive(projectId, () =>
      PgProjectSync._mergeWithServer(projectId, localName, prefer, asked)
    );
  }

  private static async _mergeWithServer(
    projectId: string,
    localName: string,
    prefer?: "local" | "server",
    asked?: readonly string[]
  ): Promise<"merged" | "conflict" | "failed"> {
    // Held for the whole merge, re-open included. Counted, so a reconcile
    // that starts or finishes meanwhile can neither open it early nor have
    // it opened under it.
    PgProjectSync.holdPushes();
    // Every snapshot of this project read before now is of files this may be
    // about to replace, so none of them may be sent
    PgProjectSync._bump(projectId);
    // What was read as local on the first attempt -- what the editor's
    // buffers were last known to agree with -- and what the store holds now
    let first: Record<string, string> | null = null;
    let written: Record<string, string> | null = null;
    // What the workspace holds after an attempt that wrote it. Re-reading
    // instead would be wrong for the current workspace: `snapshotOf` reads it
    // from memory, which `replaceWorkspaceFiles` leaves alone until the
    // re-open below -- so a retry would take the pre-merge copy for local work
    // and undo, silently, the server's changes the first attempt merged in.
    let carried: Record<string, string> | null = null;

    try {
      for (let attempt = 0; attempt < MERGE_ATTEMPTS; attempt++) {
        const full = await PgProjectSync.read(projectId);
        // Deleted on another device, most likely while this one was editing:
        // the question is whether to keep the work, not which version wins
        if (full === "gone") {
          PgProjectSync._raise({ projectId, kind: "deleted-elsewhere" });
          return "conflict";
        }
        if (!full || !isUsableSnapshot(full.snapshot)) return "failed";

        const server = full.snapshot.files;
        const local = carried ?? (await snapshotOf(localName)).files;
        first ??= local;
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

        // What a push would have kept before sending. A merge that reconcile
        // starts can reach an edit no push has seen -- autosaved, its
        // debounce still pending -- and without this it had no base for it.
        // First attempt only: a retry's local copy is the merge's own result,
        // and the shadow's hash check refuses anything but the agreement.
        if (mark && !carried) {
          await PgSyncBase.capture(
            projectId,
            diffFiles(mark.files, localHashes).changed,
            mark.files
          );
        }

        const plan = planMerge({
          base: mark?.files ?? {},
          baseContents: await PgSyncBase.read(projectId),
          local,
          localHashes,
          server,
          serverHashes,
        });

        // Unanswered, or answered about other files than these. Checked on
        // every attempt: a retry re-reads a server that may have moved again.
        if (
          plan.conflicts.length &&
          (!prefer ||
            (asked && !plan.conflicts.every((path) => asked.includes(path))))
        ) {
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
          written = merged;
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
      try {
        // Before the gate opens: until the editor and memory hold what the
        // store now does, any push would read the pre-merge copy
        const folded = written
          ? await PgProjectSync._catchUp(localName, first!, written)
          : [];
        if (folded.length) {
          // What the merge wrote is the agreement for these files, or its
          // base is kept already -- the merged copy when its upload landed,
          // the server's when it did not. Kept now, as in `_adopt`: the
          // re-open re-took the shadow from the folded copy, which no longer
          // matches the mark.
          const mark = await PgSyncMark.read(projectId);
          if (mark) {
            await PgSyncBase.capture(projectId, folded, mark.files, written!);
          }
          // The mark was written, and the upload made, from the merged copy
          // alone. What the editor folded in on top is on this device only,
          // and a mark that says nothing is owed would have reconcile's cheap
          // path skip the project until the next edit.
          await PgSyncMark.markDirty(projectId);
        }
      } finally {
        // And after catching up, so a snapshot read while it ran is not sent
        PgProjectSync._bump(projectId);
        PgProjectSync.releasePushes();
      }
    }
  }

  /**
   * Whether a merge or adoption of this project is running, or waiting to.
   *
   * Reconcile leaves such a project for its next pass: the merge is already
   * reading the server and rewriting the workspace, and a second pass over
   * the same project would only queue behind it with a decision made before
   * it ran.
   */
  static isMerging(projectId: string) {
    return PgProjectSync._merging.has(projectId);
  }

  /**
   * Run `task` once nothing else is rewriting this project, then let the
   * next one in.
   *
   * Two merges of one project cannot overlap safely. Each reads the local copy
   * from memory and the agreement from the mark, at different moments: a
   * second merge that read memory before the first had re-opened the
   * workspace, and the mark after the first had written it, planned the
   * pre-merge copy against the new agreement -- so every line only the other
   * device changed read as this device reverting it, and it uploaded the
   * revert, which the swap accepted. The second push to arrive -- a debounce
   * refused mid-reconcile, or the user answering the banner -- reaches here
   * as easily as the first.
   *
   * So a later caller waits, and then runs from scratch: fresh reads, its own
   * `prefer`. Handing it the earlier call's outcome instead would answer the
   * banner with whatever the reconcile decided.
   *
   * Nothing a task awaits may wait on this project's chain in turn. The merge's
   * own upload does not merge again (`merging`), and the reconcile its re-open
   * starts is not awaited and skips a project that `isMerging`.
   *
   * @param task given whether it had to wait, since what the caller decided
   * before calling may no longer hold
   */
  private static async _exclusive<T>(
    projectId: string,
    task: (waited: boolean) => Promise<T>
  ): Promise<T> {
    const previous = PgProjectSync._tails.get(projectId);
    let finish!: () => void;
    // Resolves whatever the task does, so a failure cannot wedge the chain
    const tail = new Promise<void>((resolve) => (finish = resolve));
    PgProjectSync._tails.set(projectId, tail);
    PgProjectSync._merging.set(
      projectId,
      (PgProjectSync._merging.get(projectId) ?? 0) + 1
    );

    try {
      if (previous) await previous;
      return await task(!!previous);
    } finally {
      const left = (PgProjectSync._merging.get(projectId) ?? 1) - 1;
      if (left) PgProjectSync._merging.set(projectId, left);
      else PgProjectSync._merging.delete(projectId);
      // Only the newest link is kept, and only while it is outstanding, so
      // the map holds at most one promise per project that is busy
      if (PgProjectSync._tails.get(projectId) === tail) {
        PgProjectSync._tails.delete(projectId);
      }
      finish();
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
          // everything that merged stays merged. Only the files the banner
          // named, too: the merge re-reads the server, and an answer about
          // `src/lib.rs` is not an answer about a file that has come to
          // overlap since.
          const outcome = await PgProjectSync.mergeWithServer(
            projectId,
            name,
            resolution === "keep-local" ? "local" : "server",
            PgProjectSync._conflicts.get(projectId)?.paths
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
    // Counted, not a single slot. Load, a tab coming back, and a merge each
    // hold for their own reasons and overlap freely; with one slot, whichever
    // finished first opened the gate for all of them -- a reconcile ending
    // mid-merge let the editor upload the pre-merge copy, and a merge ending
    // mid-reconcile did the same to the reconcile.
    if (PgProjectSync._holds++ > 0) return;
    PgProjectSync._gate = new Promise((resolve) => {
      PgProjectSync._release = resolve;
    });
  }

  /**
   * Give up one hold. Pushes go through once every holder has let go. A
   * release with no hold outstanding does nothing, so it cannot open a gate
   * someone else is holding.
   */
  static releasePushes() {
    if (!PgProjectSync._holds) return;
    if (--PgProjectSync._holds > 0) return;
    PgProjectSync._openGate();
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
    PgProjectSync._merging.clear();
    PgProjectSync._tails.clear();
    PgProjectSync._generations.clear();
    // Every hold at once: a reset is the one place that is allowed to
    PgProjectSync._holds = 0;
    PgProjectSync._openGate();
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
  private static _holds = 0;
  private static _signingOut = 0;

  private static readonly _names = new Map<string, string>();
  private static readonly _conflicts = new Map<string, Conflict>();
  private static readonly _conflictListeners = new Set<() => void>();
  /** Merges and adoptions running or queued, per project -- see `_exclusive` */
  private static readonly _merging = new Map<string, number>();
  /** The last queued merge or adoption per project, while any is outstanding */
  private static readonly _tails = new Map<string, Promise<void>>();
  /** Rewrites of each project's local files -- see `generationOf` */
  private static readonly _generations = new Map<string, number>();

  private static _openGate() {
    PgProjectSync._release?.();
    PgProjectSync._release = null;
    PgProjectSync._gate = Promise.resolve();
  }

  private static _generationOf(projectId: string) {
    return PgProjectSync._generations.get(projectId) ?? 0;
  }

  private static _bump(projectId: string) {
    PgProjectSync._generations.set(
      projectId,
      PgProjectSync._generationOf(projectId) + 1
    );
  }

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
 * Whether a local copy's user files are exactly what a mark says this device
 * last agreed with the server, under the name it is called now.
 *
 * Shared by reconcile and adoption, because adoption re-asks the question
 * reconcile decided on and the two must not disagree about the answer. A mark
 * from before per-file hashes answers it as a whole, through the one hash it
 * holds, and an empty hash -- marks older still -- matches no copy.
 */
export const isCleanAgainst = async (
  mark: SyncMark | LegacySyncMark | null,
  localName: string,
  files: Record<string, string>
): Promise<boolean> => {
  if (!mark || mark.name !== localName) return false;
  if ("legacy" in mark) {
    return (
      !!mark.contentHash &&
      mark.contentHash === (await legacyContentHash(files))
    );
  }
  return sameUserFiles(mark.files, await hashFiles({ files }));
};

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
