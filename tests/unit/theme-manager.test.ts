import { assertEquals } from "@std/assert";
import { createThemeManager } from "../../src/theme-manager/theme-manager.ts";
import {
  assertFileExists,
  createBasicConfig,
  createTestEnvironment,
  createTestThemes,
  writeTestConfig,
} from "../utils/test-setup.ts";

Deno.test("createThemeManager: successfully creates manager", async () => {
  await using env = await createTestEnvironment();

  await writeTestConfig(env.configPath, createBasicConfig());
  await createTestThemes(env.themesDir, ["theme1", "theme2"]);

  const result = await createThemeManager({
    configPath: env.configPath,
    themesDirPath: env.themesDir,
    backupPath: env.backupPath,
  }).toResult();

  assertEquals(result.isOk(), true);

  const manager = result.data;
  assertEquals(typeof manager.getConfig, "function");
  assertEquals(typeof manager.listThemes, "function");
  assertEquals(typeof manager.applyTheme, "function");
  assertEquals(typeof manager.applyThemeByFilename, "function");
});

Deno.test("createThemeManager: creates config if it doesn't exist", async () => {
  await using env = await createTestEnvironment();
  const nonExistentConfigPath = `${env.tempDir}/nonexistent.toml`;

  await createTestThemes(env.themesDir, ["theme1"]);

  const result = await createThemeManager({
    configPath: nonExistentConfigPath,
    themesDirPath: env.themesDir,
    backupPath: env.backupPath,
  }).toResult();

  // Should succeed and create the config file
  assertEquals(result.isOk(), true);
  // Verify file was created
  const fileExists = await Deno.stat(nonExistentConfigPath).then(() => true)
    .catch(() => false);
  assertEquals(fileExists, true);
});

Deno.test("createThemeManager: creates themes directory if it doesn't exist", async () => {
  await using env = await createTestEnvironment();
  const nonExistentThemesDir = `${env.tempDir}/nonexistent`;

  await writeTestConfig(env.configPath, createBasicConfig());

  const result = await createThemeManager({
    configPath: env.configPath,
    themesDirPath: nonExistentThemesDir,
    backupPath: env.backupPath,
  }).toResult();

  // Should fail with NoThemesFoundError since the directory is empty
  assertEquals(result.isErr(), true);
  if (result.isErr()) {
    if (Array.isArray(result.error)) {
      throw new Error("Expected single error, got array");
    }
    assertEquals(result.error._tag, "NoThemesFoundError");
  }
  // Verify directory was created
  const dirExists = await Deno.stat(nonExistentThemesDir).then((s) =>
    s.isDirectory
  ).catch(() => false);
  assertEquals(dirExists, true);
});

Deno.test("ThemeManager.getConfig: returns current config", async () => {
  await using env = await createTestEnvironment();

  const originalConfig = createBasicConfig(["existing-theme.toml"]);
  await writeTestConfig(env.configPath, originalConfig);
  await createTestThemes(env.themesDir, ["theme1"]);

  const manager = (await createThemeManager({
    configPath: env.configPath,
    themesDirPath: env.themesDir,
    backupPath: env.backupPath,
  }).toResult()).data;

  const config = manager.getConfig();
  assertEquals(config.general?.import, ["existing-theme.toml"]);
});

Deno.test("ThemeManager.listThemes: returns all themes with active status", async () => {
  await using env = await createTestEnvironment();

  await writeTestConfig(env.configPath, createBasicConfig());
  await createTestThemes(env.themesDir, [
    "monokai-pro",
    "one-dark",
    "theme_with_underscores",
  ]);

  const manager = (await createThemeManager({
    configPath: env.configPath,
    themesDirPath: env.themesDir,
    backupPath: env.backupPath,
  }).toResult()).data;

  const themes = manager.listThemes();

  assertEquals(themes.length, 3);

  // Check theme labels are properly formatted
  const labels = themes.map((t) => t.label).sort();
  assertEquals(labels, ["Monokai Pro", "One Dark", "Theme With Underscores"]);

  // Initially no themes should be active
  const activeThemes = themes.filter((t) => t.isCurrentlyActive);
  assertEquals(activeThemes.length, 0);

  // All themes should have proper structure
  themes.forEach((theme) => {
    assertEquals(typeof theme.path, "string");
    assertEquals(typeof theme.label, "string");
    assertEquals(typeof theme.isCurrentlyActive, "boolean");
    assertEquals(theme.path.endsWith(".toml"), true);
  });
});

Deno.test("ThemeManager.applyTheme: applies theme and creates backup", async () => {
  await using env = await createTestEnvironment();

  const originalConfig = createBasicConfig(["existing-import.toml"]);
  await writeTestConfig(env.configPath, originalConfig);
  await createTestThemes(env.themesDir, ["monokai-pro", "one-dark"]);

  const manager = (await createThemeManager({
    configPath: env.configPath,
    themesDirPath: env.themesDir,
    backupPath: env.backupPath,
  }).toResult()).data;

  const themes = manager.listThemes();
  const selectedTheme = themes.find((t) => t.label === "Monokai Pro")!;

  const result = await manager.applyTheme(selectedTheme).toResult();

  assertEquals(result.isOk(), true);
  assertEquals(result.data.label, "Monokai Pro");

  // Verify backup was created
  await assertFileExists(env.backupPath);

  // Verify config was updated
  const newConfig = manager.getConfig();
  assertEquals(newConfig.general?.import?.length, 2);
  assertEquals(
    newConfig.general?.import?.includes("existing-import.toml"),
    true,
  );
  assertEquals(newConfig.general?.import?.includes(selectedTheme.path), true);

  // Config was written to file successfully
});

Deno.test("ThemeManager.applyTheme: replaces existing theme", async () => {
  await using env = await createTestEnvironment();

  await writeTestConfig(env.configPath, createBasicConfig());
  await createTestThemes(env.themesDir, ["theme1", "theme2"]);

  const manager = (await createThemeManager({
    configPath: env.configPath,
    themesDirPath: env.themesDir,
    backupPath: env.backupPath,
  }).toResult()).data;

  const themes = manager.listThemes();

  // Apply first theme
  await manager.applyTheme(themes[0]).toResult();
  let config = manager.getConfig();
  assertEquals(config.general?.import?.length, 1);
  assertEquals(config.general?.import?.[0], themes[0].path);

  // Apply second theme
  await manager.applyTheme(themes[1]).toResult();
  config = manager.getConfig();
  assertEquals(config.general?.import?.length, 1);
  assertEquals(config.general?.import?.[0], themes[1].path);
});

Deno.test("ThemeManager.applyTheme: handles config without general section", async () => {
  await using env = await createTestEnvironment();

  // Config without general section
  await writeTestConfig(env.configPath, { font: { size: 12 } });
  await createTestThemes(env.themesDir, ["theme1"]);

  const manager = (await createThemeManager({
    configPath: env.configPath,
    themesDirPath: env.themesDir,
    backupPath: env.backupPath,
  }).toResult()).data;

  const themes = manager.listThemes();
  const result = await manager.applyTheme(themes[0]).toResult();

  assertEquals(result.isOk(), true);

  const config = manager.getConfig();
  assertEquals(config.general?.import?.length, 1);
  assertEquals(config.general?.import?.[0], themes[0].path);
});

Deno.test("ThemeManager.applyThemeByFilename: applies theme by filename", async () => {
  await using env = await createTestEnvironment();

  await writeTestConfig(env.configPath, createBasicConfig());
  await createTestThemes(env.themesDir, ["monokai-pro", "one-dark"]);

  const manager = (await createThemeManager({
    configPath: env.configPath,
    themesDirPath: env.themesDir,
    backupPath: env.backupPath,
  }).toResult()).data;

  const result = await manager.applyThemeByFilename("monokai-pro.toml")
    .toResult();

  assertEquals(result.isOk(), true);
  assertEquals(result.data.label, "Monokai Pro");

  const config = manager.getConfig();
  assertEquals(
    config.general?.import?.some((i: string) => i.includes("monokai-pro.toml")),
    true,
  );
});

Deno.test("ThemeManager.applyThemeByFilename: fails with nonexistent theme", async () => {
  await using env = await createTestEnvironment();

  await writeTestConfig(env.configPath, createBasicConfig());
  await createTestThemes(env.themesDir, ["theme1"]);

  const manager = (await createThemeManager({
    configPath: env.configPath,
    themesDirPath: env.themesDir,
    backupPath: env.backupPath,
  }).toResult()).data;

  const result = await manager.applyThemeByFilename("nonexistent.toml")
    .toResult();

  assertEquals(result.isErr(), true);
  assertEquals(result.error._tag, "ThemeNotFoundError");
});

Deno.test("ThemeManager: active theme detection", async () => {
  await using env = await createTestEnvironment();

  await writeTestConfig(env.configPath, createBasicConfig());
  await createTestThemes(env.themesDir, ["theme1", "theme2", "theme3"]);

  const manager = (await createThemeManager({
    configPath: env.configPath,
    themesDirPath: env.themesDir,
    backupPath: env.backupPath,
  }).toResult()).data;

  // Initially no active themes
  let themes = manager.listThemes();
  assertEquals(themes.filter((t) => t.isCurrentlyActive).length, 0);

  // Apply first theme
  await manager.applyTheme(themes[0]).toResult();
  themes = manager.listThemes();
  assertEquals(themes.filter((t) => t.isCurrentlyActive).length, 1);
  assertEquals(themes.find((t) => t.isCurrentlyActive)?.path, themes[0].path);

  // Switch to second theme
  await manager.applyTheme(themes[1]).toResult();
  themes = manager.listThemes();
  assertEquals(themes.filter((t) => t.isCurrentlyActive).length, 1);
  assertEquals(themes.find((t) => t.isCurrentlyActive)?.path, themes[1].path);
});
