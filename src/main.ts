import { parseArgs } from "@std/cli/parse-args";
import { promptSelect } from "@std/cli/unstable-prompt-select";
import denoJson from "../deno.json" with { type: "json" };
import {
  applyTheme,
  bold,
  type FilePath,
  getActiveThemes,
  validateConfigFile,
  validateSelectedTheme,
  validateThemesDirectory,
} from "./core.ts";

const homeDir = Deno.env.get("HOME") ?? Deno.cwd();

const args = parseArgs(Deno.args, {
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

if (args.help) {
  console.log("Help");
  Deno.exit(0);
}

if (args.version) {
  console.log(denoJson.version);
  Deno.exit(0);
}

console.log(args);

const config = await validateConfigFile(args.config);
console.log(config);
const themes = await validateThemesDirectory(args.themes);
console.log(themes);

if (args.select !== undefined) {
  const theme = await validateSelectedTheme(args.select, themes);
  console.log(theme);
}

const activeThemes = getActiveThemes(config, themes);
console.log("activeThemes: %o", activeThemes);

const selectedTheme = promptSelect(
  `Select Alacritty color theme(s)`,
  themes.map((t) => {
    const isActive = activeThemes.has(t.path);

    return ({
      label: isActive ? bold(t.name) + " (active)" : t.name,
      value: t,
    });
  }),
  {
    // Clear input after selection
    clear: true,
    // Max. number of visible items
    visibleLines: 10,
  },
);
console.log(selectedTheme);

if (selectedTheme === null) {
  console.log("No themes selected. Exiting.");
  Deno.exit(0);
}

await applyTheme(
  [selectedTheme.value],
  themes,
  args.config as FilePath,
  config,
  args.backup as FilePath,
);

// ----
