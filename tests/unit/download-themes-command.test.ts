/**
 * Unit tests for the download-themes command.
 */

import { assertEquals, assertExists } from "@std/assert";
import { stub } from "@std/testing/mock";
import { downloadThemesCommand } from "../../src/commands/download-themes.ts";

// Mock GitHub API responses
const mockTreeResponse = {
  sha: "40e0c6c8690d1c62f58718fcef8a48eb6077740b",
  url:
    "https://api.github.com/repos/alacritty/alacritty-theme/git/trees/40e0c6c8690d1c62f58718fcef8a48eb6077740b",
  tree: [
    {
      path: "themes/monokai.toml",
      mode: "100644",
      type: "blob" as const,
      sha: "1e7510b61e24363888f6ef19610bc26d2f81208d",
      size: 58573,
      url:
        "https://api.github.com/repos/alacritty/alacritty-theme/git/blobs/1e7510b61e24363888f6ef19610bc26d2f81208d",
    },
    {
      path: "themes/dracula.toml",
      mode: "100644",
      type: "blob" as const,
      sha: "128daeb6f2d4537533c7b5242cafd621d71bfe6a",
      size: 107713,
      url:
        "https://api.github.com/repos/alacritty/alacritty-theme/git/blobs/128daeb6f2d4537533c7b5242cafd621d71bfe6a",
    },
    {
      path: "themes/solarized.toml",
      mode: "100644",
      type: "blob" as const,
      sha: "abc123def456",
      size: 50000,
      url:
        "https://api.github.com/repos/alacritty/alacritty-theme/git/blobs/abc123def456",
    },
  ],
  truncated: false,
};

// Mock raw content responses (plain text, not base64)
const mockRawContents: Record<string, string> = {
  "monokai.toml":
    '[colors.primary]\nbackground = "#272822"\nforeground = "#F8F8F2"',
  "dracula.toml":
    '[colors.primary]\nbackground = "#282a36"\nforeground = "#f8f8f2"',
  "solarized.toml":
    '[colors.primary]\nbackground = "#002b36"\nforeground = "#839496"',
};

Deno.test("downloadThemesCommand: returns error for invalid repository URL", async () => {
  const result = await downloadThemesCommand({
    repositoryUrl: "invalid-url",
    outputPath: "/tmp/themes",
  }).toResult();

  assertEquals(result.isErr(), true);
  if (result.isErr()) {
    assertEquals(result.error._tag, "InvalidRepositoryUrlError");
  }
});

Deno.test("downloadThemesCommand: successfully downloads themes from repository", async () => {
  const originalFetch = globalThis.fetch;
  const tempDir = await Deno.makeTempDir();

  // Mock fetch to return different responses based on URL
  const fetchStub = stub(
    globalThis,
    "fetch",
    (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      // Return tree response for listThemes (API call)
      if (url.includes("/git/trees/")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockTreeResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      // Return raw content for each theme (raw.githubusercontent.com)
      for (const [filename, content] of Object.entries(mockRawContents)) {
        if (
          url.includes("raw.githubusercontent.com") && url.includes(filename)
        ) {
          return Promise.resolve(
            new Response(content, {
              status: 200,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }),
          );
        }
      }

      return Promise.resolve(new Response("Not Found", { status: 404 }));
    },
  );

  try {
    const result = await downloadThemesCommand({
      repositoryUrl: "https://github.com/alacritty/alacritty-theme",
      outputPath: tempDir,
    }).toResult();

    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      const themes = result.data;
      assertEquals(themes.length, 3);

      // Verify all themes were downloaded
      const monokaiTheme = themes.find((t) => t.label === "Monokai");
      const draculaTheme = themes.find((t) => t.label === "Dracula");
      const solarizedTheme = themes.find((t) => t.label === "Solarized");

      assertExists(monokaiTheme);
      assertExists(draculaTheme);
      assertExists(solarizedTheme);

      // Verify files exist
      const monokaiExists = await Deno.stat(monokaiTheme.path).then(() => true)
        .catch(() => false);
      const draculaExists = await Deno.stat(draculaTheme.path).then(() => true)
        .catch(() => false);
      const solarizedExists = await Deno.stat(solarizedTheme.path).then(() =>
        true
      ).catch(() => false);

      assertEquals(monokaiExists, true);
      assertEquals(draculaExists, true);
      assertEquals(solarizedExists, true);

      // Verify file contents
      const monokaiContent = await Deno.readTextFile(monokaiTheme.path);
      assertEquals(
        monokaiContent,
        '[colors.primary]\nbackground = "#272822"\nforeground = "#F8F8F2"',
      );

      const draculaContent = await Deno.readTextFile(draculaTheme.path);
      assertEquals(
        draculaContent,
        '[colors.primary]\nbackground = "#282a36"\nforeground = "#f8f8f2"',
      );

      const solarizedContent = await Deno.readTextFile(solarizedTheme.path);
      assertEquals(
        solarizedContent,
        '[colors.primary]\nbackground = "#002b36"\nforeground = "#839496"',
      );
    }
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("downloadThemesCommand: handles GitHub API errors", async () => {
  const originalFetch = globalThis.fetch;
  const tempDir = await Deno.makeTempDir();

  // Mock fetch to return error
  const fetchStub = stub(
    globalThis,
    "fetch",
    (_input: string | URL | Request, _init?: RequestInit) => {
      return Promise.resolve(
        new Response("Forbidden", {
          status: 403,
          statusText: "Forbidden",
        }),
      );
    },
  );

  try {
    const result = await downloadThemesCommand({
      repositoryUrl: "https://github.com/alacritty/alacritty-theme",
      outputPath: tempDir,
    }).toResult();

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error._tag, "GitHubApiError");
    }
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("downloadThemesCommand: returns ResultAsync that can be chained", async () => {
  const originalFetch = globalThis.fetch;
  const tempDir = await Deno.makeTempDir();

  // Mock fetch to return successful responses
  const fetchStub = stub(
    globalThis,
    "fetch",
    (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      // Return tree response for listThemes (API call)
      if (url.includes("/git/trees/")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockTreeResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      // Return raw content for each theme (raw.githubusercontent.com)
      for (const [filename, content] of Object.entries(mockRawContents)) {
        if (
          url.includes("raw.githubusercontent.com") && url.includes(filename)
        ) {
          return Promise.resolve(
            new Response(content, {
              status: 200,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }),
          );
        }
      }

      return Promise.resolve(new Response("Not Found", { status: 404 }));
    },
  );

  try {
    // Test that the function returns a ResultAsync that can be chained
    const resultAsync = downloadThemesCommand({
      repositoryUrl: "https://github.com/alacritty/alacritty-theme",
      outputPath: tempDir,
    });

    // Chain a map operation to verify it's a proper ResultAsync
    const mappedResult = await resultAsync
      .map((themes) => themes.length)
      .toResult();

    assertEquals(mappedResult.isOk(), true);
    if (mappedResult.isOk()) {
      assertEquals(mappedResult.data, 3);
    }
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("downloadThemesCommand: can use match pattern for error handling", async () => {
  let errorHandled = false;
  let successHandled = false;

  await downloadThemesCommand({
    repositoryUrl: "invalid-url",
    outputPath: "/tmp/themes",
  }).match(
    (_themes) => {
      successHandled = true;
    },
    (error) => {
      errorHandled = true;
      assertEquals(error._tag, "InvalidRepositoryUrlError");
    },
  );

  assertEquals(errorHandled, true);
  assertEquals(successHandled, false);
});

Deno.test("downloadThemesCommand: uses custom ref parameter", async () => {
  const originalFetch = globalThis.fetch;
  const tempDir = await Deno.makeTempDir();
  const capturedUrls: string[] = [];

  // Mock fetch to capture URLs and return successful responses
  const fetchStub = stub(
    globalThis,
    "fetch",
    (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      capturedUrls.push(url);

      // Return tree response for listThemes (API call)
      if (url.includes("/git/trees/")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockTreeResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      // Return raw content for each theme (raw.githubusercontent.com)
      for (const [filename, content] of Object.entries(mockRawContents)) {
        if (
          url.includes("raw.githubusercontent.com") && url.includes(filename)
        ) {
          return Promise.resolve(
            new Response(content, {
              status: 200,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }),
          );
        }
      }

      return Promise.resolve(new Response("Not Found", { status: 404 }));
    },
  );

  try {
    const result = await downloadThemesCommand({
      repositoryUrl: "https://github.com/alacritty/alacritty-theme",
      outputPath: tempDir,
      ref: "develop",
    }).toResult();

    assertEquals(result.isOk(), true);

    // Verify that the custom ref was used in the raw content URLs
    const rawUrls = capturedUrls.filter((url) =>
      url.includes("raw.githubusercontent.com")
    );
    assertEquals(rawUrls.length > 0, true);

    // All raw URLs should contain the custom ref "develop" with proper format
    for (const url of rawUrls) {
      assertEquals(
        url.includes("/refs/heads/develop/"),
        true,
        `URL should contain /refs/heads/develop/ ref: ${url}`,
      );
    }
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("downloadThemesCommand: defaults to 'master' ref when not specified", async () => {
  const originalFetch = globalThis.fetch;
  const tempDir = await Deno.makeTempDir();
  const capturedUrls: string[] = [];

  // Mock fetch to capture URLs and return successful responses
  const fetchStub = stub(
    globalThis,
    "fetch",
    (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      capturedUrls.push(url);

      // Return tree response for listThemes (API call)
      if (url.includes("/git/trees/")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockTreeResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      // Return raw content for each theme (raw.githubusercontent.com)
      for (const [filename, content] of Object.entries(mockRawContents)) {
        if (
          url.includes("raw.githubusercontent.com") && url.includes(filename)
        ) {
          return Promise.resolve(
            new Response(content, {
              status: 200,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }),
          );
        }
      }

      return Promise.resolve(new Response("Not Found", { status: 404 }));
    },
  );

  try {
    const result = await downloadThemesCommand({
      repositoryUrl: "https://github.com/alacritty/alacritty-theme",
      outputPath: tempDir,
      // ref not specified, should default to "master"
    }).toResult();

    assertEquals(result.isOk(), true);

    // Verify that the default ref "master" was used in the raw content URLs
    const rawUrls = capturedUrls.filter((url) =>
      url.includes("raw.githubusercontent.com")
    );
    assertEquals(rawUrls.length > 0, true);

    // All raw URLs should contain the default ref "master"
    for (const url of rawUrls) {
      assertEquals(
        url.includes("/refs/heads/master/"),
        true,
        `URL should contain /refs/heads/master/ ref: ${url}`,
      );
    }
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});
