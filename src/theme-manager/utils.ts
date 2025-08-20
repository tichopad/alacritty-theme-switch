/**
 * Transforms "slugified" TOML filenames to prettier format.
 * Removes special characters and only keeps alphanumeric characters and numbers.
 * E.g. `monokai_pro.toml` -> `Monokai Pro`
 */
export function unslugify(filename: string): string {
  return filename
    // Remove the .toml extension
    .replace(/\.toml$/, "")
    // Replace all non-alphanumeric characters with a space
    .replace(/[^a-zA-Z0-9]/g, " ")
    // Replace multiple spaces with a single space
    .replace(/\s+/g, " ")
    .trim()
    // Uppercase the first letter of each word
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Check if the given path is a TOML file.
 */
export function isToml(path: string): boolean {
  const extension = path.split(".").pop();
  return extension === "toml";
}
