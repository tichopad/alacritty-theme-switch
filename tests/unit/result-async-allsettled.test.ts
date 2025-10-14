/**
 * Unit tests for ResultAsync.allSettled method
 */

import { assertEquals } from "@std/assert";
import { ResultAsync } from "../../src/no-exceptions/result-async.ts";

Deno.test("ResultAsync.allSettled: combines multiple successful results", async () => {
  const result1 = ResultAsync.ok(1);
  const result2 = ResultAsync.ok("hello");
  const result3 = ResultAsync.ok(true);

  const combined = ResultAsync.allSettled([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, [1, "hello", true]);
  }
});

Deno.test("ResultAsync.allSettled: returns all errors when one result fails", async () => {
  const result1 = ResultAsync.ok(1);
  const result2 = ResultAsync.err("error occurred");
  const result3 = ResultAsync.ok(true);

  const combined = ResultAsync.allSettled([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    assertEquals(resolved.error, ["error occurred"]);
  }
});

Deno.test("ResultAsync.allSettled: returns all errors when multiple results fail", async () => {
  const result1 = ResultAsync.ok(1);
  const result2 = ResultAsync.err("first error");
  const result3 = ResultAsync.err("second error");

  const combined = ResultAsync.allSettled([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    // Should return all errors, not just the first one
    assertEquals(resolved.error, ["first error", "second error"]);
  }
});

Deno.test("ResultAsync.allSettled: returns all errors when all results fail", async () => {
  const result1 = ResultAsync.err("error 1");
  const result2 = ResultAsync.err("error 2");
  const result3 = ResultAsync.err("error 3");

  const combined = ResultAsync.allSettled([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    assertEquals(resolved.error, ["error 1", "error 2", "error 3"]);
  }
});

Deno.test("ResultAsync.allSettled: handles empty array", async () => {
  const combined = ResultAsync.allSettled([]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, []);
  }
});

Deno.test("ResultAsync.allSettled: handles single successful result", async () => {
  const result1 = ResultAsync.ok(42);

  const combined = ResultAsync.allSettled([result1]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, [42]);
  }
});

Deno.test("ResultAsync.allSettled: handles single failed result", async () => {
  const result1 = ResultAsync.err("single error");

  const combined = ResultAsync.allSettled([result1]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    assertEquals(resolved.error, ["single error"]);
  }
});

Deno.test("ResultAsync.allSettled: works with fromPromise results", async () => {
  const result1 = ResultAsync.fromPromise(Promise.resolve(10));
  const result2 = ResultAsync.fromPromise(Promise.resolve(20));
  const result3 = ResultAsync.fromPromise(Promise.resolve(30));

  const combined = ResultAsync.allSettled([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, [10, 20, 30]);
  }
});

Deno.test("ResultAsync.allSettled: handles rejected promises", async () => {
  const result1 = ResultAsync.fromPromise(Promise.resolve(10));
  const result2 = ResultAsync.fromPromise(
    Promise.reject(new Error("promise failed")),
  );
  const result3 = ResultAsync.fromPromise(Promise.resolve(30));

  const combined = ResultAsync.allSettled([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    assertEquals(resolved.error.length, 1);
    assertEquals(resolved.error[0] instanceof Error, true);
    assertEquals((resolved.error[0] as Error).message, "promise failed");
  }
});

Deno.test("ResultAsync.allSettled: handles multiple rejected promises", async () => {
  const result1 = ResultAsync.fromPromise(
    Promise.reject(new Error("first failure")),
  );
  const result2 = ResultAsync.fromPromise(
    Promise.reject(new Error("second failure")),
  );
  const result3 = ResultAsync.fromPromise(Promise.resolve(30));

  const combined = ResultAsync.allSettled([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    assertEquals(resolved.error.length, 2);
    assertEquals(resolved.error[0] instanceof Error, true);
    assertEquals((resolved.error[0] as Error).message, "first failure");
    assertEquals(resolved.error[1] instanceof Error, true);
    assertEquals((resolved.error[1] as Error).message, "second failure");
  }
});

Deno.test("ResultAsync.allSettled: can be chained with map on success", async () => {
  const result1 = ResultAsync.ok(1);
  const result2 = ResultAsync.ok(2);
  const result3 = ResultAsync.ok(3);

  const combined = ResultAsync.allSettled([result1, result2, result3])
    .map((values) => values.reduce((sum, val) => sum + val, 0));

  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, 6);
  }
});

Deno.test("ResultAsync.allSettled: can be chained with mapErr on failure", async () => {
  const result1 = ResultAsync.ok(1);
  const result2 = ResultAsync.err("error 1");
  const result3 = ResultAsync.err("error 2");

  const combined = ResultAsync.allSettled([result1, result2, result3])
    .mapErr((errors) => `Found ${errors.length} errors: ${errors.join(", ")}`);

  const resolved = await combined.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    assertEquals(resolved.error, "Found 2 errors: error 1, error 2");
  }
});

Deno.test("ResultAsync.allSettled: preserves type information for different types", async () => {
  const result1 = ResultAsync.ok(42);
  const result2 = ResultAsync.ok("test");
  const result3 = ResultAsync.ok({ key: "value" });

  const combined = ResultAsync.allSettled([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    // TypeScript should infer the type as [number, string, { key: string }]
    assertEquals(resolved.data[0], 42);
    assertEquals(resolved.data[1], "test");
    assertEquals(resolved.data[2], { key: "value" });
  }
});

Deno.test("ResultAsync.allSettled: works with async operations", async () => {
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

  const combined = ResultAsync.allSettled([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, [2, 6, 12]);
  }
});

Deno.test("ResultAsync.allSettled: collects all errors from async operations", async () => {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const result1 = ResultAsync.ok(1).map(async (x) => {
    await delay(10);
    return x * 2;
  });

  const result2 = ResultAsync.err("async error 1");

  const result3 = ResultAsync.err("async error 2");

  const combined = ResultAsync.allSettled([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    assertEquals(resolved.error, ["async error 1", "async error 2"]);
  }
});

Deno.test("ResultAsync.allSettled: difference from all - collects all errors", async () => {
  const result1 = ResultAsync.ok(1);
  const result2 = ResultAsync.err("first error");
  const result3 = ResultAsync.err("second error");

  // Using allSettled - should get all errors
  const settledResult = await ResultAsync.allSettled([
    result1,
    result2,
    result3,
  ]).toResult();

  // Using all - should get only first error
  const allResult = await ResultAsync.all([result1, result2, result3])
    .toResult();

  assertEquals(settledResult.isErr(), true);
  assertEquals(allResult.isErr(), true);

  if (settledResult.isErr() && allResult.isErr()) {
    // allSettled returns array of all errors
    assertEquals(settledResult.error, ["first error", "second error"]);
    // all returns just the first error
    assertEquals(allResult.error, "first error");
  }
});

Deno.test("ResultAsync.allSettled: can process errors individually", async () => {
  const result1 = ResultAsync.ok(1);
  const result2 = ResultAsync.err({ code: 404, message: "Not found" });
  const result3 = ResultAsync.err({ code: 500, message: "Server error" });

  const combined = ResultAsync.allSettled([result1, result2, result3]);
  const resolved = await combined.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    // Can iterate through all errors
    assertEquals(resolved.error.length, 2);
    assertEquals(resolved.error[0].code, 404);
    assertEquals(resolved.error[0].message, "Not found");
    assertEquals(resolved.error[1].code, 500);
    assertEquals(resolved.error[1].message, "Server error");
  }
});
