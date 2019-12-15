const {
  pipe,
  unslugify,
  readYaml,
  loadThemes,
  applyTheme,
  useSaveSelectedTheme,
} = require('../index');
const mockFs = require('mock-fs');

beforeAll(() => {
  // Mock "fs" module with in-memory filesystem
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
      'breeze.yml': `
        colors:
          primary:
            background: '0x555555'
            foreground: '0x666666'
      `,
    },
  });
});

afterAll(() => {
  // Restore "fs" module
  mockFs.restore();
});

test('Function "pipe" correctly applies all given functions in order', () => {
  const mockUpperCase = jest.fn(s => s.toUpperCase());
  const mockAddOranges = jest.fn(s => `${s}, oranges`);
  const mockExclaim = jest.fn(s => `${s}!`);
  const result = pipe('apples')(mockUpperCase, mockAddOranges, mockExclaim);

  expect(result).toBe('APPLES, oranges!');
  expect(mockUpperCase).toHaveBeenCalledWith('apples');
  expect(mockAddOranges).toHaveBeenCalledWith('APPLES');
  expect(mockExclaim).toHaveBeenCalledWith('APPLES, oranges');
});

test('Function "unslugify" transforms "slugified" YAML filenames to readable format', () => {
  const slugs = ['monokai_pro.yml', 'terminal.app.yml', 'walton-lincoln_dark.yml', 'breeze.yml'];
  const transformed = slugs.map(unslugify);

  expect(transformed).toEqual(['Monokai Pro', 'Terminal.app', 'Walton-lincoln Dark', 'Breeze']);
});

test('Function "readYaml" loads YAML file as an object', async () => {
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

test('Function "loadThemes" lists all YAML files in a directory', async () => {
  const files = await loadThemes('themes');

  expect(files).toEqual([
    {
      path: expect.stringMatching(/breeze\.yml$/),
      stats: expect.anything(),
    },
    {
      path: expect.stringMatching(/monokai_pro\.yml$/),
      stats: expect.anything(),
    },
  ]);
});

test('Function "applyTheme" merges given config file with root config file', async () => {
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

test('Function "useSaveSelectedTheme" saves and loads savefile correctly', async () => {
  const savefile = useSaveSelectedTheme('.selected_theme');
  await savefile.saveSelected('themes/monokai_pro.yml');
  const savedData = await savefile.getSelected();

  expect(savedData).toBe('themes/monokai_pro.yml');
});
