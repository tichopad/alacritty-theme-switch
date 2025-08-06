import { copy } from "@std/fs/copy";
import { walk } from "@std/fs/walk";
import { stringify } from "@std/toml/stringify";
import { parse } from "@std/toml/parse";

/** Alias for a string representing a full file path */
type FilePath = string;

/** Theme entry */
type Theme = {
  path: FilePath;
  label: string;
  isCurrentlyActive: boolean | null;
};

/** Alacritty configuration file content */
type Config = {
  // This is the only section we're really interested in
  general?: {
    // This is an array of file paths containing partial Alacritty configurations
    import?: string[];
  };
  [key: string]: unknown;
};

/** Theme manager input parameters */
type ThemesManagerParams = {
  /** Path to the backup file */
  backupPath: string;
  /** Path to the Alacritty configuration file */
  configPath: string;
  /** Path to the directory containing custom themes' files */
  themesDirPath: string;
};

/** Theme manager type */
type ThemeManager = {
  /** Currently active parsed Alacritty configuration */
  config: Config;
  /** Apply a theme */
  applyTheme(selectedTheme: Theme): Promise<void>;
  /** Apply a theme given its filename */
  applyThemeByFilename(fileName: string): Promise<void>;
  /** List all themes with information if they are currently active */
  listThemes(): Theme[];
};

/**
 * Create a theme manager.
 *
 * Handles loading themes, listing them, checking their existence, applying them to the
 * configuration file, etc.
 *
 * @example
 * ```
 * const manager = await createThemeManager({
 *   configPath: "/path/to/alacritty.toml",
 *   themesDirPath: "/path/to/themes",
 *   backupPath: "/path/to/backup.toml",
 * });
 * const themes = manager.listThemes();
 * ```
 */
export async function createThemeManager(
  params: ThemesManagerParams,
): Promise<ThemeManager> {
  let config = await parseConfig(params.configPath);
  const themes = await loadThemes(params.themesDirPath);
  const themesPaths = new Set(themes.map((theme) => theme.path));

  // Get a set of currently active themes
  function activeThemes() {
    const imports = config.general?.import ?? [];
    const activeThemes = imports.filter((i) => themesPaths.has(i));
    return new Set(activeThemes);
  }

  /** List all themes with information if they are currently active */
  function listThemes() {
    return themes.map((theme) => ({
      ...theme,
      isCurrentlyActive: activeThemes().has(theme.path),
    }));
  }

  /** Apply a given theme. Creates a backup of the original config file. */
  async function applyTheme(selectedTheme: Theme) {
    await createBackup(params.configPath, params.backupPath);

    const newConfig = structuredClone(config);
    newConfig.general ??= {};
    newConfig.general.import ??= [];
    // Remove all themes from import entries first
    newConfig.general.import = newConfig.general.import.filter(
      (importEntryPath) => {
        return !themesPaths.has(importEntryPath);
      },
    );
    // Then add the selected theme there
    newConfig.general.import.push(selectedTheme.path);

    await Deno.writeTextFile(params.configPath, stringify(newConfig));

    config = newConfig;
  }

  /** Apply a theme given its filename */
  async function applyThemeByFilename(name: string) {
    const theme = await checkThemeExists(name, listThemes());
    await applyTheme(theme);
  }

  return {
    config,
    listThemes,
    applyThemeByFilename,
    applyTheme,
  };
}

/**
 * Check if a theme with a given filename exists.
 */
async function checkThemeExists(filename: string, allThemes: Theme[]) {
  const theme = allThemes.find((theme) => theme.path.endsWith(filename));

  if (theme === undefined) {
    throw new Error(`Given selected theme ${filename} does not exist.`);
  }
  try {
    const stat = await Deno.stat(theme.path);
    if (!stat.isFile) {
      throw new Error(`Given selected theme ${theme.path} is not a file.`);
    }
  } catch (statError) {
    throw new Error(
      `Given selected theme ${theme.path} does not exist or is not readable.`,
      { cause: statError },
    );
  }
  if (!isToml(theme.path)) {
    console.error(`Given selected theme ${theme.path} is not a TOML file.`);
    Deno.exit(1);
  }

  return theme;
}

/**
 * Load themes from a given directory.
 */
async function loadThemes(themeDirPath: FilePath): Promise<Theme[]> {
  try {
    const stat = await Deno.stat(themeDirPath);
    if (stat.isFile) {
      throw new Error(`Given themes directory ${themeDirPath} is a file.`);
    }
    if (!stat.isDirectory) {
      throw new Error(
        `Given themes directory ${themeDirPath} is not a directory.`,
      );
    }
  } catch (statError) {
    throw new Error(
      `Given themes directory ${themeDirPath} does not exist or is not readable.`,
      { cause: statError },
    );
  }

  const files = walk(themeDirPath, { exts: ["toml"] });
  const themes = await Array.fromAsync(files);
  if (themes.length === 0) {
    throw new Error(
      `Given themes directory ${themeDirPath} does not contain any TOML files.`,
    );
  }

  return themes.map((theme) => ({
    path: theme.path,
    label: unslugify(theme.name),
    isCurrentlyActive: null,
  }));
}

/**
 * Reads Alacritty config file at a given path and returns its parsed content.
 */
async function parseConfig(configPath: FilePath): Promise<Config> {
  // TODO: nothrow
  try {
    const stat = await Deno.stat(configPath);
    if (stat.isDirectory) {
      throw new Error(`Given configuration file ${configPath} is a directory.`);
    }
    if (!stat.isFile) {
      throw new Error(`Given configuration file ${configPath} is not a file.`);
    }
  } catch (statError) {
    throw new Error(
      `Given configuration file ${configPath} does not exist or is not readable.`,
      { cause: statError },
    );
  }

  if (!isToml(configPath)) {
    throw new Error(
      `Given configuration file ${configPath} is not a TOML file.`,
    );
  }

  const content = await Deno.readTextFile(configPath);
  const parsedContent = parse(content);

  return parsedContent;
}

/**
 * Create a backup of the given config file.
 */
function createBackup(configPath: string, backupPath: string) {
  return copy(configPath, backupPath, { overwrite: true });
}

/**
 * Transforms "slugified" TOML filenames to prettier format.
 * E.g. `monokai_pro.toml` -> `Monokai Pro`
 */
function unslugify(path: string) {
  return path
    .replace(/\.toml$/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Check if the given path is a TOML file.
 */
function isToml(path: string) {
  const extension = path.split(".").pop();
  return extension === "toml";
}
