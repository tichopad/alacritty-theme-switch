/**
 * Error thrown when parsing TOML content fails.
 */
export class TomlParseError extends Error {
  readonly _tag = "TomlParseError";
  content: string;
  constructor(content: string, options?: ErrorOptions) {
    super(`Failed to parse TOML content.`, options);
    this.content = content;
  }
}

export class TomlStringifyError extends Error {
  readonly _tag = "TomlStringifyError";
  obj: Record<string, unknown>;
  constructor(obj: Record<string, unknown>, options?: ErrorOptions) {
    super(`Failed to stringify TOML object.`, options);
    this.obj = obj;
  }
}
