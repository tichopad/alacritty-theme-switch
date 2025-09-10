import { promptSelect } from "@std/cli/unstable-prompt-select";
import {
  bold,
  getArgs,
  getHomeDir,
  printHelp,
  printVersion,
  underscore,
} from "./cli.ts";
import { createThemeManager } from "./theme-manager/theme-manager.ts";

const args = getArgs(Deno.args, getHomeDir(Deno.build.os), Deno.build.os);

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
  console.error("Failed to create theme manager! ❌");
  console.error(managerResult.error);
  Deno.exit(1);
}

const manager = managerResult.data;

// If a theme is selected by a CLI arg, apply it  and quit
if (args.select !== undefined) {
  await manager
    .applyThemeByFilename(args.select)
    .match(
      (appliedTheme) => {
        console.log(`Applied theme ${bold(appliedTheme.label)} ✅`);
        Deno.exit(0);
      },
      (error) => {
        console.log("Failed to apply theme! ❌");
        console.error(error);
        Deno.exit(1);
      },
    );
}

// Else prompt user to select a theme
const themes = manager.listThemes();
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

// And apply it
await manager.applyTheme(selectedTheme.value).match(
  (appliedTheme) => {
    console.log(`Applied theme ${bold(appliedTheme.label)} ✅`);
    Deno.exit(0);
  },
  (error) => {
    console.log("Failed to apply theme! ❌");
    console.error(error);
    Deno.exit(1);
  },
);
