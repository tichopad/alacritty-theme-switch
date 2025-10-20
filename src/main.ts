import {
  bold,
  getArgs,
  getHomeDir,
  interactiveThemesSelection,
  printHelp,
  printVersion,
} from "./cli.ts";
import { clearThemesCommand } from "./commands/clear-themes.ts";
import { downloadThemesCommand } from "./commands/download-themes.ts";
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
  console.log(`Downloading themes from ${bold(args.url)}@${bold(args.ref)}`);
  console.log(`Output directory: ${bold(args.themes)}`);

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

// Handle clear-themes subcommand
if (args.command === "clear-themes") {
  const decision = confirm(
    `Are you sure you want to delete all themes from ${
      bold(
        args.themes,
      )
    }?`,
  );
  if (!decision) {
    console.log("Cancelled. ✅");
    Deno.exit(0);
  }

  console.log(`Clearing all themes from ${bold(args.themes)}...`);

  await clearThemesCommand({
    themesPath: args.themes,
  }).match(
    (deletedPaths) => {
      console.log(
        `Successfully deleted ${
          bold(deletedPaths.length.toString())
        } theme(s) ✅`,
      );
      Deno.exit(0);
    },
    (error) => {
      if (error._tag === "NoThemesFoundError") {
        console.log("No themes found to delete. ✅");
        Deno.exit(0);
      }
      console.error("Failed to clear themes! ❌");
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
});

if (managerResult.isErr()) {
  if (managerResult.error._tag === "NoThemesFoundError") {
    console.log(
      "No themes found. Use `ats download-themes` to download some.",
    );
    Deno.exit(0);
  }
  console.error("Failed to create theme manager! ❌");
  console.error(managerResult.error);
  Deno.exit(1);
}

const manager = managerResult.value;

// Handle --select flag which skips the interactive prompt
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
  Deno.exit(0);
}

// Else display interactive prompt
await interactiveThemesSelection(manager)
  .andThen((selectedTheme) => manager.applyTheme(selectedTheme))
  .match(
    (appliedTheme) => {
      console.log(`Applied theme ${bold(appliedTheme.label)} ✅`);
      Deno.exit(0);
    },
    (error) => {
      // Handle (SIGINT) Ctrl+C gracefully
      if (error._tag === "ExitPromptError") {
        console.log("Cancelled. ✅");
        Deno.exit(0);
      }

      console.log("Failed to apply theme! ❌");
      console.error(error);
      Deno.exit(1);
    },
  );

Deno.exit(0);
