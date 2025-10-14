import { basename } from "@std/path/basename";
import type { FilePath } from "./types.ts";
import { detectThemeBrightness, unslugify } from "./utils.ts";

type ThemeContent = Record<string, unknown> & {
  colors?: {
    primary?: {
      background?: string;
    };
  };
};

/**
 * Theme represents a color theme for Alacritty.
 */
export class Theme {
  /** Path to the theme file */
  path: FilePath;
  /** Whether the theme is currently active */
  isCurrentlyActive: boolean | null;
  /** Parsed theme content */
  themeContent: ThemeContent;

  constructor(
    path: FilePath,
    themeContent: Record<string, unknown> = {},
    isCurrentlyActive: boolean | null = null,
  ) {
    this.path = path;
    this.themeContent = themeContent;
    this.isCurrentlyActive = isCurrentlyActive;
  }

  /** Human-readable theme name */
  get label(): string {
    return unslugify(basename(this.path));
  }

  /** Theme brightness */
  get brightness(): "light" | "dark" {
    return detectThemeBrightness(this.themeContent);
  }
}
