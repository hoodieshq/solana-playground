// Public API of the slice: import from here, never from its internals.
// Shared by the export (HOO-1760) and the import (HOO-1761) of a gist.
export {
  fromGistFiles,
  GistFormatError,
  isExportablePath,
  MANIFEST_NAME,
  MAX_GIST_BYTES,
  MAX_GIST_FILES,
  measureGist,
  toGistFiles,
} from "./lib/format";
export type { GistFiles, GistFormatReason } from "./lib/format";
export { gistTelemetry } from "./model/telemetry";
export type { GistExportFailure } from "./model/telemetry";
