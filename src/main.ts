import { promptSelect } from "@std/cli/unstable-prompt-select";
import { bold, getArgs, printHelp, printVersion, underscore } from "./cli.ts";
import { createThemeManager } from "./theme-manager.ts";

const args = getArgs(Deno.args);

// Show help and quit
if (args.help) {
  printHelp();
  Deno.exit(0);
}

// Show version and quit
if (args.version) {
  printVersion();
  Deno.exit(0);
}

// We're in theme management territory now -> create a manager
const manager = await createThemeManager({
  configPath: args.config,
  themesDirPath: args.themes,
  backupPath: args.backup,
});

// If a theme is selected by a CLI arg, apply it and quit
if (args.select !== undefined) {
  await manager.applyThemeByFilename(args.select);
}

// Prompt user to select a theme
const selectedTheme = promptSelect(
  `Select Alacritty color theme`,
  manager.listThemes().map((theme) => {
    return ({
      label: theme.isCurrentlyActive
        ? underscore(bold(theme.label) + " ✨")
        : theme.label,
      value: theme,
    });
  }),
);
if (selectedTheme === null) {
  console.log("No themes selected. Exiting.");
  Deno.exit(0);
}

await manager.applyTheme(selectedTheme.value);
