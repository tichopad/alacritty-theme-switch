import { stringify } from "@std/toml/stringify";
import { parse } from "@std/toml/parse";

/**
 * Test environment setup for creating temporary directories and files.
 */
export interface TestEnvironment {
  tempDir: string;
  configPath: string;
  themesDir: string;
  backupPath: string;
  [Symbol.asyncDispose](): Promise<void>;
}

/**
 * Creates a temporary test environment with all necessary directories and paths.
 * Each test gets a unique temporary directory to ensure test isolation.
 */
export async function createTestEnvironment(): Promise<TestEnvironment> {
  const tempDir = await Deno.makeTempDir({ prefix: "ats_test_" });
  const configPath = `${tempDir}/alacritty.toml`;
  const themesDir = `${tempDir}/themes`;
  const backupPath = `${tempDir}/alacritty.bak.toml`;

  // Create themes directory
  await Deno.mkdir(themesDir, { recursive: true });

  return {
    tempDir,
    configPath,
    themesDir,
    backupPath,
    [Symbol.asyncDispose]: async () => {
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch (error) {
        // Ignore cleanup errors in tests - they shouldn't fail the test
        console.warn(`Failed to cleanup test directory ${tempDir}:`, error);
      }
    },
  };
}

/**
 * Writes a test configuration file in TOML format.
 */
export async function writeTestConfig(
  path: string,
  config: Record<string, unknown>,
): Promise<void> {
  await Deno.writeTextFile(path, stringify(config));
}

/**
 * Writes a test theme file in TOML format.
 */
export async function writeTestTheme(
  path: string,
  theme: Record<string, unknown>,
): Promise<void> {
  await Deno.writeTextFile(path, stringify(theme));
}

/**
 * Creates a basic Alacritty configuration for testing.
 */
export function createBasicConfig(
  imports: string[] = [],
): Record<string, unknown> {
  return {
    general: {
      import: imports,
    },
    font: {
      size: 12,
    },
    window: {
      opacity: 0.9,
    },
  };
}

/**
 * Creates a basic theme configuration for testing.
 */
export function createBasicTheme(): Record<string, unknown> {
  return {
    colors: {
      primary: {
        background: "#000000",
        foreground: "#ffffff",
      },
      normal: {
        black: "#000000",
        red: "#ff0000",
        green: "#00ff00",
        yellow: "#ffff00",
        blue: "#0000ff",
        magenta: "#ff00ff",
        cyan: "#00ffff",
        white: "#ffffff",
      },
    },
  };
}

/**
 * Creates multiple test themes in the specified directory.
 */
export async function createTestThemes(
  themesDir: string,
  themeNames: string[] = ["theme1", "theme2", "theme3"],
): Promise<void> {
  for (const name of themeNames) {
    const themePath = `${themesDir}/${name}.toml`;
    await writeTestTheme(themePath, createBasicTheme());
  }
}

/**
 * Asserts that a file exists at the given path.
 */
export async function assertFileExists(path: string): Promise<void> {
  try {
    const stat = await Deno.stat(path);
    if (!stat.isFile) {
      throw new Error(`Path exists but is not a file: ${path}`);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`File does not exist: ${path}`);
    }
    throw error;
  }
}

/**
 * Asserts that a directory exists at the given path.
 */
export async function assertDirectoryExists(path: string): Promise<void> {
  try {
    const stat = await Deno.stat(path);
    if (!stat.isDirectory) {
      throw new Error(`Path exists but is not a directory: ${path}`);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`Directory does not exist: ${path}`);
    }
    throw error;
  }
}

/**
 * Reads and parses a TOML file for testing.
 */
export async function readTestToml(path: string): Promise<object> {
  const content = await Deno.readTextFile(path);
  return parse(content);
}
