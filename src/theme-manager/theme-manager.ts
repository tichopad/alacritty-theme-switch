import { copy } from "@std/fs/copy";
import { walk } from "@std/fs/walk";
import { stringify } from "@std/toml/stringify";
import { parse } from "@std/toml/parse";
import { Result, ResultAsync } from "../result.ts";
import {
  BackupError,
  type CheckThemeExistsError,
  DirectoryIsFileError,
  DirectoryNotAccessibleError,
  DirectoryNotDirectoryError,
  FileIsDirectoryError,
  FileNotFoundError,
  FileNotReadableError,
  FileNotTOMLError,
  type LoadThemesError,
  NoThemesFoundError,
  type ParseConfigError,
  ThemeNotAccessibleError,
  ThemeNotFileError,
  ThemeNotFoundError,
  ThemeNotTOMLError,
  WriteError,
} from "./errors.ts";

// *** Utility Functions *** //

/**
 * Transforms "slugified" TOML filenames to prettier format.
 * E.g. `monokai_pro.toml` -> `Monokai Pro`
 */
function unslugify(filename: string) {
  return filename
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

// *** Non-throwing Functions *** //

/**
 * Creates a backup copy of the configuration file.
 */
function createBackup(
  configPath: string,
  backupPath: string,
): ResultAsync<null, BackupError> {
  return ResultAsync.fromPromise(
    copy(configPath, backupPath, { overwrite: true }).then(() => null),
    (error) => new BackupError(configPath, { cause: error }),
  );
}

/**
 * Parses an Alacritty configuration file from TOML format.
 */
function parseConfig(
  configPath: FilePath,
): ResultAsync<Config, ParseConfigError> {
  return ResultAsync.fromPromise(
    (async () => {
      try {
        const stat = await Deno.stat(configPath);
        if (stat.isDirectory) {
          throw new FileIsDirectoryError(configPath);
        }
        if (!stat.isFile) {
          throw new FileNotReadableError(configPath);
        }
      } catch (statError) {
        if (
          statError instanceof FileIsDirectoryError ||
          statError instanceof FileNotReadableError
        ) {
          throw statError;
        }
        throw new FileNotFoundError(configPath, { cause: statError });
      }

      if (!isToml(configPath)) {
        throw new FileNotTOMLError(configPath);
      }

      try {
        const content = await Deno.readTextFile(configPath);
        const parsedContent = parse(content);
        return parsedContent;
      } catch (parseError) {
        throw new FileNotReadableError(configPath, { cause: parseError });
      }
    })(),
    (error) => error as ParseConfigError,
  );
}

// *** Types *** //

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
  config: ResultAsync<Config, ParseConfigError>;
  /** Apply a theme */
  applyTheme(
    selectedTheme: Theme,
  ): ResultAsync<void, BackupError | ParseConfigError | WriteError>;
  /** Apply a theme given its filename */
  applyThemeByFilename(
    fileName: string,
  ): ResultAsync<
    void,
    ParseConfigError | BackupError | WriteError | CheckThemeExistsError
  >;
  /** List all themes with information if they are currently active */
  listThemes(): ResultAsync<Theme[], ParseConfigError>;
};

// *** Implementation *** //

/**
 * Validates that a theme with the given filename exists and is accessible.
 */
function checkThemeExists(
  filename: string,
  allThemes: Theme[],
): ResultAsync<Theme, CheckThemeExistsError> {
  const theme = allThemes.find((theme) => theme.path.endsWith(filename));

  if (theme === undefined) {
    return ResultAsync.err(new ThemeNotFoundError(filename));
  }

  return ResultAsync.fromPromise(
    Deno.stat(theme.path),
    (error) => new ThemeNotAccessibleError(theme.path, { cause: error }),
  ).flatMap((stat): Result<Theme, ThemeNotFileError | ThemeNotTOMLError> => {
    if (!stat.isFile) {
      return Result.err(new ThemeNotFileError(theme.path));
    }

    if (!isToml(theme.path)) {
      return Result.err(new ThemeNotTOMLError(theme.path));
    }

    return Result.ok(theme);
  });
}

/**
 * Discovers and loads all TOML theme files from the specified directory.
 */
function loadThemes(
  themeDirPath: FilePath,
): ResultAsync<Theme[], LoadThemesError> {
  return ResultAsync.fromPromise(
    Deno.stat(themeDirPath),
    (error) => new DirectoryNotAccessibleError(themeDirPath, { cause: error }),
  ).flatMap(
    (stat): Result<void, DirectoryIsFileError | DirectoryNotDirectoryError> => {
      if (stat.isFile) {
        return Result.err(new DirectoryIsFileError(themeDirPath));
      }
      if (!stat.isDirectory) {
        return Result.err(new DirectoryNotDirectoryError(themeDirPath));
      }
      return Result.ok(undefined);
    },
  ).flatMap(async (): Promise<Result<Theme[], NoThemesFoundError>> => {
    const files = walk(themeDirPath, { exts: ["toml"] });
    const themes = await Array.fromAsync(files);
    if (themes.length === 0) {
      return Result.err(new NoThemesFoundError(themeDirPath));
    }

    const mappedThemes = themes.map((theme) => ({
      path: theme.path,
      label: unslugify(theme.name),
      isCurrentlyActive: null,
    }));

    return Result.ok(mappedThemes);
  });
}

/**
 * Create a theme manager using the Result pattern for type-safe error handling.
 *
 * Handles loading themes, listing them, checking their existence, applying them to the
 * configuration file, etc. All operations return Results instead of throwing errors.
 *
 * @example
 * ```
 * const managerResult = await createThemeManager({
 *   configPath: "/path/to/alacritty.toml",
 *   themesDirPath: "/path/to/themes",
 *   backupPath: "/path/to/backup.toml",
 * }).toResult();
 *
 * if (managerResult.isOk()) {
 *   const manager = managerResult.data;
 *   const themesResult = await manager.listThemes().toResult();
 *   // Handle themes...
 * } else {
 *   console.error("Failed to create theme manager:", managerResult.error.message);
 * }
 * ```
 */
export function createThemeManager(
  params: ThemesManagerParams,
): ResultAsync<ThemeManager, ParseConfigError | LoadThemesError> {
  let config = parseConfig(params.configPath);

  return loadThemes(params.themesDirPath).flatMap((themes: Theme[]) => {
    const themesPaths = new Set(themes.map((theme) => theme.path));

    /**
     * Returns the set of currently active theme paths from the configuration.
     */
    function getActiveThemes(): ResultAsync<Set<string>, ParseConfigError> {
      return config.map((c) => {
        const imports = c.general?.import ?? [];
        const activeThemes = imports.filter((i: string) => themesPaths.has(i));
        return new Set(activeThemes);
      });
    }

    /**
     * Lists all available themes with their active status.
     */
    function listThemes(): ResultAsync<Theme[], ParseConfigError> {
      return getActiveThemes().map((activeThemes) => {
        return themes.map((theme) => ({
          ...theme,
          isCurrentlyActive: activeThemes.has(theme.path),
        }));
      });
    }

    /**
     * Applies the specified theme to the configuration file after creating a backup.
     */
    function applyTheme(
      selectedTheme: Theme,
    ): ResultAsync<void, BackupError | ParseConfigError | WriteError> {
      return createBackup(params.configPath, params.backupPath)
        .flatMap(() => config)
        .flatMap(async (c) => {
          try {
            const newConfig = structuredClone(c);
            newConfig.general ??= {};
            newConfig.general.import ??= [];
            // Remove all themes from import entries first
            newConfig.general.import = newConfig.general.import.filter(
              (importEntryPath: string) => {
                return !themesPaths.has(importEntryPath);
              },
            );
            // Then add the selected theme there
            newConfig.general.import.push(selectedTheme.path);

            await Deno.writeTextFile(params.configPath, stringify(newConfig));

            config = ResultAsync.fromResult(Result.ok(newConfig));
            return Result.ok<void>(undefined);
          } catch (writeError) {
            return Result.err(
              new WriteError(params.configPath, { cause: writeError }),
            );
          }
        });
    }

    /**
     * Applies a theme by its filename after validating it exists.
     */
    function applyThemeByFilename(
      name: string,
    ): ResultAsync<
      void,
      ParseConfigError | BackupError | WriteError | CheckThemeExistsError
    > {
      return listThemes().flatMap((themes) => {
        return checkThemeExists(name, themes).flatMap((theme: Theme) => {
          return applyTheme(theme);
        });
      });
    }

    return Result.ok({
      config,
      listThemes,
      applyThemeByFilename,
      applyTheme,
    });
  });
}
