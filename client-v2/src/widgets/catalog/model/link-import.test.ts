const { mockImportGist, mockGithubImport } = vi.hoisted(() => ({
  mockImportGist: vi.fn(),
  mockGithubImport: vi.fn(),
}));

vi.mock("@/features/gist", async () => {
  const url = await vi.importActual<typeof import("@/features/gist/lib/url")>(
    "@/features/gist/lib/url"
  );
  class GistImportError extends Error {
    constructor(readonly reason: string, message: string) {
      super(message);
    }
  }
  return {
    parseGistUrl: url.parseGistUrl,
    importGist: mockImportGist,
    GistImportError,
  };
});

vi.mock("@/utils", () => {
  class ImportCancelledError extends Error {}
  class GithubNotFoundError extends Error {
    readonly owner: string;
    readonly repo: string;
    constructor(given: { owner: string; repo: string; message: string }) {
      super(given.message);
      this.owner = given.owner;
      this.repo = given.repo;
    }
  }
  return {
    ImportCancelledError,
    GithubNotFoundError,
    PgGithub: {
      isValidUrl: (url: string) =>
        /^(https:\/\/?)?(www\.)?github\.com\/.+?\/.+/.test(url),
      import: mockGithubImport,
    },
  };
});

import { GistImportError } from "@/features/gist";
import { GithubNotFoundError, ImportCancelledError } from "@/utils";

import { BAD_LINK, importLink } from "./link-import";

const REPO = "https://github.com/alice/ts-client";
const GIST = "https://gist.github.com/alice/0123abcd";

beforeEach(() => {
  mockImportGist.mockReset().mockResolvedValue(undefined);
  mockGithubImport.mockReset().mockResolvedValue(undefined);
});

describe("importLink routes the link", () => {
  it("imports a repository link, trimmed", async () => {
    await expect(importLink(`  ${REPO} `)).resolves.toEqual({
      outcome: "imported",
      source: "github",
    });
    expect(mockGithubImport).toHaveBeenCalledWith(REPO);
    expect(mockImportGist).not.toHaveBeenCalled();
  });

  it("takes a repository link without its scheme", async () => {
    await expect(importLink("github.com/alice/ts-client")).resolves.toEqual({
      outcome: "imported",
      source: "github",
    });
  });

  it("sends a gist link to the gist import, from New project", async () => {
    await expect(importLink(GIST)).resolves.toEqual({
      outcome: "imported",
      source: "gist",
    });
    expect(mockImportGist).toHaveBeenCalledWith(GIST, "new-project");
    expect(mockGithubImport).not.toHaveBeenCalled();
  });

  it("refuses a link that is neither, before any import", async () => {
    await expect(importLink("https://gitlab.com/acme/escrow")).resolves.toEqual(
      {
        outcome: "failed",
        source: "unknown",
        reason: "bad-link",
        message: BAD_LINK,
      }
    );
    expect(BAD_LINK).toBe("This isn't a GitHub repo or gist link.");
    expect(mockGithubImport).not.toHaveBeenCalled();
    expect(mockImportGist).not.toHaveBeenCalled();
  });
});

describe("importLink says why an import failed", () => {
  const failWith = (error: unknown) =>
    mockGithubImport.mockRejectedValueOnce(error);

  it("calls a closed program picker a cancel", async () => {
    failWith(new ImportCancelledError());
    await expect(importLink(REPO)).resolves.toEqual({ outcome: "cancelled" });
  });

  it("says a repository GitHub cannot find may be private", async () => {
    const error = new GithubNotFoundError({
      owner: "acme",
      repo: "escrow-private",
      message: "not found",
    });
    failWith(error);
    await expect(importLink(REPO)).resolves.toEqual({
      outcome: "failed",
      source: "github",
      reason: "not-found",
      message:
        "Playground can't find acme/escrow-private on GitHub. It may be private, renamed or deleted.",
      error,
    });
  });

  it("keeps a gist import's own reason and message", async () => {
    mockImportGist.mockRejectedValueOnce(
      new GistImportError("rate-limited", "Gist limit.")
    );
    await expect(importLink(GIST)).resolves.toMatchObject({
      outcome: "failed",
      source: "gist",
      reason: "rate-limited",
      message: "Gist limit.",
    });
  });

  it.each([
    [
      "GitHub's hourly request limit for this browser has been reached. Please try again later.",
      "rate-limited",
    ],
    [
      'Repository "a/b" is too large to import because GitHub only returns part of its file list.',
      "too-large",
    ],
    ["No program code found in a/b.", "no-program"],
    [
      "This doesn't look like a Solana program. Playground opens Anchor, native Rust and Seahorse programs.",
      "no-program",
    ],
    ['GitHub request for "a/b" failed with status 500.', "request-failed"],
  ])("reads %s as %s, showing it as it is", async (message, reason) => {
    failWith(new Error(message));
    await expect(importLink(REPO)).resolves.toMatchObject({
      outcome: "failed",
      source: "github",
      reason,
      message,
    });
  });

  it("gives a throw that is not an Error a message of its own", async () => {
    failWith("boom");
    await expect(importLink(REPO)).resolves.toMatchObject({
      outcome: "failed",
      reason: "request-failed",
      message: "Could not import it.",
    });
  });
});
