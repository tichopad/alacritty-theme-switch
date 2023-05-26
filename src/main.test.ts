import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs/promises";
import yaml, { YAMLSeq, parseDocument } from "yaml";
import {
  modifyConfig,
  listYamlFiles,
  modifyImportList,
  writeConfig,
} from "./main.js";

function dd(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = "";
  for (let i = 0; i < strings.length; i++) {
    result += strings[i] + (values[i] || "");
  }
  const lines = result.split("\n");
  const minIndent = Math.min(
    ...lines
      .filter((line) => line.trim() !== "")
      .map((line) => line.search(/\S/))
  );
  return lines
    .map((line) => line.slice(minIndent))
    .join("\n")
    .trim()
    .concat("\n");
}

describe("listYamlFiles", () => {
  it("lists theme files", async () => {
    const files = await listYamlFiles(`${__dirname}/themes`);
    expect(files).toEqual([
      "/home/michael/Projekty/alacritty-theme-switch/src/themes/cobalt2.yml",
      "/home/michael/Projekty/alacritty-theme-switch/src/themes/mariana.yml",
    ]);
  });
});

describe("modifyImportList", () => {
  it("should add themeFilePath to import list", () => {
    const inputYaml = dd`
      import:
        - file1
        - file2
    `;
    const themeFilePath = "themeFile";
    const expectedYaml = dd`
      import:
        - file1
        - file2
        - themeFile
    `;
    const doc = parseDocument(inputYaml);
    const modifiedDoc = modifyImportList(themeFilePath)(doc);
    expect(modifiedDoc.toString()).toEqual(expectedYaml);
  });

  it("should create import list if it does not exist", () => {
    const inputYaml = dd`
      key: value
    `;
    const themeFilePath = "themeFile";
    const expectedYaml = dd`
      key: value
      import:
        - themeFile
    `;
    const doc = parseDocument(inputYaml);
    const modifiedDoc = modifyImportList(themeFilePath)(doc);
    expect(modifiedDoc.toString()).toEqual(expectedYaml);
  });
});

describe("modifyConfig", () => {
  it("should return a modified yaml string", () => {
    const alacrittyConfig = dd`
      window:
        opacity: 1.0
      import:
        - file1
    `;
    const themeFilePath = "themeFile";
    const expectedYaml = dd`
      window:
        opacity: 1.0
      import:
        - file1
        - themeFile
    `;
    expect(modifyConfig(alacrittyConfig, themeFilePath)).toEqual(expectedYaml);
  });
});

describe("writeConfig", () => {
  const CONFIG_PATH = `${__dirname}/_tmp_test_config.yml`;
  beforeEach(async () => {
    const configYaml = dd`
      window:
        opacity: 1.0
      import:
        - file1
    `;
    await fs.writeFile(CONFIG_PATH, configYaml);
  });
  afterEach(async () => {
    await fs.unlink(CONFIG_PATH);
  });
  it("should modify and write a config file", async () => {
    const themeFilePath = `${__dirname}/themes/cobalt2.yml`;
    const configPath = CONFIG_PATH;
    const expectedYaml = dd`
      window:
        opacity: 1.0
      import:
        - file1
        - ${themeFilePath}
    `;
    await writeConfig(configPath, themeFilePath);
    const outputYaml = await fs.readFile(configPath, "utf8");
    expect(outputYaml).toEqual(expectedYaml);
  });
});
