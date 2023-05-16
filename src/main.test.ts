import { expect, it } from "vitest";
import { parseYaml } from "./main.js";

const EXAMPLE_YAML = `
#This is an example YAML file
name: John
age: 30
cars:
  - Ford #Commented
  - BMW
  - Fiat
`;

it("should parse YAML", () => {
  expect(parseYaml(EXAMPLE_YAML)).toEqual({
    name: "John",
    age: 30,
    cars: ["Ford", "BMW", "Fiat"],
  });
});
