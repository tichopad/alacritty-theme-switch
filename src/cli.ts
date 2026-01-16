import interactiveSearchPrompt from "@inquirer/search";
import { parseArgs } from "@std/cli/parse-args";
import { join } from "@std/path/join";
import { fromPromise } from "neverthrow";
import denoJson from "../deno.json" with { type: "json" };
import type { IThemeManager } from "./theme-manager/theme-manager.ts";
import type { FilePath } from "./types.ts";

type PositionalCommand = "download-themes" | "clear-themes";

type Args = {
  // Flags
  /** Show help */
  help: boolean;
  /** Show version */
  version: boolean;
  /** Path to the alacritty's configuration file */
  config: string;
  /** Path to the directory containing custom themes' files */
  themes: string;
  /** Path to the alacritty's configuration file backup made before every switch */
  backup: string;
  /**
   * Path (relative to themes' directory) to a single configuration file that
   * should be used directly instead of prompting a select
   */
  select?: string;
  /** URL for download-themes command (always set when command is "download-themes") */
  url: string;
  /** Git reference (branch, tag, or commit SHA) for download-themes command */
  ref: string;
  // Commands
  /** Subcommand to execute */
  command?: PositionalCommand;
  // Rest
  /** Positional arguments */
  _: Array<string | number>;
  [key: string]: unknown;
};

/**
 * Parse CLI arguments.
 * @param cliArgs CLI arguments, e.g. returned by Deno.args
 */
export function getArgs(
  cliArgs: string[],
  homeDir: FilePath,
  os: typeof Deno.build.os,
): Args {
  const parsed = parseArgs(cliArgs, {
    boolean: ["help", "version"],
    string: [
      "config",
      "themes",
      "backup",
      "select",
      "url",
      "ref",
    ],
    alias: {
      h: "help",
      v: "version",
      c: "config",
      t: "themes",
      b: "backup",
      s: "select",
      u: "url",
      r: "ref",
    },
    default: {
      config: join(getDefaultConfigDir(homeDir, os), "alacritty.toml"),
      themes: join(getDefaultConfigDir(homeDir, os), "themes"),
      backup: join(getDefaultConfigDir(homeDir, os), "alacritty.bak.toml"),
      url: "https://github.com/alacritty/alacritty-theme",
      ref: "master",
    },
  });

  // Parse subcommand from positional arguments
  const firstArg = parsed._[0];
  if (typeof firstArg === "string" && firstArg === "download-themes") {
    return {
      ...parsed,
      command: "download-themes",
    };
  }

  if (typeof firstArg === "string" && firstArg === "clear-themes") {
    return {
      ...parsed,
      command: "clear-themes",
    };
  }

  return parsed;
}

export function parsePositionalCommand(
  positionalArgs: Array<string | number>,
): PositionalCommand | undefined {
  const firstArg = positionalArgs?.[0];

  if (typeof firstArg === "string" && firstArg === "download-themes") {
    return "download-themes";
  }

  if (typeof firstArg === "string" && firstArg === "clear-themes") {
    return "clear-themes";
  }

  return undefined;
}

/**
 * Print help message.
 */
export function printHelp() {
  console.log(
    `alacritty-theme-switch ${denoJson.version}\n` +
      `Usage:\n` +
      `  ats [options]                    Interactive theme selection\n` +
      `  ats download-themes [options]    Download themes from GitHub repository\n` +
      `  ats clear-themes [options]       Delete all themes from themes directory\n` +
      `\n` +
      `Commands:\n` +
      `  download-themes  Download themes from a GitHub repository\n` +
      `  clear-themes     Delete all theme files from the themes directory\n` +
      `\n` +
      `Options:\n` +
      `  -h, --help                 Show this help message and exit.\n` +
      `  -v, --version              Show the version number and exit.\n` +
      `  -c, --config               Path to the alacritty's configuration file\n` +
      `                             (default: $HOME/.config/alacritty/alacritty.toml)\n` +
      `  -t, --themes               Path to the directory containing custom themes' files\n` +
      `                             (default: $HOME/.config/alacritty/themes)\n` +
      `  -b, --backup               Path to the alacritty's configuration file backup made\n` +
      `                             before every switch\n` +
      `                             (default: $HOME/.config/alacritty/alacritty.bak.toml)\n` +
      `  -s, --select               Path (relative to themes' directory) to a single\n` +
      `                             configuration file that should be used directly instead of\n` +
      `                             prompting a select\n` +
      `\n` +
      `download-themes options:\n` +
      `  -u, --url                  GitHub repository URL to download themes from\n` +
      `                             (default: https://github.com/alacritty/alacritty-theme)\n` +
      `  -r, --ref                  Git reference (branch, tag, or commit SHA) to download from\n` +
      `                             (default: master)`,
  );
}

/**
 * Print version.
 */
export function printVersion() {
  console.log(denoJson.version);
}

class ExitPromptError extends Error {
  _tag = "ExitPromptError";
  constructor(options?: ErrorOptions) {
    super("Cancelled by user.", options);
  }
}
class InteractiveSearchError extends Error {
  _tag = "InteractiveSearchError";
  constructor(options?: ErrorOptions) {
    super("Interactive search prompt failed.", options);
  }
}

/**
 * Displays an interactive prompt to select a theme.
 * @param themeManager - Theme manager instance
 * @returns A ResultAsync containing the selected theme or an error
 */
export function interactiveThemesSelection(themeManager: IThemeManager) {
  const themes = themeManager.listThemes();
  const activeTheme = themeManager.getFirstActiveTheme();

  const filterThemesOnInput = (input: string | undefined) => {
    return themes
      .filter((theme) => {
        // If no input, show all themes
        if (!input) {
          return true;
        }
        // Match on brightness
        if (/^light|dark$/i.test(input)) {
          return theme.brightness === input.trim().toLowerCase();
        }
        // Dumb fuzzy matching
        const inputWords = input.split(/\s+/);
        const allMatch = inputWords.every((word) =>
          theme.label.toLowerCase().includes(word.toLowerCase())
        );
        if (allMatch) {
          return true;
        }
        return false;
      })
      .sort((a, b) => {
        // Sort by brightness first (dark before light)
        if (a.brightness !== b.brightness) {
          return a.brightness === "dark" ? -1 : 1;
        }
        // Then sort alphabetically by label
        return a.label.localeCompare(b.label, undefined, { numeric: true });
      })
      .map((theme) => {
        // Add brightness indicator to theme name
        const brightnessIcon = theme.brightness === "light" ? "☀️ " : "🌙";
        const themeName = `${brightnessIcon} ${theme.label}`;

        return {
          name: theme.isCurrentlyActive
            ? underscore(bold(themeName) + " ✨")
            : themeName,
          value: theme,
        };
      });
  };

  return fromPromise(
    interactiveSearchPrompt({
      message: activeTheme
        ? `Select Alacritty color theme (current: ${activeTheme.label})`
        : `Select Alacritty color theme`,
      pageSize: 10,
      source: filterThemesOnInput,
    }),
    (error) => {
      if (Error.isError(error) && error.name === "ExitPromptError") {
        return new ExitPromptError({ cause: error });
      }
      return new InteractiveSearchError({ cause: error });
    },
  );
}

/**
 * Get home directory.
 *
 * Uses $HOME on POSIX systems and $USERPROFILE on Windows.
 * If neither is set, uses current directory and logs a warning.
 */
export function getHomeDir(os: typeof Deno.build.os): FilePath {
  let homeDir: string | undefined;

  if (os === "windows") {
    homeDir = Deno.env.get("APPDATA") ?? Deno.env.get("USERPROFILE");
  } else {
    homeDir = Deno.env.get("HOME") ?? Deno.env.get("XDG_CONFIG_HOME");
  }

  if (homeDir === undefined) {
    console.warn(
      "Could not determine home directory. Using current directory as the default root.",
    );
    homeDir = Deno.cwd();
  }

  return homeDir;
}

/**
 * Get default alacritty configuration path.
 */
function getDefaultConfigDir(
  homeDir: FilePath,
  os: typeof Deno.build.os,
): FilePath {
  if (os === "windows") {
    return join(homeDir, "alacritty");
  }
  return join(homeDir, ".config", "alacritty");
}

/**
 * Make terminal output text bold.
 */
export function bold(s: string): string {
  return `\x1b[1m${s}\x1b[0m`;
}

/**
 * Make terminal output text underlined.
 */
export function underscore(s: string): string {
  return `\x1b[4m${s}\x1b[0m`;
}
