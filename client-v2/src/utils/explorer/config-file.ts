import { createLogger } from "../../shared/lib/logger";
import { PgFs } from "./fs";

const log = createLogger("explorer:config-file");

/**
 * Write a file the app keeps outside any workspace, under `/.config`, so that
 * a file it creates survives a reload.
 *
 * lightning-fs writes a file's content at once but saves its folder tree
 * 500 ms after the last write, so a reload inside that window loses a file
 * just created: its content is stored, and nothing points at it. `PgFs.flush`
 * saves the tree, but it rewrites the whole tree every time, so it runs only
 * when this write creates the file; a write to a file that exists changes
 * content only. Unlike `writeWorkspaceFile`, which remembers the paths it
 * flushed, this asks whether the file exists, because the stores that use it
 * also remove their files, and a removed file's next write creates it again.
 *
 * A failed flush is reported here and does not fail the write: the content
 * landed, only its survival of a reload in the next 500 ms is at risk.
 *
 * @param path full path of the file
 * @param data file content
 */
export const writeConfigFile = async (path: string, data: string) => {
  // Both started in this tick, so the write keeps its place among the writes
  // callers start without awaiting (`PgThreadIndex._mint`), and the check,
  // queued first, still sees the file as it was
  const [existed] = await Promise.all([
    PgFs.exists(path),
    PgFs.writeFile(path, data, { createParents: true }),
  ]);
  if (existed) return;
  try {
    await PgFs.flush();
  } catch (e) {
    log.error(e, { report: true });
  }
};
