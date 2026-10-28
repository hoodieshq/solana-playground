import { report } from "./diagnostics";
import { PgSyncMark } from "./sync-mark";
import type { SyncMark } from "./sync-mark";
import type { Disposable } from "../../../utils/types";

/**
 * Sync itself, loaded on first use. The slice's entry exports this module, and
 * `project-sync` subscribes to the explorer as it loads (`tab-reload`): a
 * static import would hand that to everything importing the entry for `report`
 */
const sync = () => import("./project-sync");
const snapshot = () => import("./snapshot");

/**
 * Where a project in the navigation says its work lives (Spec 02, "A row shows
 * a marker only when it is not in the account"): only here, or in the account
 * but behind this browser. No marker is the account holding what this browser
 * holds.
 */
export type SyncMarker = "this-browser" | "not-synced";

/** What sync already knows of one project, in the order reconcile asks it */
interface MarkerFacts {
  /** Signed in, not signing out, against a deployment with a database */
  available: boolean;
  /** A conflict waits on the person (`PgProjectSync.conflicts`) */
  conflict: boolean;
  /** This account has a mark for it, readable or not (`PgSyncMark.exists`) */
  hasMark: boolean;
  /** The mark, or `null` when it cannot be read */
  mark: SyncMark | null;
}

/**
 * The marker for a project, from what sync knows. `isClean` hashes the local
 * copy and is asked only when the mark is dirty, as reconcile's cheap path
 * does: `dirty` lets a clean project skip the hash, never decides on its own.
 */
const decide = async (
  facts: MarkerFacts,
  isClean: (mark: SyncMark | null) => Promise<boolean>
): Promise<SyncMarker | null> => {
  if (!facts.available) return null;
  if (facts.conflict) return "not-synced";
  if (!facts.hasMark) return "this-browser";
  if (facts.mark && !facts.mark.dirty) return null;
  // A mark that cannot be read is an agreement nobody can check: the account
  // has the project, and reconcile merges it against an empty base
  return (await isClean(facts.mark)) ? null : "not-synced";
};

/**
 * The marker for one project, read from the sync mark and the open conflicts,
 * never from state of its own. `null` while signed out or where sync is off:
 * the account row says that once, so the rows stay clean.
 *
 * @param localName the workspace's name here, which the mark's name is held to
 */
export const syncMarkerOf = async (
  projectId: string,
  localName: string
): Promise<SyncMarker | null> => {
  try {
    const { PgProjectSync, isCleanAgainst } = await sync();
    const available = await PgProjectSync.isAvailable();
    const hasMark = available && (await PgSyncMark.exists(projectId));
    return await decide(
      {
        available,
        conflict: !!PgProjectSync.conflictFor(projectId),
        hasMark,
        mark: hasMark ? await PgSyncMark.read(projectId) : null,
      },
      async (mark) => {
        const { snapshotOf } = await snapshot();
        return isCleanAgainst(
          mark,
          localName,
          (await snapshotOf(localName)).files
        );
      }
    );
  } catch (e) {
    // A marker is a hint on a row; a failed read leaves the row unmarked
    report(`sync marker ${projectId}`, e);
    return null;
  }
};

/**
 * Calls `cb` when a marker may have moved: a mark written or removed, a
 * conflict raised or settled, the network lost or back.
 *
 * A mark flagged dirty counts only while offline. Online, the editor uploads
 * within its debounce and the accepted mark that follows fires anyway, so the
 * open project would otherwise read "Not synced" for every pause in typing.
 */
export const onDidChangeSyncMarkers = (cb: () => void): Disposable => {
  let disposed = false;
  let conflicts: Disposable | null = null;
  const marks = PgSyncMark.onDidChange((_, change) => {
    if (change !== "dirtied" || !navigator.onLine) cb();
  });
  sync()
    .then(({ PgProjectSync }) => {
      if (!disposed) conflicts = PgProjectSync.onDidChangeConflicts(cb);
    })
    .catch((e) => report("sync markers: listen for conflicts", e));
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return {
    dispose: () => {
      disposed = true;
      marks.dispose();
      conflicts?.dispose();
      window.removeEventListener("online", cb);
      window.removeEventListener("offline", cb);
    },
  };
};

if (import.meta.vitest) {
  const { describe, it, expect, vi, afterEach, beforeAll } = import.meta.vitest;

  describe("features/persistence/model/sync-marker", () => {
    let PgProjectSync: typeof import("./project-sync").PgProjectSync;
    beforeAll(async () => {
      ({ PgProjectSync } = await sync());
    });
    afterEach(() => vi.restoreAllMocks());

    /** Every field named: an explicit copy, not a spread over a base */
    const facts = (fields: Partial<MarkerFacts>): MarkerFacts => ({
      available: fields.available ?? true,
      conflict: fields.conflict ?? false,
      hasMark: fields.hasMark ?? true,
      mark: fields.mark === undefined ? MARK : fields.mark,
    });
    const MARK: SyncMark = {
      files: { "/src/lib.rs": "h1" },
      name: "counter",
      updatedAt: "2026-10-29T00:00:00.000Z",
      dirty: false,
    };
    const DIRTY: SyncMark = {
      files: MARK.files,
      name: MARK.name,
      updatedAt: MARK.updatedAt,
      dirty: true,
    };
    const clean = (answer: boolean) => vi.fn(async () => answer);

    describe("decide", () => {
      it("marks nothing where sync is off or nobody is signed in", async () => {
        const isClean = clean(false);
        expect(
          await decide(facts({ available: false, conflict: true }), isClean)
        ).toBeNull();
        expect(isClean).not.toHaveBeenCalled();
      });

      it("says Not synced while a conflict waits, whatever the mark", async () => {
        expect(
          await decide(facts({ conflict: true, hasMark: false }), clean(true))
        ).toBe("not-synced");
      });

      it("says This browser for a project the account has no mark for", async () => {
        expect(
          await decide(facts({ hasMark: false, mark: null }), clean(true))
        ).toBe("this-browser");
      });

      it("trusts a clean mark without hashing the project", async () => {
        const isClean = clean(false);
        expect(await decide(facts({}), isClean)).toBeNull();
        expect(isClean).not.toHaveBeenCalled();
      });

      it("hashes a dirty mark's project and lets the hash decide", async () => {
        expect(await decide(facts({ mark: DIRTY }), clean(true))).toBeNull();
        expect(await decide(facts({ mark: DIRTY }), clean(false))).toBe(
          "not-synced"
        );
      });

      it("says Not synced for a mark that exists but cannot be read", async () => {
        expect(await decide(facts({ mark: null }), clean(false))).toBe(
          "not-synced"
        );
      });
    });

    describe("syncMarkerOf", () => {
      it("leaves the row unmarked when sync cannot be asked", async () => {
        vi.spyOn(PgProjectSync, "isAvailable").mockRejectedValue(
          new Error("probe failed")
        );
        expect(await syncMarkerOf("p1", "counter")).toBeNull();
      });

      it("reads This browser for a project with no mark", async () => {
        vi.spyOn(PgProjectSync, "isAvailable").mockResolvedValue(true);
        vi.spyOn(PgSyncMark, "exists").mockResolvedValue(false);
        expect(await syncMarkerOf("p1", "counter")).toBe("this-browser");
      });

      it("reads a clean mark as no marker", async () => {
        vi.spyOn(PgProjectSync, "isAvailable").mockResolvedValue(true);
        vi.spyOn(PgSyncMark, "exists").mockResolvedValue(true);
        vi.spyOn(PgSyncMark, "read").mockResolvedValue(MARK);
        expect(await syncMarkerOf("p1", "counter")).toBeNull();
      });
    });

    describe("onDidChangeSyncMarkers", () => {
      const listen = () => {
        let fire: (
          id: string,
          change: "written" | "dirtied" | "removed"
        ) => void = () => {};
        vi.spyOn(PgSyncMark, "onDidChange").mockImplementation((cb) => {
          fire = cb;
          return { dispose: () => {} };
        });
        const cb = vi.fn();
        const sub = onDidChangeSyncMarkers(cb);
        return {
          cb,
          sub,
          fire: (change: "written" | "dirtied" | "removed") =>
            fire("p1", change),
        };
      };

      it("re-reads on an accepted or removed mark, and on the network", () => {
        const { cb, sub, fire } = listen();
        fire("written");
        fire("removed");
        window.dispatchEvent(new Event("offline"));
        window.dispatchEvent(new Event("online"));
        expect(cb).toHaveBeenCalledTimes(4);
        sub.dispose();
        window.dispatchEvent(new Event("online"));
        expect(cb).toHaveBeenCalledTimes(4);
      });

      it("re-reads on a conflict raised or settled, once sync has loaded", async () => {
        const { cb, sub } = listen();
        // The subscription lands a task after the module's import settles
        await new Promise((resolve) => setTimeout(resolve, 0));
        PgProjectSync.raise({ projectId: "p1", kind: "deleted-elsewhere" });
        expect(cb).toHaveBeenCalledOnce();
        sub.dispose();
        PgProjectSync.reset();
      });

      it("listens to no conflict once disposed before sync loaded", async () => {
        const { cb, sub } = listen();
        sub.dispose();
        await new Promise((resolve) => setTimeout(resolve, 0));
        PgProjectSync.raise({ projectId: "p1", kind: "deleted-elsewhere" });
        expect(cb).not.toHaveBeenCalled();
        PgProjectSync.reset();
      });

      it("ignores a dirty flag while online, not while offline", () => {
        const { cb, sub, fire } = listen();
        vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
        fire("dirtied");
        expect(cb).not.toHaveBeenCalled();
        vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
        fire("dirtied");
        expect(cb).toHaveBeenCalledOnce();
        sub.dispose();
      });
    });
  });
}
