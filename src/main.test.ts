import { expect, it } from "vitest";
import { add } from "./main.js";

it("should pass", () => {
  expect(add(1, 2)).toBe(3);
});
