/**
 * Result Type Implementation
 *
 * A Rust-inspired Result type for TypeScript that provides functional error handling.
 * This implementation allows for explicit error handling without throwing exceptions,
 * making error states part of the type system and encouraging proper error handling.
 */

/**
 * Represents a successful result containing a value of type T.
 * This is a type alias for Result<T, never>, meaning it can never contain an error.
 *
 * @template T - The type of the success value
 *
 * @example
 * ```typescript
 * const success: Ok<string> = Result.ok("Hello, World!");
 * console.log(success.data); // "Hello, World!"
 * ```
 */
export type Ok<T> = Result<T, never>;

/**
 * Represents a failed result containing an error of type E.
 * This is a type alias for Result<never, E>, meaning it can never contain a success value.
 *
 * @template E - The type of the error value
 *
 * @example
 * ```typescript
 * const failure: Err<string> = Result.err("Something went wrong");
 * console.log(failure.error); // "Something went wrong"
 * ```
 */
export type Err<E> = Result<never, E>;

/**
 * A Result type that represents either a successful value (Ok) or an error (Err).
 * This provides a functional approach to error handling, making error states explicit
 * in the type system and encouraging proper error handling without exceptions.
 *
 * @template T - The type of the success value
 * @template E - The type of the error value
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return Result.err("Division by zero");
 *   }
 *   return Result.ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.isOk()) {
 *   console.log("Result:", result.data); // Result: 5
 * } else {
 *   console.log("Error:", result.error);
 * }
 * ```
 */
export class Result<T, E> {
  /**
   * Protected constructor to prevent direct instantiation.
   * Use Result.ok() or Result.err() static methods to create instances.
   *
   * @param _tag - Discriminant tag indicating whether this is an "ok" or "err" result
   * @param value - The actual value (either success data or error)
   */
  protected constructor(
    readonly _tag: "ok" | "err",
    protected readonly value: T | E,
  ) {}

  /**
   * Creates a successful Result containing the provided data.
   *
   * @template T - The type of the success value
   * @param data - The success value to wrap
   * @returns An Ok result containing the provided data
   *
   * @example
   * ```typescript
   * const success = Result.ok(42);
   * console.log(success.isOk()); // true
   * console.log(success.data); // 42
   * ```
   */
  static ok<T>(data: T): Ok<T> {
    return new Result("ok", data) as Ok<T>;
  }

  /**
   * Creates a failed Result containing the provided error.
   *
   * @template E - The type of the error value
   * @param error - The error value to wrap
   * @returns An Err result containing the provided error
   *
   * @example
   * ```typescript
   * const failure = Result.err("Something went wrong");
   * console.log(failure.isErr()); // true
   * console.log(failure.error); // "Something went wrong"
   * ```
   */
  static err<E>(error: E): Err<E> {
    return new Result("err", error) as Err<E>;
  }

  /**
   * Attempts to execute the provided function and wraps its result in a Result.
   * If the function throws an error, it is caught and wrapped in an Err result.
   *
   * @template T - The type of the success value
   * @template E - The type of the error value (defaults to Error)
   * @param f - The function to execute
   * @param errorMapper - Optional function to transform caught errors into the desired error type
   * @returns A Result containing the function's return value or the caught error
   * @example
   * ```typescript
   * const result = Result.try(() => {
   *   // Some operation that might throw an error
   *   throw new Error("Something went wrong");
   * });
   * console.log(result.isErr()); // true
   * console.log(result.error); // Error: "Something went wrong"
   * ```
   */
  static try<T, E = Error>(
    f: () => T,
    errorMapper?: (error: unknown) => E,
  ): Result<T, E> {
    try {
      return Result.ok(f());
    } catch (error) {
      return Result.err(errorMapper ? errorMapper(error) : error as E);
    }
  }

  /**
   * Type guard to check if this Result is a successful Ok variant.
   * This method narrows the type to Ok<T> when it returns true.
   *
   * @returns true if this Result contains a success value, false otherwise
   *
   * @example
   * ```typescript
   * const result: Result<number, string> = Result.ok(42);
   * if (result.isOk()) {
   *   // TypeScript knows result is Ok<number> here
   *   console.log(result.data); // 42 - no type error
   * }
   * ```
   */
  isOk(): this is Ok<T> {
    return this._tag === "ok";
  }

  /**
   * Type guard to check if this Result is a failed Err variant.
   * This method narrows the type to Err<E> when it returns true.
   *
   * @returns true if this Result contains an error value, false otherwise
   *
   * @example
   * ```typescript
   * const result: Result<number, string> = Result.err("failed");
   * if (result.isErr()) {
   *   // TypeScript knows result is Err<string> here
   *   console.log(result.error); // "failed" - no type error
   * }
   * ```
   */
  isErr(): this is Err<E> {
    return this._tag === "err";
  }

  /**
   * Gets the success value from an Ok result.
   *
   * @throws {Error} If called on an Err result
   * @returns The success value of type T
   *
   * @example
   * ```typescript
   * const success = Result.ok(42);
   * console.log(success.data); // 42
   *
   * const failure = Result.err("error");
   * console.log(failure.data); // throws Error: "Cannot get data from an Err"
   * ```
   */
  get data(): T {
    if (this.isOk()) return this.value as T;
    throw new Error("Cannot get data from an Err");
  }

  /**
   * Gets the error value from an Err result.
   *
   * @throws {Error} If called on an Ok result
   * @returns The error value of type E
   *
   * @example
   * ```typescript
   * const failure = Result.err("something went wrong");
   * console.log(failure.error); // "something went wrong"
   *
   * const success = Result.ok(42);
   * console.log(success.error); // throws Error: "Cannot get error from an Ok"
   * ```
   */
  get error(): E {
    if (this.isErr()) return this.value as E;
    throw new Error("Cannot get error from an Ok");
  }

  /**
   * Transforms the success value of this Result using the provided function.
   * If this Result is an Err, the function is not called and the error is preserved.
   * This is a functor operation that allows chaining transformations on success values.
   *
   * @template U - The type of the transformed value
   * @param f - Function to transform the success value
   * @returns A new Result with the transformed value or the original error
   *
   * @example
   * ```typescript
   * const result = Result.ok(5)
   *   .map(x => x * 2)
   *   .map(x => x.toString());
   * console.log(result.data); // "10"
   *
   * const error = Result.err("failed")
   *   .map(x => x * 2); // function not called
   * console.log(error.error); // "failed"
   * ```
   */
  map<U>(f: (value: T) => U): Result<U, E> {
    return this.isOk()
      ? Result.ok(f(this.data))
      : (this as unknown as Result<U, E>);
  }

  /**
   * Transforms the success value of this Result using a function that returns another Result.
   * This is a monadic bind operation that allows chaining operations that may fail.
   * If this Result is an Err, the function is not called and the error is preserved.
   *
   * @template U - The type of the success value in the returned Result
   * @param f - Function that takes the success value and returns a new Result
   * @returns A new Result from the function or the original error
   *
   * @example
   * ```typescript
   * function safeDivide(a: number, b: number): Result<number, string> {
   *   return b === 0 ? Result.err("Division by zero") : Result.ok(a / b);
   * }
   *
   * const result = Result.ok(10)
   *   .flatMap(x => safeDivide(x, 2))
   *   .flatMap(x => safeDivide(x, 0)); // This will fail
   * console.log(result.error); // "Division by zero"
   * ```
   */
  flatMap<U>(f: (value: T) => Result<U, E>): Result<U, E> {
    return this.isOk() ? f(this.data) : (this as unknown as Result<U, E>);
  }

  /**
   * Converts this Result to a plain JavaScript object for JSON serialization.
   * The object will have a _tag field indicating the variant and either a data or error field.
   *
   * @returns A plain object representation of this Result
   *
   * @example
   * ```typescript
   * const success = Result.ok(42);
   * console.log(success.toJSON()); // { _tag: "ok", data: 42 }
   *
   * const failure = Result.err("error");
   * console.log(failure.toJSON()); // { _tag: "err", error: "error" }
   * ```
   */
  toJSON() {
    return {
      _tag: this._tag,
      [this._tag === "ok" ? "data" : "error"]: this.value,
    };
  }

  /**
   * Converts this Result to a JSON string representation.
   *
   * @returns A JSON string representation of this Result
   *
   * @example
   * ```typescript
   * const result = Result.ok(42);
   * console.log(result.toString()); // '{"_tag":"ok","data":42}'
   * ```
   */
  toString(): string {
    return JSON.stringify(this.toJSON());
  }
}

/**
 * An asynchronous version of Result that wraps a Promise<Result<T, E>>.
 * This class provides functional error handling for asynchronous operations,
 * allowing you to chain async operations while maintaining explicit error handling.
 *
 * @template T - The type of the success value
 * @template E - The type of the error value
 *
 * @example
 * ```typescript
 * async function fetchUser(id: string): Promise<User> {
 *   // ... fetch implementation
 * }
 *
 * const userResult = ResultAsync
 *   .fromPromise(fetchUser("123"))
 *   .map(user => user.name)
 *   .mapErr(error => `Failed to fetch user: ${error.message}`);
 *
 * const result = await userResult.toResult();
 * if (result.isOk()) {
 *   console.log("User name:", result.data);
 * } else {
 *   console.log("Error:", result.error);
 * }
 * ```
 */
export class ResultAsync<T, E> {
  /**
   * Creates a new ResultAsync from a Promise<Result<T, E>>.
   * This constructor is typically not called directly; use the static factory methods instead.
   *
   * @param promise - A promise that resolves to a Result
   */
  constructor(private readonly promise: Promise<Result<T, E>>) {}

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
   *
   * @example
   * ```typescript
   * // Basic usage
   * const result = ResultAsync.fromPromise(fetch("/api/data"));
   *
   * // With error mapping
   * const result = ResultAsync.fromPromise(
   *   fetch("/api/data"),
   *   (error) => `Network error: ${error.message}`
   * );
   * ```
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
   *
   * @example
   * ```typescript
   * const syncResult = Result.ok(42);
   * const asyncResult = ResultAsync.fromResult(syncResult);
   * ```
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
   *
   * @example
   * ```typescript
   * const result = ResultAsync.ok(42);
   * // Equivalent to: ResultAsync.fromResult(Result.ok(42))
   * ```
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
   *
   * @example
   * ```typescript
   * const result = ResultAsync.err("Something went wrong");
   * // Equivalent to: ResultAsync.fromResult(Result.err("Something went wrong"))
   * ```
   */
  static err<E>(error: E): ResultAsync<never, E> {
    return new ResultAsync(Promise.resolve(Result.err(error)));
  }

  /**
   * Transforms the success value of this ResultAsync using a function that may be async.
   * If the ResultAsync contains an error, the function is not called and the error is preserved.
   * The mapping function can return either a synchronous value or a Promise.
   *
   * @template U - The type of the transformed value
   * @param f - Function to transform the success value (can be sync or async)
   * @returns A new ResultAsync with the transformed value or the original error
   *
   * @example
   * ```typescript
   * const result = ResultAsync.ok(5)
   *   .map(x => x * 2)                    // sync transformation
   *   .map(async x => {                   // async transformation
   *     await delay(100);
   *     return x.toString();
   *   });
   *
   * const finalResult = await result.toResult();
   * console.log(finalResult.data); // "10"
   * ```
   */
  map<U>(f: (value: T) => U | Promise<U>): ResultAsync<U, E> {
    const newPromise = this.promise.then(async (result) => {
      if (result.isErr()) {
        return result as unknown as Result<U, E>;
      }
      try {
        const mapped = await f(result.data);
        return Result.ok<U>(mapped);
      } catch (error) {
        // If the mapping function throws, we need to handle it
        // This is a bit tricky since we don't know the error type
        throw error;
      }
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
   *
   * @example
   * ```typescript
   * async function validateUser(id: string): Promise<Result<User, string>> {
   *   // ... validation logic
   * }
   *
   * const result = ResultAsync.ok("user123")
   *   .flatMap(id => validateUser(id))
   *   .flatMap(user => ResultAsync.ok(user.email));
   * ```
   */
  flatMap<U, F>(
    f: (value: T) => Result<U, F> | ResultAsync<U, F> | Promise<Result<U, F>>,
  ): ResultAsync<U, E | F> {
    const newPromise = this.promise.then(async (result) => {
      if (result.isErr()) {
        return result as unknown as Result<U, E | F>;
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
   *
   * @example
   * ```typescript
   * const result = ResultAsync.fromPromise(fetch("/api/data"))
   *   .mapErr(error => `Network request failed: ${error.message}`);
   * ```
   */
  mapErr<F>(f: (error: E) => F): ResultAsync<T, F> {
    const newPromise = this.promise.then((result) => {
      if (result.isOk()) {
        return result as unknown as Result<T, F>;
      }
      return Result.err<F>(f(result.error));
    });
    return new ResultAsync(newPromise);
  }

  /**
   * Converts this ResultAsync back to a Promise<Result<T, E>>.
   * This is useful when you need to await the result and handle it synchronously.
   *
   * @returns A Promise that resolves to the underlying Result
   *
   * @example
   * ```typescript
   * const resultAsync = ResultAsync.ok(42);
   * const result = await resultAsync.toResult();
   *
   * if (result.isOk()) {
   *   console.log(result.data); // 42
   * }
   * ```
   */
  toResult(): Promise<Result<T, E>> {
    return this.promise;
  }

  /**
   * Unwraps the success value from this ResultAsync, throwing an error if it contains an Err.
   * This is a convenience method but should be used sparingly as it defeats the purpose
   * of explicit error handling. Prefer using match() or toResult() with proper error handling.
   *
   * @throws {Error} If the ResultAsync contains an Err
   * @returns A Promise that resolves to the success value
   *
   * @example
   * ```typescript
   * const result = ResultAsync.ok(42);
   * const value = await result.unwrap(); // 42
   *
   * const error = ResultAsync.err("failed");
   * await error.unwrap(); // throws Error: "Called unwrap on an Err: failed"
   * ```
   */
  async unwrap(): Promise<T> {
    const result = await this.promise;
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
   *
   * @example
   * ```typescript
   * const result = ResultAsync.fromPromise(fetch("/api/user"));
   *
   * const message = await result.match(
   *   async (response) => {
   *     const user = await response.json();
   *     return `Hello, ${user.name}!`;
   *   },
   *   (error) => `Failed to load user: ${error.message}`
   * );
   *
   * console.log(message); // Either greeting or error message
   * ```
   */
  async match<U>(
    onOk: (value: T) => U | Promise<U>,
    onErr: (error: E) => U | Promise<U>,
  ): Promise<U> {
    const result = await this.promise;
    if (result.isOk()) {
      return onOk(result.data);
    } else {
      return onErr(result.error);
    }
  }
}
