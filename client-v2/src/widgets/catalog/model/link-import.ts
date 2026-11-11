import { GistImportError, importGist, parseGistUrl } from "@/features/gist";
import type {
  LinkImport,
  LinkImportFailure,
  LinkSource,
} from "@/features/new-project";
import {
  GithubNotFoundError,
  ImportCancelledError,
  PgGithub,
} from "@/utils";

/** A link that is neither a GitHub repository nor a gist */
export const BAD_LINK = "This isn't a GitHub repo or gist link.";

/**
 * A repository GitHub answers 404 for: private and missing look the same
 * without an account, so the message names both (designers' spec 10)
 */
const notFound = (owner: string, repo: string) =>
  `Playground can't find ${owner}/${repo} on GitHub. It may be private, ` +
  "renamed or deleted.";

/** What a failure that carries no message of its own says */
const FALLBACK = "Could not import it.";

/**
 * `PgGithub`'s failures other than a 404 are plain errors; their reason is
 * read from the message's known shapes, for the events only. A copy change
 * there counts as `request-failed` and shows the user the same message.
 */
const REASONS: [RegExp, LinkImportFailure][] = [
  [/hourly request limit/, "rate-limited"],
  [/too large to import/, "too-large"],
  [/^No program code found/, "no-program"],
  [/doesn't look like a Solana program/, "no-program"],
];

const failed = (
  source: LinkSource,
  error: unknown
): Extract<LinkImport, { outcome: "failed" }> => {
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
    return {
      outcome: "failed",
      source,
      reason: error.reason,
      message: error.message,
      error,
    };
  }
  if (!(error instanceof Error)) {
    return {
      outcome: "failed",
      source,
      reason: "request-failed",
      message: FALLBACK,
      error,
    };
  }
  const reason =
    REASONS.find(([shape]) => shape.test(error.message))?.[1] ??
    "request-failed";
  return {
    outcome: "failed",
    source,
    reason,
    message: error.message || FALLBACK,
    error,
  };
};

/**
 * Import New project's link as the explorer's dialog does: a gist link to
 * the gist import (checked first, a gist page is on a GitHub host too), a
 * repository or folder link to `PgGithub.import`. A link that is neither is
 * refused before any request. Never throws: the outcome says how it ended.
 *
 * @param link the field's text
 * @returns how the import ended
 */
export const importLink = async (link: string): Promise<LinkImport> => {
  const url = link.trim();
  const source: LinkSource | undefined = parseGistUrl(url)
    ? "gist"
    : PgGithub.isValidUrl(url)
    ? "github"
    : undefined;
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
