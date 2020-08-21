const fs = require('fs-extra');
const mockFs = require('mock-fs');
const { pipe, unslugify, readYaml, loadThemes, applyTheme, useSaveSelectedTheme } = require('../src/index');

beforeEach(() => {
  mockFs({
    'alacritty.yml': `
      colors:
        primary:
          background: '0x111111'
          foreground: '0x222222'
      font:
        normal:
          style: Regular
    `,
    themes: {
      'monokai_pro.yml': `
        colors:
          primary:
            background: '0x333333'
            foreground: '0x444444'
      `,
      'breeze.yaml': `
        colors:
          primary:
            background: '0x555555'
            foreground: '0x666666'
      `,
      'deep_one.yaml': `
        colors:
          primary:
            background: '0x777777'
      `,
      'not_a_yaml.json': `
        {
          hello: "There!"
        }
      `,
    },
  });
});

afterEach(() => {
  mockFs.restore();
});

describe('Function "pipe"', () => {
  test('Correctly applies all given functions in order', () => {
    const mockUpperCase = jest.fn(s => s.toUpperCase());
    const mockAddOranges = jest.fn(s => `${s}, oranges`);
    const mockExclaim = jest.fn(s => `${s}!`);
    const result = pipe('apples')(mockUpperCase, mockAddOranges, mockExclaim);

    expect(result).toBe('APPLES, oranges!');
    expect(mockUpperCase).toHaveBeenCalledWith('apples');
    expect(mockAddOranges).toHaveBeenCalledWith('APPLES');
    expect(mockExclaim).toHaveBeenCalledWith('APPLES, oranges');
  });
});

describe('Function "unslugify"', () => {
  test('Transforms "slugified" YAML filenames to readable format', () => {
    const slugs = ['monokai_pro.yml', 'terminal.app.yml', 'walton-lincoln_dark.yaml', 'breeze.yaml'];
    const transformed = slugs.map(unslugify);

    expect(transformed).toEqual(['Monokai Pro', 'Terminal.app', 'Walton-lincoln Dark', 'Breeze']);
  });
});

describe('Function "loadThemes"', () => {
  test('Lists all YAML files in a directory sorted', async () => {
    const files = await loadThemes('themes');

    expect(files).toEqual([
      {
        path: expect.stringMatching(/breeze\.yaml$/),
        stats: expect.anything(),
      },
      {
        path: expect.stringMatching(/deep_one\.yaml$/),
        stats: expect.anything(),
      },
      {
        path: expect.stringMatching(/monokai_pro\.yml$/),
        stats: expect.anything(),
      },
    ]);
  });
});

describe('Function "readYaml"', () => {
  test('Loads YAML file as an object', async () => {
    const yaml = await readYaml('themes/monokai_pro.yml');

    expect(yaml).toEqual({
      colors: {
        primary: {
          background: '0x333333',
          foreground: '0x444444',
        },
      },
    });
  });
  test('Throws when passed file is not a YAML', async () => {
    expect(readYaml('themes/not_a_yaml.txt')).rejects.toBeInstanceOf(Error);
  });
});

describe('Function "applyTheme"', () => {
  test('Merges given config file with root config file', async () => {
    await applyTheme('themes/monokai_pro.yml', 'alacritty.yml');
    const yaml = await readYaml('alacritty.yml');

    expect(yaml).toEqual({
      colors: {
        primary: {
          background: '0x333333',
          foreground: '0x444444',
        },
      },
      font: {
        normal: {
          style: 'Regular',
        },
      },
    });
  });
  test('Merges given config file deeply', async () => {
    await applyTheme('themes/deep_one.yaml', 'alacritty.yml');
    const yaml = await readYaml('alacritty.yml');

    expect(yaml).toEqual({
      colors: {
        primary: {
          background: '0x777777',
          foreground: '0x222222',
        },
      },
      font: {
        normal: {
          style: 'Regular',
        },
      },
    });
  });
});

describe('Function "useSaveSelectedTheme"', () => {
  test('Saves and loads savefile correctly', async () => {
    const savefile = useSaveSelectedTheme('.selected_theme');
    await savefile.saveSelected('themes/monokai_pro.yml');
    const savefileExists = await fs.pathExists('.selected_theme');
    const savedData = await savefile.getSelected();

    expect(savefileExists).toBe(true);
    expect(savedData).toBe('themes/monokai_pro.yml');
  });
  test('Returns null if the savefile does not exist', async () => {
    const savefile = useSaveSelectedTheme('.selected_theme');
    const savedData = await savefile.getSelected();

    expect(savedData).toBeNull();
  });
});
