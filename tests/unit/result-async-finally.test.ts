/**
 * Unit tests for ResultAsync.finally method
 */

import { assertEquals } from "@std/assert";
import { ResultAsync } from "../../src/no-exceptions/result-async.ts";

Deno.test("ResultAsync.finally: executes side effect on successful result", async () => {
  let sideEffectExecuted = false;

  const result = ResultAsync.ok(42)
    .finally(() => {
      sideEffectExecuted = true;
    });

  const resolved = await result.toResult();

  assertEquals(sideEffectExecuted, true);
  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, 42);
  }
});

Deno.test("ResultAsync.finally: executes side effect on error result", async () => {
  let sideEffectExecuted = false;

  const result = ResultAsync.err("error occurred")
    .finally(() => {
      sideEffectExecuted = true;
    });

  const resolved = await result.toResult();

  assertEquals(sideEffectExecuted, true);
  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    assertEquals(resolved.error, "error occurred");
  }
});

Deno.test("ResultAsync.finally: preserves the original result value", async () => {
  const result = ResultAsync.ok("test value")
    .finally(() => {
      // Side effect that doesn't affect the result
    });

  const resolved = await result.toResult();

  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, "test value");
  }
});

Deno.test("ResultAsync.finally: preserves the original error value", async () => {
  const result = ResultAsync.err("original error")
    .finally(() => {
      // Side effect that doesn't affect the error
    });

  const resolved = await result.toResult();

  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    assertEquals(resolved.error, "original error");
  }
});

Deno.test("ResultAsync.finally: can be used for cleanup operations", async () => {
  let cleanupCalled = false;
  let resourceValue = "resource";

  const result = ResultAsync.ok(100)
    .finally(() => {
      cleanupCalled = true;
      resourceValue = "cleaned up";
    });

  const resolved = await result.toResult();

  assertEquals(cleanupCalled, true);
  assertEquals(resourceValue, "cleaned up");
  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, 100);
  }
});

Deno.test("ResultAsync.finally: can be chained with other methods", async () => {
  let finallyExecuted = false;

  const result = ResultAsync.ok(10)
    .map((x) => x * 2)
    .finally(() => {
      finallyExecuted = true;
    })
    .map((x) => x + 5);

  const resolved = await result.toResult();

  assertEquals(finallyExecuted, true);
  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, 25); // (10 * 2) + 5
  }
});

Deno.test("ResultAsync.finally: executes even when chained after error", async () => {
  let finallyExecuted = false;

  const result = ResultAsync.ok(10)
    .flatMap(() => ResultAsync.err("error in chain"))
    .finally(() => {
      finallyExecuted = true;
    });

  const resolved = await result.toResult();

  assertEquals(finallyExecuted, true);
  assertEquals(resolved.isErr(), true);
  if (resolved.isErr()) {
    assertEquals(resolved.error, "error in chain");
  }
});

Deno.test("ResultAsync.finally: works with fromPromise", async () => {
  let finallyExecuted = false;

  const result = ResultAsync.fromPromise(Promise.resolve("async value"))
    .finally(() => {
      finallyExecuted = true;
    });

  const resolved = await result.toResult();

  assertEquals(finallyExecuted, true);
  assertEquals(resolved.isOk(), true);
  if (resolved.isOk()) {
    assertEquals(resolved.data, "async value");
  }
});
