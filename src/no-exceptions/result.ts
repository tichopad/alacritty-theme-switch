/**
 * Result Type Implementation
 *
 * A Rust and supermacro/neverthrow inspired Result type for TypeScript that provides functional error handling.
 * This implementation allows for explicit error handling without throwing exceptions,
 * making error states part of the type system and encouraging proper error handling.
 */

/**
 * Represents a successful result containing a value of type T.
 * This is a type alias for Result<T, never>, meaning it can never contain an error.
 *
 * @template T - The type of the success value
 */
export type Ok<T> = Result<T, never>;

/**
 * Represents a failed result containing an error of type E.
 * This is a type alias for Result<never, E>, meaning it can never contain a success value.
 *
 * @template E - The type of the error value
 */
export type Err<E> = Result<never, E>;

/**
 * A Result type that represents either a successful value (Ok) or an error (Err).
 * This provides a functional approach to error handling, making error states explicit
 * in the type system and encouraging proper error handling without exceptions.
 *
 * @template T - The type of the success value
 * @template E - The type of the error value
 */
export class Result<T, E> {
  readonly #variant: { _tag: "ok"; value: T } | { _tag: "err"; value: E };

  /**
   * Protected constructor to prevent direct instantiation.
   * Use Result.ok() or Result.err() static methods to create instances.
   *
   * @param variant - Discriminated union containing either success data or error
   */
  constructor(
    variant: { _tag: "ok"; value: T } | { _tag: "err"; value: E },
  ) {
    this.#variant = variant;
  }

  /**
   * Creates a successful Result containing the provided data.
   *
   * @template T - The type of the success value
   * @param data - The success value to wrap
   * @returns An Ok result containing the provided data
   */
  static ok<T>(data: T): Ok<T> {
    return new Result({ _tag: "ok", value: data }) as Ok<T>;
  }

  /**
   * Creates a failed Result containing the provided error.
   *
   * @template E - The type of the error value
   * @param error - The error value to wrap
   * @returns An Err result containing the provided error
   */
  static err<E>(error: E): Err<E> {
    return new Result({ _tag: "err", value: error }) as Err<E>;
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
   */
  isOk(): this is Ok<T> {
    return this.#variant._tag === "ok";
  }

  /**
   * Type guard to check if this Result is a failed Err variant.
   * This method narrows the type to Err<E> when it returns true.
   *
   * @returns true if this Result contains an error value, false otherwise
   */
  isErr(): this is Err<E> {
    return this.#variant._tag === "err";
  }

  /**
   * Gets the discriminant tag indicating whether this is an "ok" or "err" result.
   *
   * @returns The tag value ("ok" or "err")
   */
  get _tag(): "ok" | "err" {
    return this.#variant._tag;
  }

  /**
   * Gets the success value from an Ok result.
   *
   * @throws {Error} If called on an Err result
   * @returns The success value of type T
   */
  get data(): T {
    if (this.#variant._tag === "ok") {
      return this.#variant.value;
    }
    throw new Error("Cannot get data from an Err");
  }

  /**
   * Gets the error value from an Err result.
   *
   * @throws {Error} If called on an Ok result
   * @returns The error value of type E
   */
  get error(): E {
    if (this.#variant._tag === "err") {
      return this.#variant.value;
    }
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
   */
  map<U>(f: (value: T) => U): Result<U, E> {
    return this.#variant._tag === "ok"
      ? Result.ok(f(this.#variant.value))
      : Result.err(this.#variant.value);
  }

  /**
   * Transforms the success value of this Result using a function that returns another Result.
   * This is a monadic bind operation that allows chaining operations that may fail.
   * If this Result is an Err, the function is not called and the error is preserved.
   *
   * @template U - The type of the success value in the returned Result
   * @param f - Function that takes the success value and returns a new Result
   * @returns A new Result from the function or the original error
   */
  flatMap<U>(f: (value: T) => Result<U, E>): Result<U, E> {
    if (this.#variant._tag === "ok") {
      return f(this.#variant.value);
    } else {
      return Result.err(this.#variant.value);
    }
  }

  /**
   * Transforms the error value of this Result using a function that returns another Result.
   * This is useful for error recovery - converting an Err into an Ok, or transforming
   * an error into a different error type.
   * If this Result is an Ok, the function is not called and the success value is preserved.
   *
   * @template U - The type of the success value in the returned Result from the callback
   * @template A - The type of the error value in the returned Result from the callback
   * @param f - Function that takes the error value and returns a new Result
   * @returns A new Result from the function or the original success value
   *
   * @example
   * ```typescript
   * enum DatabaseError {
   *   NotFound = 'NotFound',
   *   ConnectionError = 'ConnectionError',
   * }
   *
   * const dbResult: Result<string, DatabaseError> = Result.err(DatabaseError.NotFound);
   *
   * // Error recovery: convert NotFound error to a default value
   * const recovered = dbResult.orElse((error) =>
   *   error === DatabaseError.NotFound
   *     ? Result.ok('default-user')
   *     : Result.err(500)
   * );
   * // recovered is Ok('default-user')
   * ```
   */
  orElse<U, A>(f: (error: E) => Result<U, A>): Result<T | U, A> {
    if (this.#variant._tag === "err") {
      const mapped = f(this.#variant.value);
      // Reconstruct to get proper type widening
      return mapped.isOk()
        ? Result.ok<T | U>(mapped.data)
        : Result.err<A>(mapped.error);
    }
    // Reconstruct Ok to avoid type cast
    return Result.ok<T | U>(this.#variant.value);
  }

  /**
   * Converts this Result to a plain JavaScript object for JSON serialization.
   * The object will have a _tag field indicating the variant and either a data or error field.
   *
   * @returns A plain object representation of this Result
   */
  toJSON() {
    return {
      _tag: this.#variant._tag,
      [this.#variant._tag === "ok" ? "data" : "error"]: this.#variant.value,
    };
  }

  /**
   * Converts this Result to a JSON string representation.
   *
   * @returns A JSON string representation of this Result
   */
  toString(): string {
    return JSON.stringify(this.toJSON());
  }
}
