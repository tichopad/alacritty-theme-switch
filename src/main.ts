import { parse } from "yaml";

export function parseYaml(yamlString: string) {
  return parse(yamlString);
}
