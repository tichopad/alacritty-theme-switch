# AI Agent Development Guidelines

This document provides development rules and architectural guidance for AI agents working on the alacritty-theme-switch project.

## Project Overview

This is a Deno TypeScript CLI tool for switching color themes in the Alacritty terminal emulator. The project emphasizes type safety, explicit error handling, minimal dependencies, and code readability.

## Core Principles

### Dependency management

Prefer Deno's standard library modules whenever possible (e.g., `@std/cli`, `@std/fs`, `@std/toml`, `@std/assert`). Only add external dependencies when absolutely necessary and when @std/ alternatives don't exist. All dependencies should be imported from JSR (jsr:@std/...) as shown in deno.json.

### Error handling

Use the custom Result and ResultAsync types for all operations that can fail. Functions should return Result<T, E> or ResultAsync<T, E> instead of throwing exceptions. Define specific error types with `_tag` discriminants (see `src/theme-manager/errors.ts`). Use union types to compose multiple possible error types in function signatures.

### Code quality

#### Comments and documentation

All public functions must have comprehensive JSDoc comments with examples. Comments should explain business logic and design decisions, not just what the code does. Include @template, @param, @returns, and @example tags in JSDoc. Provide realistic usage examples in JSDoc comments.

#### Code style

Prefer explicit type annotations over inference for public APIs. Use map, flatMap and other functional methods on Result/ResultAsync. Treat data as immutable. Avoid mutating objects; create new objects when changes are needed. Strive for clear naming. Use descriptive names that explain intent (e.g., `applyThemeByFilename` vs `apply`).

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

Create specific error classes with `_tag` discriminants for pattern matching. Include relevant context (file paths, operation details) in error messages. Use `ErrorOptions` with `cause` to preserve original error information. Group related errors into union types (e.g., `ParseConfigError`, `LoadThemesError`).

### Module organization

Each module should have a clear, focused purpose. Use index files to re-export public APIs when appropriate. Keep error definitions close to the code that uses them. Define types near their usage, not in separate type-only files.

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

Use kebab-case for file names (`theme-manager.ts`, not `themeManager.ts`). Use camelCase with descriptive verbs for functions (`applyTheme`, `listThemes`). Use PascalCase for types and interfaces (`ThemeManager`, `ParseConfigError`). Use SCREAMING_SNAKE_CASE for module-level constants.

## Testing Guidelines

### Test framework

Write tests using `Deno.test()` with Deno's built-in test runner. Import assertion functions from `@std/assert`. The `__tests__` directory contains old Node.js tests that should be ignored.

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

Read existing code to understand the theme management domain. Look at existing error types and follow the same patterns. Understand how Result/ResultAsync are used throughout the codebase.

### Code review checklist

- [ ] All functions that can fail return Result or ResultAsync
- [ ] Error types are properly defined with `_tag` discriminants
- [ ] JSDoc comments include examples and explain the purpose
- [ ] No external dependencies added without justification
- [ ] @std/ libraries used where applicable
- [ ] Tests cover both success and error cases

### Performance considerations

Use ResultAsync for operations that should be deferred. Don't make functions async unless they perform I/O. Use appropriate @std/fs functions for file system operations.

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
  path: string
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
  themePaths.map((path) => validateTheme(path).toResult())
);
const errors = results.filter((r) => r.isErr()).map((r) => r.error);
const themes = results.filter((r) => r.isOk()).map((r) => r.data);
```

Remember: This codebase prioritizes correctness and maintainability over brevity. When in doubt, choose the more explicit and type-safe approach.
