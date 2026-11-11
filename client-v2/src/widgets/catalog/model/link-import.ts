import { GistImportError, importGist, parseGistUrl } from "@/features/gist";
import type {
  LinkImport,
  LinkImportFailure,
  LinkSource,
} from "@/features/new-project";
import { IMPORT_FALLBACK } from "@/features/new-project";
import { GithubNotFoundError, ImportCancelledError, PgGithub } from "@/utils";

/** A link that is neither a GitHub repository nor a gist */
export const BAD_LINK = "This isn't a GitHub repo or gist link.";

/**
 * A repository GitHub answers 404 for: private and missing look the same
 * without an account, so the message names both (designers' spec 10)
 */
const notFound = (owner: string, repo: string) =>
  `Playground can't find ${owner}/${repo} on GitHub. It may be private, ` +
  "renamed or deleted.";

/**
 * A request that never got an answer: `fetch` rejects with a `TypeError`
 * whose message names the fetch, in each browser's words (Chrome "Failed to
 * fetch", Firefox "NetworkError when attempting to fetch resource", Safari
 * "Load failed"). Any other `TypeError` is a fault of ours.
 */
const isUnanswered = (error: unknown) =>
  error instanceof TypeError &&
  /fetch|network|load failed/i.test(error.message);

const UNREACHABLE =
  "Could not reach GitHub. Check the connection and try again.";

/** Every reason but a bad link, which never reaches an import */
type ImportFailure = Exclude<LinkImportFailure, "bad-link">;

/**
 * `PgGithub`'s failures other than a 404 are plain errors; their reason is
 * read from the message's known shapes, for the events and the log level
 * only. A copy change there counts as `unexpected` and shows the user the
 * same message.
 */
const REASONS: [RegExp, ImportFailure][] = [
  [/hourly request limit/, "rate-limited"],
  [/too large to import/, "too-large"],
  [/^No program code found/, "no-program"],
  [/doesn't look like a Solana program/, "no-program"],
  [/^GitHub refused the request/, "network"],
  [/^GitHub request for .+ failed with status/, "network"],
];

const failed = (
  source: LinkSource,
  error: unknown
): Extract<LinkImport, { source: LinkSource }> => {
  if (error instanceof GithubNotFoundError) {
    return {
      outcome: "failed",
      source,
      reason: "not-found",
      message: notFound(error.owner, error.repo),
      error,
    };
  }
  if (error instanceof GistImportError) {
    // The gist import reported its own faults already; what it calls a
    // failed request is GitHub's, which the user can only retry
    return {
      outcome: "failed",
      source,
      reason: error.reason === "request-failed" ? "network" : error.reason,
      message: error.message,
      error,
    };
  }
  if (isUnanswered(error)) {
    return {
      outcome: "failed",
      source,
      reason: "network",
      message: UNREACHABLE,
      error,
    };
  }
  if (!(error instanceof Error)) {
    return {
      outcome: "failed",
      source,
      reason: "unexpected",
      message: IMPORT_FALLBACK,
      error,
    };
  }
  const reason =
    REASONS.find(([shape]) => shape.test(error.message))?.[1] ?? "unexpected";
  return {
    outcome: "failed",
    source,
    reason,
    message: error.message || IMPORT_FALLBACK,
    error,
  };
};

/** Which import takes the link: a gist page is on a GitHub host too */
const sourceOf = (url: string): LinkSource | undefined => {
  if (parseGistUrl(url)) return "gist";
  if (PgGithub.isValidUrl(url)) return "github";
  return undefined;
};

/**
 * Import New project's link as the explorer's dialog does: a gist link
 * to the gist import, a repository or folder link to `PgGithub.import`. A
 * link that is neither is refused before any request. Never throws: the
 * outcome says how it ended.
 *
 * @param link the field's text
 * @returns how the import ended
 */
export const importLink = async (link: string): Promise<LinkImport> => {
  const url = link.trim();
  const source = sourceOf(url);
  if (!source) {
    return {
      outcome: "failed",
      source: "unknown",
      reason: "bad-link",
      message: BAD_LINK,
    };
  }

  try {
    if (source === "gist") await importGist(url, "new-project");
    else await PgGithub.import(url);
  } catch (error) {
    if (error instanceof ImportCancelledError) return { outcome: "cancelled" };
    return failed(source, error);
  }
  return { outcome: "imported", source };
};
