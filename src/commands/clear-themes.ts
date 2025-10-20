import { errAsync, ResultAsync } from "neverthrow";
import { NoThemesFoundError } from "../theme-manager/errors.ts";
import {
  type FilePath,
  safeDeleteFile,
  safeWalkAll,
} from "../utils/fs-utils.ts";

/**
 * Options for the clear-themes command.
 */
export type ClearThemesOptions = {
  /** Local directory where themes are stored */
  themesPath: FilePath;
};

/**
 * Execute the clear-themes command.
 *
 * Deletes all .toml theme files from the themes directory.
 * Returns the original paths of all deleted files.
 *
 * @param options - Command options
 * @returns A ResultAsync containing the count of deleted files or an error
 */
export function clearThemesCommand(
  options: ClearThemesOptions,
) {
  return safeWalkAll(options.themesPath, {
    exts: ["toml"],
    includeFiles: true,
    includeDirs: false,
  })
    .andThen((entries) => {
      if (entries.length === 0) {
        return errAsync(new NoThemesFoundError(options.themesPath));
      }
      const deleteResults = entries.map((entry) => {
        return safeDeleteFile(entry.path).map(() => entry.path as FilePath);
      });
      return ResultAsync.combine(deleteResults);
    });
}
