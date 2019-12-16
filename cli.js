#!/usr/bin/env node
'use strict';
const fs = require('fs-extra');
const chalk = require('chalk');
const meow = require('meow');
const path = require('path');
const inquirer = require('inquirer');
const process = require('process');
const { loadThemes, applyTheme, unslugify, useSaveSelectedTheme } = require('./index');
const home = require('os').homedir();
const error = text => console.log(chalk.red(text + '\n'));
const success = text => console.log(chalk.bold.green(text + '\n'));

const cli = meow(
  `
    Usage
      $ alacritty-switch-theme <options>

    Options
      --config, -c Alacritty configuration file
      --themes, -t Themes' configuration files root directory
      --backup, -b Backup of the original Alacritty configuration file before new theme is applied

    Examples
      $ alacritty-switch-theme --config ~/.config/alacritty/alacritty.yml
      $ alacritty-switch-theme --themes ~/alacritty-themes
      $ alacritty-switch-theme --backup ~/backup/alacritty.backup.yml
`,
  {
    flags: {
      config: {
        type: 'string',
        alias: 'c',
        default: `${home}/.config/alacritty/alacritty.yml`,
      },
      themes: {
        type: 'string',
        alias: 't',
        default: `${home}/.config/alacritty/themes`,
      },
      backup: {
        type: 'string',
        alias: 'b',
        default: `${home}/.config/alacritty/alacritty.theme-switch-backup.yml`,
      },
    },
  }
);

(async () => {
  // Validate CLI parameters
  try {
    // Check if given configuration is a file
    const configStat = await fs.stat(cli.flags.config);
    if (configStat.isFile() === false) {
      throw new Error(`Configuration ${cli.flags.config} is not a file.`);
    }
    // Check if configuration is in YAML format
    if (path.extname(cli.flags.config) !== '.yml') {
      throw new Error(`Configuration file ${cli.flags.config} is not a YAML file.`);
    }
    // Check if given theme directory exists and it's really a directory
    const themesStat = await fs.stat(cli.flags.themes);
    if (themesStat.isDirectory() === false) {
      throw new Error(`Given "themes" attribute ${cli.flags.themes} must be a directory.`);
    }
  } catch (err) {
    error(err);
    process.exit(1);
  }

  // Handle saving last selected theme state
  const saveFile = path.resolve(cli.flags.themes, '.selected_theme');
  const { saveSelected, getSelected } = useSaveSelectedTheme(saveFile);
  const lastSelected = await getSelected();

  // Load theme config files
  const themes = await loadThemes(cli.flags.themes);

  if (themes.length === 0) {
    error(`No theme files were found at ${cli.flags.themes}`);
    process.exit(1);
  }

  // Create prompt themes choices with readable names
  const themesChoices = themes.map(item => {
    const isLastSelected = lastSelected === item.path;
    const name = unslugify(path.basename(item.path));

    return {
      name: isLastSelected ? chalk.bold(`${name} (last selected)`) : name,
      value: item.path,
    };
  });

  // Display prompt
  const questions = [
    {
      type: 'list',
      name: 'theme',
      message: 'Select Alacritty color theme:',
      choices: themesChoices,
      pageSize: 25,
    },
  ];
  const answer = await inquirer.prompt(questions);

  try {
    // Backup Alacritty config file
    await fs.copyFile(cli.flags.config, cli.flags.backup);
    // Merge changes to the config file
    await applyTheme(answer.theme, cli.flags.config);
    // Save the selected theme filename
    await saveSelected(answer.theme);
    success('Theme applied.');
  } catch (err) {
    error(err);
    process.exit(1);
  }
})();
