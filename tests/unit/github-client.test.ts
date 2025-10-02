import { assertEquals, assertExists } from "@std/assert";
import { stub } from "@std/testing/mock";
import { createGitHubClient } from "../../src/theme-manager/github/client.ts";
import { InvalidRepositoryUrlError } from "../../src/theme-manager/github/errors.ts";

// Mock GitHub API responses
const mockTreeResponse = {
  sha: "40e0c6c8690d1c62f58718fcef8a48eb6077740b",
  url:
    "https://api.github.com/repos/alacritty/alacritty-theme/git/trees/40e0c6c8690d1c62f58718fcef8a48eb6077740b",
  tree: [
    {
      path: "LICENSE",
      mode: "100644",
      type: "blob" as const,
      sha: "149bf8b02588cc29afafd9ed5bca90a92e7ebbe3",
      size: 10875,
      url:
        "https://api.github.com/repos/alacritty/alacritty-theme/git/blobs/149bf8b02588cc29afafd9ed5bca90a92e7ebbe3",
    },
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
      path: "images/monokai.png",
      mode: "100644",
      type: "blob" as const,
      sha: "1e7510b61e24363888f6ef19610bc26d2f81208d",
      size: 58573,
      url:
        "https://api.github.com/repos/alacritty/alacritty-theme/git/blobs/1e7510b61e24363888f6ef19610bc26d2f81208d",
    },
  ],
  truncated: false,
};

const mockContentsResponse = {
  name: "monokai.toml",
  path: "themes/monokai.toml",
  sha: "1e7510b61e24363888f6ef19610bc26d2f81208d",
  size: 58573,
  url:
    "https://api.github.com/repos/alacritty/alacritty-theme/contents/themes/monokai.toml",
  html_url:
    "https://github.com/alacritty/alacritty-theme/blob/master/themes/monokai.toml",
  git_url:
    "https://api.github.com/repos/alacritty/alacritty-theme/git/blobs/1e7510b61e24363888f6ef19610bc26d2f81208d",
  download_url:
    "https://raw.githubusercontent.com/alacritty/alacritty-theme/master/themes/monokai.toml",
  type: "file" as const,
  content: btoa(
    '[colors.primary]\nbackground = "#272822"\nforeground = "#F8F8F2"',
  ),
  encoding: "base64" as const,
};

Deno.test("createGitHubClient: should parse valid HTTPS URL", () => {
  const result = createGitHubClient(
    "https://github.com/alacritty/alacritty-theme",
  );
  assertEquals(result.isOk(), true);
  assertExists(result.data);
});

Deno.test("createGitHubClient: should parse valid HTTPS URL with .git", () => {
  const result = createGitHubClient(
    "https://github.com/alacritty/alacritty-theme.git",
  );
  assertEquals(result.isOk(), true);
  assertExists(result.data);
});

Deno.test("createGitHubClient: should parse valid SSH URL", () => {
  const result = createGitHubClient(
    "git@github.com:alacritty/alacritty-theme.git",
  );
  assertEquals(result.isOk(), true);
  assertExists(result.data);
});

Deno.test("createGitHubClient: should return error on invalid URL", () => {
  const result = createGitHubClient("not-a-valid-url");
  assertEquals(result.isErr(), true);
  assertEquals(result.error instanceof InvalidRepositoryUrlError, true);
});

Deno.test("GitHubClient: listThemes should return themes from repository", async () => {
  const originalFetch = globalThis.fetch;

  // Mock fetch to return our test data
  const fetchStub = stub(
    globalThis,
    "fetch",
    (_input: string | URL | Request, _init?: RequestInit) => {
      return Promise.resolve(
        new Response(JSON.stringify(mockTreeResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    },
  );

  try {
    const clientResult = createGitHubClient(
      "https://github.com/alacritty/alacritty-theme",
    );

    if (!clientResult.isOk()) {
      throw new Error("Failed to create client");
    }

    const client = clientResult.data;
    const result = await client.listThemes().toResult();

    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      assertEquals(Array.isArray(result.data), true);
      assertEquals(result.data.length, 2); // Only 2 TOML files in mock data

      // Check that all themes have required properties
      result.data.forEach((theme) => {
        assertExists(theme.path);
        assertExists(theme.label);
        assertEquals(theme.isCurrentlyActive, null);
        assertEquals(theme.path.endsWith(".toml"), true);
      });

      // Verify specific themes
      assertEquals(result.data[0].path, "themes/monokai.toml");
      assertEquals(result.data[0].label, "Monokai");
      assertEquals(result.data[1].path, "themes/dracula.toml");
      assertEquals(result.data[1].label, "Dracula");
    }
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
  }
});

Deno.test("GitHubClient: downloadTheme should download a single theme", async () => {
  const originalFetch = globalThis.fetch;
  const tempDir = await Deno.makeTempDir();

  // Mock fetch to return file contents
  const fetchStub = stub(
    globalThis,
    "fetch",
    (_input: string | URL | Request, _init?: RequestInit) => {
      return Promise.resolve(
        new Response(JSON.stringify(mockContentsResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    },
  );

  try {
    const clientResult = createGitHubClient(
      "https://github.com/alacritty/alacritty-theme",
    );

    if (!clientResult.isOk()) {
      throw new Error("Failed to create client");
    }

    const client = clientResult.data;
    const result = await client.downloadTheme(
      "themes/monokai.toml",
      tempDir,
    ).toResult();

    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      const theme = result.data;
      assertExists(theme.path);
      assertEquals(theme.label, "Monokai");
      assertEquals(theme.isCurrentlyActive, null);

      // Verify file was written
      const fileExists = await Deno.stat(theme.path).then(() => true).catch(
        () => false,
      );
      assertEquals(fileExists, true);

      // Verify file contents
      const content = await Deno.readTextFile(theme.path);
      assertEquals(
        content,
        '[colors.primary]\nbackground = "#272822"\nforeground = "#F8F8F2"',
      );
    }
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("GitHubClient: downloadTheme should handle API errors", async () => {
  const originalFetch = globalThis.fetch;
  const tempDir = await Deno.makeTempDir();

  // Mock fetch to return error
  const fetchStub = stub(
    globalThis,
    "fetch",
    (_input: string | URL | Request, _init?: RequestInit) => {
      return Promise.resolve(
        new Response("Not Found", {
          status: 404,
          statusText: "Not Found",
        }),
      );
    },
  );

  try {
    const clientResult = createGitHubClient(
      "https://github.com/alacritty/alacritty-theme",
    );

    if (!clientResult.isOk()) {
      throw new Error("Failed to create client");
    }

    const client = clientResult.data;
    const result = await client.downloadTheme(
      "themes/nonexistent.toml",
      tempDir,
    ).toResult();

    assertEquals(result.isErr(), true);
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("GitHubClient: downloadAllThemes should download all themes", async () => {
  const originalFetch = globalThis.fetch;
  const tempDir = await Deno.makeTempDir();

  // Mock fetch to return different responses based on URL
  const fetchStub = stub(
    globalThis,
    "fetch",
    (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      // Return tree response for listThemes
      if (url.includes("/git/trees/")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockTreeResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      // Return contents response for downloadTheme
      if (url.includes("/contents/themes/monokai.toml")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockContentsResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      if (url.includes("/contents/themes/dracula.toml")) {
        const draculaResponse = {
          ...mockContentsResponse,
          name: "dracula.toml",
          path: "themes/dracula.toml",
          content: btoa(
            '[colors.primary]\nbackground = "#282a36"\nforeground = "#f8f8f2"',
          ),
        };
        return Promise.resolve(
          new Response(JSON.stringify(draculaResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      return Promise.resolve(new Response("Not Found", { status: 404 }));
    },
  );

  try {
    const clientResult = createGitHubClient(
      "https://github.com/alacritty/alacritty-theme",
    );

    if (!clientResult.isOk()) {
      throw new Error("Failed to create client");
    }

    const client = clientResult.data;
    const result = await client.downloadAllThemes(tempDir).toResult();

    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      const themes = result.data;
      assertEquals(themes.length, 2);

      // Verify both themes were downloaded
      const monokaiTheme = themes.find((t) => t.label === "Monokai");
      const draculaTheme = themes.find((t) => t.label === "Dracula");

      assertExists(monokaiTheme);
      assertExists(draculaTheme);

      // Verify files exist
      const monokaiExists = await Deno.stat(monokaiTheme.path).then(() => true)
        .catch(() => false);
      const draculaExists = await Deno.stat(draculaTheme.path).then(() => true)
        .catch(() => false);

      assertEquals(monokaiExists, true);
      assertEquals(draculaExists, true);

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
    }
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("GitHubClient: downloadAllThemes should handle partial failures", async () => {
  const originalFetch = globalThis.fetch;
  const tempDir = await Deno.makeTempDir();

  // Mock fetch to return tree but fail on one download
  const fetchStub = stub(
    globalThis,
    "fetch",
    (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      // Return tree response for listThemes
      if (url.includes("/git/trees/")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockTreeResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      // Return success for monokai
      if (url.includes("/contents/themes/monokai.toml")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockContentsResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      // Return error for dracula
      if (url.includes("/contents/themes/dracula.toml")) {
        return Promise.resolve(
          new Response("Server Error", {
            status: 500,
            statusText: "Internal Server Error",
          }),
        );
      }

      return Promise.resolve(new Response("Not Found", { status: 404 }));
    },
  );

  try {
    const clientResult = createGitHubClient(
      "https://github.com/alacritty/alacritty-theme",
    );

    if (!clientResult.isOk()) {
      throw new Error("Failed to create client");
    }

    const client = clientResult.data;
    const result = await client.downloadAllThemes(tempDir).toResult();

    // Should fail if any download fails
    assertEquals(result.isErr(), true);
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});
