/**
 * Unit tests for ResultAsync.all method
 */

import { assertEquals } from "@std/assert";
import { ResultAsync } from "../../src/no-exceptions/result-async.ts";

Deno.test("ResultAsync.all: combines multiple successful results", async () => {
  const result1 = ResultAsync.ok(1);
  const result2 = ResultAsync.ok("hello");
  const result3 = ResultAsync.ok(true);

  const combined = ResultAsync.all([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, [1, "hello", true]);
  }
});

Deno.test("ResultAsync.all: returns first error when one result fails", async () => {
  const result1 = ResultAsync.ok(1);
  const result2 = ResultAsync.err("error occurred");
  const result3 = ResultAsync.ok(true);

  const combined = ResultAsync.all([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    assertEquals(resolved.error, "error occurred");
  }
});

Deno.test("ResultAsync.all: returns first error when multiple results fail", async () => {
  const result1 = ResultAsync.ok(1);
  const result2 = ResultAsync.err("first error");
  const result3 = ResultAsync.err("second error");

  const combined = ResultAsync.all([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    // Should return the first error encountered
    assertEquals(resolved.error, "first error");
  }
});

Deno.test("ResultAsync.all: handles empty array", async () => {
  const combined = ResultAsync.all([]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, []);
  }
});

Deno.test("ResultAsync.all: handles single result", async () => {
  const result1 = ResultAsync.ok(42);

  const combined = ResultAsync.all([result1]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, [42]);
  }
});

Deno.test("ResultAsync.all: works with fromPromise results", async () => {
  const result1 = ResultAsync.fromPromise(Promise.resolve(10));
  const result2 = ResultAsync.fromPromise(Promise.resolve(20));
  const result3 = ResultAsync.fromPromise(Promise.resolve(30));

  const combined = ResultAsync.all([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, [10, 20, 30]);
  }
});

Deno.test("ResultAsync.all: handles rejected promises", async () => {
  const result1 = ResultAsync.fromPromise(Promise.resolve(10));
  const result2 = ResultAsync.fromPromise(
    Promise.reject(new Error("promise failed")),
  );
  const result3 = ResultAsync.fromPromise(Promise.resolve(30));

  const combined = ResultAsync.all([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    assertEquals(resolved.error instanceof Error, true);
    assertEquals((resolved.error as Error).message, "promise failed");
  }
});

Deno.test("ResultAsync.all: can be chained with map", async () => {
  const result1 = ResultAsync.ok(1);
  const result2 = ResultAsync.ok(2);
  const result3 = ResultAsync.ok(3);

  const combined = ResultAsync.all([result1, result2, result3])
    .map((values) => values.reduce((sum, val) => sum + val, 0));

  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, 6);
  }
});

Deno.test("ResultAsync.all: can be chained with flatMap", async () => {
  const result1 = ResultAsync.ok(1);
  const result2 = ResultAsync.ok(2);
  const result3 = ResultAsync.ok(3);

  const combined = ResultAsync.all([result1, result2, result3])
    .flatMap((values) => {
      const sum = values.reduce((s, val) => s + val, 0);
      return sum > 5 ? ResultAsync.ok(sum) : ResultAsync.err("sum too small");
    });

  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, 6);
  }
});

Deno.test("ResultAsync.all: preserves type information for different types", async () => {
  const result1 = ResultAsync.ok(42);
  const result2 = ResultAsync.ok("test");
  const result3 = ResultAsync.ok({ key: "value" });

  const combined = ResultAsync.all([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    // TypeScript should infer the type as [number, string, { key: string }]
    assertEquals(resolved.data[0], 42);
    assertEquals(resolved.data[1], "test");
    assertEquals(resolved.data[2], { key: "value" });
  }
});

Deno.test("ResultAsync.all: works with async operations", async () => {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const result1 = ResultAsync.ok(1).map(async (x) => {
    await delay(10);
    return x * 2;
  });

  const result2 = ResultAsync.ok(2).map(async (x) => {
    await delay(5);
    return x * 3;
  });

  const result3 = ResultAsync.ok(3).map(async (x) => {
    await delay(15);
    return x * 4;
  });

  const combined = ResultAsync.all([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, [2, 6, 12]);
  }
});

Deno.test("ResultAsync.all: error in async operation is caught", async () => {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const result1 = ResultAsync.ok(1).map(async (x) => {
    await delay(10);
    return x * 2;
  });

  const result2 = ResultAsync.err("async error");

  const result3 = ResultAsync.ok(3).map(async (x) => {
    await delay(15);
    return x * 4;
  });

  const combined = ResultAsync.all([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    assertEquals(resolved.error, "async error");
  }
});
