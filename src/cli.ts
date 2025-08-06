import { parseArgs } from "@std/cli/parse-args";
import denoJson from "../deno.json" with { type: "json" };

/**
 * Parse CLI arguments.
 * @param cliArgs CLI arguments, e.g. returned by Deno.args
 */
export function getArgs(cliArgs: string[]) {
  const homeDir = getHomeDir();

  return parseArgs(cliArgs, {
    boolean: ["help", "version"],
    string: ["config", "themes", "backup", "select"],
    alias: {
      h: "help",
      v: "version",
      c: "config",
      t: "themes",
      b: "backup",
      s: "select",
    },
    default: {
      config: `${homeDir}/.config/alacritty/alacritty.toml`,
      themes: `${homeDir}/.config/alacritty/themes`,
      backup: `${homeDir}/.config/alacritty/alacritty.bak.toml`,
    },
  });
}

/**
 * Print help message.
 */
export function printHelp() {
  console.log(
    `alacritty-theme-switch ${denoJson.version}\n` +
      `Usage:\n` +
      `  ats [options]\n` +
      `Options:\n` +
      `  -h, --help     Show this help message and exit.\n` +
      `  -v, --version  Show the version number and exit.\n` +
      `  -c, --config   Path to the alacritty's configuration file\n` +
      `                 (default: $HOME/.config/alacritty/alacritty.toml)\n` +
      `  -t, --themes   Path to the directory containing custom themes' files\n` +
      `                 (default: $HOME/.config/alacritty/themes)\n` +
      `  -b, --backup   Path to the alacritty's configuration file backup made\n` +
      `                 before every switch\n` +
      `                 (default: $HOME/.config/alacritty/alacritty.bak.toml)\n` +
      `  -s, --select   Path (relative to themes' directory) to a single\n` +
      `                 configuration file that should be used directly instead of\n` +
      `                 prompting a select`,
  );
}

/**
 * Print version.
 */
export function printVersion() {
  console.log(denoJson.version);
}

/**
 * Get home directory.
 *
 * Uses $HOME on POSIX systems and $USERPROFILE on Windows.
 * If neither is set, uses current directory and logs a warning.
 */
function getHomeDir() {
  const posixHomeDir = Deno.env.get("HOME");
  const windowsHomeDir = Deno.env.get("USERPROFILE");
  let homeDir = posixHomeDir ?? windowsHomeDir;

  if (homeDir === undefined) {
    console.warn(
      "Could not determine home directory. Using current directory.",
    );
    homeDir = Deno.cwd();
  }

  return homeDir;
}

/**
 * Make terminal output text bold.
 */
export function bold(s: string) {
  return `\x1b[1m${s}\x1b[0m`;
}

/**
 * Make terminal output text underlined.
 */
export function underscore(s: string) {
  return `\x1b[4m${s}\x1b[0m`;
}
