/**
 * Error thrown when creating a backup fails.
 */
export class BackupError extends Error {
  readonly _tag = "BackupError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`Failed to create backup of ${path}.`, options);
    this.path = path;
  }
}

/**
 * Error thrown when a theme is not found.
 */
export class ThemeNotFoundError extends Error {
  readonly _tag = "ThemeNotFoundError";
  filename: string;
  constructor(filename: string, options?: ErrorOptions) {
    super(`Given selected theme ${filename} does not exist.`, options);
    this.filename = filename;
  }
}

/**
 * Error thrown when a theme is not a TOML file.
 */
export class ThemeNotTOMLError extends Error {
  readonly _tag = "ThemeNotTOMLError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`Given selected theme ${path} is not a TOML file.`, options);
    this.path = path;
  }
}

/**
 * Error thrown when no themes are found in a directory.
 */
export class NoThemesFoundError extends Error {
  readonly _tag = "NoThemesFoundError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(
      `Given themes directory ${path} does not contain any TOML files.`,
      options,
    );
    this.path = path;
  }
}
