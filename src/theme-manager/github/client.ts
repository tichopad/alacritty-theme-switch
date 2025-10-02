import { ensureDir } from "@std/fs/ensure-dir";
import { basename, join } from "@std/path";
import { Result, ResultAsync } from "../../result.ts";
import type { FilePath, Theme } from "../types.ts";
import { unslugify } from "../utils.ts";
import {
  DirectoryCreateError,
  FileDownloadError,
  FileWriteError,
  GitHubApiError,
  type GitHubClientError,
  InvalidRepositoryUrlError,
} from "./errors.ts";

/**
 * Response from GitHub API for repository tree.
 */
interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: Array<{
    path: string;
    mode: string;
    type: "blob" | "tree";
    sha: string;
    size?: number;
    url: string;
  }>;
  truncated: boolean;
}

/**
 * Response from GitHub API for file contents.
 */
interface GitHubContentsResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: "file";
  content: string;
  encoding: "base64";
}

/**
 * Parsed repository information from a GitHub URL.
 */
interface RepositoryInfo {
  owner: string;
  repo: string;
}

/**
 * GitHub client for fetching Alacritty themes from a remote repository.
 *
 * This client provides methods to list and download TOML theme files from a GitHub repository.
 * It uses GitHub's REST API v3 and doesn't require authentication for public repositories.
 *
 * Note: This class is not exported directly. Use the `createGitHubClient` factory function
 * to create instances with proper error handling.
 *
 * @internal
 */
class GitHubClient {
  private readonly owner: string;
  private readonly repo: string;
  private readonly apiBaseUrl = "https://api.github.com";

  /**
   * Creates a new GitHub client for the specified repository.
   *
   * This constructor assumes that the owner and repo values are well-formed.
   * Use the `createGitHubClient` factory function for URL parsing and validation.
   *
   * @param owner - GitHub repository owner
   * @param repo - GitHub repository name
   *
   * @internal
   */
  constructor(owner: string, repo: string) {
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Lists all TOML theme files in the repository.
   *
   * This method fetches the repository tree recursively and filters for files
   * with a .toml extension. The returned themes have their path set to the
   * remote path in the repository.
   *
   * @returns A ResultAsync containing an array of themes or an error
   *
   * @example
   * ```typescript
   * const client = new GitHubClient("https://github.com/alacritty/alacritty-theme");
   * const result = await client.listThemes().toResult();
   *
   * if (result.isOk()) {
   *   result.data.forEach(theme => {
   *     console.log(`${theme.label}: ${theme.path}`);
   *   });
   * } else {
   *   console.error("Failed to list themes:", result.error);
   * }
   * ```
   */
  listThemes(): ResultAsync<Theme[], GitHubClientError> {
    const url =
      `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/git/trees/HEAD?recursive=1`;

    return this.fetchJson<GitHubTreeResponse>(url)
      .map((response) => {
        // Filter for TOML files only
        const tomlFiles = response.tree.filter(
          (item) => item.type === "blob" && item.path.endsWith(".toml"),
        );

        // Convert to Theme objects
        return tomlFiles.map((file): Theme => ({
          path: file.path,
          label: unslugify(basename(file.path)),
          isCurrentlyActive: null,
        }));
      });
  }

  /**
   * Downloads a single theme file from the repository to the specified output directory.
   *
   * The file will be saved with its original filename in the output directory.
   * If the output directory doesn't exist, it will be created.
   *
   * @param remotePath - Path to the theme file in the repository (e.g., "themes/monokai_pro.toml")
   * @param outputPath - Local directory path where the theme should be saved
   * @returns A ResultAsync containing the downloaded theme with local path or an error
   *
   * @example
   * ```typescript
   * const client = new GitHubClient("https://github.com/alacritty/alacritty-theme");
   * const result = await client.downloadTheme(
   *   "themes/monokai_pro.toml",
   *   "./my-themes"
   * ).toResult();
   *
   * if (result.isOk()) {
   *   console.log(`Downloaded theme to: ${result.data.path}`);
   * } else {
   *   console.error("Download failed:", result.error);
   * }
   * ```
   */
  downloadTheme(
    remotePath: string,
    outputPath: FilePath,
  ): ResultAsync<Theme, GitHubClientError> {
    const url =
      `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents/${remotePath}`;

    return this.ensureDirectory(outputPath)
      .flatMap(() => this.fetchJson<GitHubContentsResponse>(url))
      .flatMap((response) => {
        // Decode base64 content
        const content = atob(response.content);
        const filename = basename(remotePath);
        const localPath = join(outputPath, filename);

        // Write file to disk
        return ResultAsync.fromPromise(
          Deno.writeTextFile(localPath, content),
          (error) => new FileWriteError(localPath, { cause: error }),
        ).map((): Theme => ({
          path: localPath,
          label: unslugify(filename),
          isCurrentlyActive: null,
        }));
      });
  }

  /**
   * Downloads all TOML theme files from the repository to the specified output directory.
   *
   * This method first lists all themes in the repository, then downloads each one.
   * If the output directory doesn't exist, it will be created.
   *
   * @param outputPath - Local directory path where themes should be saved
   * @returns A ResultAsync containing an array of downloaded themes with local paths or an error
   *
   * @example
   * ```typescript
   * const client = new GitHubClient("https://github.com/alacritty/alacritty-theme");
   * const result = await client.downloadAllThemes("./my-themes").toResult();
   *
   * if (result.isOk()) {
   *   console.log(`Downloaded ${result.data.length} themes`);
   *   result.data.forEach(theme => {
   *     console.log(`  - ${theme.label}`);
   *   });
   * } else {
   *   console.error("Download failed:", result.error);
   * }
   * ```
   */
  downloadAllThemes(
    outputPath: FilePath,
  ): ResultAsync<Theme[], GitHubClientError> {
    return this.listThemes()
      .flatMap((themes) => {
        // Download all themes in parallel
        const downloadPromises = themes.map((theme) =>
          this.downloadTheme(theme.path, outputPath).toResult()
        );

        return ResultAsync.fromPromise(
          Promise.all(downloadPromises),
          (error) => new FileDownloadError("multiple files", { cause: error }),
        );
      })
      .flatMap((results) => {
        // Separate successful downloads from errors
        const errors = results.filter((r) => r.isErr());
        const themes = results.filter((r) => r.isOk()).map((r) => r.data);

        // If any downloads failed, return the first error
        if (errors.length > 0) {
          return ResultAsync.err(errors[0].error);
        }

        return ResultAsync.ok(themes);
      });
  }

  /**
   * Fetches JSON data from a URL using GitHub API.
   *
   * @template T - Expected response type
   * @param url - API endpoint URL
   * @returns A ResultAsync containing the parsed JSON response or an error
   */
  private fetchJson<T>(url: string): ResultAsync<T, GitHubClientError> {
    return ResultAsync.fromPromise(
      fetch(url, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "alacritty-theme-switch",
        },
      }),
      (error) => new GitHubApiError(url, { cause: error }),
    ).flatMap((response) => {
      if (!response.ok) {
        const err = new GitHubApiError(
          url,
          {
            cause: new Error(
              `HTTP ${response.status}: ${response.statusText}`,
            ),
          },
        );
        return ResultAsync.err(err);
      }
      return ResultAsync.fromPromise(
        response.json() as Promise<T>,
        (error) => new GitHubApiError(url, { cause: error }),
      );
    });
  }

  /**
   * Ensures that a directory exists, creating it if necessary.
   *
   * @param dirPath - Directory path to ensure
   * @returns A ResultAsync that resolves when the directory exists or an error
   */
  private ensureDirectory(
    dirPath: FilePath,
  ): ResultAsync<void, GitHubClientError> {
    return ResultAsync.fromPromise(
      ensureDir(dirPath),
      (error) => new DirectoryCreateError(dirPath, { cause: error }),
    );
  }
}

/**
 * Parses a GitHub repository URL to extract owner and repository name.
 *
 * Supports the following URL formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 *
 * @param url - GitHub repository URL
 * @returns Repository information or null if URL is invalid
 */
function parseRepositoryUrl(url: string): RepositoryInfo | null {
  // Handle HTTPS URLs
  const httpsMatch = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/,
  );
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2],
    };
  }

  // Handle SSH URLs
  const sshMatch = url.match(/^git@github\.com:([^/]+)\/(.+?)(\.git)?$/);
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
    };
  }

  return null;
}

/**
 * Creates a new GitHub client for the specified repository.
 *
 * This factory function parses the repository URL and returns a Result containing
 * either a GitHubClient instance or an error if the URL format is invalid.
 *
 * @param repositoryUrl - GitHub repository URL in one of the following formats:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo.git
 *   - git@github.com:owner/repo.git
 *
 * @returns A Result containing the GitHubClient instance or an InvalidRepositoryUrlError
 *
 * @example
 * ```typescript
 * import { createGitHubClient } from "./github/client.ts";
 *
 * const clientResult = createGitHubClient("https://github.com/alacritty/alacritty-theme");
 *
 * if (clientResult.isOk()) {
 *   const client = clientResult.data;
 *
 *   // List all themes in the repository
 *   const themesResult = await client.listThemes().toResult();
 *   if (themesResult.isOk()) {
 *     console.log(`Found ${themesResult.data.length} themes`);
 *   }
 * } else {
 *   console.error("Invalid repository URL:", clientResult.error);
 * }
 * ```
 */
export function createGitHubClient(
  repositoryUrl: string,
): Result<GitHubClient, InvalidRepositoryUrlError> {
  const repoInfo = parseRepositoryUrl(repositoryUrl);

  if (!repoInfo) {
    return Result.err(new InvalidRepositoryUrlError(repositoryUrl));
  }

  return Result.ok(new GitHubClient(repoInfo.owner, repoInfo.repo));
}
