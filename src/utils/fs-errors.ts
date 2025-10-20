/**
 * Module for defining custom error types for file and directory operations.
 */

/**
 * Error thrown when a file is not found.
 */
export class FileNotFoundError extends Error {
  readonly _tag = "FileNotFoundError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`File ${path} not found.`, options);
    this.path = path;
  }
}

/**
 * Error thrown when a file is not readable.
 */
export class FileNotReadableError extends Error {
  readonly _tag = "FileNotReadableError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`File ${path} is not readable.`, options);
    this.path = path;
  }
}

/**
 * Error thrown when a file is not a TOML file.
 */
export class FileNotTOMLError extends Error {
  readonly _tag = "FileNotTOMLError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`${path} is not a TOML file.`, options);
    this.path = path;
  }
}

/**
 * Error thrown when a path is expected to be a file but is a directory.
 */
export class FileIsDirectoryError extends Error {
  readonly _tag = "FileIsDirectoryError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`${path} is a directory.`, options);
    this.path = path;
  }
}

/**
 * Error thrown when deleting a file fails.
 */
export class FileDeletionError extends Error {
  readonly _tag = "FileDeletionError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`Failed to delete file ${path}.`, options);
    this.path = path;
  }
}

/**
 * Error thrown when a path is expected to be a directory but is a file.
 */
export class DirectoryIsFileError extends Error {
  readonly _tag = "DirectoryIsFileError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`Given themes directory ${path} is a file.`, options);
    this.path = path;
  }
}

/**
 * Error thrown when a path is not a directory.
 */
export class DirectoryNotDirectoryError extends Error {
  readonly _tag = "DirectoryNotDirectoryError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`Given themes directory ${path} is not a directory.`, options);
    this.path = path;
  }
}

/**
 * Error thrown when a directory does not exist or is not accessible.
 */
export class DirectoryNotAccessibleError extends Error {
  readonly _tag = "DirectoryNotAccessibleError";
  path: string | URL;
  constructor(path: string | URL, options?: ErrorOptions) {
    super(
      `Given themes directory ${path} does not exist or is not readable.`,
      options,
    );
    this.path = path;
  }
}

/**
 * Error thrown when creating a directory fails.
 */
export class DirectoryCreateError extends Error {
  readonly _tag = "DirectoryCreateError";
  path: string;

  constructor(path: string, options?: ErrorOptions) {
    super(`Failed to create directory: ${path}`, options);
    this.path = path;
  }
}

/**
 * Error thrown when writing to a file fails.
 */
export class WriteError extends Error {
  readonly _tag = "WriteError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`Failed to write to ${path}.`, options);
    this.path = path;
  }
}
