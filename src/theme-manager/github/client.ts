import { basename, join } from "@std/path";
import {
  err,
  errAsync,
  fromPromise,
  fromSafePromise,
  ok,
  okAsync,
  Result,
  type ResultAsync,
} from "neverthrow";
import pMap from "p-map";
import {
  type FilePath,
  safeEnsureDir,
  safeWriteFile,
} from "../../utils/fs-utils.ts";
import { safeParseTomlContent } from "../../utils/toml-utils.ts";
import { Theme } from "../theme.ts";
import {
  FileDownloadError,
  GitHubApiError,
  InvalidRepositoryUrlError,
  NoLicenseFileFoundError,
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
 * It uses GitHub's REST API v3 for listing files, but downloads content directly from
 * raw.githubusercontent.com to avoid API rate limits.
 *
 * API rate limits (only applies to listing):
 * - Without authentication: 60 requests per hour
 * - With authentication: 5000 requests per hour
 *
 * Raw content downloads are not subject to API rate limits.
 *
 * Note: This class is not exported directly. Use the `createGitHubClient` factory function
 * to create instances with proper error handling.
 *
 * @internal
 */
class GitHubClient {
  readonly #owner: string;
  readonly #repo: string;
  readonly #ref: string;
  readonly #apiBaseUrl = "https://api.github.com";
  readonly #rawBaseUrl = "https://raw.githubusercontent.com";
  readonly #token?: string;

  /**
   * Creates a new GitHub client for the specified repository.
   *
   * This constructor assumes that the owner and repo values are well-formed.
   * Use the `createGitHubClient` factory function for URL parsing and validation.
   *
   * @param owner - GitHub repository owner
   * @param repo - GitHub repository name
   * @param ref - Git reference (branch, tag, or commit SHA) to use for downloads (default: "master")
   * @param token - Optional GitHub personal access token for authentication
   *
   * @internal
   */
  constructor(owner: string, repo: string, ref = "master", token?: string) {
    this.#owner = owner;
    this.#repo = repo;
    this.#ref = ref;
    this.#token = token;
  }

  /**
   * Lists all TOML theme files in the repository.
   *
   * This method fetches the repository tree recursively and filters for files
   * with a .toml extension. The returned themes have their path set to the
   * remote path in the repository.
   *
   * @returns A ResultAsync containing an array of themes or an error
   */
  listThemes() {
    const url =
      `${this.#apiBaseUrl}/repos/${this.#owner}/${this.#repo}/git/trees/HEAD?recursive=1`;

    return this.#fetchJson<GitHubTreeResponse>(url)
      .map((response) => {
        // Filter for TOML files only
        const tomlFiles = response.tree.filter(
          (item) => item.type === "blob" && item.path.endsWith(".toml"),
        );

        // Convert to Theme instances
        // Note: brightness defaults to "dark" since we haven't downloaded the files yet
        return tomlFiles.map((file) => new Theme(file.path, {}, null));
      });
  }

  /**
   * Downloads a single theme file from the repository to the specified output directory.
   *
   * This method fetches the file content directly from raw.githubusercontent.com,
   * which is not subject to GitHub API rate limits. The file will be saved with
   * its original filename in the output directory. If the output directory doesn't
   * exist, it will be created.
   *
   * @param remotePath - Path to the theme file in the repository (e.g., "themes/monokai_pro.toml")
   * @param outputPath - Local directory path where the theme should be saved
   * @returns A ResultAsync containing the downloaded theme with local path or an error
   *
   * @example
   * const client = new GitHubClient("https://github.com/alacritty/alacritty-theme");
   * const result = await client.downloadTheme(
   *   "themes/monokai_pro.toml",
   *   "./my-themes"
   * )
   *
   * if (result.isOk()) {
   *   console.log(`Downloaded theme to: ${result.data.path}`);
   * } else {
   *   console.error("Download failed:", result.error);
   * }
   */
  downloadTheme(
    remotePath: string,
    outputPath: FilePath,
  ) {
    // Construct raw content URL
    const repoUrl = `${this.#rawBaseUrl}/${this.#owner}/${this.#repo}/`;
    const url = new URL(`${repoUrl}/refs/heads/${this.#ref}/${remotePath}`);

    return safeEnsureDir(outputPath)
      .andThen(() => this.#fetchRawContent(url.toString()))
      .andThen((content) => {
        const filename = basename(remotePath);
        const localPath = join(outputPath, filename);

        return safeParseTomlContent(content)
          .asyncAndThen((themeContent) => {
            return safeWriteFile(localPath, content).map(() => {
              return new Theme(localPath, themeContent, null);
            });
          });
      });
  }

  /**
   * Downloads all TOML theme files from the repository to the specified output directory.
   *
   * This method downloads each theme file sequentially from raw.githubusercontent.com, which is not
   * subject to API rate limits. It also downloads the repository's LICENSE file to preserve
   * proper attribution, naming it uniquely to avoid conflicts when downloading from multiple
   * repositories.
   *
   * If the output directory doesn't exist, it will be created.
   *
   * @param themes - Array of themes to download (typically obtained from listThemes())
   * @param outputPath - Local directory path where themes should be saved
   * @param onProgress - Optional callback to report download progress
   * @returns A ResultAsync containing an array of downloaded themes with local paths or an error
   *
   * @example
   * ```typescript
   * const client = new GitHubClient("https://github.com/alacritty/alacritty-theme");
   * const themesResult = await client.listThemes()
   *
   * if (themesResult.isOk()) {
   *   const result = await client.downloadAllThemes(themesResult.data, "./my-themes")
   *
   *   if (result.isOk()) {
   *     console.log(`Downloaded ${result.data.length} themes`);
   *     result.data.forEach(theme => {
   *       console.log(`  - ${theme.label}`);
   *     });
   *   } else {
   *     console.error("Download failed:", result.error);
   *   }
   * }
   * ```
   *
   * @example With progress callback
   * ```typescript
   * const client = new GitHubClient("https://github.com/alacritty/alacritty-theme");
   * const themesResult = await client.listThemes()
   *
   * if (themesResult.isOk()) {
   *   const result = await client.downloadAllThemes(
   *     themesResult.data,
   *     "./my-themes",
   *     (current, total) => {
   *       console.log(`Progress: ${current}/${total}`);
   *     }
   *   )
   * }
   * ```
   */
  downloadAllThemes(
    themes: Theme[],
    outputPath: FilePath,
    onProgress?: (current: number, total: number) => void,
  ) {
    const downloadResultsPromises = pMap(
      themes,
      async (theme) => {
        const downloaded = await this.downloadTheme(theme.path, outputPath);
        onProgress?.(themes.indexOf(theme) + 1, themes.length);
        return downloaded;
      },
      { concurrency: 10 },
    );

    const downloadResult = fromSafePromise(downloadResultsPromises)
      .andThen((results) => Result.combine(results))
      .andThen((themes) => {
        return this.#downloadLicense(outputPath).map(() => themes); // Return themes
      });

    return downloadResult;
  }

  /**
   * Downloads the LICENSE file from the repository to the specified output directory.
   *
   * The LICENSE file is saved with a unique name based on the repository owner and name
   * to avoid conflicts when downloading themes from multiple repositories.
   * For example, the LICENSE from alacritty/alacritty-theme will be saved as
   * "LICENSE-alacritty-alacritty-theme".
   *
   * This method tries multiple common license file naming conventions in order:
   * - LICENSE
   * - LICENSE.md
   * - LICENSE.txt
   * - license
   * - license.md
   * - license.txt
   *
   * If none of these files exist in the repository, this method will silently succeed
   * without downloading anything, as some repositories may not have a LICENSE file
   * in the root directory.
   *
   * @param outputPath - Local directory path where the LICENSE should be saved
   * @returns A ResultAsync that resolves when the LICENSE is downloaded or an error
   *
   * @example
   * const client = new GitHubClient("https://github.com/alacritty/alacritty-theme");
   * const result = await client.downloadLicense("./my-themes");
   *
   * if (result.isOk()) {
   *   console.log("LICENSE file downloaded successfully");
   * } else {
   *   console.error("Failed to download LICENSE:", result.error);
   * }
   */
  #downloadLicense(
    outputPath: FilePath,
  ) {
    // Common license file naming conventions, in order of preference
    const licenseFilenames = [
      "LICENSE",
      "LICENSE.md",
      "LICENSE.txt",
      "license",
      "license.md",
      "license.txt",
    ];

    return safeEnsureDir(outputPath)
      .map(() =>
        this.#tryDownloadLicenseFilesSequentially(licenseFilenames, outputPath)
      )
      .andThen((result) => result);
  }

  /**
   * Helper method to try downloading license files sequentially using a loop.
   *
   * This method iterates through each filename in the array. If a download succeeds,
   * it returns Ok. If a 404 is encountered, it tries the next filename. Any other
   * error is propagated immediately.
   *
   * @param filenames - Array of license filenames to try
   * @param outputPath - Local directory path where the LICENSE should be saved
   * @returns A Promise<Result> that resolves when a LICENSE is downloaded or all attempts fail
   */
  async #tryDownloadLicenseFilesSequentially(
    filenames: string[],
    outputPath: FilePath,
  ) {
    for (const filename of filenames) {
      const result = await this.#tryDownloadLicenseFile(filename, outputPath);
      if (result.isOk()) {
        return result;
      }
    }
    return err(new NoLicenseFileFoundError());
  }

  /**
   * Attempts to download a single license file.
   *
   * @param remoteFilename - License filename to try (e.g., "LICENSE")
   * @param outputPath - Local directory path where the LICENSE should be saved
   * @returns A ResultAsync that resolves when the LICENSE is downloaded or an error
   */
  #tryDownloadLicenseFile(
    remoteFilename: string,
    outputPath: FilePath,
  ) {
    const repoUrl = `${this.#rawBaseUrl}/${this.#owner}/${this.#repo}/`;
    const url = new URL(`${repoUrl}/refs/heads/${this.#ref}/${remoteFilename}`);

    return this.#fetchRawContent(url.toString()).andThen((content) => {
      // Create a unique filename based on repository owner and name
      const uniqueFilename = `license_${this.#owner}-${this.#repo}.txt`;
      const localPath = join(outputPath, uniqueFilename);

      // Write LICENSE file to disk
      return safeWriteFile(localPath, content);
    });
  }

  /**
   * Fetches JSON data from a URL using GitHub API.
   *
   * @template T - Expected response type
   * @param url - API endpoint URL
   * @returns A ResultAsync containing the parsed JSON response or an error
   */
  #fetchJson<T>(url: string) {
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "alacritty-theme-switch",
    };

    // Add authentication token if available
    if (this.#token) {
      headers["Authorization"] = `Bearer ${this.#token}`;
    }

    return safeFetch(url, (error) => new GitHubApiError(url, { cause: error }))
      .map((response) => response.json() as Promise<T>); // TODO: Add parsing/validation!
  }

  /**
   * Fetches raw text content from a URL.
   *
   * This method is used to download files directly from raw.githubusercontent.com,
   * which bypasses GitHub API rate limits.
   *
   * @param url - Raw content URL
   * @returns A ResultAsync containing the text content or an error
   */
  #fetchRawContent(url: string) {
    return safeFetch(
      url,
      (error) => new FileDownloadError(url, { cause: error }),
    ).map((response) => response.text());
  }
}

/**
 * Fetches a URL and returns the response as a ResultAsync.
 *
 * @param url - URL to fetch
 * @param errorMapper - Function to map fetch errors to custom errors
 * @returns A ResultAsync containing the response or an error
 */
function safeFetch<TErr>(
  url: string,
  errorMapper: (error: unknown) => TErr,
): ResultAsync<Response, TErr> {
  return fromPromise(
    fetch(url),
    errorMapper,
  ).andThen((response) => {
    if (!response.ok) {
      const cause = new Error(
        `HTTP ${response.status}: ${response.statusText}`,
      );
      return errAsync(
        errorMapper(cause),
      );
    }
    return okAsync(response);
  });
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
 * The client will automatically use a GitHub token from the GITHUB_TOKEN environment
 * variable if available, which increases the API rate limit from 60 to 5000 requests/hour.
 * Note that only the listing operation uses the API; downloads fetch directly from
 * raw.githubusercontent.com and are not subject to rate limits.
 *
 * @param repositoryUrl - GitHub repository URL in one of the following formats:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo.git
 *   - git@github.com:owner/repo.git
 * @param ref - Git reference (branch, tag, or commit SHA) to use for downloads (default: "master")
 * @param token - Optional GitHub personal access token. If not provided, will check GITHUB_TOKEN env var
 *
 * @returns A Result containing the GitHubClient instance or an InvalidRepositoryUrlError
 *
 * @example
 * import { createGitHubClient } from "./github/client.ts";
 *
 * const clientResult = createGitHubClient("https://github.com/alacritty/alacritty-theme");
 *
 * if (clientResult.isOk()) {
 *   const client = clientResult.data;
 *
 *   // List all themes in the repository
 *   const themesResult = await client.listThemes()
 *   if (themesResult.isOk()) {
 *     console.log(`Found ${themesResult.data.length} themes`);
 *   }
 * } else {
 *   console.error("Invalid repository URL:", clientResult.error);
 * }
 */
export function createGitHubClient(
  repositoryUrl: string,
  ref = "master",
  token?: string,
): Result<GitHubClient, InvalidRepositoryUrlError> {
  const repoInfo = parseRepositoryUrl(repositoryUrl);

  if (!repoInfo) {
    return err(new InvalidRepositoryUrlError(repositoryUrl));
  }

  // Use provided token or fall back to GITHUB_TOKEN environment variable
  const authToken = token ?? Deno.env.get("GITHUB_TOKEN");

  return ok(
    new GitHubClient(repoInfo.owner, repoInfo.repo, ref, authToken),
  );
}
