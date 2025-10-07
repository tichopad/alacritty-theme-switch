import { parse } from "@std/toml/parse";
import { Result } from "../no-exceptions/result.ts";
import { ResultAsync } from "../no-exceptions/result-async.ts";
import { FileNotReadableError, TomlParseError } from "./errors.ts";
import type { FilePath } from "./types.ts";

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
 * ```ts
 * unslugify("monokai_pro.toml") // "Monokai Pro"
 * unslugify("moonlight_ii_vscode.toml") // "Moonlight II Vscode"
 * ```
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

/**
 * Check if the given path is a TOML file.
 */
export function isToml(path: string): boolean {
  const extension = path.split(".").pop();
  return extension === "toml";
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
  return Result.try(
    () => parse(content),
    (error) => new TomlParseError(content, { cause: error }),
  );
}

/**
 * Safely reads and parses a TOML file.
 *
 * @param path - Path to the TOML file
 * @returns ResultAsync containing the parsed TOML content or an error
 * ```
 */
export function safeParseToml(path: FilePath) {
  return ResultAsync.fromPromise(
    Deno.readTextFile(path).then(parse),
    (error) => new FileNotReadableError(path, { cause: error }),
  );
}

/**
 * Parses a hex color string to RGB values.
 *
 * @param hex - Hex color string (e.g., "#1e2127" or "#fff")
 * @returns RGB values as [r, g, b] in 0-255 range, or null if invalid
 *
 * @example
 * ```ts
 * parseHexColor("#1e2127") // [30, 33, 39]
 * parseHexColor("#fff") // [255, 255, 255]
 * parseHexColor("invalid") // null
 * ```
 */
function parseHexColor(hex: string): [number, number, number] | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, "");

  // Handle 3-digit hex (e.g., #fff)
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b];
  }

  // Handle 6-digit hex (e.g., #1e2127)
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b];
  }

  return null;
}

/**
 * Calculates the relative luminance of an RGB color.
 * Uses the W3C formula for relative luminance.
 *
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Relative luminance (0-1)
 *
 * @example
 * ```ts
 * calculateLuminance(255, 255, 255) // 1.0 (white)
 * calculateLuminance(0, 0, 0) // 0.0 (black)
 * calculateLuminance(30, 33, 39) // ~0.01 (dark)
 * ```
 */
function calculateLuminance(r: number, g: number, b: number): number {
  // Convert to 0-1 range
  const [rs, gs, bs] = [r / 255, g / 255, b / 255];

  // Apply gamma correction
  const gammaCorrect = (channel: number): number => {
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  };

  const rLinear = gammaCorrect(rs);
  const gLinear = gammaCorrect(gs);
  const bLinear = gammaCorrect(bs);

  // Calculate relative luminance using W3C formula
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Detects whether a theme is light or dark based on its background color.
 *
 * @param theme - Parsed theme content
 * @returns "light" or "dark" based on the background color luminance
 *
 * @example
 * ```ts
 * const theme = {
 *   colors: {
 *     primary: {
 *       background: "#1e2127",
 *       foreground: "#abb2bf"
 *     }
 *   }
 * };
 * detectThemeBrightness(theme) // "dark"
 * ```
 */
export function detectThemeBrightness(
  theme: Record<string, unknown>,
): "light" | "dark" {
  // Extract background color from theme
  const colors = theme.colors as Record<string, unknown> | undefined;
  const primary = colors?.primary as Record<string, unknown> | undefined;
  const background = primary?.background as string | undefined;

  // Default to dark if background color is missing or invalid
  if (!background || typeof background !== "string") {
    return "dark";
  }

  // Parse hex color
  const rgb = parseHexColor(background);
  if (!rgb) {
    return "dark";
  }

  // Calculate luminance
  const [r, g, b] = rgb;
  const luminance = calculateLuminance(r, g, b);

  // Threshold of 0.5 - above is light, below is dark
  return luminance > 0.5 ? "light" : "dark";
}
