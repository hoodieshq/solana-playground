import {
  ConversionError,
  GithubImportError,
  isUnknownFramework,
} from "@/utils/import-error";

import type { ImportReason } from "./telemetry";

/**
 * The reason an import or a GitHub link view reports for a failure, read from
 * the error's type, never from its message: a `GithubImportError` and a
 * `ConversionError` carry theirs; an export's unknown framework is
 * `unsupported`; a `TypeError`, which `fetch` throws when a request gets no
 * answer, is `network`; anything else is `other`.
 *
 * @param error what the import threw
 * @returns the reason telemetry sends
 */
export const importReasonOf = (error: unknown): ImportReason => {
  if (error instanceof GithubImportError) return error.reason;
  if (error instanceof ConversionError) return error.reason;
  if (isUnknownFramework(error)) return "unsupported";
  if (error instanceof TypeError) return "network";
  return "other";
};
