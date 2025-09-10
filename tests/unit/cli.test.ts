import { assertEquals } from "@std/assert";
import { bold, getArgs, getHomeDir, underscore } from "../../src/cli.ts";

// Mock environment for testing getHomeDir function
const originalEnv = {
  HOME: Deno.env.get("HOME"),
  USERPROFILE: Deno.env.get("USERPROFILE"),
  APPDATA: Deno.env.get("APPDATA"),
  XDG_CONFIG_HOME: Deno.env.get("XDG_CONFIG_HOME"),
};

function setTestEnv(
  home?: string,
  userProfile?: string,
  appData?: string,
  xdgConfigHome?: string,
) {
  if (home !== undefined) {
    Deno.env.set("HOME", home);
  } else {
    Deno.env.delete("HOME");
  }

  if (userProfile !== undefined) {
    Deno.env.set("USERPROFILE", userProfile);
  } else {
    Deno.env.delete("USERPROFILE");
  }

  if (appData !== undefined) {
    Deno.env.set("APPDATA", appData);
  } else {
    Deno.env.delete("APPDATA");
  }

  if (xdgConfigHome !== undefined) {
    Deno.env.set("XDG_CONFIG_HOME", xdgConfigHome);
  } else {
    Deno.env.delete("XDG_CONFIG_HOME");
  }
}

function restoreEnv() {
  if (originalEnv.HOME) {
    Deno.env.set("HOME", originalEnv.HOME);
  } else {
    Deno.env.delete("HOME");
  }

  if (originalEnv.USERPROFILE) {
    Deno.env.set("USERPROFILE", originalEnv.USERPROFILE);
  } else {
    Deno.env.delete("USERPROFILE");
  }

  if (originalEnv.APPDATA) {
    Deno.env.set("APPDATA", originalEnv.APPDATA);
  } else {
    Deno.env.delete("APPDATA");
  }

  if (originalEnv.XDG_CONFIG_HOME) {
    Deno.env.set("XDG_CONFIG_HOME", originalEnv.XDG_CONFIG_HOME);
  } else {
    Deno.env.delete("XDG_CONFIG_HOME");
  }
}

Deno.test("getArgs: default values with POSIX OS", () => {
  const args = getArgs([], "/home/user", "linux");

  assertEquals(args.help, false);
  assertEquals(args.version, false);
  assertEquals(args.config, "/home/user/.config/alacritty/alacritty.toml");
  assertEquals(args.themes, "/home/user/.config/alacritty/themes");
  assertEquals(args.backup, "/home/user/.config/alacritty/alacritty.bak.toml");
  assertEquals(args.select, undefined);
  assertEquals(args._, []);
});

Deno.test("getArgs: default values with Windows OS", () => {
  const args = getArgs([], "C:\\Users\\user", "windows");

  // Note: @std/path join normalizes to forward slashes even on Windows when running on POSIX
  assertEquals(args.config, "C:\\Users\\user/alacritty/alacritty.toml");
  assertEquals(args.themes, "C:\\Users\\user/alacritty/themes");
  assertEquals(args.backup, "C:\\Users\\user/alacritty/alacritty.bak.toml");
});

Deno.test("getArgs: help flag short form", () => {
  const args = getArgs(["-h"], "/home/user", "linux");

  assertEquals(args.help, true);
  assertEquals(args.version, false);
});

Deno.test("getArgs: help flag long form", () => {
  const args = getArgs(["--help"], "/home/user", "linux");

  assertEquals(args.help, true);
  assertEquals(args.version, false);
});

Deno.test("getArgs: version flag short form", () => {
  const args = getArgs(["-v"], "/home/user", "linux");

  assertEquals(args.help, false);
  assertEquals(args.version, true);
});

Deno.test("getArgs: version flag long form", () => {
  const args = getArgs(["--version"], "/home/user", "linux");

  assertEquals(args.help, false);
  assertEquals(args.version, true);
});

Deno.test("getArgs: custom config path short form", () => {
  const args = getArgs(["-c", "/custom/config.toml"], "/home/user", "linux");

  assertEquals(args.config, "/custom/config.toml");
});

Deno.test("getArgs: custom config path long form", () => {
  const args = getArgs(
    ["--config", "/custom/config.toml"],
    "/home/user",
    "linux",
  );

  assertEquals(args.config, "/custom/config.toml");
});

Deno.test("getArgs: custom themes directory", () => {
  const args = getArgs(["-t", "/custom/themes"], "/home/user", "linux");

  assertEquals(args.themes, "/custom/themes");
});

Deno.test("getArgs: custom backup path", () => {
  const args = getArgs(["-b", "/custom/backup.toml"], "/home/user", "linux");

  assertEquals(args.backup, "/custom/backup.toml");
});

Deno.test("getArgs: select theme", () => {
  const args = getArgs(["-s", "monokai-pro.toml"], "/home/user", "linux");

  assertEquals(args.select, "monokai-pro.toml");
});

Deno.test("getArgs: multiple flags combined", () => {
  const args = getArgs(
    [
      "-c",
      "/custom/config.toml",
      "-t",
      "/custom/themes",
      "-b",
      "/custom/backup.toml",
      "-s",
      "theme.toml",
    ],
    "/home/user",
    "linux",
  );

  assertEquals(args.config, "/custom/config.toml");
  assertEquals(args.themes, "/custom/themes");
  assertEquals(args.backup, "/custom/backup.toml");
  assertEquals(args.select, "theme.toml");
});

Deno.test("getArgs: positional arguments", () => {
  const args = getArgs(["arg1", "arg2", "123"], "/home/user", "linux");

  assertEquals(args._, ["arg1", "arg2", 123]);
});

Deno.test("getArgs: mixed flags and positional args", () => {
  const args = getArgs(
    ["-h", "positional", "--config", "/path", "another"],
    "/home/user",
    "linux",
  );

  assertEquals(args.help, true);
  assertEquals(args.config, "/path");
  assertEquals(args._, ["positional", "another"]);
});

Deno.test("bold: formats text with bold escape codes", () => {
  const result = bold("test text");
  assertEquals(result, "\x1b[1mtest text\x1b[0m");
});

Deno.test("bold: handles empty string", () => {
  const result = bold("");
  assertEquals(result, "\x1b[1m\x1b[0m");
});

Deno.test("bold: handles special characters", () => {
  const result = bold("test@#$%^&*()");
  assertEquals(result, "\x1b[1mtest@#$%^&*()\x1b[0m");
});

Deno.test("underscore: formats text with underline escape codes", () => {
  const result = underscore("test text");
  assertEquals(result, "\x1b[4mtest text\x1b[0m");
});

Deno.test("underscore: handles empty string", () => {
  const result = underscore("");
  assertEquals(result, "\x1b[4m\x1b[0m");
});

Deno.test("underscore: handles special characters", () => {
  const result = underscore("test@#$%^&*()");
  assertEquals(result, "\x1b[4mtest@#$%^&*()\x1b[0m");
});

Deno.test("bold and underscore: can be combined", () => {
  const result = bold(underscore("test"));
  assertEquals(result, "\x1b[1m\x1b[4mtest\x1b[0m\x1b[0m");
});

Deno.test("getArgs: uses provided homeDir parameter", () => {
  const args = getArgs([], "/custom/home", "linux");

  assertEquals(args.config, "/custom/home/.config/alacritty/alacritty.toml");
  assertEquals(args.themes, "/custom/home/.config/alacritty/themes");
  assertEquals(
    args.backup,
    "/custom/home/.config/alacritty/alacritty.bak.toml",
  );
});

// Tests for getHomeDir function (which still has side effects)
Deno.test("getHomeDir: uses HOME on POSIX systems", () => {
  setTestEnv("/home/user");

  const homeDir = getHomeDir("linux");

  assertEquals(homeDir, "/home/user");

  restoreEnv();
});

Deno.test("getHomeDir: uses XDG_CONFIG_HOME as fallback on POSIX", () => {
  setTestEnv(undefined, undefined, undefined, "/home/user/.config");

  const homeDir = getHomeDir("linux");

  assertEquals(homeDir, "/home/user/.config");

  restoreEnv();
});

Deno.test("getHomeDir: uses APPDATA on Windows", () => {
  setTestEnv(undefined, undefined, "C:\\Users\\user\\AppData\\Roaming");

  const homeDir = getHomeDir("windows");

  assertEquals(homeDir, "C:\\Users\\user\\AppData\\Roaming");

  restoreEnv();
});

Deno.test("getHomeDir: uses USERPROFILE as fallback on Windows", () => {
  setTestEnv(undefined, "C:\\Users\\user");

  const homeDir = getHomeDir("windows");

  assertEquals(homeDir, "C:\\Users\\user");

  restoreEnv();
});

Deno.test("getHomeDir: falls back to current directory when no env vars", () => {
  setTestEnv(undefined, undefined, undefined, undefined);

  const homeDir = getHomeDir("linux");

  // Should be current working directory
  assertEquals(typeof homeDir, "string");
  assertEquals(homeDir.length > 0, true);

  restoreEnv();
});
