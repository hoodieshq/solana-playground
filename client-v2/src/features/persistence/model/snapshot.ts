// Deep import, not the `utils` barrel: the barrel reaches `settings.ts`,
// which reads a webpack-defined global that does not exist under jest, so
// importing it here would make this module untestable. Same reason
// `chat-storage.ts` reaches for `utils/explorer/fs` directly.
import { PgExplorer } from "../../../utils/explorer/explorer";
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
 * Serialize the current workspace.
 *
 * Paths are stored relative to the project root, not absolute: the absolute
 * form embeds the workspace name, so a renamed or differently-named project on
 * another device would not match.
 */
export const buildSnapshot = async (): Promise<Snapshot> => {
  const tuples = PgExplorer.getAllFiles();
  const prefix = `/${PgExplorer.currentWorkspaceName}/`;
  const files: Record<string, string> = {};

  for (const [fullPath, content] of tuples) {
    const path = fullPath.startsWith(prefix)
      ? fullPath.slice(prefix.length)
      : fullPath.replace(/^\//, "");
    files[path] = content;
  }

  // Read off the store rather than the explorer, because the explorer does not
  // have them: `isItemNameValid` rejects any name starting with a dot, so
  // nothing under `.workspace/` -- nor `.tutorial.json` -- is ever in the
  // in-memory tree. Filtering for them alone therefore filtered a set they
  // were never in, and the program keypair and tutorial progress silently
  // stayed on whichever device made them.
  for (const path of SYNCED_WORKSPACE_FILES) {
    try {
      files[path] = await PgFs.readToString(prefix + path);
    } catch {
      // A project that has never been built has no keypair, and one that is
      // not a tutorial has no progress. Absent is the common case, not a fault.
    }
  }

  const kept = filterSnapshotPaths(Object.keys(files));
  return {
    files: Object.fromEntries(kept.map((path) => [path, files[path]])),
  };
};

/**
 * Serialize a workspace that is *not* the current one.
 *
 * `buildSnapshot` reads `PgExplorer.getAllFiles()`, which only ever holds the
 * current workspace -- so it cannot answer "does this other project still
 * match what the server has". Reconciling every project on load needs exactly
 * that, and the backing store is the only place the answer lives.
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
 * Serialize a workspace, current or not.
 *
 * The current one comes from memory, because that is what the user is looking
 * at and what an unsaved edit lives in; any other comes off the store.
 */
export const snapshotOf = async (name: string): Promise<Snapshot> =>
  name === PgExplorer.currentWorkspaceName
    ? await buildSnapshot()
    : await buildSnapshotOf(name);

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
