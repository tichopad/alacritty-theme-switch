# alacritty-theme-switch

> CLI utility for [Alacritty](https://github.com/jwilm/alacritty) color theme and configuration switching

See `alacritty-theme-switch --help` for basic information.

The CLI utility allows to save multiple Alacritty configuration files, which can contain only a subset of Alacritty
configuration options (e.g. colors, fonts) inside a directory. The intended usage is dynamically switching between multiple color themes (hence the name), but it can be used with any configuration options.

Executing `alacritty-switch-theme` then shows a list of
all these files and allows you to select one. The selected configuration is then merged with the main Alacritty
configuration file and saved.

The main configuration file is backed up before every merge.

**Please note, that all comments inside the main configuration file are removed upon switch.**

# Installation

Run

`npm install -g alacritty-theme-switch`

inside your terminal.

# How to

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

## 3) Run `alacritty-theme-switch`

## 4) Select theme and hit Enter

```
? Select Alacritty color theme: (Use arrow keys)
  Argonaut
  Ayu Dark (last selected)
❯ Monokai
```
