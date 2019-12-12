'use strict';
const yaml = require('js-yaml');
const fs = require('fs-extra');
const klaw = require('klaw-sync');
const path = require('path');

/**
 * Apply theme configuration to the main Alacritty config file.
 * @param {String} themePath Theme config file path
 * @returns {Promise<void>}
 */
async function applyTheme(themePath, rootConfigPath) {
  const config = await readYaml(rootConfigPath);
  const theme = await readYaml(themePath);
  const merged = { ...config, ...theme };
  const mergedConfig = yaml.safeDump(merged);

  await fs.writeFile(rootConfigPath, mergedConfig);
}

/**
 * Load theme config files from a directory.
 * @param {String} directoryPath Themes directory path
 * @returns {Promise<Array<{path: String, stats: Object}>>}
 */
function loadThemes(directoryPath) {
  fs.ensureDirSync(directoryPath);
  const onlyYaml = item => path.extname(item.path) === '.yml';
  return klaw(directoryPath, { nodir: true, filter: onlyYaml });
}

/**
 * Read YAML file and load it as an object.
 * @param {String} filePath YAML file path
 * @returns {Promise<Object>}
 */
async function readYaml(filePath) {
  const yamlFile = await fs.readFile(filePath, { encoding: 'utf-8' });

  return yaml.safeLoad(yamlFile);
}

/**
 * Convert "slugified" file name (lower case, underscored) to proper cased, spaced text.
 * @param {String} text Input text
 * @returns {String}
 */
function unslugify(text) {
  const withoutUnderscore = text.replace(/_+/g, ' ');
  const withoutExtension = withoutUnderscore.replace('.yml', '');
  const withProperCase = withoutExtension.replace(/\w\S*/g, str => {
    return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();
  });

  return withProperCase;
}

module.exports = {
  loadThemes,
  applyTheme,
  readYaml,
  unslugify,
};
