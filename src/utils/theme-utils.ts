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
  theme: Record<string, unknown>, // TODO: Change to Theme type or apply better validation
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

/**
 * Parses a hex color string to RGB values.
 *
 * @param hex - Hex color string (e.g., "#1e2127" or "#fff")
 * @returns RGB values as [r, g, b] in 0-255 range, or null if invalid
 *
 * @example
 * parseHexColor("#1e2127") // [30, 33, 39]
 * parseHexColor("#fff") // [255, 255, 255]
 * parseHexColor("invalid") // null
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
 * calculateLuminance(255, 255, 255) // 1.0 (white)
 * calculateLuminance(0, 0, 0) // 0.0 (black)
 * calculateLuminance(30, 33, 39) // ~0.01 (dark)
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
