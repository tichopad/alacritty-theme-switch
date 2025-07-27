'use strict';
const toml = require('smol-toml');
const fs = require('fs-extra');
const klaw = require('klaw-sync');
const path = require('path');
const deepmerge = require('deepmerge');

/**
 * Checks if given file is a TOML by it's extension.
 * @param {String} filePath Absolute or relative file path
 * @returns {Boolean}
 */
function isToml(filePath) {
  const extension = path.extname(filePath);

  return extension === '.toml';
}

/**
 * Apply theme configuration to the main Alacritty config file.
 * @param {String} themePath Theme config file path
 * @param {String} rootConfigPath Main Alacritty configuration file path
 * @returns {Promise<void>}
 */
async function applyTheme(themePath, rootConfigPath) {
  const config = await readToml(rootConfigPath);
  const theme = await readToml(themePath);
  const merged = deepmerge(config, theme);
  const mergedConfig = toml.stringify(merged);

  await fs.writeFile(rootConfigPath, mergedConfig);
}

/**
 * Load theme config files from a directory.
 * @param {String} directoryPath Themes directory path
 * @returns {Promise<Array<{path: String, stats: Object}>>}
 */
async function loadThemes(directoryPath) {
  await fs.ensureDir(directoryPath);
  const themeFiles = klaw(directoryPath, {
    nodir: true,
    filter: item => isToml(item.path),
  });

  return themeFiles;
}

/**
 * Read TOML file and load it as an object.
 * @param {String} filePath TOML file path
 * @returns {Promise<Object>}
 */
async function readToml(filePath) {
  if (isToml(filePath) === false) {
    throw new Error(`Given file ${filePath} is not a TOML.`);
  }

  const tomlFile = await fs.readFile(filePath, { encoding: 'utf-8' });

  return toml.parse(tomlFile);
}

/**
 * Convert "slugified" file name (lower case, underscored) to proper cased, spaced text.
 * @param {String} text Input text
 * @returns {String}
 */
function unslugify(text) {
  const withoutUnderscore = text => text.replace(/_+/g, ' ');
  const withoutExtension = text => text.replace(/\.toml/, '');
  const withProperCase = text => text.replace(/\w\S*/g, s => s.charAt(0).toUpperCase() + s.substr(1).toLowerCase());

  return pipe(text)(withoutUnderscore, withoutExtension, withProperCase);
}

/**
 * Simple helper function for functions piping
 * @param {any} input Pipe input
 */
function pipe(input) {
  return (...fns) => fns.reduce((carry, f) => f(carry), input);
}

/**
 * Handles saving and reading information about last selected theme
 * @param {String} saveFile Save file path
 * @returns {{ saveSelected: (themeFile: String) => Promise<void>, getSelected: () => Promise<String|null> }}
 */
function useSaveSelectedTheme(saveFile) {
  return {
    saveSelected: themeFile => fs.writeFile(saveFile, themeFile),
    getSelected: async () => {
      if (await fs.pathExists(saveFile)) {
        return fs.readFile(saveFile, { encoding: 'utf-8' });
      }

      return null;
    },
  };
}

module.exports = {
  loadThemes,
  applyTheme,
  readToml,
  unslugify,
  pipe,
  useSaveSelectedTheme,
  isToml,
};
