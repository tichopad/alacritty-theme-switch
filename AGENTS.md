# AI Agent Development Guidelines

This document provides development rules and architectural guidance for AI
agents working on the alacritty-theme-switch project.

## Project Overview

This is a Deno TypeScript CLI tool for switching color themes in the Alacritty
terminal emulator. The project emphasizes type safety, explicit error handling,
minimal dependencies, and code readability.

## Core Principles

### Dependency management

Prefer Deno's standard library modules whenever possible (e.g., `@std/cli`,
`@std/fs`, `@std/toml`, `@std/assert`). Only add external dependencies when
absolutely necessary and when @std/ alternatives don't exist. All dependencies
should be imported from JSR (jsr:@std/...) as shown in deno.json.

### Error handling

Use the custom Result and ResultAsync types for all operations that can fail.
Functions should return Result<T, E> or ResultAsync<T, E> instead of throwing
exceptions. Define specific error types with `_tag` discriminants (see
`src/theme-manager/errors.ts`). Use union types to compose multiple possible
error types in function signatures.

### Code quality

#### Comments and documentation

All public functions must have comprehensive JSDoc comments with examples.
Comments should explain business logic and design decisions, not just what the
code does. Include @template, @param, @returns, and @example tags in JSDoc.
Provide realistic usage examples in JSDoc comments.

#### Code style

Prefer explicit type annotations over inference for public APIs. Use map,
flatMap and other functional methods on Result/ResultAsync. Treat data as
immutable. Avoid mutating objects; create new objects when changes are needed.
Strive for clear naming. Use descriptive names that explain intent (e.g.,
`applyThemeByFilename` vs `apply`).

## Architecture Patterns

### Result Pattern Usage

```typescript
// Good: Explicit error handling with typed errors
function parseConfig(path: string): ResultAsync<Config, ParseConfigError> {
  return ResultAsync.fromPromise(Deno.readTextFile(path))
    .mapErr((error) => new FileNotFoundError(path, { cause: error }))
    .flatMap((content) => parseToml(content));
}

// Bad: Throwing exceptions
function parseConfig(path: string): Promise<Config> {
  const content = await Deno.readTextFile(path); // Can throw
  return parseToml(content); // Can throw
}
```

### Error type design

Create specific error classes with `_tag` discriminants for pattern matching.
Include relevant context (file paths, operation details) in error messages. Use
`ErrorOptions` with `cause` to preserve original error information. Group
related errors into union types (e.g., `ParseConfigError`, `LoadThemesError`).

### Module organization

Each module should have a clear, focused purpose. Keep error definitions close
to the code that uses them. Define types near their usage, not in separate
type-only files.

**Do not use barrel export files (index.ts files that only re-export from other
modules).** Instead, import directly from the specific module files. This
improves code clarity by making dependencies explicit and avoids unnecessary
indirection.

```typescript
// Good: Direct imports from specific modules
import { GitHubClient } from "../src/theme-manager/github/client.ts";
import { InvalidRepositoryUrlError } from "../src/theme-manager/github/errors.ts";

// Bad: Importing from barrel files
import {
  GitHubClient,
  InvalidRepositoryUrlError,
} from "../src/theme-manager/github/index.ts";
```

## File Structure Conventions

### Source Organization

```
src/
├── main.ts              # CLI entry point
├── cli.ts               # CLI argument parsing and help
├── result.ts            # Result/ResultAsync implementation
└── theme-manager/       # Theme management domain
    ├── theme-manager.ts # Core theme management logic
    └── errors.ts        # Domain-specific error types
```

### Naming conventions

Use kebab-case for file names (`theme-manager.ts`, not `themeManager.ts`). Use
camelCase with descriptive verbs for functions (`applyTheme`, `listThemes`). Use
PascalCase for types and interfaces (`ThemeManager`, `ParseConfigError`). Use
SCREAMING_SNAKE_CASE for module-level constants.

## Linting and Formatting

### Checks

Run `deno task check` after each change to check formatting, linting and type
safety.

## Testing Guidelines

### Running tests

The tests need to be run with `--allow-all` to have the correct permissions. Use
the `deno task test` command to run all tests and
`deno task test ./path/to/test.ts` to run a specific test file.

### Test framework

Write tests using `Deno.test()` with Deno's built-in test runner. Import
assertion functions from `@std/assert`. The `__tests__` directory contains old
Node.js tests that should be ignored.

### Test Structure

```typescript
import { assertEquals, assertRejects } from "@std/assert";
import { Result } from "../src/result.ts";

Deno.test("should parse valid configuration", async () => {
  const result = await parseConfig("valid-config.toml").toResult();
  assertEquals(result.isOk(), true);
});

Deno.test("should return error for missing file", async () => {
  const result = await parseConfig("missing.toml").toResult();
  assertEquals(result.isErr(), true);
  assertEquals(result.error._tag, "FileNotFoundError");
});
```

## Development Workflow

### Before making changes

Read existing code to understand the theme management domain. Look at existing
error types and follow the same patterns. Understand how Result/ResultAsync are
used throughout the codebase.

### Code review checklist

- [ ] All functions that can fail return Result or ResultAsync
- [ ] Error types are properly defined with `_tag` discriminants
- [ ] JSDoc comments include examples and explain the purpose
- [ ] No external dependencies added without justification
- [ ] @std/ libraries used where applicable
- [ ] Tests cover both success and error cases

### Performance considerations

Use ResultAsync for operations that should be deferred. Don't make functions
async unless they perform I/O. Use appropriate @std/fs functions for file system
operations.

## Common Patterns

### Configuration Loading

```typescript
// Load and parse configuration with proper error handling
const config = ResultAsync.fromPromise(Deno.readTextFile(configPath))
  .mapErr((error) => new FileNotFoundError(configPath, { cause: error }))
  .flatMap((content) => parseToml(content))
  .mapErr((error) => new FileNotTOMLError(configPath, { cause: error }));
```

### Validation Chains

```typescript
// Chain validations using flatMap
function validateTheme(
  path: string,
): ResultAsync<Theme, CheckThemeExistsError> {
  return checkFileExists(path)
    .flatMap(() => checkIsFile(path))
    .flatMap(() => checkIsTomlFile(path))
    .map(() => ({ path, label: getThemeLabel(path) }));
}
```

### Error Aggregation

```typescript
// Collect multiple errors when processing lists
const results = await Promise.all(
  themePaths.map((path) => validateTheme(path).toResult()),
);
const errors = results.filter((r) => r.isErr()).map((r) => r.error);
const themes = results.filter((r) => r.isOk()).map((r) => r.data);
```

Remember: This codebase prioritizes correctness and maintainability over
brevity. When in doubt, choose the more explicit and type-safe approach.

## Version control

- Always use `git` for version control
- Unless specified otherwise, assume GitHub is used for repository management
  - Prefer using GitHub integration and GitHub MCP server if available,
    otherwise attempt to use GitHub CLI

### Version control operations

- DO NOT use `git commit`, `git push`, `git checkout -b` or any other similar
  git-related write operation unless the user explicitly requests it

### Commit message format

Use the following format for commit messages:

```
<short description focused on the main change(s)>

<long, potentially multi-line description going more in detail, but still covering only the important stuff - omitting minor details>
```

Example:

```
Added generic form validation component

Generic form validation component should address issues with each form's validation being handled differently, creating inconsistency and slowing down development.

New validation component uses `zod` 4.0 library for schema parsing.

Following form validations have been refactored using new approach:

- Create user
- Edit user
```

### Pull/merge request description format

- Always try to search for common PR description templates in the current
  project folder first (e.g. `.github/pull_request_template.md`)
- If a template is available, follow its formatting while adhering to the
  general rules described below
- When creating a GitHub PR, use GitHub-flavored Markdown
  - See [GitHub-flavored Markdown spec](https://github.github.com/gfm/)
- General description rules:
  - Try to keep the description as short, concise and straight to the point as
    possible. Avoid any technical fluff, corporate speak or flowery language.
  - Do not over-use bullet points beginning with a bold text, followed by a
    colon
  - Do not go into too much detail about changes in specific files - that's
    better handled via line comments and will be done by the user later
  - Focus on the goal the PR is trying to solve first, then cover how that goal
    has been achieved
  - Emphasize any breaking or potentially risky changes introduced
  - Split the description into different sections if needed
  - The title should be clear and short, focusing on the main goal or changes
  - If an existing template contains a check list, do not modify it and include
    it in the description as-is - the user will handle going through the items.

Bad example: Title: `refactor(profile): Code update 🛠️` Description:

```markdown
Hey team 👋 Just a quick refactor of the `UserProfile` component. It's now a
modern functional component using hooks! ✨ Much cleaner. 😎

- **Changes**: Swapped the old class component for a new function. Using
  `useState` and `useEffect` now. Much better!
- **Tests**: Updated the tests and stories. All green! ✅

Btw I renamed the `userName` prop to just `name`. Should be ready to merge. LMK
what you think! 🙏🚀
```

Good example: Title: `Convert UserProfile to a functional component`
Description:

```markdown
### Summary

This PR refactors the `UserProfile` class component into a functional component
using React Hooks (`useState`, `useEffect`).

The goal is to improve the maintainability and readability of the component,
while also aligning it with the modern React patterns used throughout the rest
of the application.

### Related issues

- `ISSUE-123`

### Details

- The component was converted from a `class` to a `function`.
- State management was migrated from `this.state` and `this.setState` to the
  `useState` hook.
- Data fetching logic in `componentDidMount` was moved into a `useEffect` hook.
- Associated Storybook stories and Jest tests were updated to support the new
  implementation.

### Breaking Changes

- The prop `userName` has been renamed to `name` to better align with the API
  response object. All parent components that render `<UserProfile>` must be
  updated to pass the `name` prop instead of `userName`.
```

## Dependency management

### Installing dependencies

- Always use the `deno add x` to install dependencies
- Don't directly modify `deno.json` unless the user requests it explicitly

## Documentation sources

### General

Try to use Context7 or web fetch to get documentation for a library if
available.

### JSR/Deno libraries

For JSR/Deno libraries, use the built-in `deno doc` command to read
documentation, e.g. `deno doc jsr:@std/cli/unstable-progress-bar`.
