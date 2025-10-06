/**
 * Module for defining custom error types for the theme manager.
 */

export class BackupError extends Error {
  readonly _tag = "BackupError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`Failed to create backup of ${path}.`, options);
    this.path = path;
  }
}

export class WriteError extends Error {
  readonly _tag = "WriteError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`Failed to write to ${path}.`, options);
    this.path = path;
  }
}

export class ThemeNotFoundError extends Error {
  readonly _tag = "ThemeNotFoundError";
  filename: string;
  constructor(filename: string, options?: ErrorOptions) {
    super(`Given selected theme ${filename} does not exist.`, options);
    this.filename = filename;
  }
}

export class ThemeNotTOMLError extends Error {
  readonly _tag = "ThemeNotTOMLError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`Given selected theme ${path} is not a TOML file.`, options);
    this.path = path;
  }
}

export class DirectoryIsFileError extends Error {
  readonly _tag = "DirectoryIsFileError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`Given themes directory ${path} is a file.`, options);
    this.path = path;
  }
}

export class DirectoryNotDirectoryError extends Error {
  readonly _tag = "DirectoryNotDirectoryError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`Given themes directory ${path} is not a directory.`, options);
    this.path = path;
  }
}

export class DirectoryNotAccessibleError extends Error {
  readonly _tag = "DirectoryNotAccessibleError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(
      `Given themes directory ${path} does not exist or is not readable.`,
      options,
    );
    this.path = path;
  }
}

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

export class FileNotFoundError extends Error {
  readonly _tag = "FileNotFoundError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`File ${path} not found.`, options);
    this.path = path;
  }
}

export class FileNotReadableError extends Error {
  readonly _tag = "FileNotReadableError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`File ${path} is not readable.`, options);
    this.path = path;
  }
}

export class FileNotTOMLError extends Error {
  readonly _tag = "FileNotTOMLError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`${path} is not a TOML file.`, options);
    this.path = path;
  }
}

export class FileIsDirectoryError extends Error {
  readonly _tag = "FileIsDirectoryError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`${path} is a directory.`, options);
    this.path = path;
  }
}

export class TomlParseError extends Error {
  readonly _tag = "TomlParseError";
  content: string;
  constructor(content: string, options?: ErrorOptions) {
    super(`Failed to parse TOML content.`, options);
    this.content = content;
  }
}

export type ParseConfigError =
  | FileNotFoundError
  | FileNotReadableError
  | FileNotTOMLError
  | FileIsDirectoryError;

export type CheckThemeExistsError =
  | ThemeNotFoundError
  | ThemeNotTOMLError
  | FileNotFoundError;

export type LoadThemesError =
  | DirectoryIsFileError
  | DirectoryNotDirectoryError
  | DirectoryNotAccessibleError
  | NoThemesFoundError
  | FileNotReadableError;
