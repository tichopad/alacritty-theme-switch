const mockFs = require('mock-fs');
const { pipe, unslugify, readToml, loadThemes, applyTheme, useSaveSelectedTheme } = require('../src/index');

beforeEach(() => {
  mockFs({
    'alacritty.toml': `
[colors.primary]
background = '0x111111'
foreground = '0x222222'

[font.normal]
style = 'Regular'
    `,
    themes: {
      'monokai_pro.toml': `
[colors.primary]
background = '0x333333'
foreground = '0x444444'
      `,
      'breeze.toml': `
[colors.primary]
background = '0x555555'
foreground = '0x666666'
      `,
      'deep_one.toml': `
[colors.primary]
background = '0x777777'
      `,
      'not_a_toml.json': `
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

describe('Edge Cases and Error Conditions', () => {
  describe('Function "pipe" - Edge Cases', () => {
    test('Handles empty function list', () => {
      const result = pipe('test')();
      expect(result).toBe('test');
    });

    test('Handles single function', () => {
      const upperCase = s => s.toUpperCase();
      const result = pipe('test')(upperCase);
      expect(result).toBe('TEST');
    });

    test('Handles functions that return different types', () => {
      const toNumber = s => parseInt(s, 10);
      const multiply = n => n * 2;
      const toString = n => n.toString();

      const result = pipe('42')(toNumber, multiply, toString);
      expect(result).toBe('84');
    });

    test('Handles functions that throw errors', () => {
      const throwError = () => {
        throw new Error('Test error');
      };
      const upperCase = s => s.toUpperCase();

      expect(() => pipe('test')(upperCase, throwError)).toThrow('Test error');
    });

    test('Handles null and undefined inputs', () => {
      const toString = val => String(val);
      const upperCase = s => s.toUpperCase();

      expect(pipe(null)(toString, upperCase)).toBe('NULL');
      expect(pipe(undefined)(toString, upperCase)).toBe('UNDEFINED');
    });

    test('Handles complex data transformations', () => {
      const parseJson = str => JSON.parse(str);
      const extractName = obj => obj.name;
      const addPrefix = name => `Hello, ${name}!`;

      const result = pipe('{"name": "World"}')(parseJson, extractName, addPrefix);
      expect(result).toBe('Hello, World!');
    });
  });
  describe('Function "readToml" - Error Handling', () => {
    test('Throws error for non-existent file', async () => {
      await expect(readToml('non-existent-file.toml')).rejects.toThrow();
    });

    test('Throws error for file with non-TOML extension', async () => {
      await expect(readToml('themes/not_a_toml.json')).rejects.toThrow(
        'Given file themes/not_a_toml.json is not a TOML.'
      );
    });

    test('Throws error for malformed TOML content', async () => {
      mockFs({
        'malformed.toml': `
[colors.primary
background = '0x111111'
        `,
      });

      await expect(readToml('malformed.toml')).rejects.toThrow();
    });

    test('Handles empty TOML file', async () => {
      mockFs({
        'empty.toml': '',
      });

      const result = await readToml('empty.toml');
      expect(result).toEqual({});
    });

    test('Handles complex nested TOML structure', async () => {
      mockFs({
        'complex.toml': `
[colors.primary]
background = '0x111111'
foreground = '0x222222'

[colors.normal]
black = '0x000000'
red = '0xff0000'

[font]
size = 12.0

[window]
padding.x = 10
padding.y = 10
        `,
      });

      const result = await readToml('complex.toml');
      expect(result).toEqual({
        colors: {
          primary: {
            background: '0x111111',
            foreground: '0x222222',
          },
          normal: {
            black: '0x000000',
            red: '0xff0000',
          },
        },
        font: {
          size: 12.0,
        },
        window: {
          padding: {
            x: 10,
            y: 10,
          },
        },
      });
    });
  });

  describe('Function "loadThemes" - Error Handling', () => {
    test('Creates directory if it does not exist', async () => {
      mockFs({});

      const themes = await loadThemes('non-existent-themes');
      expect(themes).toEqual([]);
    });

    test('Returns empty array for directory with no TOML files', async () => {
      mockFs({
        'empty-themes': {},
      });

      const themes = await loadThemes('empty-themes');
      expect(themes).toEqual([]);
    });

    test('Filters out non-TOML files correctly', async () => {
      mockFs({
        'mixed-themes': {
          'theme1.toml': '[colors.primary]\nbackground = "0x111111"',
          'theme2.yml': 'colors:\n  primary:\n    background: "0x222222"',
          'theme3.json': '{"colors": {"primary": {"background": "0x333333"}}}',
          'theme4.txt': 'some text',
          'theme5.toml': '[colors.primary]\nbackground = "0x444444"',
        },
      });

      const themes = await loadThemes('mixed-themes');
      expect(themes).toHaveLength(2);
      expect(themes.map(t => t.path)).toEqual(
        expect.arrayContaining([expect.stringMatching(/theme1\.toml$/), expect.stringMatching(/theme5\.toml$/)])
      );
    });
  });

  describe('Function "applyTheme" - Error Handling', () => {
    test('Throws error when theme file does not exist', async () => {
      await expect(applyTheme('non-existent-theme.toml', 'alacritty.toml')).rejects.toThrow();
    });

    test('Throws error when config file does not exist', async () => {
      await expect(applyTheme('themes/monokai_pro.toml', 'non-existent-config.toml')).rejects.toThrow();
    });

    test('Handles theme with missing sections gracefully', async () => {
      mockFs({
        'alacritty.toml': `
[colors.primary]
background = '0x111111'
foreground = '0x222222'

[font.normal]
style = 'Regular'
        `,
        'minimal-theme.toml': `
[colors.primary]
background = '0x333333'
        `,
      });

      await applyTheme('minimal-theme.toml', 'alacritty.toml');
      const result = await readToml('alacritty.toml');

      expect(result.colors.primary.background).toBe('0x333333');
      expect(result.colors.primary.foreground).toBe('0x222222'); // Should preserve original
      expect(result.font.normal.style).toBe('Regular'); // Should preserve original
    });

    test('Handles empty theme file', async () => {
      mockFs({
        'alacritty.toml': `
[colors.primary]
background = '0x111111'
        `,
        'empty-theme.toml': '',
      });

      await applyTheme('empty-theme.toml', 'alacritty.toml');
      const result = await readToml('alacritty.toml');

      expect(result.colors.primary.background).toBe('0x111111'); // Should preserve original
    });
  });

  describe('Function "unslugify" - Boundary Conditions', () => {
    test('Handles empty string', () => {
      expect(unslugify('')).toBe('');
    });

    test('Handles string with multiple extensions', () => {
      expect(unslugify('theme.backup.toml')).toBe('Theme.backup');
    });

    test('Handles string with multiple underscores', () => {
      expect(unslugify('theme___with____many_underscores.toml')).toBe('Theme With Many Underscores');
    });

    test('Handles string with mixed case', () => {
      expect(unslugify('MiXeD_CaSe_ThEmE.toml')).toBe('Mixed Case Theme');
    });

    test('Handles numbers in theme names', () => {
      expect(unslugify('theme_v2_final.toml')).toBe('Theme V2 Final');
      expect(unslugify('123_numeric_theme.toml')).toBe('123 Numeric Theme');
    });
  });

  describe('TOML Format and Data Validation', () => {
    test('Handles TOML with mixed data types', async () => {
      mockFs({
        'mixed-types.toml': `
[test]
string_value = 'hello'
integer_value = 42
float_value = 3.14
boolean_value = true
array_value = ['a', 'b', 'c']
        `,
      });

      const config = await readToml('mixed-types.toml');
      expect(typeof config.test.string_value).toBe('string');
      expect(typeof config.test.integer_value).toBe('number');
      expect(typeof config.test.float_value).toBe('number');
      expect(typeof config.test.boolean_value).toBe('boolean');
      expect(Array.isArray(config.test.array_value)).toBe(true);
    });

    test('Handles TOML with inline tables', async () => {
      mockFs({
        'inline-tables.toml': `
[colors]
primary = { background = '0x000000', foreground = '0xffffff' }
normal = { black = '0x000000', white = '0xffffff' }
        `,
      });

      const config = await readToml('inline-tables.toml');
      expect(config.colors.primary.background).toBe('0x000000');
      expect(config.colors.primary.foreground).toBe('0xffffff');
      expect(config.colors.normal.black).toBe('0x000000');
      expect(config.colors.normal.white).toBe('0xffffff');
    });

    test('Handles theme names with special characters', async () => {
      mockFs({
        themes: {
          'theme-with-dashes.toml': '[colors.primary]\nbackground = "0x111111"',
          'theme_with_underscores.toml': '[colors.primary]\nbackground = "0x222222"',
          'theme.with.dots.toml': '[colors.primary]\nbackground = "0x333333"',
        },
      });

      const themes = await loadThemes('themes');
      expect(themes).toHaveLength(3);
    });

    test('Validates that theme application is idempotent', async () => {
      mockFs({
        'alacritty.toml': `
[colors.primary]
background = '0x000000'
foreground = '0xffffff'
        `,
        'theme.toml': `
[colors.primary]
background = '0x111111'
        `,
      });

      // Apply theme twice
      await applyTheme('theme.toml', 'alacritty.toml');
      const configAfterFirst = await readToml('alacritty.toml');

      await applyTheme('theme.toml', 'alacritty.toml');
      const configAfterSecond = await readToml('alacritty.toml');

      // Results should be identical
      expect(configAfterFirst).toEqual(configAfterSecond);
    });
  });

  describe('Integration and Performance', () => {
    test('Complete workflow: load themes, apply theme, save selection', async () => {
      mockFs({
        'alacritty.toml': `
[colors.primary]
background = '0x000000'
foreground = '0xffffff'

[font.normal]
family = 'Monospace'
        `,
        themes: {
          'dark-theme.toml': `
[colors.primary]
background = '0x1a1a1a'
foreground = '0xe0e0e0'

[colors.normal]
black = '0x000000'
red = '0xff5555'
          `,
          'light-theme.toml': `
[colors.primary]
background = '0xffffff'
foreground = '0x000000'

[colors.normal]
black = '0x000000'
blue = '0x0000ff'
          `,
        },
      });

      // Step 1: Load available themes
      const themes = await loadThemes('themes');
      expect(themes).toHaveLength(2);

      // Step 2: Apply a theme
      const selectedTheme = themes.find(t => t.path.includes('dark-theme'));
      await applyTheme(selectedTheme.path, 'alacritty.toml');

      // Step 3: Verify theme was applied
      const updatedConfig = await readToml('alacritty.toml');
      expect(updatedConfig.colors.primary.background).toBe('0x1a1a1a');
      expect(updatedConfig.colors.primary.foreground).toBe('0xe0e0e0');
      expect(updatedConfig.colors.normal.black).toBe('0x000000');
      expect(updatedConfig.colors.normal.red).toBe('0xff5555');
      expect(updatedConfig.font.normal.family).toBe('Monospace'); // Should preserve original

      // Step 4: Save selection
      const saveFile = useSaveSelectedTheme('.selected_theme');
      await saveFile.saveSelected(selectedTheme.path);

      // Step 5: Verify selection was saved
      const savedSelection = await saveFile.getSelected();
      expect(savedSelection).toBe(selectedTheme.path);
    });

    test('Theme switching between multiple themes preserves non-theme config', async () => {
      mockFs({
        'alacritty.toml': `
[colors.primary]
background = '0x000000'
foreground = '0xffffff'

[font.normal]
family = 'Monospace'
size = 12.0

[window]
padding.x = 10
padding.y = 10

[scrolling]
history = 5000
        `,
        themes: {
          'theme1.toml': `
[colors.primary]
background = '0x111111'
foreground = '0xeeeeee'
          `,
          'theme2.toml': `
[colors.primary]
background = '0x222222'
foreground = '0xdddddd'

[colors.normal]
red = '0xff0000'
          `,
        },
      });

      // Apply first theme
      await applyTheme('themes/theme1.toml', 'alacritty.toml');
      let config = await readToml('alacritty.toml');

      expect(config.colors.primary.background).toBe('0x111111');
      expect(config.font.normal.family).toBe('Monospace');
      expect(config.window.padding.x).toBe(10);
      expect(config.scrolling.history).toBe(5000);

      // Apply second theme
      await applyTheme('themes/theme2.toml', 'alacritty.toml');
      config = await readToml('alacritty.toml');

      expect(config.colors.primary.background).toBe('0x222222');
      expect(config.colors.normal.red).toBe('0xff0000');
      expect(config.font.normal.family).toBe('Monospace'); // Should still be preserved
      expect(config.window.padding.x).toBe(10); // Should still be preserved
      expect(config.scrolling.history).toBe(5000); // Should still be preserved
    });

    test('Handles many theme files efficiently', async () => {
      const manyThemes = {};
      for (let i = 0; i < 50; i++) {
        manyThemes[`theme_${i}.toml`] = `
[colors.primary]
background = '0x${i.toString(16).padStart(6, '0')}'
        `;
      }

      mockFs({
        'many-themes': manyThemes,
      });

      const themes = await loadThemes('many-themes');
      expect(themes).toHaveLength(50);
    });

    test('Handles rapid successive theme applications', async () => {
      mockFs({
        'alacritty.toml': '[colors.primary]\nbackground = "0x000000"',
        'theme1.toml': '[colors.primary]\nbackground = "0x111111"',
        'theme2.toml': '[colors.primary]\nbackground = "0x222222"',
        'theme3.toml': '[colors.primary]\nbackground = "0x333333"',
      });

      // Apply themes rapidly in sequence
      for (let i = 1; i <= 3; i++) {
        await applyTheme(`theme${i}.toml`, 'alacritty.toml');
        const config = await readToml('alacritty.toml');
        expect(config.colors.primary.background).toBe(`0x${i}${i}${i}${i}${i}${i}`);
      }
    });
  });

  describe('Function "useSaveSelectedTheme" - Error Handling', () => {
    test('Handles empty save file', async () => {
      mockFs({
        '.selected_theme': '',
      });

      const saveFile = useSaveSelectedTheme('.selected_theme');
      const result = await saveFile.getSelected();
      expect(result).toBe('');
    });

    test('Handles save file with special characters', async () => {
      const specialPath = 'themes/thème-français@#$%.toml';

      const saveFile = useSaveSelectedTheme('.selected_theme');
      await saveFile.saveSelected(specialPath);
      const result = await saveFile.getSelected();
      expect(result).toBe(specialPath);
    });

    test('Handles very long file paths in save file', async () => {
      const longPath = 'themes/' + 'a'.repeat(500) + '.toml';

      const saveFile = useSaveSelectedTheme('.selected_theme');
      await saveFile.saveSelected(longPath);
      const result = await saveFile.getSelected();
      expect(result).toBe(longPath);
    });
  });
});
