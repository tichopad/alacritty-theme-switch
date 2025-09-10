import { assertEquals } from "@std/assert";
import {
  checkThemeExists,
  createBackup,
  loadThemes,
  parseConfig,
  writeConfigToFile,
} from "../../src/theme-manager/config-operations.ts";
import {
  assertFileExists,
  createBasicConfig,
  createTestEnvironment,
  createTestThemes,
  writeTestConfig,
} from "../utils/test-setup.ts";

Deno.test("createBackup: successfully creates backup file", async () => {
  await using env = await createTestEnvironment();

  // Create original config
  await writeTestConfig(env.configPath, createBasicConfig());

  // Create backup
  const result = await createBackup(env.configPath, env.backupPath)
    .toResult();

  assertEquals(result.isOk(), true);
  await assertFileExists(env.backupPath);

  // Verify backup content matches original
  const originalContent = await Deno.readTextFile(env.configPath);
  const backupContent = await Deno.readTextFile(env.backupPath);
  assertEquals(backupContent, originalContent);
});

Deno.test("createBackup: overwrites existing backup", async () => {
  await using env = await createTestEnvironment();

  // Create original config and old backup
  await writeTestConfig(env.configPath, createBasicConfig());
  await writeTestConfig(env.backupPath, { old: "backup" });

  // Create new backup
  const result = await createBackup(env.configPath, env.backupPath).toResult();

  assertEquals(result.isOk(), true);

  // Verify backup was overwritten
  const backupContent = await Deno.readTextFile(env.backupPath);
  const originalContent = await Deno.readTextFile(env.configPath);
  assertEquals(backupContent, originalContent);
});

Deno.test("createBackup: fails when source file doesn't exist", async () => {
  await using env = await createTestEnvironment();

  const nonExistentPath = `${env.tempDir}/nonexistent.toml`;

  const result = await createBackup(nonExistentPath, env.backupPath).toResult();

  assertEquals(result.isErr(), true);
  assertEquals(result.error._tag, "BackupError");
});

Deno.test("writeConfigToFile: successfully writes config", async () => {
  await using env = await createTestEnvironment();

  const config = createBasicConfig(["theme1.toml"]);
  const result = await writeConfigToFile(env.configPath, config)
    .toResult();

  assertEquals(result.isOk(), true);
  await assertFileExists(env.configPath);

  // Verify content was written correctly
  const content = await Deno.readTextFile(env.configPath);
  assertEquals(content.includes("theme1.toml"), true);
});

Deno.test("writeConfigToFile: fails with invalid path", async () => {
  await using env = await createTestEnvironment();
  const invalidPath = `${env.tempDir}/nonexistent/config.toml`;

  const config = createBasicConfig();
  const result = await writeConfigToFile(invalidPath, config)
    .toResult();

  assertEquals(result.isErr(), true);
  assertEquals(result.error._tag, "WriteError");
});

Deno.test("parseConfig: successfully parses valid TOML config", async () => {
  await using env = await createTestEnvironment();

  await writeTestConfig(env.configPath, createBasicConfig(["theme1.toml"]));

  const result = await parseConfig(env.configPath).toResult();

  assertEquals(result.isOk(), true);
  assertEquals(result.data.general?.import, ["theme1.toml"]);
});

Deno.test("parseConfig: fails with non-TOML file", async () => {
  await using env = await createTestEnvironment();
  const txtPath = `${env.tempDir}/config.txt`;

  await Deno.writeTextFile(txtPath, "not a toml file");

  const result = await parseConfig(txtPath).toResult();

  assertEquals(result.isErr(), true);
  assertEquals(result.error._tag, "FileNotTOMLError");
});

Deno.test("parseConfig: fails with nonexistent file", async () => {
  await using env = await createTestEnvironment();
  const nonExistentPath = `${env.tempDir}/nonexistent.toml`;

  const result = await parseConfig(nonExistentPath).toResult();

  assertEquals(result.isErr(), true);
  assertEquals(result.error._tag, "FileNotFoundError");
});

Deno.test("parseConfig: fails when path is directory", async () => {
  await using env = await createTestEnvironment();

  const result = await parseConfig(env.themesDir).toResult();

  assertEquals(result.isErr(), true);
  assertEquals(result.error._tag, "FileNotTOMLError");
});

Deno.test("loadThemes: successfully loads themes from directory", async () => {
  await using env = await createTestEnvironment();

  await createTestThemes(env.themesDir, ["theme1", "theme2", "theme3"]);

  const result = await loadThemes(env.themesDir).toResult();

  assertEquals(result.isOk(), true);
  assertEquals(result.data.length, 3);

  const themeNames = result.data.map((t) => t.label).sort();
  assertEquals(themeNames, ["Theme1", "Theme2", "Theme3"]);

  // Verify paths are correct
  result.data.forEach((theme) => {
    assertEquals(theme.path.startsWith(env.themesDir), true);
    assertEquals(theme.path.endsWith(".toml"), true);
    assertEquals(theme.isCurrentlyActive, null);
  });
});

Deno.test("loadThemes: ignores non-TOML files", async () => {
  await using env = await createTestEnvironment();

  await createTestThemes(env.themesDir, ["theme1"]);
  await Deno.writeTextFile(`${env.themesDir}/readme.txt`, "not a theme");
  await Deno.writeTextFile(`${env.themesDir}/config.yaml`, "also not a theme");

  const result = await loadThemes(env.themesDir).toResult();

  assertEquals(result.isOk(), true);
  assertEquals(result.data.length, 1);
  assertEquals(result.data[0].label, "Theme1");
});

Deno.test("loadThemes: fails with empty directory", async () => {
  await using env = await createTestEnvironment();

  const result = await loadThemes(env.themesDir).toResult();

  assertEquals(result.isErr(), true);
  assertEquals(result.error._tag, "NoThemesFoundError");
});

Deno.test("loadThemes: fails with nonexistent directory", async () => {
  await using env = await createTestEnvironment();
  const nonExistentDir = `${env.tempDir}/nonexistent`;

  const result = await loadThemes(nonExistentDir).toResult();

  assertEquals(result.isErr(), true);
  assertEquals(result.error._tag, "DirectoryNotAccessibleError");
});

Deno.test("loadThemes: fails when path is file", async () => {
  await using env = await createTestEnvironment();

  await writeTestConfig(env.configPath, createBasicConfig());

  const result = await loadThemes(env.configPath).toResult();

  assertEquals(result.isErr(), true);
  assertEquals(result.error._tag, "DirectoryIsFileError");
});

Deno.test("checkThemeExists: finds existing theme", async () => {
  await using env = await createTestEnvironment();

  await createTestThemes(env.themesDir, ["monokai-pro", "one-dark"]);
  const themes = (await loadThemes(env.themesDir).toResult()).data;

  const result = await checkThemeExists("monokai-pro.toml", themes)
    .toResult();

  assertEquals(result.isOk(), true);
  assertEquals(result.data.label, "Monokai Pro");
});

Deno.test("checkThemeExists: fails with nonexistent theme", async () => {
  await using env = await createTestEnvironment();

  await createTestThemes(env.themesDir, ["theme1"]);
  const themes = (await loadThemes(env.themesDir).toResult()).data;

  const result = await checkThemeExists("nonexistent.toml", themes)
    .toResult();

  assertEquals(result.isErr(), true);
  assertEquals(result.error._tag, "ThemeNotFoundError");
});

Deno.test("checkThemeExists: fails with non-TOML theme", async () => {
  await using env = await createTestEnvironment();

  await createTestThemes(env.themesDir, ["theme1"]);
  const themes = (await loadThemes(env.themesDir).toResult()).data;

  // Manually add a non-TOML theme to the list
  const nonTomlTheme = {
    path: `${env.themesDir}/theme.txt`,
    label: "Non TOML",
    isCurrentlyActive: null,
  };
  themes.push(nonTomlTheme);

  const result = await checkThemeExists("theme.txt", themes).toResult();

  assertEquals(result.isErr(), true);
  assertEquals(result.error._tag, "ThemeNotTOMLError");
});
