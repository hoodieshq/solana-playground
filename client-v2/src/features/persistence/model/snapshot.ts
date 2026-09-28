// Deep import, not the `utils` barrel: the barrel reaches `settings.ts`,
// which reads a webpack-defined global that does not exist under jest, so
// importing it here would make this module untestable. Same reason
// `chat-storage.ts` reaches for `utils/explorer/fs` directly.
import { PgFs } from "../../../utils/explorer/fs";

/**
 * Workspace files that travel with the code.
 *
 * `program-info.json` carries the program keypair. Syncing it is deliberate:
 * without it the same project deploys to a different address on every device,
 * which is the thing users notice. This is a playground, the keys are
 * playground keys, and the UI says so. The two tutorial files are what let a
 * lesson resume on another device at the page it was left on, rather than at
 * the beginning.
 *
 * `.workspace/metadata.json` -- the open tabs and cursor positions -- is
 * deliberately *not* here. It is rewritten every time a project is opened, so
 * syncing it would make merely looking at a project a change the other device
 * has to reconcile, and two idle browsers would trade conflicts over where the
 * caret was.
 */
export const SYNCED_WORKSPACE_FILES = [
  ".workspace/program-info.json",
  ".workspace/tutorial-storage.json",
  ".tutorial.json",
];

/**
 * Whether a full path is one of the workspace files the snapshot carries.
 *
 * All three are written straight to the store rather than through the
 * explorer's state, so no explorer event fires for them and nothing would
 * otherwise schedule an upload -- the tutorial page you left off on, and the
 * keypair that decides the program's address, reached the server only if some
 * unrelated edit happened to trigger a push afterwards.
 *
 * Matched on the suffix because the prefix is the workspace name, which is
 * whatever the user called the project.
 */
export const isSyncedWorkspaceFile = (path: string) =>
  SYNCED_WORKSPACE_FILES.some((synced) => path.endsWith(`/${synced}`));

/** Keep user files and the named workspace files; drop everything else */
export const filterSnapshotPaths = (paths: readonly string[]) =>
  paths.filter(
    (path) =>
      SYNCED_WORKSPACE_FILES.includes(path) || !path.startsWith(".workspace/")
  );

/** One project, as it is stored */
export interface Snapshot {
  files: Record<string, string>;
}

/**
 * Serialize a workspace off the store.
 *
 * A directory that is not there reads as empty rather than throwing: a
 * workspace registered before its files landed is a real state, and it should
 * reconcile as "nothing here" rather than abort the pass.
 */
export const buildSnapshotOf = async (name: string): Promise<Snapshot> => {
  const root = `/${name}`;
  const files: Record<string, string> = {};

  const walk = async (dir: string) => {
    let names: string[];
    try {
      names = await PgFs.readDir(dir);
    } catch {
      return;
    }

    for (const child of names) {
      const path = `${dir}/${child}`;
      const metadata = await PgFs.getMetadata(path);
      if (metadata.isDirectory()) await walk(path);
      else files[path.slice(root.length + 1)] = await PgFs.readToString(path);
    }
  };

  await walk(root);

  const kept = filterSnapshotPaths(Object.keys(files));
  return {
    files: Object.fromEntries(kept.map((path) => [path, files[path]])),
  };
};

/**
 * Serialize a workspace, current or not, off the store.
 *
 * The current one used to come from memory, on the grounds that an unsaved
 * edit lives there. It does not stay there: autosave writes state and disk in
 * the same callback. What memory does hold, and disk does not, is a stale
 * copy -- tabs share the store but not each other's state, so a tab another
 * tab has written underneath would upload its old files over the new ones.
 */
export const snapshotOf = (name: string): Promise<Snapshot> =>
  buildSnapshotOf(name);

/**
 * Canonical bytes for a snapshot.
 *
 * Sorted by path, and an array of pairs rather than an object, because the
 * comparison this feeds crosses Postgres: `snapshot` is stored as `jsonb`,
 * which does not preserve key order (it orders keys by length, then bytewise).
 * Hashing `JSON.stringify(snapshot)` directly would therefore make a snapshot
 * that round-tripped through the server hash differently from the identical
 * one held here, and every reconcile would read as a change.
 */
const canonical = (snapshot: Snapshot) => {
  const files = snapshot.files ?? {};
  return JSON.stringify(
    Object.keys(files)
      .sort()
      .map((path) => [path, files[path]])
  );
};

/**
 * Identify a snapshot's contents.
 *
 * SHA-256, not a cheap rolling hash. This is no longer only "has anything
 * changed since the last upload" -- reconcile decides whether to *replace a
 * project's files* by comparing two of these, so a collision is silent data
 * loss rather than a skipped upload.
 *
 * `crypto.subtle` is available in every browser in a secure context, which
 * includes `localhost`; jsdom is the one environment without it and
 * `setupTests.ts` polyfills it there.
 */
export const hashSnapshot = async (snapshot: Snapshot): Promise<string> => {
  const bytes = new TextEncoder().encode(canonical(snapshot));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Identify only what the *user* wrote.
 *
 * The three workspace files travel with the project but nobody types them:
 * `PgProgramInfo` rewrites the keypair file every time a workspace opens, and
 * the tutorial files follow the reader around. They are generated state, and
 * they are regenerated on a schedule this module does not control.
 *
 * That makes them useless for the question `isClean` asks -- "does this device
 * hold work the server has not seen". Including them meant taking another
 * device's copy left the project differing from the snapshot it had just
 * adopted, within a second, through nothing the user did. The next reconcile
 * read that as local work, and when the other device had also moved on it
 * asked the user to choose between two copies differing by a file neither of
 * them wrote.
 *
 * They still sync: `hashSnapshot` covers the whole thing, and that is what
 * decides whether an upload is worth making.
 */
export const hashUserFiles = async (snapshot: Snapshot): Promise<string> => {
  const files = snapshot.files ?? {};
  return await hashSnapshot({
    files: Object.fromEntries(
      Object.keys(files)
        .filter((path) => !SYNCED_WORKSPACE_FILES.includes(path))
        .map((path) => [path, files[path]])
    ),
  });
};
