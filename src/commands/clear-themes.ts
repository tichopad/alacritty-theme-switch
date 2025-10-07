/**
 * Clear themes command implementation.
 *
 * This module handles deleting all theme files from the local themes directory.
 */

import { walk } from "@std/fs/walk";
import { ResultAsync } from "../no-exceptions/result-async.ts";
import {
  DirectoryNotAccessibleError,
  NoThemesFoundError,
} from "../theme-manager/errors.ts";
import type { FilePath } from "../theme-manager/types.ts";

/**
 * Options for the clear-themes command.
 */
export type ClearThemesOptions = {
  /** Local directory where themes are stored */
  themesPath: FilePath;
};

/**
 * Error indicating that a theme file could not be deleted.
 */
export class ThemeDeletionError extends Error {
  readonly _tag = "ThemeDeletionError";
  path: string;
  constructor(path: string, options?: ErrorOptions) {
    super(`Failed to delete theme file ${path}.`, options);
    this.path = path;
  }
}

/**
 * Error types that can be returned by the clear-themes command.
 */
export type ClearThemesError =
  | DirectoryNotAccessibleError
  | NoThemesFoundError
  | ThemeDeletionError;

/**
 * Execute the clear-themes command.
 *
 * Deletes all .toml theme files from the themes directory.
 * Returns the number of files deleted.
 *
 * @param options - Command options
 * @returns A ResultAsync containing the count of deleted files or an error
 *
 * @example
 * ```typescript
 * const result = await clearThemesCommand({
 *   themesPath: "~/.config/alacritty/themes"
 * }).toResult();
 *
 * if (result.isOk()) {
 *   console.log(`Deleted ${result.data} theme(s)`);
 * } else {
 *   console.error("Clear failed:", result.error);
 * }
 * ```
 */
export function clearThemesCommand(
  options: ClearThemesOptions,
): ResultAsync<number, ClearThemesError> {
  const { themesPath } = options;

  // Walk the directory to find all .toml files
  return ResultAsync.fromPromise(
    Array.fromAsync(walk(themesPath, { exts: ["toml"] })),
    (error) => {
      // All errors during directory walking are treated as directory not accessible
      return new DirectoryNotAccessibleError(themesPath, { cause: error });
    },
  ).flatMap(
    (entries): ResultAsync<number, NoThemesFoundError | ThemeDeletionError> => {
      // Filter to only include files (not directories)
      const themeFiles = entries.filter((entry) => entry.isFile);

      if (themeFiles.length === 0) {
        return ResultAsync.err(new NoThemesFoundError(themesPath));
      }

      // Delete all theme files
      return ResultAsync.fromPromise(
        (async () => {
          let deletedCount = 0;
          for (const entry of themeFiles) {
            const result = await safeDeleteFile(entry.path).toResult();
            if (result.isOk()) {
              deletedCount++;
            }
          }
          return deletedCount;
        })(),
        (error) => {
          if (error instanceof ThemeDeletionError) {
            return error;
          }
          // Fallback for unexpected errors
          return new ThemeDeletionError(themesPath, { cause: error });
        },
      );
    },
  );
}

function safeDeleteFile(
  path: string,
): ResultAsync<void, ThemeDeletionError> {
  return ResultAsync.fromPromise(
    Deno.remove(path),
    (error) => new ThemeDeletionError(path, { cause: error }),
  );
}
