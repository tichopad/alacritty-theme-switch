import search from "@inquirer/search";
import {
  bold,
  getArgs,
  getHomeDir,
  printHelp,
  printVersion,
  underscore,
} from "./cli.ts";
import { downloadThemesCommand } from "./commands/download-themes.ts";
import { ResultAsync } from "./result.ts";
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

// Handle download-themes subcommand
if (args.command === "download-themes") {
  console.log(`Downloading themes from ${bold(args.url!)}...`);
  console.log(`Git reference: ${args.ref}`);
  console.log(`Output directory: ${args.themes}`);
  console.log();

  await downloadThemesCommand({
    repositoryUrl: args.url,
    outputPath: args.themes,
    ref: args.ref,
  }).match(
    (downloadedThemes) => {
      console.log(
        `\nSuccessfully downloaded ${
          bold(downloadedThemes.length.toString())
        } theme(s): ✅`,
      );
      downloadedThemes.forEach((theme) => {
        console.log(` - ${theme.label}`);
      });
      console.log(
        `\n💙 These themes are made possible by the open-source community.`,
      );
      console.log(`   Consider supporting the authors at ${bold(args.url)}`);
      Deno.exit(0);
    },
    (error) => {
      console.error("Failed to download themes! ❌");
      console.error(error);
      Deno.exit(1);
    },
  );
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
const activeTheme = themes.find((t) => t.isCurrentlyActive);

await ResultAsync.fromPromise(
  search({
    message: activeTheme
      ? `Select Alacritty color theme (current: ${activeTheme.label})`
      : `Select Alacritty color theme`,
    instructions: {
      navigation: "Use arrow keys to navigate (or type to search)",
      pager: "Use space to select and enter to confirm",
    },
    pageSize: 10,
    source: (input) => {
      return themes
        .filter((theme) => {
          return input
            ? theme.label.toLowerCase().includes(input.toLowerCase())
            : true;
        })
        .map((theme) => {
          return {
            name: theme.isCurrentlyActive
              ? underscore(bold(theme.label) + " ✨")
              : theme.label,
            value: theme,
          };
        });
    },
  }),
  (error) => error,
)
  .flatMap((selectedTheme) => manager.applyTheme(selectedTheme))
  .match(
    (appliedTheme) => {
      console.log(`Applied theme ${bold(appliedTheme.label)} ✅`);
      Deno.exit(0);
    },
    (error) => {
      // Handle Ctrl+C gracefully
      if (error instanceof Error && error.name === "ExitPromptError") {
        console.log("\nExiting...");
        Deno.exit(0);
      }
      console.log("Failed to apply theme! ❌");
      console.error(error);
      Deno.exit(1);
    },
  );
