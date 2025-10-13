import { assertEquals, assertThrows } from "@std/assert";
import { Result } from "../../src/no-exceptions/result.ts";
import { ResultAsync } from "../../src/no-exceptions/result-async.ts";

Deno.test("Result.ok creates successful result", () => {
  const result = Result.ok("success");

  assertEquals(result.isOk(), true);
  assertEquals(result.isErr(), false);
  assertEquals(result.data, "success");
});

Deno.test("Result.err creates error result", () => {
  const result = Result.err("error");

  assertEquals(result.isOk(), false);
  assertEquals(result.isErr(), true);
  assertEquals(result.error, "error");
});

Deno.test("Result.ok accessing error throws", () => {
  const result = Result.ok("success");

  assertThrows(
    () => {
      result.error;
    },
    Error,
    "Cannot get error from an Ok",
  );
});

Deno.test("Result.err accessing data throws", () => {
  const result = Result.err("error");

  assertThrows(
    () => {
      result.data;
    },
    Error,
    "Cannot get data from an Err",
  );
});

Deno.test("Result.map transforms Ok value", () => {
  const result = Result.ok(5);
  const mapped = result.map((x) => x * 2);

  assertEquals(mapped.isOk(), true);
  assertEquals(mapped.data, 10);
});

Deno.test("Result.map preserves Err", () => {
  const result = Result.err("error");
  const mapped = result.map((x: number) => x * 2);

  assertEquals(mapped.isErr(), true);
  assertEquals(mapped.error, "error");
});

Deno.test("Result.flatMap chains Ok results", () => {
  const result = Result.ok(5);
  const chained = result.flatMap((x) => Result.ok(x * 2));

  assertEquals(chained.isOk(), true);
  assertEquals(chained.data, 10);
});

Deno.test("Result.flatMap chains to Err", () => {
  const result: Result<number, string> = Result.ok(5);
  const chained = result.flatMap((_x): Result<number, string> =>
    Result.err("error")
  );

  assertEquals(chained.isErr(), true);
  assertEquals(chained.error, "error");
});

Deno.test("Result.flatMap preserves Err", () => {
  const result = Result.err("original error");
  const chained = result.flatMap((x: number) => Result.ok(x * 2));

  assertEquals(chained.isErr(), true);
  assertEquals(chained.error, "original error");
});

Deno.test("Result.toJSON serializes Ok result", () => {
  const result = Result.ok(42);
  const json = result.toJSON();

  assertEquals(json._tag, "ok");
  assertEquals(json.data, 42);
});

Deno.test("Result.toJSON serializes Err result", () => {
  const result = Result.err("failure");
  const json = result.toJSON();

  assertEquals(json._tag, "err");
  assertEquals(json.error, "failure");
});

Deno.test("ResultAsync.ok creates successful async result", async () => {
  const result = ResultAsync.ok("success");
  const resolved = await result.toResult();

  assertEquals(resolved.isOk(), true);
  assertEquals(resolved.data, "success");
});

Deno.test("ResultAsync.err creates error async result", async () => {
  const result = ResultAsync.err("error");
  const resolved = await result.toResult();

  assertEquals(resolved.isErr(), true);
  assertEquals(resolved.error, "error");
});

Deno.test("ResultAsync.fromPromise handles successful promise", async () => {
  const promise = Promise.resolve("success");
  const result = ResultAsync.fromPromise(promise);
  const resolved = await result.toResult();

  assertEquals(resolved.isOk(), true);
  assertEquals(resolved.data, "success");
});

Deno.test("ResultAsync.fromPromise handles rejected promise", async () => {
  const promise = Promise.reject(new Error("failure"));
  const result = ResultAsync.fromPromise(promise);
  const resolved = await result.toResult();

  assertEquals(resolved.isErr(), true);
  assertEquals(resolved.error instanceof Error, true);
  assertEquals((resolved.error as Error).message, "failure");
});

Deno.test("ResultAsync.fromPromise with error mapper", async () => {
  const promise = Promise.reject(new Error("failure"));
  const result = ResultAsync.fromPromise(
    promise,
    (error) => `mapped: ${(error as Error).message}`,
  );
  const resolved = await result.toResult();

  assertEquals(resolved.isErr(), true);
  assertEquals(resolved.error, "mapped: failure");
});

Deno.test("ResultAsync.map transforms Ok value", async () => {
  const result = ResultAsync.ok(5);
  const mapped = result.map((x) => x * 2);
  const resolved = await mapped.toResult();

  assertEquals(resolved.isOk(), true);
  assertEquals(resolved.data, 10);
});

Deno.test("ResultAsync.flatMap chains async operations", async () => {
  const result = ResultAsync.ok(5);
  const chained = result.flatMap((x) => ResultAsync.ok(x * 2));
  const resolved = await chained.toResult();

  assertEquals(resolved.isOk(), true);
  assertEquals(resolved.data, 10);
});

Deno.test("ResultAsync.match handles async Ok", async () => {
  const result = ResultAsync.ok(5);
  const matched = await result.match(
    (value) => `success: ${value}`,
    (error) => `error: ${error}`,
  );

  assertEquals(matched, "success: 5");
});

Deno.test("ResultAsync.match handles async Err", async () => {
  const result = ResultAsync.err("failure");
  const matched = await result.match(
    (value) => `success: ${value}`,
    (error) => `error: ${error}`,
  );

  assertEquals(matched, "error: failure");
});
