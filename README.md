![GitHub Workflow Status](https://img.shields.io/github/workflow/status/tichopad/alacritty-theme-switch/Tests?label=tests) ![David](https://img.shields.io/david/tichopad/alacritty-theme-switch) [![npm](https://img.shields.io/npm/v/alacritty-theme-switch)](https://www.npmjs.com/package/alacritty-theme-switch) ![node-lts](https://img.shields.io/node/v-lts/alacritty-theme-switch)

# alacritty-theme-switch

> CLI utility for [Alacritty](https://github.com/jwilm/alacritty) color theme and configuration switching

See `alacritty-theme-switch --help` for basic information.

The CLI utility allows to save multiple Alacritty configuration files, which can contain only a subset of Alacritty
configuration options (e.g. colors, fonts) inside a directory. The intended usage is dynamically switching between multiple color themes (hence the name), but it can be used with any configuration options.

Executing `alacritty-theme-switch` then shows a list of
all these files and allows you to select one. The selected configuration is then merged with the main Alacritty
configuration file and saved.

The main configuration file is backed up before every merge.

**Please note, that all comments inside the main configuration file are removed upon switch.**

# Installation

Run

`npm install -g alacritty-theme-switch`

inside your terminal.

# Configuration

The utility can be configured by passing additional flags/parameters:

1. `--config` or `-c` Path to the alacritty's configuration file
   - E.g.: `alacritty-switch-theme --config ~/.config/alacritty/alacritty.yml`
   - Default: `$HOME/.config/alacritty/alacritty.yml`
2. `--themes` or `-t` Path to the directory containing custom themes' files
   - E.g.: `alacritty-switch-theme --themes ~/alacritty-themes`
   - Default: `$HOME/.config/alacritty/themes`
3. `--backup` or `-b` Path to the alacritty's configuration file backup made before every switch
   - E.g.: `alacritty-switch-theme --backup ~/backup/alacritty.backup.yml`
   - Default: `$HOME/.config/alacritty/alacritty.theme-switch-backup.yml`
4. `--select` or `-s` Path (relative to themes' directory) to a single configuration file that should be used directly instead of prompting a select

# Usage

## 1) Create folder for your color themes

The folder is in `~/.config/alacritty/themes/` by default, but can be set by using `--themes` parameter.

Example:

```
.
├── alacritty
│   ├── alacritty.yml
│   └── themes
```

## 2) Add color theme file

Create new YAML file in your color themes directory.

Write your color theme configuration to the file or copy/paste anything from the [official repository themes list](https://github.com/alacritty/alacritty/wiki/Color-schemes).

You can add as many files as you want.

Example:

```
.
├── alacritty
│   ├── alacritty.yml
│   └── themes
│       └── monokai.yml
```

_monokai.yml:_

```
colors:

  primary:
    background: '0x272822'
    foreground: '0xF8F8F2'

  normal:
    black:      '0x272822'
    red:        '0xF92672'
    green:      '0xA6E22E'
    yellow:     '0xF4BF75'
    blue:       '0x66D9EF'
    magenta:    '0xAE81FF'
    cyan:       '0xA1EFE4'
    white:      '0xF8F8F2'

  bright:
    black:      '0x75715E'
    red:        '0xF92672'
    green:      '0xA6E22E'
    yellow:     '0xF4BF75'
    blue:       '0x66D9EF'
    magenta:    '0xAE81FF'
    cyan:       '0xA1EFE4'
    white:      '0xF9F8F5'
```

## 3) Run `alacritty-theme-switch` or `ats`

## 4) Select theme and hit Enter

```
? Select Alacritty color theme: (Use arrow keys)
  Argonaut
  Ayu Dark (last selected)
❯ Monokai
```

# Last selected theme

After a theme is applied, it's name is saved to a file named `.selected_theme` inside the themes directory. This information is then used to keep track of the last selected theme.

If you manually change the alacritty colors configuration or rename the last selected theme's configuration file, the information will be lost.

# OS support

This hasn't been tested on Windows and OS X yet. There'll probably be issues with default settings, as it's looking for the `$HOME/.config/alacritty` folder, but after setting the `--config`, `--themes` and `--backup` flags, it should work just fine.

Create an issue or pull request if you want to add out-of-the-box support for your platform of choice.
