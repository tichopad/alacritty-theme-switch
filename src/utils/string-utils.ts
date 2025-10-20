/**
 * Check if a word is a Roman numeral (I-X).
 * Matches: I, II, III, IV, V, VI, VII, VIII, IX, X
 */
function isRomanNumeral(word: string): boolean {
  return /^(i{1,3}|iv|v|vi{0,3}|ix|x)$/i.test(word);
}

/**
 * Transforms "slugified" TOML filenames to prettier format.
 * Removes special characters and only keeps alphanumeric characters and numbers.
 * Detects and uppercases Roman numerals (I-X).
 *
 * @example
 * unslugify("monokai_pro.toml") // "Monokai Pro"
 * unslugify("moonlight_ii_vscode.toml") // "Moonlight II Vscode"
 */
export function unslugify(filename: string): string {
  const transformed = filename
    // Remove the .toml extension
    .replace(/\.toml$/, "")
    // Replace all non-alphanumeric characters with a space
    .replace(/[^a-zA-Z0-9]/g, " ")
    // Replace multiple spaces with a single space
    .replace(/\s+/g, " ")
    .trim()
    // Uppercase the first letter of each word
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Detect and uppercase Roman numerals
  return transformed
    .split(" ")
    .map((word) => isRomanNumeral(word) ? word.toUpperCase() : word)
    .join(" ");
}
