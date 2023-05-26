import fs, { readFile } from "fs/promises";
import path from "path";
import { pipe } from "fp-ts/function";
import { stringify, type Document, parseDocument, isSeq } from "yaml";

type Brand<K, T> = K & { __brand: T };

export type AbsolutePath = Brand<string, "AbsolutePath">;

function isAbsolutePath(filePath: string): filePath is AbsolutePath {
  return path.isAbsolute(filePath);
}

function getAbsolutePath(...pathSegments: string[]): AbsolutePath {
  return path.resolve(...pathSegments) as AbsolutePath;
}

export async function listYamlFiles(
  directory: string
): Promise<AbsolutePath[]> {
  const files = await fs.readdir(directory);

  return files
    .filter((file) => /\.ya?ml/i.test(path.extname(file)))
    .map((file) => getAbsolutePath(directory, file));
}

const loadYamlFile = (filePath: string): Promise<string> =>
  readFile(filePath, "utf8");

const parseYaml = (yamlString: string): Document.Parsed =>
  parseDocument(yamlString);

const serializeYaml = (doc: Document): string => stringify(doc);

export const modifyImportList =
  (themeFilePath: string) =>
  (doc: Document.Parsed): Document => {
    const clonedDoc = doc.clone();
    let importList = clonedDoc.get("import");
    if (!importList) {
      importList = clonedDoc.createNode([]);
    }
    if (!isSeq(importList)) {
      throw new Error("Import list is not a list");
    }
    importList.add(themeFilePath);
    clonedDoc.set("import", importList);
    return clonedDoc;
  };

export const modifyConfig = (
  alacrittyConfig: string,
  themeFilePath: string
): string =>
  pipe(
    alacrittyConfig,
    parseYaml,
    modifyImportList(themeFilePath),
    serializeYaml
  );

export const writeConfig = async (
  configPath: string,
  themeFilePath: string
) => {
  const alacrittyConfig = await loadYamlFile(configPath);
  const modifiedConfig = modifyConfig(alacrittyConfig, themeFilePath);
  await fs.writeFile(configPath, modifiedConfig);
};
