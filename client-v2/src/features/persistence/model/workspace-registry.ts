import { report } from "./diagnostics";
// Deep imports, not the `utils` barrel, for the reason `snapshot.ts` gives
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgFs } from "../../../utils/explorer/fs";
import { PgWorkspace } from "../../../utils/explorer/workspace";

/** Same matching as `sync-mark`: ENOENT comes as a code or in the message */
const isMissing = (error: unknown) => {
  const e = error as { code?: string; message?: string };
  return e?.code === "ENOENT" || !!e?.message?.includes("ENOENT");
};

/**
 * The workspaces the store records, name to id.
 *
 * Read the way the explorer reads it, migration included, so a config still
 * in the pre-id shape compares as what the explorer made of it.
 *
 * @returns the map, or `null` when there is no config to read. That is not
 * evidence of anything -- a browser that has never initialized has none --
 * so callers treat it as "cannot tell", not as "nothing is registered".
 */
const onDisk = async (): Promise<Map<string, string> | null> => {
  let raw: string;
  try {
    raw = await PgFs.readToString(PgWorkspace.WORKSPACES_CONFIG_PATH);
  } catch (e) {
    if (!isMissing(e)) report("read workspace registry", e);
    return null;
  }

  try {
    const { workspaces } = PgWorkspace.migrate(JSON.parse(raw));
    return new Map(workspaces.map((w) => [w.name, w.id]));
  } catch (e) {
    report("parse workspace registry", e);
    return null;
  }
};

/**
 * The list of workspaces as this tab's explorer holds it.
 *
 * Each tab reads the registry once, when it loads, and writes its own copy
 * back on every switch. So a tab that re-opens a workspace after a neighbour
 * created, deleted or renamed one undoes that change on disk -- and a tab
 * whose workspace a neighbour renamed or deleted goes on believing it exists.
 * Neither can be fixed from here without changing the explorer; both can be
 * noticed, which is what this is for.
 */
export const PgWorkspaceRegistry = {
  /**
   * Whether the store's registry lists the same workspaces, under the same
   * ids, as this tab's memory. Which one is current is not compared: every
   * tab has its own, and the store holds whichever saved last.
   *
   * `true` when there is no registry to compare with.
   */
  async matchesMemory(): Promise<boolean> {
    const disk = await onDisk();
    if (!disk) return true;

    const names = PgExplorer.allWorkspaceNames ?? [];
    if (names.length !== disk.size) return false;
    return names.every(
      (name) => disk.get(name) === PgExplorer.workspaceIdOf(name)
    );
  },

  /**
   * Whether the store's registry still has `name` under `id`.
   *
   * `true` when there is no registry to ask.
   */
  async has(name: string, id: string): Promise<boolean> {
    const disk = await onDisk();
    return !disk || disk.get(name) === id;
  },
};
