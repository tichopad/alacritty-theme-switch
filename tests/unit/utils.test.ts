import { assertEquals } from "@std/assert";
import { isToml, unslugify } from "../../src/theme-manager/utils.ts";

Deno.test("unslugify: basic underscore replacement", () => {
  assertEquals(unslugify("monokai_pro.toml"), "Monokai Pro");
});

Deno.test("unslugify: basic dash replacement", () => {
  assertEquals(unslugify("one-dark.toml"), "One Dark");
});

Deno.test("unslugify: mixed separators", () => {
  assertEquals(
    unslugify("theme_with-mixed_separators.toml"),
    "Theme With Mixed Separators",
  );
});

Deno.test("unslugify: numbers in filename", () => {
  assertEquals(
    unslugify("theme-with-numbers-123.toml"),
    "Theme With Numbers 123",
  );
});

Deno.test("unslugify: single word", () => {
  assertEquals(unslugify("simple.toml"), "Simple");
});

Deno.test("unslugify: uppercase preservation", () => {
  assertEquals(unslugify("UPPERCASE_THEME.toml"), "UPPERCASE THEME");
});

Deno.test("unslugify: mixed case", () => {
  assertEquals(unslugify("MixedCase_Theme.toml"), "MixedCase Theme");
});

Deno.test("unslugify: special characters removal", () => {
  assertEquals(
    unslugify("theme@with#special$chars.toml"),
    "Theme With Special Chars",
  );
});

Deno.test("unslugify: multiple consecutive separators", () => {
  assertEquals(
    unslugify("theme___with---multiple____separators.toml"),
    "Theme With Multiple Separators",
  );
});

Deno.test("unslugify: leading and trailing separators", () => {
  assertEquals(unslugify("_-theme-name-_.toml"), "Theme Name");
});

Deno.test("unslugify: empty filename", () => {
  assertEquals(unslugify(".toml"), "");
});

Deno.test("unslugify: only separators", () => {
  assertEquals(unslugify("___---.toml"), "");
});

Deno.test("unslugify: alphanumeric only", () => {
  assertEquals(unslugify("theme123abc.toml"), "Theme123abc");
});

Deno.test("unslugify: complex real-world example", () => {
  assertEquals(
    unslugify("dracula_pro_van_helsing.toml"),
    "Dracula Pro Van Helsing",
  );
});

Deno.test("unslugify: another complex example", () => {
  assertEquals(
    unslugify("gruvbox-material-dark-hard.toml"),
    "Gruvbox Material Dark Hard",
  );
});

Deno.test("isToml: valid TOML file", () => {
  assertEquals(isToml("theme.toml"), true);
});

Deno.test("isToml: TOML with path", () => {
  assertEquals(isToml("/path/to/theme.toml"), true);
});

Deno.test("isToml: YAML file", () => {
  assertEquals(isToml("config.yaml"), false);
});

Deno.test("isToml: JSON file", () => {
  assertEquals(isToml("data.json"), false);
});

Deno.test("isToml: text file", () => {
  assertEquals(isToml("file.txt"), false);
});

Deno.test("isToml: no extension", () => {
  assertEquals(isToml("no-extension"), false);
});

Deno.test("isToml: empty string", () => {
  assertEquals(isToml(""), false);
});

Deno.test("isToml: only extension", () => {
  assertEquals(isToml(".toml"), true);
});

Deno.test("isToml: multiple dots", () => {
  assertEquals(isToml("file.backup.toml"), true);
});

Deno.test("isToml: case sensitivity", () => {
  assertEquals(isToml("file.TOML"), false);
  assertEquals(isToml("file.Toml"), false);
});

Deno.test("isToml: TOML in middle of filename", () => {
  assertEquals(isToml("toml-file.txt"), false);
});

Deno.test("isToml: complex path with TOML extension", () => {
  assertEquals(
    isToml("/home/user/.config/alacritty/themes/monokai-pro.toml"),
    true,
  );
});

Deno.test("isToml: Windows path with TOML extension", () => {
  assertEquals(isToml("C:\\Users\\user\\themes\\theme.toml"), true);
});

Deno.test("isToml: relative path with TOML extension", () => {
  assertEquals(isToml("./themes/theme.toml"), true);
  assertEquals(isToml("../themes/theme.toml"), true);
});
