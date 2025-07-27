# Project Overview: alacritty-theme-switch

## 1. Project Purpose & Functionality

**Purpose**: alacritty-theme-switch is a CLI utility for dynamically switching between multiple color themes and configurations in the Alacritty terminal emulator.

**Problem Solved**: Alacritty users can easily switch between different color themes without manually editing configuration files. The tool manages multiple theme configurations and applies them to the main Alacritty configuration file.

**Main Features**:

- Interactive theme selection via command-line interface
- YAML configuration file management
- Automatic backup of original configuration before applying changes
- Support for partial configuration files (themes can contain only color settings, fonts, etc.)
- Last selected theme tracking
- Command-line flags for custom configuration paths
- Support for direct theme selection without interactive prompt

## 2. Repository Structure

```
alacritty-theme-switch/
├── src/                 # Main source code
│   ├── cli.js          # CLI entry point
│   └── index.js        # Core functionality
├── __tests__/          # Unit tests
│   └── index.test.js
├── .github/            # GitHub workflows
│   └── workflows/
│       ├── tests.yml   # CI testing workflow
│       └── publish.yml # NPM publishing workflow
├── .husky/             # Git hooks configuration
├── package.json        # Project metadata and dependencies
├── package-lock.json   # Dependency lock file
├── README.md           # Documentation
├── LICENSE.md          # MIT License
├── .eslintrc           # ESLint configuration
├── .prettierrc         # Prettier code formatting configuration
├── jest.config.js      # Jest testing configuration
├── .gitignore          # Git ignore patterns
└── dependabot.yml      # GitHub dependabot configuration
```

## 3. Technology Stack

**Programming Language**: JavaScript (Node.js)

**Frameworks & Libraries**:

- **meow**: CLI app helper for parsing command-line arguments
- **inquirer**: Interactive command-line prompts
- **js-yaml**: YAML parser and serializer
- **fs-extra**: File system operations
- **klaw-sync**: File system walker
- **deepmerge**: Deep merging of JavaScript objects
- **chalk**: Terminal string styling

**Development Tools**:

- **Jest**: Testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **npm-run-all**: CLI command execution

**Node.js Engine**: >=12.0.0

## 4. Development Workflow

**Environment Setup**:

1. Clone repository
2. Run `npm install` to install dependencies

**Build Process**:

- No explicit build process; this is a Node.js CLI application
- Entry points are directly executable JavaScript files

**Testing**:

- Framework: Jest
- Command: `npm test` or `npm run test:unit`
- Tests include mocking of file system operations

**Code Quality**:

- Linting: ESLint (`npm run lint`)
- Formatting: Prettier (`npm run format`)
- Pre-commit hooks via Husky to enforce code quality

**CI/CD Pipeline**:

- GitHub Actions for testing on push/pull request
- Automated NPM publishing on release creation
- Tests run on Node.js 12.x and 14.x

**Dependency Management**:

- npm as package manager
- package-lock.json for dependency locking
- Dependabot for dependency updates

**Documentation**:

- README.md contains comprehensive usage documentation
- JSDoc comments in source code
- Inline examples in README

## 5. Configuration Files

**package.json**:

- Defines project metadata, dependencies, and scripts
- Entry points for CLI commands (`alacritty-theme-switch` and `ats`)
- Development scripts for testing, linting, and formatting
- Engine requirements (Node.js >=12.0.0)

**.eslintrc**:

- ESLint configuration for code linting
- Environment settings for Node.js and Jest
- Recommended ESLint rules

**.prettierrc**:

- Prettier configuration for code formatting
- Settings for line endings, semicolons, quotes, indentation, etc.

**jest.config.js**:

- Jest testing framework configuration
- Node.js test environment

**GitHub Workflow Files**:

- tests.yml: CI pipeline for running tests on multiple Node.js versions
- publish.yml: CD pipeline for publishing to NPM on release creation

## 6. Entry Points

**Primary Entry Points**:

1. `src/cli.js` - Main CLI executable (referenced in package.json bin field)
2. `src/index.js` - Core library functions (referenced in package.json main field)

**CLI Commands**:

- `alacritty-theme-switch` or `ats` - Main command for theme switching
- Flags for custom configuration paths:
  - `--config/-c`: Alacritty configuration file path
  - `--themes/-t`: Themes directory path
  - `--backup/-b`: Backup file path
  - `--select/-s`: Direct theme selection

The application is designed as a simple, single-purpose CLI tool that integrates with Alacritty's YAML-based configuration system to provide an easy way to switch between different terminal themes.
