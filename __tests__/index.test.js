const fs = require("fs-extra");
const mockFs = require("mock-fs");
const {
  pipe,
  unslugify,
  readToml,
  loadThemes,
  applyTheme,
  useSaveSelectedTheme,
} = require("../src/index");

beforeEach(() => {
  mockFs({
    "alacritty.toml": `
[colors.primary]
background = '0x111111'
foreground = '0x222222'

[font.normal]
style = 'Regular'
    `,
    themes: {
      "monokai_pro.toml": `
[colors.primary]
background = '0x333333'
foreground = '0x444444'
      `,
      "breeze.toml": `
[colors.primary]
background = '0x555555'
foreground = '0x666666'
      `,
      "deep_one.toml": `
[colors.primary]
background = '0x777777'
      `,
      "not_a_toml.json": `
{
  "hello": "There!"
}
      `,
    },
  });
});

afterEach(() => {
  mockFs.restore();
});

describe('Function "pipe"', () => {
  test("Correctly applies all given functions in order", () => {
    const mockUpperCase = jest.fn((s) => s.toUpperCase());
    const mockAddOranges = jest.fn((s) => `${s}, oranges`);
    const mockExclaim = jest.fn((s) => `${s}!`);
    const result = pipe("apples")(mockUpperCase, mockAddOranges, mockExclaim);

    expect(result).toBe("APPLES, oranges!");
    expect(mockUpperCase).toHaveBeenCalledWith("apples");
    expect(mockAddOranges).toHaveBeenCalledWith("APPLES");
    expect(mockExclaim).toHaveBeenCalledWith("APPLES, oranges");
  });
});

describe('Function "unslugify"', () => {
  test('Transforms "slugified" TOML filenames to readable format', () => {
    const slugs = [
      "monokai_pro.toml",
      "terminal.app.toml",
      "walton-lincoln_dark.toml",
      "breeze.toml",
    ];
    const transformed = slugs.map(unslugify);

    expect(transformed).toEqual([
      "Monokai Pro",
      "Terminal.app",
      "Walton-lincoln Dark",
      "Breeze",
    ]);
  });
});

describe('Function "loadThemes"', () => {
  test("Lists all TOML files in a directory sorted", async () => {
    const files = await loadThemes("themes");

    expect(files).toEqual([
      {
        path: expect.stringMatching(/breeze\.toml$/),
        stats: expect.anything(),
      },
      {
        path: expect.stringMatching(/deep_one\.toml$/),
        stats: expect.anything(),
      },
      {
        path: expect.stringMatching(/monokai_pro\.toml$/),
        stats: expect.anything(),
      },
    ]);
  });
});

describe('Function "readToml"', () => {
  test("Loads TOML file as an object", async () => {
    const toml = await readToml("themes/monokai_pro.toml");

    expect(toml).toEqual({
      colors: {
        primary: {
          background: "0x333333",
          foreground: "0x444444",
        },
      },
    });
  });
  test("Throws when passed file is not a TOML", async () => {
    expect(readToml("themes/not_a_toml.txt")).rejects.toBeInstanceOf(Error);
  });
});

describe('Function "applyTheme"', () => {
  test("Merges given config file with root config file", async () => {
    await applyTheme("themes/monokai_pro.toml", "alacritty.toml");
    const toml = await readToml("alacritty.toml");

    expect(toml).toEqual({
      colors: {
        primary: {
          background: "0x333333",
          foreground: "0x444444",
        },
      },
      font: {
        normal: {
          style: "Regular",
        },
      },
    });
  });
  test("Merges given config file deeply", async () => {
    await applyTheme("themes/deep_one.toml", "alacritty.toml");
    const toml = await readToml("alacritty.toml");

    expect(toml).toEqual({
      colors: {
        primary: {
          background: "0x777777",
          foreground: "0x222222",
        },
      },
      font: {
        normal: {
          style: "Regular",
        },
      },
    });
  });
});

describe('Function "useSaveSelectedTheme"', () => {
  test("Saves and loads savefile correctly", async () => {
    const savefile = useSaveSelectedTheme(".selected_theme");
    await savefile.saveSelected("themes/monokai_pro.toml");
    const savefileExists = await fs.pathExists(".selected_theme");
    const savedData = await savefile.getSelected();

    expect(savefileExists).toBe(true);
    expect(savedData).toBe("themes/monokai_pro.toml");
  });
  test("Returns null if the savefile does not exist", async () => {
    const savefile = useSaveSelectedTheme(".selected_theme");
    const savedData = await savefile.getSelected();

    expect(savedData).toBeNull();
  });
});
