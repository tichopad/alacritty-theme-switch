# GitHub Client Module

This module provides a simple client for downloading Alacritty theme files
(TOML) from GitHub repositories.

## Usage

### Basic Example

```typescript
import { createGitHubClient } from "./github/client.ts";

// Create a client for the official Alacritty themes repository
const clientResult = createGitHubClient(
  "https://github.com/alacritty/alacritty-theme",
);

if (clientResult.isErr()) {
  console.error("Invalid repository URL:", clientResult.error);
  Deno.exit(1);
}

const client = clientResult.data;

// List all available themes
const themesResult = await client.listThemes().toResult();
if (themesResult.isOk()) {
  console.log(`Found ${themesResult.data.length} themes`);
  themesResult.data.forEach((theme) => {
    console.log(`- ${theme.label}: ${theme.path}`);
  });
}

// Download all themes to a local directory
const downloadResult = await client.downloadAllThemes("./my-themes").toResult();
if (downloadResult.isOk()) {
  console.log(`Downloaded ${downloadResult.data.length} themes`);
}
```

### Download a Single Theme

```typescript
const clientResult = createGitHubClient(
  "https://github.com/alacritty/alacritty-theme",
);

if (clientResult.isErr()) {
  console.error("Invalid repository URL:", clientResult.error);
  Deno.exit(1);
}

const client = clientResult.data;

const result = await client
  .downloadTheme("themes/dracula.toml", "./my-themes")
  .toResult();

if (result.isOk()) {
  console.log(`Downloaded: ${result.data.label}`);
  console.log(`Saved to: ${result.data.path}`);
} else {
  console.error("Download failed:", result.error);
}
```

### Supported URL Formats

The `createGitHubClient` function accepts GitHub repository URLs in the
following formats:

- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`
- `git@github.com:owner/repo.git`

## API Reference

### `createGitHubClient()`

```typescript
function createGitHubClient(
  repositoryUrl: string,
): Result<GitHubClient, InvalidRepositoryUrlError>;
```

Creates a new GitHub client for the specified repository.

This factory function parses the repository URL and returns a Result containing
either a GitHubClient instance or an error if the URL format is invalid.

**Parameters:**

- `repositoryUrl`: GitHub repository URL

**Returns:**

- `Result<GitHubClient, InvalidRepositoryUrlError>` - A Result containing the
  GitHubClient instance or an InvalidRepositoryUrlError

**Example:**

```typescript
const clientResult = createGitHubClient(
  "https://github.com/alacritty/alacritty-theme",
);

if (clientResult.isOk()) {
  const client = clientResult.data;
  // Use the client...
} else {
  console.error("Invalid URL:", clientResult.error);
}
```

### `GitHubClient`

#### Methods

##### `listThemes()`

```typescript
listThemes(): ResultAsync<Theme[], GitHubClientError>
```

Lists all TOML theme files in the repository.

**Returns:**

- `ResultAsync` containing an array of themes or an error

**Example:**

```typescript
const result = await client.listThemes().toResult();
if (result.isOk()) {
  result.data.forEach((theme) => {
    console.log(theme.label, theme.path);
  });
}
```

##### `downloadTheme()`

```typescript
downloadTheme(remotePath: string, outputPath: FilePath): ResultAsync<Theme, GitHubClientError>
```

Downloads a single theme file from the repository.

**Parameters:**

- `remotePath`: Path to the theme file in the repository (e.g.,
  "themes/dracula.toml")
- `outputPath`: Local directory path where the theme should be saved

**Returns:**

- `ResultAsync` containing the downloaded theme with local path or an error

**Example:**

```typescript
const result = await client
  .downloadTheme("themes/nord.toml", "./themes")
  .toResult();
```

##### `downloadAllThemes()`

```typescript
downloadAllThemes(outputPath: FilePath): ResultAsync<Theme[], GitHubClientError>
```

Downloads all TOML theme files from the repository.

**Parameters:**

- `outputPath`: Local directory path where themes should be saved

**Returns:**

- `ResultAsync` containing an array of downloaded themes or an error

**Example:**

```typescript
const result = await client.downloadAllThemes("./themes").toResult();
if (result.isOk()) {
  console.log(`Downloaded ${result.data.length} themes`);
}
```

## Error Types

All errors follow the project's error handling pattern with `_tag`
discriminants:

- **`InvalidRepositoryUrlError`**: Thrown when the repository URL format is
  invalid
- **`GitHubApiError`**: Thrown when a GitHub API request fails
- **`FileDownloadError`**: Thrown when downloading a file fails
- **`FileWriteError`**: Thrown when writing a file to disk fails
- **`DirectoryCreateError`**: Thrown when creating a directory fails
- **`ThemeNotFoundInRepoError`**: Thrown when a theme is not found in the
  repository

All errors are combined into the `GitHubClientError` union type.

## Implementation Details

### GitHub API

The client uses GitHub's REST API v3:

- **Tree API**: `GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1` to list
  all files
- **Contents API**: `GET /repos/{owner}/{repo}/contents/{path}` to download
  individual files

### Rate Limiting

GitHub API has rate limits for unauthenticated requests:

- 60 requests per hour for public repositories

For most use cases (downloading themes once), this should be sufficient. If you
need higher limits, you can modify the client to include a GitHub personal
access token in the request headers.

### File Filtering

The client automatically filters for files with a `.toml` extension when listing
themes.

### Parallel Downloads

The `downloadAllThemes()` method downloads all themes in parallel using
`Promise.all()` for better performance.

## Examples

See the `examples/` directory for complete working examples:

- `examples/list-themes.ts`: List all themes from a repository
- `examples/download-themes.ts`: Download all themes from a repository

Run examples with:

```bash
deno run --allow-net examples/list-themes.ts
deno run --allow-net --allow-write examples/download-themes.ts
```
