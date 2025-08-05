import { copy } from "@std/fs/copy";
import { walk, type WalkEntry } from "@std/fs/walk";
import { stringify } from "@std/toml/stringify";
import { parse } from "@std/toml/parse";

export type Branded<T, B> = T & { __brand: B };
export type ThemeEntry = WalkEntry & { path: FilePath };
export type FilePath = Branded<string, "FilePath">;

function createBackup(configPath: string, backupPath: string) {
  return copy(configPath, backupPath, { overwrite: true });
}

export async function applyTheme(
  selectedThemes: ThemeEntry[],
  allThemes: ThemeEntry[],
  configPath: FilePath,
  currentConfig: Config,
  backupPath: FilePath,
) {
  await createBackup(configPath, backupPath);

  const newConfig = structuredClone(currentConfig);
  newConfig.general ??= {};
  newConfig.general.import ??= [];
  newConfig.general.import = newConfig.general.import.filter((i) => {
    return !allThemes.some((t) => t.path === i);
  });
  newConfig.general.import.push(...selectedThemes.map((t) => t.path));

  await Deno.writeTextFile(
    configPath,
    stringify(newConfig),
  );
}

export function bold(s: string) {
  return `\x1b[1m${s}\x1b[0m`;
}

export function getActiveThemes(
  config: Config,
  themes: WalkEntry[],
): Set<FilePath> {
  const imports = config.general?.import ?? [];
  const themesPathsSet = new Set(themes.map((t) => t.path));
  const activeThemes = imports.filter((i): i is FilePath => {
    return themesPathsSet.has(i);
  });

  return new Set(activeThemes);
}

export async function validateSelectedTheme(name: string, themes: WalkEntry[]) {
  const theme = themes.find((t) => t.name === name);
  if (!theme) {
    console.error(`Given selected theme ${name} does not exist.`);
    Deno.exit(1);
  }
  const stat = await Deno.stat(theme.path);
  if (!stat.isFile) {
    console.error(`Given selected theme ${theme.path} is not a file.`);
    Deno.exit(1);
  }
  if (!isToml(theme.path)) {
    console.error(`Given selected theme ${theme.path} is not a TOML file.`);
    Deno.exit(1);
  }
  return theme;
}

export async function validateThemesDirectory(
  path: string,
): Promise<ThemeEntry[]> {
  // TODO: nothrow
  const stat = await Deno.stat(path);
  if (stat.isFile) {
    console.error(
      `Given themes directory ${path} is a file, but it should be a directory.`,
    );
    Deno.exit(1);
  }
  if (!stat.isDirectory) {
    console.error(`Given themes directory ${path} does not exist.`);
    Deno.exit(1);
  }
  // There are not theme files in this dir
  const files = walk(path, { exts: ["toml"] });
  const themes = await Array.fromAsync(files);
  if (themes.length === 0) {
    console.error(
      `Given themes directory ${path} does not contain any TOML files.`,
    );
    Deno.exit(1);
  }
  return themes as ThemeEntry[];
}

type Config = {
  // This is the only section we're really interested in
  general?: {
    import?: string[];
  };
  [key: string]: unknown;
};

export async function validateConfigFile(
  path: string,
): Promise<Config> {
  // TODO: nothrow
  const stat = await Deno.stat(path);
  if (stat.isDirectory) {
    console.error(
      `Given configuration file ${path} is a directory, but it should be a file.`,
    );
    Deno.exit(1);
  }
  if (!stat.isFile) {
    console.error(`Given configuration file ${path} does not exist.`);
    Deno.exit(1);
  }
  if (!isToml(path)) {
    console.error(
      `Given configuration file ${path} is not a TOML file.`,
    );
    Deno.exit(1);
  }
  const content = await Deno.readTextFile(path);
  const parsedContent = parse(content);

  return parsedContent;
}

function isToml(path: string) {
  const extension = path.split(".").pop();
  return extension === "toml";
}
