import { copy } from "@std/fs/copy";
import { walk } from "@std/fs/walk";
import { stringify } from "@std/toml/stringify";
import { Result } from "../no-exceptions/result.ts";
import { ResultAsync } from "../no-exceptions/result-async.ts";
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
import { Theme } from "./theme.ts";
import type { Config, FilePath } from "./types.ts";
import { isToml, safeParseToml } from "./utils.ts";

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
 * Detects the brightness (light/dark) of each theme by parsing its content.
 *
 * If any theme file cannot be read or parsed, the entire operation fails with
 * an error indicating which file caused the problem.
 */
export function loadThemes(themeDirPath: FilePath) {
  return validateDir(themeDirPath).flatMap(() => {
    return walkThemes(themeDirPath).flatMap(
      async (themes): Promise<Result<Theme[], LoadThemesError>> => {
        if (themes.length === 0) {
          return Result.err(new NoThemesFoundError(themeDirPath));
        }

        // Parse each theme file to create Theme instances
        const parseResults = await Promise.all(
          themes.map(async (theme) => {
            const parseResult = await safeParseToml(theme.path).toResult();
            return parseResult.map((themeContent) =>
              new Theme(theme.path, themeContent, null)
            );
          }),
        );

        // Check if any parsing failed - fail fast on first error
        const firstError = parseResults.find((result) => result.isErr());
        if (firstError?.isErr()) {
          return Result.err(firstError.error);
        }

        // All succeeded, extract the themes
        const themeInstances = parseResults
          .filter((result): result is Result<Theme, never> => result.isOk())
          .map((result) => result.data);

        return Result.ok(themeInstances);
      },
    );
  });
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
