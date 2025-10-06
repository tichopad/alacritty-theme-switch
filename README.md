# alacritty-theme-switch

`alacritty-theme-switch` is a CLI tool for switching color themes in the
[Alacritty](https://github.com/alacritty/alacritty) terminal emulator. It lets
you store multiple theme configurations and switch between them interactively or
programmatically.

## Features

- **Interactive theme selection** with fuzzy search
- **Download themes** directly from GitHub repositories
- **Automatic backups** of your configuration before each switch
- **Non-destructive merging** of theme files with your main config
- **Cross-platform** support (Linux, macOS, Windows)

## Quick start

Install the tool:

```bash
# Via npm
npm install -g alacritty-theme-switch

# Via JSR (Deno)
deno install -g -A -n ats jsr:@tichopad/alacritty-theme-switch
```

Download themes from the official repository:

```bash
ats download-themes
```

Switch themes interactively:

```bash
ats
```

## Installation

### Via npm

```bash
npm install -g alacritty-theme-switch
```

### Via JSR (Deno)

```bash
deno install -g -A -n ats jsr:@tichopad/alacritty-theme-switch
```

## How to use

### Download themes

The easiest way to get started is to download themes from a GitHub repository:

```bash
ats download-themes
```

This downloads all themes from the
[official Alacritty themes repository](https://github.com/alacritty/alacritty-theme)
to `~/.config/alacritty/themes` (or `%APPDATA%\alacritty\themes` on Windows).

**License notice:** When downloading themes, the repository's LICENSE file is
also downloaded to preserve proper attribution. The default repository
([alacritty/alacritty-theme](https://github.com/alacritty/alacritty-theme)) is
licensed under the Apache License 2.0. If you download from multiple
repositories, each license is saved separately to avoid conflicts.

Download from a custom repository:

```bash
ats download-themes --url https://github.com/user/custom-themes
```

Download to a custom directory:

```bash
ats download-themes --themes ~/my-themes
```

Download from a specific branch or tag:

```bash
ats download-themes --ref v1.0.0
```

### Switch themes interactively

Run `ats` to open an interactive theme selector:

```bash
ats
```

Use arrow keys or type to search, then press Enter to apply a theme. The
currently active theme is highlighted.

### Switch themes programmatically

Apply a specific theme without prompting:

```bash
ats --select monokai.toml
```

The `--select` option takes a filename relative to your themes directory.

### Create custom themes

Create a TOML file in your themes directory (`~/.config/alacritty/themes` by
default):

```toml
# ~/.config/alacritty/themes/my-theme.toml

[colors.primary]
background = '#272822'
foreground = '#F8F8F2'

[colors.normal]
black   = '#272822'
red     = '#F92672'
green   = '#A6E22E'
yellow  = '#F4BF75'
blue    = '#66D9EF'
magenta = '#AE81FF'
cyan    = '#A1EFE4'
white   = '#F8F8F2'

[colors.bright]
black   = '#75715E'
red     = '#F92672'
green   = '#A6E22E'
yellow  = '#F4BF75'
blue    = '#66D9EF'
magenta = '#AE81FF'
cyan    = '#A1EFE4'
white   = '#F9F8F5'
```

Theme files can contain any valid Alacritty configuration options, not just
colors.

## Configuration

Customize paths and behavior with command-line options:

```
Options:
  -c, --config <path>    Path to Alacritty config file
                         (default: ~/.config/alacritty/alacritty.toml)
  -t, --themes <path>    Path to themes directory
                         (default: ~/.config/alacritty/themes)
  -b, --backup <path>    Path to backup file
                         (default: ~/.config/alacritty/alacritty.bak.toml)
  -s, --select <file>    Apply theme without prompting
  -h, --help             Show help
  -v, --version          Show version
```

On Windows, the default config directory is `%APPDATA%\alacritty` instead of
`~/.config/alacritty`.

### Examples

Use a custom config location:

```bash
ats --config ~/dotfiles/alacritty.toml
```

Use a custom themes directory:

```bash
ats --themes ~/my-alacritty-themes
```

## How it works

When you apply a theme, `alacritty-theme-switch`:

1. Creates a backup of your current Alacritty config
2. Reads your main config file and the selected theme file
3. Merges the theme into your config (theme values override existing values)
4. Writes the merged config back to your main config file
5. Saves the theme name to `.selected_theme` for tracking

**Note:** Comments in your main config file are removed during the merge process
due to TOML parsing limitations.

## Platform support

The tool works on Linux, macOS, and Windows. Default paths are
platform-specific:

- **Linux/macOS**: `~/.config/alacritty/`
- **Windows**: `%APPDATA%\alacritty\`

You can override defaults with command-line options on any platform.

## License

MIT
