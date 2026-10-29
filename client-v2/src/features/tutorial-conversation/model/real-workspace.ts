import type { Workspace } from "./ports";
import { applyFile } from "../../../utils/explorer/apply-file";
import { PgExplorer } from "../../../utils/explorer/explorer";

/**
 * The open workspace as the engine's `Workspace` port. A write goes through
 * `applyFile`, so the open editor shows it at once and its autosave does not
 * put the old text back.
 */
export const realWorkspace: Workspace = {
  async read(path) {
    return (
      PgExplorer.getFileContent(PgExplorer.convertToFullPath(path)) ?? null
    );
  },
  async write(path, content) {
    await applyFile(path, content);
  },
};
