import { extname } from "@std/path/extname";
import { parse } from "@std/toml/parse";
import {
  fromPromise,
  fromThrowable,
  type Result,
  type ResultAsync,
} from "neverthrow";
import { FileNotReadableError } from "./fs-errors.ts";
import type { FilePath } from "./fs-utils.ts";
import { TomlParseError, TomlStringifyError } from "./toml-errors.ts";
import { stringify } from "@std/toml/stringify";

/**
 * Check if the given path is a TOML file.
 */
export function isToml(path: string): boolean {
  return extname(path) === ".toml";
}

/**
 * Safely parses TOML content from a string.
 *
 * @param content - TOML content as a string
 * @returns Result containing the parsed TOML object or a TomlParseError
 */
export function safeParseTomlContent(
  content: string,
): Result<Record<string, unknown>, TomlParseError> {
  const parseToml = fromThrowable(
    parse,
    (error) => new TomlParseError(content, { cause: error }),
  );
  return parseToml(content);
}

/**
 * Safely reads and parses a TOML file.
 *
 * @param path - Path to the TOML file
 * @returns ResultAsync containing the parsed TOML content or an error
 * ```
 */
export function safeParseToml(path: FilePath): ResultAsync<
  Record<string, unknown>,
  FileNotReadableError | TomlParseError
> {
  const readContent = fromPromise(
    Deno.readTextFile(path),
    (error) => new FileNotReadableError(path, { cause: error }),
  );

  return readContent.andThen((content) => safeParseTomlContent(content));
}

/**
 * Safely stringifies a TOML object.
 *
 * @param obj - TOML object to stringify
 * @returns Result containing the stringified TOML content or a TomlStringifyError
 */
export function safeStringifyToml(
  obj: Record<string, unknown>,
): Result<string, TomlStringifyError> {
  const stringifyToml = fromThrowable(
    stringify,
    (error) => new TomlStringifyError(obj, { cause: error }),
  );

  return stringifyToml(obj);
}
