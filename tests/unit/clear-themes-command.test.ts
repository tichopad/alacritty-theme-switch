/**
 * Unit tests for the clear-themes command.
 */

import { assertEquals } from "@std/assert";
import { clearThemesCommand } from "../../src/commands/clear-themes.ts";

Deno.test("clearThemesCommand: successfully deletes all theme files", async () => {
  const tempDir = await Deno.makeTempDir();

  // Create some test theme files
  await Deno.writeTextFile(
    `${tempDir}/theme1.toml`,
    '[colors.primary]\nbackground = "#000000"',
  );
  await Deno.writeTextFile(
    `${tempDir}/theme2.toml`,
    '[colors.primary]\nbackground = "#111111"',
  );
  await Deno.writeTextFile(
    `${tempDir}/theme3.toml`,
    '[colors.primary]\nbackground = "#222222"',
  );

  // Also create a non-toml file to ensure it's not deleted
  await Deno.writeTextFile(`${tempDir}/readme.txt`, "This is a readme");

  try {
    const result = await clearThemesCommand({
      themesPath: tempDir,
    });

    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      assertEquals(result.value.length, 3);

      // Verify theme files were deleted
      const theme1Exists = await Deno.stat(`${tempDir}/theme1.toml`)
        .then(() => true)
        .catch(() => false);
      const theme2Exists = await Deno.stat(`${tempDir}/theme2.toml`)
        .then(() => true)
        .catch(() => false);
      const theme3Exists = await Deno.stat(`${tempDir}/theme3.toml`)
        .then(() => true)
        .catch(() => false);

      assertEquals(theme1Exists, false);
      assertEquals(theme2Exists, false);
      assertEquals(theme3Exists, false);

      // Verify non-toml file still exists
      const readmeExists = await Deno.stat(`${tempDir}/readme.txt`)
        .then(() => true)
        .catch(() => false);
      assertEquals(readmeExists, true);
    }
  } finally {
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("clearThemesCommand: returns error for nonexistent directory", async () => {
  const result = await clearThemesCommand({
    themesPath: "/nonexistent/directory",
  });

  assertEquals(result.isErr(), true);
  if (result.isErr()) {
    if (Array.isArray(result.error)) {
      throw new Error("Expected single error, got array");
    }
    assertEquals(result.error._tag, "DirectoryNotAccessibleError");
  }
});

Deno.test("clearThemesCommand: returns error for empty directory", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const result = await clearThemesCommand({
      themesPath: tempDir,
    });

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      if (Array.isArray(result.error)) {
        throw new Error("Expected single error, got array");
      }
      assertEquals(result.error._tag, "NoThemesFoundError");
    }
  } finally {
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("clearThemesCommand: returns error for directory with no toml files", async () => {
  const tempDir = await Deno.makeTempDir();

  // Create only non-toml files
  await Deno.writeTextFile(`${tempDir}/readme.txt`, "This is a readme");
  await Deno.writeTextFile(`${tempDir}/config.json`, "{}");

  try {
    const result = await clearThemesCommand({
      themesPath: tempDir,
    });

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      if (Array.isArray(result.error)) {
        throw new Error("Expected single error, got array");
      }
      assertEquals(result.error._tag, "NoThemesFoundError");
    }
  } finally {
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("clearThemesCommand: deletes themes in subdirectories", async () => {
  const tempDir = await Deno.makeTempDir();

  // Create theme files in subdirectories
  await Deno.mkdir(`${tempDir}/subdir1`, { recursive: true });
  await Deno.mkdir(`${tempDir}/subdir2`, { recursive: true });

  await Deno.writeTextFile(
    `${tempDir}/theme1.toml`,
    '[colors.primary]\nbackground = "#000000"',
  );
  await Deno.writeTextFile(
    `${tempDir}/subdir1/theme2.toml`,
    '[colors.primary]\nbackground = "#111111"',
  );
  await Deno.writeTextFile(
    `${tempDir}/subdir2/theme3.toml`,
    '[colors.primary]\nbackground = "#222222"',
  );

  try {
    const result = await clearThemesCommand({
      themesPath: tempDir,
    });

    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      assertEquals(result.value.length, 3);

      // Verify all theme files were deleted
      const theme1Exists = await Deno.stat(`${tempDir}/theme1.toml`)
        .then(() => true)
        .catch(() => false);
      const theme2Exists = await Deno.stat(`${tempDir}/subdir1/theme2.toml`)
        .then(() => true)
        .catch(() => false);
      const theme3Exists = await Deno.stat(`${tempDir}/subdir2/theme3.toml`)
        .then(() => true)
        .catch(() => false);

      assertEquals(theme1Exists, false);
      assertEquals(theme2Exists, false);
      assertEquals(theme3Exists, false);
    }
  } finally {
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("clearThemesCommand: returns ResultAsync that can be chained", async () => {
  const tempDir = await Deno.makeTempDir();

  // Create some test theme files
  await Deno.writeTextFile(
    `${tempDir}/theme1.toml`,
    '[colors.primary]\nbackground = "#000000"',
  );
  await Deno.writeTextFile(
    `${tempDir}/theme2.toml`,
    '[colors.primary]\nbackground = "#111111"',
  );

  try {
    // Test that the function returns a ResultAsync that can be chained
    const resultAsync = clearThemesCommand({
      themesPath: tempDir,
    });

    // Chain a map operation to verify it's a proper ResultAsync
    const mappedResult = await resultAsync
      .map((paths) => `Deleted ${paths.length} files`);

    assertEquals(mappedResult.isOk(), true);
    if (mappedResult.isOk()) {
      assertEquals(mappedResult.value, "Deleted 2 files");
    }
  } finally {
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("clearThemesCommand: can use match pattern for error handling", async () => {
  let errorHandled = false;
  let successHandled = false;

  await clearThemesCommand({
    themesPath: "/nonexistent/directory",
  }).match(
    (_count) => {
      successHandled = true;
    },
    (error) => {
      errorHandled = true;
      if (Array.isArray(error)) {
        throw new Error("Expected single error, got array");
      }
      assertEquals(error._tag, "DirectoryNotAccessibleError");
    },
  );

  assertEquals(errorHandled, true);
  assertEquals(successHandled, false);
});
