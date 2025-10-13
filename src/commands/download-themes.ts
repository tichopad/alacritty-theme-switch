/**
 * Download themes command implementation.
 *
 * This module handles downloading Alacritty theme files from GitHub repositories
 * to the local themes directory.
 */

import {
  ProgressBar,
  type ProgressBarFormatter,
} from "@std/cli/unstable-progress-bar";
import { ResultAsync } from "../no-exceptions/result-async.ts";
import { createGitHubClient } from "../theme-manager/github/client.ts";
import type {
  GitHubClientError,
  InvalidRepositoryUrlError,
} from "../theme-manager/github/errors.ts";
import type { Theme } from "../theme-manager/theme.ts";
import type { FilePath } from "../theme-manager/types.ts";

/**
 * Options for the download-themes command.
 */
export type DownloadThemesOptions = {
  /** GitHub repository URL to download themes from */
  repositoryUrl: string;
  /** Local directory where themes should be saved */
  outputPath: FilePath;
  /** Git reference (branch, tag, or commit SHA) to download from (default: "master") */
  ref?: string;
};

/**
 * Error types that can be returned by the download-themes command.
 */
export type DownloadThemesError = InvalidRepositoryUrlError | GitHubClientError;

/**
 * Execute the download-themes command.
 *
 * Downloads all theme files from a GitHub repository to the local themes directory.
 * Uses the GitHubClient's downloadAllThemes method to download all TOML files sequentially.
 * Displays a progress bar to provide visual feedback during the download process.
 *
 * @param options - Command options
 * @returns A ResultAsync containing the downloaded themes or an error
 *
 * @example
 * ```typescript
 * const result = await downloadThemesCommand({
 *   repositoryUrl: "https://github.com/alacritty/alacritty-theme",
 *   outputPath: "~/.config/alacritty/themes",
 *   ref: "master"
 * }).toResult();
 *
 * if (result.isOk()) {
 *   console.log(`Downloaded ${result.data.length} themes`);
 * } else {
 *   console.error("Download failed:", result.error);
 * }
 * ```
 */
export function downloadThemesCommand(
  options: DownloadThemesOptions,
): ResultAsync<Theme[], DownloadThemesError> {
  const { repositoryUrl, outputPath, ref = "master" } = options;

  const gitHubClientResult = createGitHubClient(repositoryUrl, ref);
  if (gitHubClientResult.isErr()) {
    return ResultAsync.err(gitHubClientResult.error);
  }

  const gitHubClient = gitHubClientResult.data;

  // List all remote themes first
  const themesResult = gitHubClient.listThemes();
  const downloadThemesResult = themesResult.flatMap((themes) => {
    // Track progress
    const progressBar = new ProgressBar({
      max: themes.length,
      formatter: progressBarFormatter,
    });
    // Fetch themes
    return gitHubClient.downloadAllThemes(
      themes,
      outputPath,
      (current, _total) => {
        progressBar.value = current;
      },
    ).finally(() => {
      progressBar.stop();
    });
  });

  return downloadThemesResult;
}

/**
 * Custom progress bar formatter that displays file count instead of data size.
 *
 * @param formatter - The formatter object provided by ProgressBar
 * @returns Formatted progress bar string showing files downloaded
 *
 * @example
 * ```
 * [00:05] [####------] [4/10 files]
 * ```
 */
function progressBarFormatter(
  formatter: ProgressBarFormatter,
): string {
  return `[${formatter.styledTime}] [${formatter.progressBar}] [${formatter.value}/${formatter.max} files]`;
}
