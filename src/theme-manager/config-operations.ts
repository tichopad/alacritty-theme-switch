import { copy } from "@std/fs/copy";
import { dirname } from "@std/path/dirname";
import { errAsync, fromPromise, okAsync, type ResultAsync } from "neverthrow";
import type { Config, FilePath } from "../types.ts";
import { FileIsDirectoryError, FileNotTOMLError } from "../utils/fs-errors.ts";
import { safeEnsureDir, safeStat, safeWriteFile } from "../utils/fs-utils.ts";
import {
  isToml,
  safeParseToml,
  safeStringifyToml,
} from "../utils/toml-utils.ts";
import { BackupError } from "./errors.ts";

/**
 * Creates a backup copy of the configuration file.
 *
 * @param configPath - Path to the configuration file
 * @param backupPath - Path to the backup file
 * @returns A ResultAsync containing void or an error
 */
export function createBackup(
  configPath: string,
  backupPath: string,
): ResultAsync<void, BackupError> {
  return fromPromise(
    copy(configPath, backupPath, { overwrite: true }),
    (error) => new BackupError(configPath, { cause: error }),
  );
}

/**
 * Writes the configuration to the specified file in a safe manner.
 *
 * @param path - Path to the configuration file
 * @param config - Configuration to write
 * @returns A ResultAsync containing void or an error
 */
export function writeConfigToFile(path: string, config: Config) {
  return safeStringifyToml(config)
    .asyncAndThen((content) => safeWriteFile(path, content));
}

/**
 * Ensures the configuration file exists, creating it with minimal config if needed.
 *
 * @param configPath - Path to the configuration file
 * @returns A ResultAsync containing void or an error
 */
function ensureConfigFile(configPath: FilePath) {
  return safeStat(configPath)
    .orElse((error) => {
      if (error._tag === "FileNotFoundError") {
        const parentDir = dirname(configPath);
        const ensureDirResult = safeEnsureDir(parentDir);
        return ensureDirResult.andThen(() => {
          const minimalConfig: Config = {
            general: {
              import: [],
            },
          };
          return safeStringifyToml(minimalConfig)
            .asyncAndThen((content) => safeWriteFile(configPath, content));
        });
      }
      return errAsync(error);
    });
}

/**
 * Parses an Alacritty configuration file from TOML format.
 * Creates the file with minimal configuration if it doesn't exist.
 *
 * @param configPath - Path to the configuration file
 * @returns A ResultAsync containing the parsed configuration or an error
 */
export function parseConfig(
  configPath: FilePath,
) {
  //TODO: Should validate and return a Config type
  if (!isToml(configPath)) {
    return errAsync(new FileNotTOMLError(configPath));
  }

  return ensureConfigFile(configPath)
    .andThen(() => safeStat(configPath))
    .andThen((stat) => {
      return stat.isFile
        ? okAsync(stat)
        : errAsync(new FileIsDirectoryError(configPath));
    })
    .andThen(() => safeParseToml(configPath));
}
