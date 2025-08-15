import { promptSelect } from "@std/cli/unstable-prompt-select";
import { bold, getArgs, printHelp, printVersion, underscore } from "./cli.ts";
import { createThemeManager } from "./theme-manager/index.ts";

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
const managerResult = await createThemeManager({
  configPath: args.config,
  themesDirPath: args.themes,
  backupPath: args.backup,
}).toResult();

if (managerResult.isErr()) {
  console.error("Failed to create theme manager");
  console.error(managerResult.error);
  Deno.exit(1);
}

const manager = managerResult.data;

// If a theme is selected by a CLI arg, apply it and quit
if (args.select !== undefined) {
  const applyResult = await manager.applyThemeByFilename(args.select)
    .toResult();
  if (applyResult.isErr()) {
    console.error("Failed to apply theme");
    console.error(applyResult.error);
    Deno.exit(1);
  }
  console.log(`Applied theme: ${args.select}`);
  Deno.exit(0);
}

// Get the list of themes
const themesResult = await manager.listThemes().toResult();
if (themesResult.isErr()) {
  console.error("Failed to list themes");
  console.error(themesResult.error);
  Deno.exit(1);
}

const themes = themesResult.data;

// Prompt user to select a theme
const selectedTheme = promptSelect(
  `Select Alacritty color theme`,
  themes.map((theme) => {
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

const applyResult = await manager.applyTheme(selectedTheme.value).toResult();
if (applyResult.isErr()) {
  console.error("Failed to apply theme");
  console.error(applyResult.error);
  Deno.exit(1);
}

console.log(`Applied theme: ${selectedTheme.value.label}`);
