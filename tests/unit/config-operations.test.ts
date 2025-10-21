import { assertEquals } from "@std/assert";
import {
  createBackup,
  parseConfig,
  writeConfigToFile,
} from "../../src/theme-manager/config-operations.ts";
import type { Config } from "../../src/types.ts";
import {
  assertFileExists,
  createBasicConfig,
  createTestEnvironment,
  writeTestConfig,
} from "../utils/test-setup.ts";

Deno.test("createBackup: successfully creates backup file", async () => {
  await using env = await createTestEnvironment();

  // Create original config
  await writeTestConfig(env.configPath, createBasicConfig());

  // Create backup
  const result = await createBackup(env.configPath, env.backupPath);

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
  const result = await createBackup(env.configPath, env.backupPath);

  assertEquals(result.isOk(), true);

  // Verify backup was overwritten
  const backupContent = await Deno.readTextFile(env.backupPath);
  const originalContent = await Deno.readTextFile(env.configPath);
  assertEquals(backupContent, originalContent);
});

Deno.test("createBackup: fails when source file doesn't exist", async () => {
  await using env = await createTestEnvironment();

  const nonExistentPath = `${env.tempDir}/nonexistent.toml`;

  const result = await createBackup(nonExistentPath, env.backupPath);

  assertEquals(result.isErr(), true);
  if (result.isErr()) {
    assertEquals(result.error._tag, "BackupError");
  }
});

Deno.test("writeConfigToFile: successfully writes config", async () => {
  await using env = await createTestEnvironment();

  const config = createBasicConfig(["theme1.toml"]);
  const result = await writeConfigToFile(env.configPath, config);

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
  const result = await writeConfigToFile(invalidPath, config);

  assertEquals(result.isErr(), true);
  if (result.isErr()) {
    assertEquals(result.error._tag, "WriteError");
  }
});

Deno.test("parseConfig: successfully parses valid TOML config", async () => {
  await using env = await createTestEnvironment();

  await writeTestConfig(env.configPath, createBasicConfig(["theme1.toml"]));

  const result = await parseConfig(env.configPath);

  assertEquals(result.isOk(), true);
  if (result.isOk()) {
    const config = result.value as Config;
    assertEquals((config.general as { import?: string[] })?.import, [
      "theme1.toml",
    ]);
  }
});

Deno.test("parseConfig: fails with non-TOML file", async () => {
  await using env = await createTestEnvironment();
  const txtPath = `${env.tempDir}/config.txt`;

  await Deno.writeTextFile(txtPath, "not a toml file");

  const result = await parseConfig(txtPath);

  assertEquals(result.isErr(), true);
  if (result.isErr()) {
    assertEquals(result.error._tag, "FileNotTOMLError");
  }
});

Deno.test("parseConfig: creates file if it doesn't exist", async () => {
  await using env = await createTestEnvironment();
  const nonExistentPath = `${env.tempDir}/nonexistent.toml`;

  const result = await parseConfig(nonExistentPath);

  assertEquals(result.isOk(), true);
  if (result.isOk()) {
    // Should create a minimal config with empty imports
    const config = result.value as Config;
    assertEquals((config.general as { import?: string[] })?.import, []);
  }
  // Verify file was created
  const fileExists = await Deno.stat(nonExistentPath).then(() => true).catch(
    () => false,
  );
  assertEquals(fileExists, true);
});

Deno.test("parseConfig: fails when path is directory", async () => {
  await using env = await createTestEnvironment();

  const result = await parseConfig(env.themesDir);

  assertEquals(result.isErr(), true);
  if (result.isErr()) {
    assertEquals(result.error._tag, "FileNotTOMLError");
  }
});
