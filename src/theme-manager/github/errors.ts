/**
 * Error thrown when a repository URL format is invalid.
 */
export class InvalidRepositoryUrlError extends Error {
  readonly _tag = "InvalidRepositoryUrlError";
  url: string;

  constructor(url: string, options?: ErrorOptions) {
    super(
      `Invalid GitHub repository URL: ${url}. Expected format: https://github.com/owner/repo or git@github.com:owner/repo.git`,
      options,
    );
    this.url = url;
  }
}

/**
 * Error thrown when a GitHub API request fails.
 */
export class GitHubApiError extends Error {
  readonly _tag = "GitHubApiError";
  url: string;

  constructor(url: string, options?: ErrorOptions) {
    super(`GitHub API request failed: ${url}`, options);
    this.url = url;
  }
}

/**
 * Error thrown when downloading a file fails.
 */
export class FileDownloadError extends Error {
  readonly _tag = "FileDownloadError";
  path: string;

  constructor(path: string, options?: ErrorOptions) {
    super(`Failed to download file: ${path}`, options);
    this.path = path;
  }
}

/**
 * Error thrown when writing a downloaded file to disk fails.
 */
export class FileWriteError extends Error {
  readonly _tag = "FileWriteError";
  path: string;

  constructor(path: string, options?: ErrorOptions) {
    super(`Failed to write file: ${path}`, options);
    this.path = path;
  }
}

/**
 * Error thrown when a theme is not found in the repository.
 */
export class ThemeNotFoundInRepoError extends Error {
  readonly _tag = "ThemeNotFoundInRepoError";
  themePath: string;

  constructor(themePath: string, options?: ErrorOptions) {
    super(`Theme not found in repository: ${themePath}`, options);
    this.themePath = themePath;
  }
}

/**
 * Error thrown when no license file is found in the repository.
 */
export class NoLicenseFileFoundError extends Error {
  readonly _tag = "NoLicenseFileFoundError";

  constructor(options?: ErrorOptions) {
    super(`No license file found in repository`, options);
  }
}
