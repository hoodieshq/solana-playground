import { report } from "./diagnostics";
import { PgSession } from "../../auth";
import { PgFs } from "../../../utils/explorer/fs";

/**
 * Whether an error just means "no such file".
 *
 * A project that has never synced has no mark, which is the ordinary case for
 * every project on a device that has just signed in. Same matching as
 * `chat-storage`: the browser filesystem surfaces it as a code and as a
 * message.
 */
const isMissing = (error: unknown) => {
  const e = error as { code?: string; message?: string };
  return e?.code === "ENOENT" || !!e?.message?.includes("ENOENT");
};

/** Alongside the chat threads, in the volume that already holds the code */
const ROOT = "/.config/sync";

const SUFFIX = ".json";

/**
 * Marks are per account, not per browser.
 *
 * A mark asserts "the server accepted exactly this from me, and the row stood
 * at this timestamp" -- a statement about one account, which says nothing
 * about the next one to sign in here. Sharing a directory would be actively
 * wrong for the case that makes it: a tutorial's id is *derived from its name*
 * and so is byte-identical across accounts, so the previous user's token would
 * be compared against the new user's row and refuse every push.
 *
 * Scoping by id rather than clearing on sign-out also means signing back in is
 * free: the agreements are still there, so nothing re-reconciles from scratch
 * and nothing is re-asked.
 */
const dirFor = (userId: string) => `${ROOT}/${encodeURIComponent(userId)}`;

/** Project ids carry a colon for tutorials, so the mapping has to be total */
const pathOf = (userId: string, projectId: string) =>
  `${dirFor(userId)}/${encodeURIComponent(projectId)}${SUFFIX}`;

const projectIdOf = (fileName: string) =>
  decodeURIComponent(fileName.slice(0, -SUFFIX.length));

/** Who the marks belong to, or `null` when nobody is signed in */
const currentUserId = () => PgSession.get()?.id ?? null;

/** What this device and the server last agreed on, for one project */
export interface SyncMark {
  /** `hashSnapshot` of the snapshot the server accepted */
  hash: string;
  /**
   * `hashUserFiles` of the same snapshot -- what the user actually wrote.
   *
   * This is the one reconcile decides on. `hash` covers the generated
   * workspace files too, which are rewritten on every open, so it answers
   * "is an upload worth making" rather than "does this device hold work".
   */
  contentHash: string;
  /**
   * The name it was stored under.
   *
   * Not everything worth uploading changes the snapshot: a rename sends new
   * `name` under identical bytes. Without this, "has anything changed" had to
   * fall back on `dirty`, which meant any write at all forced an upload --
   * including rewriting a workspace file with the content it already had,
   * which happens on every load.
   */
  name: string;
  /** The row's `updated_at` when it accepted it */
  updatedAt: string;
  /**
   * Set the moment an edit lands, cleared when a push succeeds.
   *
   * Strictly a hint -- `hash` is the truth, and reconcile re-hashes anything
   * flagged. It exists so the common case, a device where nothing has changed,
   * costs a handful of small reads instead of re-hashing every project's
   * contents on every reconcile.
   *
   * Set *before* the push is attempted rather than after it fails, so a tab
   * that is closed or crashes between the edit and the upload still reads as
   * dirty on the next load.
   */
  dirty: boolean;
}

/**
 * The high-water mark: what the server had, last time this device agreed.
 *
 * This is the one piece of sync state that has to outlive the page. Without
 * it, a browser that has just loaded cannot tell a local copy that is *behind*
 * the server from one that is *ahead* of it -- both are simply "different" --
 * and every reload has to guess. Guessing in favour of the server is what
 * silently destroyed work that never finished uploading.
 *
 * `PgFs` rather than `localStorage`: the origin's budget there is already
 * shared with `settings`, `wallet`, `theme` and `flow.deploys`, and this is one
 * more file next to the code it describes.
 *
 * Every method swallows its failures into `diagnostics`. A mark that cannot be
 * read is not a reason to take the panel down; it degrades to "never synced",
 * which reconcile handles.
 */
export class PgSyncMark {
  /** @returns the mark, or `null` when this project has never synced here */
  static async read(projectId: string): Promise<SyncMark | null> {
    const userId = currentUserId();
    if (!userId) return null;

    try {
      const raw = await PgFs.readToString(pathOf(userId, projectId));
      const parsed = JSON.parse(raw);
      if (
        typeof parsed?.hash !== "string" ||
        typeof parsed?.updatedAt !== "string"
      ) {
        report(`sync mark ${projectId}: malformed`, null);
        return null;
      }
      return {
        hash: parsed.hash,
        // Absent in marks written before the field existed. Empty matches no
        // snapshot, so the project is pushed once and the mark rewritten
        // complete, which is the same tolerance `name` gets.
        contentHash:
          typeof parsed.contentHash === "string" ? parsed.contentHash : "",
        // Absent in marks written before the field existed. Empty reads as
        // "not the name it is called now", so the project is pushed once and
        // the mark is rewritten complete.
        name: typeof parsed.name === "string" ? parsed.name : "",
        updatedAt: parsed.updatedAt,
        dirty: parsed.dirty === true,
      };
    } catch (e) {
      if (!isMissing(e)) report(`read sync mark ${projectId}`, e);
      return null;
    }
  }

  static async write(projectId: string, mark: SyncMark) {
    const userId = currentUserId();
    if (!userId) return;

    try {
      await PgFs.writeFile(pathOf(userId, projectId), JSON.stringify(mark), {
        createParents: true,
      });
    } catch (e) {
      report(`write sync mark ${projectId}`, e);
    }
  }

  /**
   * Note that this device has work the server has not seen.
   *
   * A project with no mark is already treated as unsynced, so there is nothing
   * to record for one -- writing a mark here would invent an agreement that
   * never happened.
   */
  static async markDirty(projectId: string) {
    const mark = await PgSyncMark.read(projectId);
    if (!mark || mark.dirty) return;
    await PgSyncMark.write(projectId, { ...mark, dirty: true });
  }

  static async remove(projectId: string) {
    const userId = currentUserId();
    if (!userId) return;

    try {
      await PgFs.removeFile(pathOf(userId, projectId));
    } catch (e) {
      if (!isMissing(e)) report(`remove sync mark ${projectId}`, e);
    }
  }

  /**
   * Every project this device has ever synced for the signed-in account.
   *
   * Reconcile needs this to spot the projects the server *no longer* lists: a
   * mark with no server row is a project deleted on another device, which is a
   * different thing from a project that was never uploaded.
   */
  static async projectIds(): Promise<string[]> {
    const userId = currentUserId();
    if (!userId) return [];

    try {
      const names = await PgFs.readDir(dirFor(userId));
      return names.filter((name) => name.endsWith(SUFFIX)).map(projectIdOf);
    } catch (e) {
      if (!isMissing(e)) report("list sync marks", e);
      return [];
    }
  }

  /**
   * Whether some *other* account on this browser has synced this project.
   *
   * Local workspaces are not account-scoped -- they predate accounts, and
   * signing out does not clear them -- so the next user to sign in here sees
   * the previous user's projects in the explorer. Handing those to the account
   * that happens to be signed in now would copy one person's work into
   * another's, and a mark under another user's id is the record that says
   * whose it was.
   *
   * A project with no mark anywhere is a different thing: made locally, never
   * synced by anyone, and so fair game for whoever signs in.
   */
  static async ownedByAnother(projectId: string): Promise<boolean> {
    const userId = currentUserId();

    try {
      for (const owner of await PgFs.readDir(ROOT)) {
        if (owner === (userId && encodeURIComponent(userId))) continue;
        if (await PgFs.exists(pathOf(decodeURIComponent(owner), projectId))) {
          return true;
        }
      }
      return false;
    } catch (e) {
      if (!isMissing(e)) report(`owners of ${projectId}`, e);
      return false;
    }
  }

  /** Drop this account's marks. Test seam, and a way out of a wedged state. */
  static async clear() {
    const userId = currentUserId();
    if (!userId) return;

    try {
      await PgFs.removeDir(dirFor(userId), { recursive: true });
    } catch (e) {
      if (!isMissing(e)) report("clear sync marks", e);
    }
  }
}
