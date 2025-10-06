import { assertEquals } from "@std/assert";
import { parse } from "@std/toml/parse";
import { detectThemeBrightness } from "../../src/theme-manager/utils.ts";

Deno.test("detectThemeBrightness - should detect dark theme (one-dark)", () => {
  const theme = {
    colors: {
      primary: {
        background: "#1e2127",
        foreground: "#abb2bf",
      },
    },
  };

  const result = detectThemeBrightness(theme);
  assertEquals(result, "dark");
});

Deno.test("detectThemeBrightness - should detect dark theme (monokai-pro)", () => {
  const theme = {
    colors: {
      primary: {
        background: "#2D2A2E",
        foreground: "#FCFCFA",
      },
    },
  };

  const result = detectThemeBrightness(theme);
  assertEquals(result, "dark");
});

Deno.test("detectThemeBrightness - should detect light theme (white background)", () => {
  const theme = {
    colors: {
      primary: {
        background: "#ffffff",
        foreground: "#000000",
      },
    },
  };

  const result = detectThemeBrightness(theme);
  assertEquals(result, "light");
});

Deno.test("detectThemeBrightness - should detect light theme (light gray background)", () => {
  const theme = {
    colors: {
      primary: {
        background: "#f0f0f0",
        foreground: "#333333",
      },
    },
  };

  const result = detectThemeBrightness(theme);
  assertEquals(result, "light");
});

Deno.test("detectThemeBrightness - should handle 3-digit hex colors (dark)", () => {
  const theme = {
    colors: {
      primary: {
        background: "#222",
        foreground: "#fff",
      },
    },
  };

  const result = detectThemeBrightness(theme);
  assertEquals(result, "dark");
});

Deno.test("detectThemeBrightness - should handle 3-digit hex colors (light)", () => {
  const theme = {
    colors: {
      primary: {
        background: "#eee",
        foreground: "#000",
      },
    },
  };

  const result = detectThemeBrightness(theme);
  assertEquals(result, "light");
});

Deno.test("detectThemeBrightness - should default to dark for missing background", () => {
  const theme = {
    colors: {
      primary: {
        foreground: "#abb2bf",
      },
    },
  };

  const result = detectThemeBrightness(theme);
  assertEquals(result, "dark");
});

Deno.test("detectThemeBrightness - should default to dark for missing colors", () => {
  const theme = {};

  const result = detectThemeBrightness(theme);
  assertEquals(result, "dark");
});

Deno.test("detectThemeBrightness - should default to dark for invalid hex color", () => {
  const theme = {
    colors: {
      primary: {
        background: "not-a-color",
        foreground: "#abb2bf",
      },
    },
  };

  const result = detectThemeBrightness(theme);
  assertEquals(result, "dark");
});

Deno.test("detectThemeBrightness - should handle hex without # prefix", () => {
  const theme = {
    colors: {
      primary: {
        background: "1e2127",
        foreground: "abb2bf",
      },
    },
  };

  const result = detectThemeBrightness(theme);
  assertEquals(result, "dark");
});

Deno.test("detectThemeBrightness - should work with actual TOML parsed theme", async () => {
  const tomlContent = await Deno.readTextFile(
    "tests/fixtures/themes/one-dark.toml",
  );
  const theme = parse(tomlContent);

  const result = detectThemeBrightness(theme);
  assertEquals(result, "dark");
});

Deno.test("detectThemeBrightness - should detect edge case near threshold (dark)", () => {
  // RGB(186, 186, 186) has luminance ~0.47, should be dark
  const theme = {
    colors: {
      primary: {
        background: "#bababa",
        foreground: "#000000",
      },
    },
  };

  const result = detectThemeBrightness(theme);
  assertEquals(result, "dark");
});

Deno.test("detectThemeBrightness - should detect edge case near threshold (light)", () => {
  // RGB(200, 200, 200) has luminance ~0.58, should be light
  const theme = {
    colors: {
      primary: {
        background: "#c8c8c8",
        foreground: "#000000",
      },
    },
  };

  const result = detectThemeBrightness(theme);
  assertEquals(result, "light");
});
