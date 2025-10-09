/**
 * Clear themes command implementation.
 *
 * This module handles deleting all theme files from the local themes directory.
 */

import type {
  DirectoryNotAccessibleError,
  FileDeletionError,
} from "../errors/file-and-dir-errors.ts";
import { ResultAsync } from "../no-exceptions/result-async.ts";
import { NoThemesFoundError } from "../theme-manager/errors.ts";
import type { FilePath } from "../theme-manager/types.ts";
import { safeDeleteFile, safeWalkAll } from "../utils.ts";

/**
 * Options for the clear-themes command.
 */
export type ClearThemesOptions = {
  /** Local directory where themes are stored */
  themesPath: FilePath;
};

/** Type alias for the output of the clear-themes command. */
type ClearThemesOutput = ResultAsync<
  FilePath[],
  DirectoryNotAccessibleError | NoThemesFoundError | FileDeletionError[]
>;

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
 *   console.log(`Deleted ${result.data.length} theme(s)`);
 * } else {
 *   console.error("Clear failed:", result.error);
 * }
 * ```
 */
export function clearThemesCommand(
  options: ClearThemesOptions,
): ClearThemesOutput {
  return safeWalkAll(options.themesPath, {
    exts: ["toml"],
    includeFiles: true,
    includeDirs: false,
  }).flatMap(
    (
      entries,
    ): ClearThemesOutput => {
      // If no theme files found, return error
      if (entries.length === 0) {
        return ResultAsync.err(new NoThemesFoundError(options.themesPath));
      }

      const deleteResults = entries.map((entry) => {
        // Delete the file and return the path
        return safeDeleteFile(entry.path).map(() => entry.path as FilePath);
      });

      return ResultAsync.allSettled(deleteResults);
    },
  );
}
