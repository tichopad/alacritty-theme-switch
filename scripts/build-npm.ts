import { build, emptyDir } from "@deno/dnt";
import denoJson from "../deno.json" with { type: "json" };

await emptyDir("./npm");

await build({
  entryPoints: ["./src/main.ts"],
  outDir: "./npm",
  shims: {
    deno: true,
  },
  scriptModule: false,
  test: true,
  // Disable type checking as Node.js built-in types might not be
  // always compatible with Deno's types. Typical issue is setTimeout.
  // It shouldn't be an issue, because runtime viability is checked with
  // tests and type-checking is done by Deno.
  typeCheck: false,
  package: {
    // package.json properties
    name: "alacritty-theme-switch",
    version: denoJson.version,
    description: "CLI utility for switching Alacritty color themes",
    license: "MIT",
    type: "module",
    repository: {
      type: "git",
      url: "git+https://github.com/tichopad/alacritty-theme-switch.git",
    },
    bugs: {
      url: "https://github.com/tichopad/alacritty-theme-switch/issues",
    },
    main: "./esm/src/main.js",
    bin: {
      "alacritty-theme-switch": "./esm/src/main.js",
      ats: "./esm/src/main.js",
    },
  },
  compilerOptions: {
    lib: ["DOM", "ESNext"],
  },
  esModule: true,
  async postBuild() {
    // steps to run after building and before running the tests
    await Deno.copyFile("LICENSE.md", "npm/LICENSE.md");
    await Deno.copyFile("README.md", "npm/README.md");

    await injectShebang("./npm/esm/src/main.js");
  },
});

/** Injects shebang to the main CLI file for proper CLI functionality. */
async function injectShebang(filePath: string) {
  const shebang = "#!/usr/bin/env node\n";

  try {
    const content = await Deno.readTextFile(filePath);
    if (!content.startsWith("#!")) {
      await Deno.writeTextFile(filePath, shebang + content);
      console.log(`Added shebang to ${filePath}`);
    }
  } catch (error) {
    console.error(`Failed to add shebang to ${filePath}:`, error);
  }
}
