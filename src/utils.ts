import { walk, type WalkOptions } from "@std/fs/walk";
import {
  DirectoryNotAccessibleError,
  FileDeletionError,
  FileNotFoundError,
  WriteError,
} from "./errors/file-and-dir-errors.ts";
import { ResultAsync } from "./no-exceptions/result-async.ts";
import type { FilePath } from "./types.ts";
import { ensureDir } from "@std/fs/ensure-dir";

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

/**
 * Safely ensures a directory exists, creating it if necessary.
 */
export function safeEnsureDir(dirPath: FilePath) {
  return ResultAsync.fromPromise(
    ensureDir(dirPath),
    (error) => new DirectoryNotAccessibleError(dirPath, { cause: error }),
  );
}

/**
 * Safely writes a file.
 */
export function safeWriteFile(path: FilePath, content: string) {
  return ResultAsync.fromPromise(
    Deno.writeTextFile(path, content),
    (error) => new WriteError(path, { cause: error }),
  );
}

/**
 * Safely stats a file.
 */
export function safeStat(path: FilePath) {
  return ResultAsync.fromPromise(
    Deno.stat(path),
    (error) => new FileNotFoundError(path, { cause: error }),
  );
}
