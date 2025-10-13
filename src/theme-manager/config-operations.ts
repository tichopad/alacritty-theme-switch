import { copy } from "@std/fs/copy";
import { stringify } from "@std/toml/stringify";
import {
  DirectoryIsFileError,
  DirectoryNotAccessibleError,
  DirectoryNotDirectoryError,
  FileIsDirectoryError,
  FileNotFoundError,
  FileNotReadableError,
  FileNotTOMLError,
} from "../errors/file-and-dir-errors.ts";
import { ResultAsync } from "../no-exceptions/result-async.ts";
import { safeWalkAll } from "../utils.ts";
import {
  BackupError,
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

type LoadThemesOutput = ResultAsync<
  Theme[],
  LoadThemesError | FileNotReadableError[]
>;
/**
 * Discovers and loads all TOML theme files from the specified directory.
 * Detects the brightness (light/dark) of each theme by parsing its content.
 *
 * If any theme file cannot be read or parsed, the entire operation fails with
 * an error indicating which file caused the problem.
 */
export function loadThemes(themeDirPath: FilePath): LoadThemesOutput {
  return validateDir(themeDirPath)
    .flatMap(() => {
      const entriesResult = safeWalkAll(themeDirPath, {
        exts: ["toml"],
        includeFiles: true,
        includeDirs: false,
      });
      return entriesResult.flatMap((entries): LoadThemesOutput => {
        if (entries.length === 0) {
          return ResultAsync.err(new NoThemesFoundError(themeDirPath));
        }

        const themeResults = entries.map((entry) => {
          return safeParseToml(entry.path).map((themeContent) =>
            new Theme(entry.path, themeContent, null)
          );
        });

        return ResultAsync.allSettled(themeResults);
      });
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
