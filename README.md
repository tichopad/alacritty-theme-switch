# alacritty-switch-theme

> CLI utility for [Alacritty](https://github.com/jwilm/alacritty) color theme switching

_This utility and documentation is a work in progress._

For now, use `npm link` (undo with `npm unlink`) from inside the root directory to access the terminal command.
See `alacritty-switch-theme --help` for more information.

The CLI utility allows to save multiple Alacritty configuration files, which can contain only a subset of Alacritty
configuration options (e.g. colors, fonts) inside a directory. The intended usage is dynamically switching between multiple color themes (hence the name), but it can be used with any configuration options.

Executing `alacritty-switch-theme` then shows a list of
all these files and allows you to select one. The selected configuration is then merged with the main Alacritty
configuration file and saved.

The main configuration file is backed up before every merge.

**Please note, that all comments inside the main configuration file are removed upon merge.**
