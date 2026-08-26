import { PgExplorer, TupleFiles } from "./explorer";
import { PgFramework } from "./framework";
import { PgLanguage } from "./language";

/** Single entry of a Git tree */
type GithubTreeItem = {
  /** Path relative to the repository root */
  path: string;
  /** `blob` for files, `tree` for directories, `commit` for submodules */
  type: string;
  /** Object hash */
  sha: string;
  /** File size in bytes, only present for blobs */
  size?: number;
};

/** Response of the Git Trees API */
type GithubTree = {
  /** Tree entries, recursive when requested */
  tree: GithubTreeItem[];
  /** Whether GitHub left entries out because the tree is too large */
  truncated: boolean;
};

/** Maximum amount of file contents to download at the same time */
const MAX_PARALLEL_DOWNLOADS = 8;

/**
 * Get the repository files that are worth importing.
 *
 * @param tree recursive Git tree of the repository
 * @param path path to the program folder, empty for the repository root
 * @returns the blobs inside `path` written in a supported language
 */
export const filterRepoFiles = (tree: GithubTreeItem[], path: string) => {
  const prefix = path.replace(/^\/+|\/+$/g, "");
  return tree.filter((item) => {
    if (item.type !== "blob") return false;
    if (prefix && item.path !== prefix && !item.path.startsWith(prefix + "/")) {
      return false;
    }
    return !!PgLanguage.getFromPath(item.path);
  });
};

export class PgGithub {
  /**
   * Get whether the given URL is a GitHub URL.
   *
   * @param url URL to check
   * @returns whether the URL is a GitHub URL
   */
  static isValidUrl(url: string) {
    return /^(https:\/\/)?(www\.)?github\.com\/.+?\/.+/.test(url);
  }

  /**
   * Parse the given URL to get owner, repository name, ref, and path.
   *
   * @param url GitHub URL
   * @returns the parsed URL
   */
  static parseUrl(url: string) {
    // https://github.com/solana-labs/solana-program-library/tree/master/token/program
    const regex =
      /(https:\/\/)?(github\.com\/)([\w-]+)\/([\w-]+)(\/)?((tree|blob)\/([\w-.]+))?(\/)?([\w-/.]*)/;
    const res = regex.exec(url);
    if (!res) throw new Error("Invalid program url");

    const owner = res[3]; // solana-labs
    const repo = res[4]; // solana-program-library
    const ref = res.at(8); // master or `undefined` on root e.g. https://github.com/coral-xyz/xnft
    const path = res[10]; // token/program
    return { owner, repo, ref, path };
  }

  /**
   * Create a new workspace from the given GitHub URL.
   *
   * @param url GitHub URL
   */
  static async import(url: string) {
    // Check whether the repository already exists in user's workspaces
    const { owner, repo, path } = this.parseUrl(url);
    const githubWorkspaceName = `github-${owner}/${repo}/${path}`;

    if (PgExplorer.allWorkspaceNames?.includes(githubWorkspaceName)) {
      // Switch to the existing workspace
      await PgExplorer.switchWorkspace(githubWorkspaceName);
    } else {
      // Create a new workspace
      const convertedFiles = await this.getFiles(url);
      await PgExplorer.createWorkspace(githubWorkspaceName, {
        files: convertedFiles,
        skipNameValidation: true,
      });
    }
  }

  /**
   * Get the files from the given repository and map them to `TupleFiles`.
   *
   * @param url GitHub URL
   * @returns explorer files
   */
  static async getFiles(url: string) {
    const { files } = await this._getRepository(url);
    const convertedFiles = await PgFramework.convertToPlaygroundLayout(files);
    return convertedFiles;
  }

  /**
   * Get the repository files and map them to `TupleFiles`.
   *
   * The whole repository layout comes from a single Git Trees request, which
   * keeps the import within GitHub's unauthenticated rate limit of 60 requests
   * per hour. Walking the `contents` API one directory at a time used to spend
   * that budget on a single import and then fail for the rest of the hour.
   *
   * @param url Github link to the program's folder in the repository
   * @returns files, owner, repo, path
   */
  private static async _getRepository(url: string) {
    const { owner, repo, ref, path } = this.parseUrl(url);
    const treeRef = ref ?? "HEAD";

    const tree = await this._getTree(owner, repo, treeRef);
    if (tree.truncated) {
      throw new Error(
        `Repository "${owner}/${repo}" is too large to import because GitHub ` +
          "only returns part of its file list."
      );
    }

    const items = filterRepoFiles(tree.tree, path);
    if (!items.length) {
      const location = path ? `"${path}" in ` : "";
      throw new Error(
        `No source files found in ${location}"${owner}/${repo}".`
      );
    }

    const files = await this._getFileContents(owner, repo, treeRef, items);
    return { files, owner, repo, path };
  }

  /**
   * Get the recursive Git tree of the given repository.
   *
   * @param owner repository owner
   * @param repo repository name
   * @param ref branch, tag or commit
   * @returns the Git tree
   */
  private static async _getTree(owner: string, repo: string, ref: string) {
    const url =
      `https://api.github.com/repos/${owner}/${repo}/git/trees/` +
      `${encodeURIComponent(ref)}?recursive=1`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(this._getErrorMessage(response, `${owner}/${repo}`));
    }

    return (await response.json()) as GithubTree;
  }

  /**
   * Download the contents of the given tree entries.
   *
   * Contents come from `raw.githubusercontent.com`, which is not part of the
   * API rate limit. Downloads run in parallel but the returned order matches
   * the given entries.
   *
   * @param owner repository owner
   * @param repo repository name
   * @param ref branch, tag or commit
   * @param items tree entries to download
   * @returns explorer files
   */
  private static async _getFileContents(
    owner: string,
    repo: string,
    ref: string,
    items: GithubTreeItem[]
  ) {
    const files: TupleFiles = new Array(items.length);
    let nextIndex = 0;

    const download = async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        const { path } = items[index];
        files[index] = [path, await this._getFile(owner, repo, ref, path)];
      }
    };

    const parallelCount = Math.min(MAX_PARALLEL_DOWNLOADS, items.length);
    await Promise.all(Array.from({ length: parallelCount }, download));

    return files;
  }

  /**
   * Download a single file from `raw.githubusercontent.com`.
   *
   * @param owner repository owner
   * @param repo repository name
   * @param ref branch, tag or commit
   * @param path file path relative to the repository root
   * @returns the file content
   */
  private static async _getFile(
    owner: string,
    repo: string,
    ref: string,
    path: string
  ) {
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/` +
        `${encodeURIComponent(ref)}/${encodedPath}`
    );
    if (!response.ok) {
      throw new Error(this._getErrorMessage(response, path));
    }

    return await response.text();
  }

  /**
   * Turn a failed response into a message that explains what to do next.
   *
   * @param response failed response
   * @param subject repository or file the request was about
   * @returns the error message
   */
  private static _getErrorMessage(response: Response, subject: string) {
    switch (response.status) {
      case 403:
      case 429:
        if (response.headers.get("x-ratelimit-remaining") === "0") {
          return (
            "GitHub's hourly request limit for this browser has been " +
            "reached. Please try again later."
          );
        }
        return `GitHub refused the request for "${subject}".`;

      case 404:
        return (
          `"${subject}" was not found on GitHub. It may be private or the ` +
          "link may be out of date."
        );

      default:
        return (
          `GitHub request for "${subject}" failed with status ` +
          `${response.status}.`
        );
    }
  }
}
