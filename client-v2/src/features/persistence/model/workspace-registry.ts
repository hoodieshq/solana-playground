import { isMissing, report } from "./diagnostics";
// Deep imports, not the `utils` barrel, for the reason `snapshot.ts` gives
import { PgFs } from "../../../utils/explorer/fs";
import { PgWorkspace } from "../../../utils/explorer/workspace";

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
 * The list of workspaces as the store records it.
 *
 * Each tab holds its own copy in memory, re-read at the start of every
 * reload and whenever a neighbour writes it -- but a neighbour can still
 * rename or delete a workspace in the moment before this tab hears of it.
 * An upload has to ask the store, not memory, whether its workspace still
 * exists.
 */
export const PgWorkspaceRegistry = {
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
