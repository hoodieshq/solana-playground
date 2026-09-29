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

/** `path -> sha256` for every file in a snapshot */
export type FileHashes = Record<string, string>;

/**
 * Whether a path is something the user writes, as opposed to one of the
 * workspace files the app regenerates on every open.
 */
export const isUserFile = (path: string) =>
  !SYNCED_WORKSPACE_FILES.includes(path);

/**
 * Lowercase hex SHA-256 of a string's UTF-8 bytes.
 *
 * SHA-256, not a cheap rolling hash: reconcile decides whether to replace a
 * file, and a merge decides which lines to keep, by comparing these -- so a
 * collision is silent data loss rather than a skipped upload.
 *
 * `crypto.subtle` is available in every browser in a secure context, which
 * includes `localhost`; jsdom is the one environment without it and
 * `setupTests.ts` polyfills it there.
 */
export const sha256 = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Hash every file separately.
 *
 * Per file rather than per snapshot because every question sync asks is now
 * per file: which ones to upload, which ones changed on which side, and which
 * ones can be merged. It also retires the canonical-ordering workaround a
 * whole-snapshot hash needed, since `jsonb` reordered keys.
 */
export const hashFiles = async (snapshot: Snapshot): Promise<FileHashes> => {
  const entries = Object.entries(snapshot.files ?? {});
  const hashes = await Promise.all(
    entries.map(([, content]) => sha256(content))
  );
  return Object.fromEntries(entries.map(([path], i) => [path, hashes[i]]));
};

/** What `next` changed or added, and what it removed, relative to `base` */
export const diffFiles = (base: FileHashes, next: FileHashes) => ({
  changed: Object.keys(next)
    .filter((path) => next[path] !== base[path])
    .sort(),
  removed: Object.keys(base)
    .filter((path) => !(path in next))
    .sort(),
});

/**
 * Whether two copies hold the same *user* files.
 *
 * The generated workspace files are left out: `PgProgramInfo` rewrites the
 * keypair file every time a workspace opens, so including them made a device
 * that had just adopted another's copy differ from it within a second, and
 * the next reconcile read that as local work.
 */
export const sameUserFiles = (a: FileHashes, b: FileHashes) => {
  const paths = Object.keys(a).filter(isUserFile);
  return (
    paths.length === Object.keys(b).filter(isUserFile).length &&
    paths.every((path) => a[path] === b[path])
  );
};

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
