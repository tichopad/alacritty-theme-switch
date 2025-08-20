import { copy } from "@std/fs/copy";
import { walk } from "@std/fs/walk";
import { parse } from "@std/toml/parse";
import { stringify } from "@std/toml/stringify";
import { Result, ResultAsync } from "../result.ts";
import {
  BackupError,
  DirectoryIsFileError,
  DirectoryNotAccessibleError,
  DirectoryNotDirectoryError,
  FileIsDirectoryError,
  FileNotFoundError,
  FileNotReadableError,
  FileNotTOMLError,
  type LoadThemesError,
  NoThemesFoundError,
  type ParseConfigError,
  ThemeNotFoundError,
  ThemeNotTOMLError,
  WriteError,
} from "./errors.ts";
import type { Config, FilePath, Theme } from "./types.ts";
import { isToml, unslugify } from "./utils.ts";

/**
 * Creates a backup copy of the configuration file.
 */
export function createBackup(configPath: string, backupPath: string) {
  return ResultAsync.fromPromise(
    copy(configPath, backupPath, { overwrite: true }).then(() => null),
    (error) => new BackupError(configPath, { cause: error }),
  );
}

/**
 * Writes the configuration to the specified file in a safe manner.
 */
export function writeConfigToFile(path: string, config: Config) {
  return ResultAsync.fromPromise(
    Deno.writeTextFile(path, stringify(config)),
    (error) => new WriteError(path, { cause: error }),
  );
}

/**
 * Parses an Alacritty configuration file from TOML format.
 */
export function parseConfig(configPath: FilePath) {
  if (!isToml(configPath)) {
    return ResultAsync.err(new FileNotTOMLError(configPath));
  }

  return validateFile(configPath).flatMap(
    (stat): ResultAsync<Config, ParseConfigError> => {
      if (stat.isDirectory) {
        return ResultAsync.err(new FileIsDirectoryError(configPath));
      }
      if (!stat.isFile) {
        return ResultAsync.err(new FileNotReadableError(configPath));
      }
      return safeParseToml(configPath);
    },
  );
}

/**
 * Validates that a theme with the given filename exists and is accessible.
 */
export function checkThemeExists(filename: string, allThemes: Theme[]) {
  const theme = allThemes.find((theme) => theme.path.endsWith(filename));

  if (theme === undefined) {
    return ResultAsync.err(new ThemeNotFoundError(filename));
  }

  if (!isToml(theme.path)) {
    return ResultAsync.err(new ThemeNotTOMLError(theme.path));
  }

  return validateFile(theme.path).map(() => theme);
}

/**
 * Discovers and loads all TOML theme files from the specified directory.
 */
export function loadThemes(themeDirPath: FilePath) {
  return validateDir(themeDirPath).flatMap(() => {
    return walkThemes(themeDirPath).flatMap((themes) => {
      if (themes.length === 0) {
        return Result.err(new NoThemesFoundError(themeDirPath));
      }

      const mappedThemes = themes.map((theme): Theme => ({
        path: theme.path,
        label: unslugify(theme.name),
        isCurrentlyActive: null,
      }));

      return Result.ok(mappedThemes);
    });
  });
}

/**
 * Safely reads and parses a TOML file.
 */
function safeParseToml(path: FilePath) {
  return ResultAsync.fromPromise(
    Deno.readTextFile(path).then(parse),
    (error) => new FileNotReadableError(path, { cause: error }),
  );
}

/**
 * Safely checks if a file exists and is accessible.
 */
function validateFile(filePath: FilePath) {
  const stat = ResultAsync.fromPromise(
    Deno.stat(filePath),
    (error) => new FileNotFoundError(filePath, { cause: error }),
  );
  return stat.flatMap((stat): ResultAsync<Deno.FileInfo, ParseConfigError> => {
    if (stat.isDirectory) {
      return ResultAsync.err(new FileIsDirectoryError(filePath));
    }
    if (!stat.isFile) {
      return ResultAsync.err(new FileNotReadableError(filePath));
    }
    return ResultAsync.ok(stat);
  });
}

/**
 * Safely checks if a directory exists and is accessible.
 */
function validateDir(dirPath: FilePath) {
  const stat = ResultAsync.fromPromise(
    Deno.stat(dirPath),
    (error) => new DirectoryNotAccessibleError(dirPath, { cause: error }),
  );
  return stat.flatMap((stat): ResultAsync<Deno.FileInfo, LoadThemesError> => {
    if (stat.isFile) {
      return ResultAsync.err(new DirectoryIsFileError(dirPath));
    }
    if (!stat.isDirectory) {
      return ResultAsync.err(new DirectoryNotDirectoryError(dirPath));
    }
    return ResultAsync.ok(stat);
  });
}

/**
 * Walks the theme directory and returns all theme TOML files.
 */
function walkThemes(themeDirPath: FilePath) {
  return ResultAsync.fromPromise(
    Array.fromAsync(walk(themeDirPath, { exts: ["toml"] })),
    (error) => new NoThemesFoundError(themeDirPath, { cause: error }),
  );
}
