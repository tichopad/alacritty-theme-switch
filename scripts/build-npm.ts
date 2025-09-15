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
  // TODO: Fix the upstream CJS compat and then enable tests
  test: false,
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
  async postBuild() {
    // steps to run after building and before running the tests
    await Deno.copyFile("LICENSE.md", "npm/LICENSE.md");
    await Deno.copyFile("README.md", "npm/README.md");

    await injectShebang("./npm/esm/src/main.js");
  },
});

async function injectShebang(filePath: string) {
  // Add shebang to the executable file for proper CLI functionality
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
