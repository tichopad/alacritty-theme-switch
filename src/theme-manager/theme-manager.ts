import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type { Config } from "../types.ts";
import { DirectoryIsFileError } from "../utils/fs-errors.ts";
import {
  type FilePath,
  safeEnsureDir,
  safeStat,
  safeWalkAll,
} from "../utils/fs-utils.ts";
import { isToml, safeParseToml } from "../utils/toml-utils.ts";
import {
  createBackup,
  parseConfig,
  writeConfigToFile,
} from "./config-operations.ts";
import {
  NoThemesFoundError,
  ThemeNotFoundError,
  ThemeNotTOMLError,
} from "./errors.ts";
import { Theme } from "./theme.ts";

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
   * Configuration getter
   * @returns The current parsed Alacritty configuration
   */
  getConfig() {
    return this.#config;
  }

  /**
   * Lists themes.
   * @returns A list of all available themes
   */
  listThemes() {
    const activeThemes = this.#getActiveThemes();
    return this.#themes.map((theme) =>
      new Theme(theme.path, theme.themeContent, activeThemes.has(theme.path))
    );
  }

  /**
   * Returns the first active theme.
   */
  getFirstActiveTheme() {
    const activeThemes = this.#getActiveThemes();
    return this.#themes.find((theme) => activeThemes.has(theme.path));
  }

  /**
   * Applies the selected theme to the Alacritty configuration.
   * @param selectedTheme - Theme to apply
   * @returns A ResultAsync containing the applied theme or an error
   */
  applyTheme(selectedTheme: Theme) {
    return createBackup(this.#configPath, this.#backupPath)
      .andThen(() => {
        const newConfig = structuredClone(this.getConfig());
        newConfig.general ??= {};
        newConfig.general.import ??= [];
        // Remove all themes from import entries first
        newConfig.general.import = newConfig.general.import.filter(
          (importEntryPath: string) => !this.#themesPaths.has(importEntryPath),
        );
        // Then add the selected theme there
        newConfig.general.import.push(selectedTheme.path);

        return okAsync(newConfig);
      })
      .andThen((newConfig) => {
        return writeConfigToFile(this.#configPath, newConfig).map(() => {
          this.#setConfig(newConfig);
          return selectedTheme;
        });
      });
  }

  /**
   * Applies the theme with the given filename.
   * @param name - Filename of the theme to apply
   * @returns A ResultAsync containing the applied theme or an error
   */
  applyThemeByFilename(name: string) {
    const theme = this.listThemes().find((theme) => theme.path.endsWith(name));

    if (theme === undefined) {
      return errAsync(new ThemeNotFoundError(name));
    }

    if (!isToml(theme.path)) {
      return errAsync(new ThemeNotTOMLError(theme.path));
    }

    return safeStat(theme.path)
      .andThen(() => this.applyTheme(theme))
      .mapErr((error) => new ThemeNotFoundError(theme.path, { cause: error }));
  }

  /**
   * Sets the current Alacritty configuration.
   */
  #setConfig(config: Config) {
    this.#config = config;
  }

  /**
   * Returns a set of all currently active themes.
   * @returns A set of all currently active themes
   */
  #getActiveThemes() {
    const config = this.getConfig();
    const imports = config.general?.import ?? [];
    const activeThemes = imports.filter((i: string) =>
      this.#themesPaths.has(i)
    );
    return new Set(activeThemes);
  }

  /**
   * Loads all themes from the given directory.
   * If the directory doesn't exist, it will be created.
   * If the directory exists but is a file, an error will be returned.
   * If the directory exists and contains TOML files, they will be parsed and returned.
   * If the directory exists and contains no TOML files, an error will be returned.
   *
   * @param themeDirPath - Path to the directory containing custom themes' files
   * @returns A ResultAsync containing an array of all themes or an error
   */
  static loadThemes(themeDirPath: FilePath) {
    return safeEnsureDir(themeDirPath)
      .andThen(() => safeStat(themeDirPath))
      .andThen((stat) => {
        return stat.isFile
          ? errAsync(new DirectoryIsFileError(themeDirPath))
          : okAsync(stat);
      })
      .andThen(() => {
        const entriesResult = safeWalkAll(themeDirPath, {
          exts: ["toml"],
          includeFiles: true,
          includeDirs: false,
        });
        return entriesResult.andThen((entries) => {
          if (entries.length === 0) {
            return errAsync(new NoThemesFoundError(themeDirPath));
          }
          const themesResults = entries.map((entry) => {
            return safeParseToml(entry.path).map((themeContent) =>
              new Theme(entry.path, themeContent, null)
            );
          });
          return ResultAsync.combine(themesResults);
        });
      });
  }
}

/**
 * Type alias for ThemeManager instance.
 */
export type IThemeManager = InstanceType<typeof ThemeManager>;

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
  return ThemeManager.loadThemes(params.themesDirPath)
    .andThen((themes) => {
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
