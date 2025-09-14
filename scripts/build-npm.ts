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
  package: {
    // package.json properties
    name: "alacritty-theme-switch",
    version: denoJson.version,
    description: "CLI utility for switching Alacritty color themes",
    license: "MIT",
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
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("LICENSE.md", "npm/LICENSE.md");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});
