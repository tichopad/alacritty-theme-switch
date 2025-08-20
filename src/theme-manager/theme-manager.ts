import { Result } from "../result.ts";
import {
  checkThemeExists,
  createBackup,
  loadThemes,
  parseConfig,
  writeConfigToFile,
} from "./config-operations.ts";
import type { Config, FilePath, Theme } from "./types.ts";

/**
 * Theme manager encapsulates all operations related to theme management.
 */
class ThemeManager {
  /** Alacritty configuration */
  #config: Config;
  /** All available themes */
  #themes: Theme[];
  /** Set of all available themes' paths */
  #themesPaths: Set<FilePath>;
  /** Path to the backup file */
  #backupPath: FilePath;
  /** Path to the Alacritty configuration file */
  #configPath: FilePath;

  constructor(
    config: Config,
    themes: Theme[],
    backupPath: FilePath,
    configPath: FilePath,
  ) {
    this.#config = config;
    this.#themes = themes;
    this.#themesPaths = new Set(themes.map((theme) => theme.path));
    this.#backupPath = backupPath;
    this.#configPath = configPath;
  }

  /**
   * Returns the current Alacritty configuration.
   */
  getConfig() {
    return this.#config;
  }

  /**
   * Returns a list of all available themes.
   */
  listThemes() {
    const activeThemes = this.#getActiveThemes();
    return this.#themes.map((theme) => ({
      ...theme,
      isCurrentlyActive: activeThemes.has(theme.path),
    }));
  }

  /**
   * Applies the selected theme to the Alacritty configuration.
   */
  applyTheme(selectedTheme: Theme) {
    return createBackup(this.#configPath, this.#backupPath)
      .flatMap(() => {
        const newConfig = structuredClone(this.getConfig());

        newConfig.general ??= {};
        newConfig.general.import ??= [];
        // Remove all themes from import entries first
        newConfig.general.import = newConfig.general.import.filter(
          (importEntryPath) => !this.#themesPaths.has(importEntryPath),
        );
        // Then add the selected theme there
        newConfig.general.import.push(selectedTheme.path);

        return Result.ok(newConfig);
      })
      .flatMap((newConfig) => {
        return writeConfigToFile(this.#configPath, newConfig).map(() => {
          this.#setConfig(newConfig);
          return selectedTheme;
        });
      });
  }

  /**
   * Applies the theme with the given filename.
   */
  applyThemeByFilename(name: string) {
    const allThemes = this.listThemes();
    return checkThemeExists(name, allThemes).flatMap((theme) => {
      return this.applyTheme(theme);
    });
  }

  /**
   * Sets the current Alacritty configuration.
   */
  #setConfig(config: Config) {
    this.#config = config;
  }

  /**
   * Returns a set of all currently active themes.
   */
  #getActiveThemes() {
    const config = this.getConfig();
    const imports = config.general?.import ?? [];
    const activeThemes = imports.filter((i: string) =>
      this.#themesPaths.has(i)
    );
    return new Set(activeThemes);
  }
}

/** Theme manager input parameters */
type ThemesManagerParams = {
  /** Path to the backup file */
  backupPath: FilePath;
  /** Path to the Alacritty configuration file */
  configPath: FilePath;
  /** Path to the directory containing custom themes' files */
  themesDirPath: FilePath;
};

/**
 * Factory function for creating a theme manager.
 */
export function createThemeManager(params: ThemesManagerParams) {
  return loadThemes(params.themesDirPath)
    .flatMap((themes) => {
      return parseConfig(params.configPath).map((config) => {
        return new ThemeManager(
          config,
          themes,
          params.backupPath,
          params.configPath,
        );
      });
    });
}
