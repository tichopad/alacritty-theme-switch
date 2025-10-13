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

// Mock raw content responses (plain text, not base64)
const mockMonokaiContent =
  '[colors.primary]\nbackground = "#272822"\nforeground = "#F8F8F2"';
const mockDraculaContent =
  '[colors.primary]\nbackground = "#282a36"\nforeground = "#f8f8f2"';

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

  // Mock fetch to return raw file contents from raw.githubusercontent.com
  const fetchStub = stub(
    globalThis,
    "fetch",
    (_input: string | URL | Request, _init?: RequestInit) => {
      return Promise.resolve(
        new Response(mockMonokaiContent, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
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
      assertEquals(content, mockMonokaiContent);
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

      // Return tree response for listThemes (API call)
      if (url.includes("/git/trees/")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockTreeResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      // Return raw content for monokai (raw.githubusercontent.com)
      if (
        url.includes("raw.githubusercontent.com") &&
        url.includes("monokai.toml")
      ) {
        return Promise.resolve(
          new Response(mockMonokaiContent, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
        );
      }

      // Return raw content for dracula (raw.githubusercontent.com)
      if (
        url.includes("raw.githubusercontent.com") &&
        url.includes("dracula.toml")
      ) {
        return Promise.resolve(
          new Response(mockDraculaContent, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
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

    // First list themes
    const themesResult = await client.listThemes().toResult();
    assertEquals(themesResult.isOk(), true);

    if (!themesResult.isOk()) {
      throw new Error("Failed to list themes");
    }

    // Then download them
    const result = await client.downloadAllThemes(themesResult.data, tempDir)
      .toResult();

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
      assertEquals(monokaiContent, mockMonokaiContent);

      const draculaContent = await Deno.readTextFile(draculaTheme.path);
      assertEquals(draculaContent, mockDraculaContent);
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

      // Return tree response for listThemes (API call)
      if (url.includes("/git/trees/")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockTreeResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      // Return success for monokai (raw.githubusercontent.com)
      if (
        url.includes("raw.githubusercontent.com") &&
        url.includes("monokai.toml")
      ) {
        return Promise.resolve(
          new Response(mockMonokaiContent, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
        );
      }

      // Return error for dracula (raw.githubusercontent.com)
      if (
        url.includes("raw.githubusercontent.com") &&
        url.includes("dracula.toml")
      ) {
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

    // First list themes
    const themesResult = await client.listThemes().toResult();
    assertEquals(themesResult.isOk(), true);

    if (!themesResult.isOk()) {
      throw new Error("Failed to list themes");
    }

    // Then download them (should fail on one)
    const result = await client.downloadAllThemes(themesResult.data, tempDir)
      .toResult();

    // Should fail if any download fails
    assertEquals(result.isErr(), true);
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("GitHubClient: downloadAllThemes should download LICENSE file", async () => {
  const originalFetch = globalThis.fetch;
  const tempDir = await Deno.makeTempDir();

  const mockLicenseContent = "Apache License 2.0\n\nCopyright...";

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

      // Return raw content for monokai (raw.githubusercontent.com)
      if (
        url.includes("raw.githubusercontent.com") &&
        url.includes("monokai.toml")
      ) {
        return Promise.resolve(
          new Response(mockMonokaiContent, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
        );
      }

      // Return raw content for dracula (raw.githubusercontent.com)
      if (
        url.includes("raw.githubusercontent.com") &&
        url.includes("dracula.toml")
      ) {
        return Promise.resolve(
          new Response(mockDraculaContent, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
        );
      }

      // Return LICENSE content
      if (
        url.includes("raw.githubusercontent.com") &&
        url.includes("LICENSE")
      ) {
        return Promise.resolve(
          new Response(mockLicenseContent, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
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

    // First list themes
    const themesResult = await client.listThemes().toResult();
    assertEquals(themesResult.isOk(), true);

    if (!themesResult.isOk()) {
      throw new Error("Failed to list themes");
    }

    // Then download them
    const result = await client.downloadAllThemes(themesResult.data, tempDir)
      .toResult();

    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      // Verify LICENSE file was downloaded with unique name
      const licenseFilename = "LICENSE-alacritty-alacritty-theme";
      const licensePath = `${tempDir}/${licenseFilename}`;

      const licenseExists = await Deno.stat(licensePath).then(() => true)
        .catch(() => false);

      assertEquals(licenseExists, true, "LICENSE file should exist");

      // Verify LICENSE content
      const licenseContent = await Deno.readTextFile(licensePath);
      assertEquals(licenseContent, mockLicenseContent);
    }
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("GitHubClient: downloadAllThemes should try multiple LICENSE filenames", async () => {
  const originalFetch = globalThis.fetch;
  const tempDir = await Deno.makeTempDir();

  const mockLicenseContent = "MIT License\n\nCopyright...";
  const attemptedUrls: string[] = [];

  // Mock fetch to return different responses based on URL
  const fetchStub = stub(
    globalThis,
    "fetch",
    (input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      // Track attempted URLs
      if (url.includes("LICENSE") || url.includes("license")) {
        attemptedUrls.push(url);
      }

      // Return tree response for listThemes (API call)
      if (url.includes("/git/trees/")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockTreeResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      // Return raw content for monokai (raw.githubusercontent.com)
      if (
        url.includes("raw.githubusercontent.com") &&
        url.includes("monokai.toml")
      ) {
        return Promise.resolve(
          new Response(mockMonokaiContent, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
        );
      }

      // Return raw content for dracula (raw.githubusercontent.com)
      if (
        url.includes("raw.githubusercontent.com") &&
        url.includes("dracula.toml")
      ) {
        return Promise.resolve(
          new Response(mockDraculaContent, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
        );
      }

      // Return 404 for "LICENSE" and "LICENSE.md", but succeed for "LICENSE.txt"
      if (
        url.includes("raw.githubusercontent.com") &&
        url.endsWith("/LICENSE")
      ) {
        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }

      if (
        url.includes("raw.githubusercontent.com") &&
        url.endsWith("/LICENSE.md")
      ) {
        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }

      if (
        url.includes("raw.githubusercontent.com") &&
        url.endsWith("/LICENSE.txt")
      ) {
        return Promise.resolve(
          new Response(mockLicenseContent, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
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

    // First list themes
    const themesResult = await client.listThemes().toResult();
    assertEquals(themesResult.isOk(), true);

    if (!themesResult.isOk()) {
      throw new Error("Failed to list themes");
    }

    // Then download them
    const result = await client.downloadAllThemes(themesResult.data, tempDir)
      .toResult();

    assertEquals(result.isOk(), true);

    // Verify that multiple LICENSE filenames were attempted
    assertEquals(
      attemptedUrls.length >= 3,
      true,
      "Should have tried multiple LICENSE filenames",
    );
    assertEquals(
      attemptedUrls.some((url) => url.endsWith("/LICENSE")),
      true,
      "Should have tried LICENSE",
    );
    assertEquals(
      attemptedUrls.some((url) => url.endsWith("/LICENSE.md")),
      true,
      "Should have tried LICENSE.md",
    );
    assertEquals(
      attemptedUrls.some((url) => url.endsWith("/LICENSE.txt")),
      true,
      "Should have tried LICENSE.txt",
    );

    if (result.isOk()) {
      // Verify LICENSE file was downloaded with unique name
      const licenseFilename = "LICENSE-alacritty-alacritty-theme";
      const licensePath = `${tempDir}/${licenseFilename}`;

      const licenseExists = await Deno.stat(licensePath).then(() => true)
        .catch(() => false);

      assertEquals(licenseExists, true, "LICENSE file should exist");

      // Verify LICENSE content
      const licenseContent = await Deno.readTextFile(licensePath);
      assertEquals(licenseContent, mockLicenseContent);
    }
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("GitHubClient: downloadAllThemes should succeed when no LICENSE file exists", async () => {
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

      // Return raw content for monokai (raw.githubusercontent.com)
      if (
        url.includes("raw.githubusercontent.com") &&
        url.includes("monokai.toml")
      ) {
        return Promise.resolve(
          new Response(mockMonokaiContent, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
        );
      }

      // Return raw content for dracula (raw.githubusercontent.com)
      if (
        url.includes("raw.githubusercontent.com") &&
        url.includes("dracula.toml")
      ) {
        return Promise.resolve(
          new Response(mockDraculaContent, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
        );
      }

      // Return 404 for all LICENSE attempts
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

    // First list themes
    const themesResult = await client.listThemes().toResult();
    assertEquals(themesResult.isOk(), true);

    if (!themesResult.isOk()) {
      throw new Error("Failed to list themes");
    }

    // Then download them - should succeed even without LICENSE
    const result = await client.downloadAllThemes(themesResult.data, tempDir)
      .toResult();

    assertEquals(
      result.isOk(),
      true,
      "Should succeed even when no LICENSE file exists",
    );

    if (result.isOk()) {
      // Verify LICENSE file was NOT created
      const licenseFilename = "LICENSE-alacritty-alacritty-theme";
      const licensePath = `${tempDir}/${licenseFilename}`;

      const licenseExists = await Deno.stat(licensePath).then(() => true)
        .catch(() => false);

      assertEquals(
        licenseExists,
        false,
        "LICENSE file should not exist when not found in repo",
      );
    }
  } finally {
    fetchStub.restore();
    globalThis.fetch = originalFetch;
    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true });
  }
});
