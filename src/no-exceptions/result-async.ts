// Any is useful for more complex generics
// deno-lint-ignore-file no-explicit-any
import { Result } from "./result.ts";

/**
 * An asynchronous version of Result that wraps a Promise<Result<T, E>>.
 * This class provides functional error handling for asynchronous operations,
 * allowing you to chain async operations while maintaining explicit error handling.
 *
 * @template T - The type of the success value
 * @template E - The type of the error value
 */
export class ResultAsync<T, E> {
  readonly #promise: Promise<Result<T, E>>;

  /**
   * Creates a new ResultAsync from a Promise<Result<T, E>>.
   * This constructor is typically not called directly; use the static factory methods instead.
   *
   * @param promise - A promise that resolves to a Result
   */
  constructor(promise: Promise<Result<T, E>>) {
    this.#promise = promise;
  }

  // Static constructors
  /**
   * Creates a ResultAsync from a Promise, converting any thrown errors to Err results.
   * This is the primary way to convert existing Promise-based APIs to use Result error handling.
   *
   * @template T - The type of the success value
   * @template E - The type of the error value (defaults to Error)
   * @param promise - The promise to wrap
   * @param errorMapper - Optional function to transform caught errors into the desired error type
   * @returns A ResultAsync that resolves to Ok on success or Err on failure
   */
  static fromPromise<T, E = Error>(
    promise: Promise<T>,
    errorMapper?: (error: unknown) => E,
  ): ResultAsync<T, E> {
    const resultPromise = promise
      .then((value) => Result.ok<T>(value))
      .catch((error) =>
        Result.err<E>(errorMapper ? errorMapper(error) : error as E)
      );
    return new ResultAsync(resultPromise);
  }

  /**
   * Creates a ResultAsync from an existing Result by wrapping it in a resolved Promise.
   *
   * @template T - The type of the success value
   * @template E - The type of the error value
   * @param result - The Result to wrap
   * @returns A ResultAsync that immediately resolves to the provided Result
   */
  static fromResult<T, E>(result: Result<T, E>): ResultAsync<T, E> {
    return new ResultAsync(Promise.resolve(result));
  }

  /**
   * Creates a ResultAsync that immediately resolves to an Ok result with the provided value.
   *
   * @template T - The type of the success value
   * @param value - The success value to wrap
   * @returns A ResultAsync that resolves to Ok(value)
   */
  static ok<T>(value: T): ResultAsync<T, never> {
    return new ResultAsync(Promise.resolve(Result.ok(value)));
  }

  /**
   * Creates a ResultAsync that immediately resolves to an Err result with the provided error.
   *
   * @template E - The type of the error value
   * @param error - The error value to wrap
   * @returns A ResultAsync that resolves to Err(error)
   */
  static err<E>(error: E): ResultAsync<never, E> {
    return new ResultAsync(Promise.resolve(Result.err(error)));
  }

  /**
   * Combines multiple ResultAsync instances into a single ResultAsync.
   * Similar to Promise.all, this method takes an array of ResultAsync values and returns
   * a single ResultAsync containing an array of all success values if all inputs succeed,
   * or the first error encountered if any input fails.
   *
   * @template T - A tuple type representing the array of ResultAsync instances
   * @param results - An array of ResultAsync instances to combine
   * @returns A ResultAsync containing either an array of all success values or the first error
   */
  static all<T extends readonly ResultAsync<any, any>[]>(
    results: T,
  ): ResultAsync<
    { [K in keyof T]: T[K] extends ResultAsync<infer U, any> ? U : never },
    T[number] extends ResultAsync<any, infer E> ? E : never
  > {
    type SuccessValues = {
      [K in keyof T]: T[K] extends ResultAsync<infer U, any> ? U : never;
    };
    type ErrorValue = T[number] extends ResultAsync<any, infer E> ? E : never;

    const promise: Promise<Result<SuccessValues, ErrorValue>> = Promise.all(
      results.map((r) => r.toResult()),
    ).then((resolvedResults) => {
      // Check if any result is an error and return the first one found
      for (const result of resolvedResults) {
        if (result.isErr()) {
          return result as Result<SuccessValues, ErrorValue>;
        }
      }

      // All results succeeded, collect all success values
      const values = resolvedResults.map((r) => r.data);
      return Result.ok(values as SuccessValues);
    });

    return new ResultAsync(promise);
  }

  /**
   * Combines multiple ResultAsync instances into a single ResultAsync, similar to Promise.allSettled.
   * Unlike ResultAsync.all which returns the first error, this method waits for all ResultAsync
   * instances to complete and returns either all success values or all error values.
   *
   * If all ResultAsync instances succeed, returns Ok with an array of all success values.
   * If one or more ResultAsync instances fail, returns Err with an array of all error values.
   *
   * @template T - A tuple type representing the array of ResultAsync instances
   * @param results - An array of ResultAsync instances to combine
   * @returns A ResultAsync containing either an array of all success values or an array of all errors
   */
  static allSettled<T extends readonly ResultAsync<any, any>[]>(
    results: T,
  ): ResultAsync<
    { [K in keyof T]: T[K] extends ResultAsync<infer U, any> ? U : never },
    Array<T[number] extends ResultAsync<any, infer E> ? E : never>
  > {
    type SuccessValues = {
      [K in keyof T]: T[K] extends ResultAsync<infer U, any> ? U : never;
    };
    type ErrorValues = Array<
      T[number] extends ResultAsync<any, infer E> ? E : never
    >;

    const promise: Promise<Result<SuccessValues, ErrorValues>> = Promise.all(
      results.map((r) => r.toResult()),
    ).then((resolvedResults) => {
      // Collect all errors
      const errors: ErrorValues = [] as ErrorValues;
      for (const result of resolvedResults) {
        if (result.isErr()) {
          errors.push(result.error);
        }
      }

      // If there are any errors, return Err with all errors
      if (errors.length > 0) {
        return Result.err(errors);
      }

      // All results succeeded, collect all success values
      const values = resolvedResults.map((r) => r.data);
      return Result.ok(values as SuccessValues);
    });

    return new ResultAsync(promise);
  }

  /**
   * Transforms the success value of this ResultAsync using a function that may be async.
   * If the ResultAsync contains an error, the function is not called and the error is preserved.
   * The mapping function can return either a synchronous value or a Promise.
   *
   * @template U - The type of the transformed value
   * @param f - Function to transform the success value (can be sync or async)
   * @returns A new ResultAsync with the transformed value or the original error
   */
  map<U>(f: (value: T) => U | Promise<U>): ResultAsync<U, E> {
    const newPromise = this.#promise.then(async (result) => {
      if (result.isErr()) {
        return result;
      }
      const mapped = await f(result.data);
      return Result.ok<U>(mapped);
    });
    return new ResultAsync(newPromise);
  }

  /**
   * Transforms the success value using a function that returns a Result, ResultAsync, or Promise<Result>.
   * This is the async version of flatMap that allows chaining operations that may fail.
   * If this ResultAsync contains an error, the function is not called and the error is preserved.
   *
   * @template U - The type of the success value in the returned Result
   * @template F - The type of the error value in the returned Result
   * @param f - Function that takes the success value and returns a Result, ResultAsync, or Promise<Result>
   * @returns A new ResultAsync with the result from the function or the original error
   */
  flatMap<U, F>(
    f: (value: T) => Result<U, F> | ResultAsync<U, F> | Promise<Result<U, F>>,
  ): ResultAsync<U, E | F> {
    const newPromise = this.#promise.then(async (result) => {
      if (result.isErr()) {
        return Result.err<E | F>(result.error);
      }

      const mapped = f(result.data);

      // Handle different return types
      if (mapped instanceof ResultAsync) {
        return await mapped.toResult();
      } else if (mapped instanceof Promise) {
        return await mapped;
      } else {
        return mapped;
      }
    });
    return new ResultAsync(newPromise);
  }

  /**
   * Transforms the error value of this ResultAsync using the provided function.
   * If this ResultAsync contains a success value, the function is not called and the value is preserved.
   * This is useful for converting error types or adding context to errors.
   *
   * @template F - The type of the transformed error value
   * @param f - Function to transform the error value
   * @returns A new ResultAsync with the transformed error or the original success value
   */
  mapErr<F>(f: (error: E) => F): ResultAsync<T, F> {
    const newPromise = this.#promise.then((result) => {
      if (result.isOk()) {
        return result;
      }
      return Result.err<F>(f(result.error));
    });
    return new ResultAsync(newPromise);
  }

  /**
   * Executes a side effect function after the ResultAsync resolves, regardless of success or error.
   * This is useful for cleanup operations or logging.
   *
   * @param f - Side effect function to execute
   * @returns A new ResultAsync with the same result
   */
  finally(f: () => void): ResultAsync<T, E> {
    const newPromise = this.#promise.finally(f);
    return new ResultAsync(newPromise);
  }

  /**
   * Converts this ResultAsync back to a Promise<Result<T, E>>.
   * This is useful when you need to await the result and handle it synchronously.
   *
   * @returns A Promise that resolves to the underlying Result
   */
  toResult(): Promise<Result<T, E>> {
    return this.#promise;
  }

  /**
   * Unwraps the success value from this ResultAsync, throwing an error if it contains an Err.
   * This is a convenience method but should be used sparingly as it defeats the purpose
   * of explicit error handling. Prefer using match() or toResult() with proper error handling.
   *
   * @throws {Error} If the ResultAsync contains an Err
   * @returns A Promise that resolves to the success value
   */
  async unwrap(): Promise<T> {
    const result = await this.#promise;
    if (result.isOk()) {
      return result.data;
    }
    throw new Error(`Called unwrap on an Err: ${result.error}`);
  }

  /**
   * Pattern matching for handling both success and error cases.
   * This method allows you to provide handlers for both Ok and Err cases,
   * ensuring that all possible outcomes are handled explicitly.
   *
   * @template U - The return type of both handler functions
   * @param onOk - Function to handle the success case (can be sync or async)
   * @param onErr - Function to handle the error case (can be sync or async)
   * @returns A Promise that resolves to the result of the appropriate handler
   */
  async match<U>(
    onOk: (value: T) => U | Promise<U>,
    onErr: (error: E) => U | Promise<U>,
  ): Promise<U> {
    const result = await this.#promise;
    if (result.isOk()) {
      return onOk(result.data);
    } else {
      return onErr(result.error);
    }
  }
}
