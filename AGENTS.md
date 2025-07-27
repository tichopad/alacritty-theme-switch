# Agent Instructions

## Build/Lint/Test Commands

- `npm test` - Run all tests, linting, and formatting checks
- `npm run test:unit` - Run unit tests only
- `npm run test:unit -- --watch` - Run tests in watch mode
- `npm run test:unit -- <file>` - Run a specific test file
- `npm run lint` - Run ESLint
- `npm run lint -- --fix` - Run ESLint and fix issues
- `npm run format` - Check code formatting with Prettier
- `npm run format -- --write` - Fix formatting issues with Prettier

## Code Style Guidelines

- Use single quotes for strings
- Use semicolons at end of statements
- 2 space indentation
- Max line width 120 characters
- Trailing commas in objects and arrays
- Arrow functions with implicit returns when possible
- Avoid parentheses around single parameter arrow functions
- Use const/let instead of var

## Naming Conventions

- camelCase for variables and functions
- PascalCase for constructors/classes
- UPPER_CASE for constants

## Imports and Exports

- Use require() for imports
- Use module.exports for exports
- Group built-in modules, external packages, and local imports
- Sort imports alphabetically within groups

## Error Handling

- Use try/catch for async operations
- Always provide meaningful error messages
- Exit with process.exit(1) for CLI errors

## Testing

- Use Jest for testing
- Mock filesystem with mock-fs for file operations
- Test both success and error cases
- Use descriptive test names

## Git Operations

- NEVER use "git commit" or "git push" without the user explicitly telling you to
- Always ask for explicit confirmation before committing or pushing changes
- Never assume the user wants to commit or push changes
- NEVER create pull requests without the user explicitly telling you to

### Git commit message format

Commit messages follow this format:
```
<short description>

<long description>
```
Example:
```
Added new feature

This feature allows users to do X, Y, and Z. It should help with A, B, and C.
```