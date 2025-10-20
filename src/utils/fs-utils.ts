import { ensureDir } from "@std/fs/ensure-dir";
import { walk, type WalkEntry, type WalkOptions } from "@std/fs/walk";
import { fromPromise, type ResultAsync } from "neverthrow";
import {
  DirectoryNotAccessibleError,
  FileDeletionError,
  FileNotFoundError,
  WriteError,
} from "./fs-errors.ts";

/** Alias for a string representing a full file path */
export type FilePath = string;

/**
 * Safely walks a directory and returns all entries.
 *
 * @param root - Root directory to walk
 * @param options - Optional walk options
 * @returns A ResultAsync containing an array of all entries or an error
 */
export function safeWalkAll(
  root: string | URL,
  options?: WalkOptions,
): ResultAsync<WalkEntry[], DirectoryNotAccessibleError> {
  return fromPromise(
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
  return fromPromise(
    Deno.remove(path, options),
    (error) => new FileDeletionError(path, { cause: error }),
  );
}

/**
 * Safely ensures a directory exists, creating it if necessary.
 *
 * @param dirPath - Path to the directory
 * @returns A ResultAsync containing void or an error
 */
export function safeEnsureDir(
  dirPath: FilePath,
): ResultAsync<void, DirectoryNotAccessibleError> {
  return fromPromise(
    ensureDir(dirPath),
    (error) => new DirectoryNotAccessibleError(dirPath, { cause: error }),
  );
}

/**
 * Safely writes a file.
 *
 * @param path - Path to the file
 * @param content - Content to write to the file
 * @returns A ResultAsync containing void or an error
 */
export function safeWriteFile(
  path: FilePath,
  content: string,
): ResultAsync<void, WriteError> {
  return fromPromise(
    Deno.writeTextFile(path, content),
    (error) => new WriteError(path, { cause: error }),
  );
}

/**
 * Safely stats a file.
 *
 * @param path - Path to the file
 * @returns A ResultAsync containing the file stats or an error
 */
export function safeStat(
  path: FilePath,
): ResultAsync<Deno.FileInfo, FileNotFoundError> {
  return fromPromise(
    Deno.stat(path),
    (error) => new FileNotFoundError(path, { cause: error }),
  );
}
