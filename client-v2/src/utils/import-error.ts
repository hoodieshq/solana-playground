// Dependency-free, like `server-error.ts`: a slice reads these without
// booting the `utils` barrel.

/** What `exportWorkspace` throws when it cannot tell a project's framework */
export const UNKNOWN_FRAMEWORK = "Could not identify framework";

/**
 * Whether an export failed only because the project's framework could not be
 * told: an expected outcome for a project of no known framework, which still
 * exports as is.
 *
 * @param error what the export threw
 * @returns whether it is that failure
 */
export const isUnknownFramework = (error: unknown) =>
  error instanceof Error && error.message === UNKNOWN_FRAMEWORK;

/** Why a GitHub import could not read the repository, as telemetry reports it */
export type GithubImportReason =
  | "not-found"
  | "rate-limited"
  | "too-large"
  | "no-source"
  | "other";

/**
 * A GitHub import failure with the reason telemetry reports; `message` is what
 * the user reads (spec `client-v2-project-files`, "Import failures carry an
 * enumerated reason")
 */
export class GithubImportError extends Error {
  constructor(message: string, readonly reason: GithubImportReason) {
    super(message);
    this.name = "GithubImportError";
  }
}

/** Why an import's files could not become a project, as telemetry reports it */
export type ConversionReason = "unsupported" | "no-source";

/**
 * An import refused or converted to nothing; `message` is what the user reads
 * (spec `client-v2-project-files`, "Import failures carry an enumerated
 * reason")
 */
export class ConversionError extends Error {
  constructor(message: string, readonly reason: ConversionReason) {
    super(message);
    this.name = "ConversionError";
  }
}
