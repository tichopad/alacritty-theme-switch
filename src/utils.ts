import { walk, type WalkOptions } from "@std/fs/walk";
import {
  DirectoryNotAccessibleError,
  FileDeletionError,
} from "./errors/file-and-dir-errors.ts";
import { ResultAsync } from "./no-exceptions/result-async.ts";

/**
 * Safely walks a directory and returns all entries.
 *
 * @param root - Root directory to walk
 * @param options - Optional walk options
 * @returns A ResultAsync containing an array of all entries or an error
 */
export function safeWalkAll(root: string | URL, options?: WalkOptions) {
  return ResultAsync.fromPromise(
    Array.fromAsync(walk(root, options)),
    (error) => new DirectoryNotAccessibleError(root, { cause: error }),
  );
}

/**
 * Safely deletes a file.
 *
 * @param path - Path to the file
 * @param options - Optional remove options
 * @returns A ResultAsync containing void or an error
 */
export function safeDeleteFile(
  path: string,
  options?: Deno.RemoveOptions,
): ResultAsync<void, FileDeletionError> {
  return ResultAsync.fromPromise(
    Deno.remove(path, options),
    (error) => new FileDeletionError(path, { cause: error }),
  );
}
