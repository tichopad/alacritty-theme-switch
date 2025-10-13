# No Exceptions

Rust and supermacro/neverthrow inspired error handling types for TypeScript that
provide functional error handling without exceptions.

## Result

A synchronous type representing either success (`Ok<T>`) or failure (`Err<E>`).

### Creating Results

```typescript
// Success
const success = Result.ok(42);

// Failure
const failure = Result.err("Something went wrong");

// From throwing function
const result = Result.try(() => JSON.parse(input));
```

### Checking Results

```typescript
if (result.isOk()) {
  console.log(result.data); // Type-safe access to success value
} else {
  console.log(result.error); // Type-safe access to error value
}
```

### Transforming Results

```typescript
// Map transforms success values
const doubled = Result.ok(5).map((x) => x * 2); // Ok(10)

// FlatMap chains operations that may fail
function divide(a: number, b: number): Result<number, string> {
  return b === 0 ? Result.err("Division by zero") : Result.ok(a / b);
}

const result = Result.ok(10)
  .flatMap((x) => divide(x, 2)) // Ok(5)
  .flatMap((x) => divide(x, 0)); // Err("Division by zero")
```

## ResultAsync

An asynchronous wrapper around `Promise<Result<T, E>>` for handling async
operations.

### Creating ResultAsync

```typescript
// From Promise
const result = ResultAsync.fromPromise(fetch("/api/data"));

// With error mapping
const result = ResultAsync.fromPromise(
  fetch("/api/data"),
  (error) => `Network error: ${error.message}`,
);

// From Result
const asyncResult = ResultAsync.fromResult(Result.ok(42));

// Direct construction
const success = ResultAsync.ok(42);
const failure = ResultAsync.err("failed");
```

### Transforming ResultAsync

```typescript
// Map supports both sync and async transformations
const result = ResultAsync.ok(5)
  .map((x) => x * 2)
  .map(async (x) => {
    await delay(100);
    return x.toString();
  });

// FlatMap chains async operations
const user = ResultAsync.ok("user123")
  .flatMap((id) => fetchUser(id))
  .flatMap((user) => validateUser(user));

// MapErr transforms error values
const result = ResultAsync.fromPromise(fetch("/api/data")).mapErr(
  (error) => `Request failed: ${error.message}`,
);

// Finally executes cleanup code regardless of success or error
const result = await ResultAsync.fromPromise(fetch("/api/data"))
  .map((response) => response.json())
  .finally(() => {
    console.log("Request completed");
    // Cleanup code runs whether the operation succeeded or failed
  })
  .toResult();
```

### Combining Multiple ResultAsync

#### ResultAsync.all - fail-fast

Combines multiple async operations similar to `Promise.all`. Returns the **first
error** encountered.

```typescript
// Combine multiple async operations (similar to Promise.all)
const result = await ResultAsync.all([
  fetchUser("user123"),
  fetchPosts("user123"),
  fetchComments("user123"),
]).toResult();

if (result.isOk()) {
  const [user, posts, comments] = result.data;
  // All operations succeeded
} else {
  // At least one operation failed - result.error contains the FIRST error
}

// Type preservation with different types
const combined = ResultAsync.all([
  ResultAsync.ok(42), // number
  ResultAsync.ok("hello"), // string
  ResultAsync.ok(true), // boolean
]);
// Type: ResultAsync<[number, string, boolean], never>

// Chain with map for parallel operations
const sum = await ResultAsync.all([
  fetchNumber(1),
  fetchNumber(2),
  fetchNumber(3),
])
  .map((numbers) => numbers.reduce((acc, n) => acc + n, 0))
  .toResult();
```

#### ResultAsync.allSettled - collect all errors

Combines multiple async operations similar to `Promise.allSettled`. Returns
**all errors** if any operation fails.

```typescript
// Collect all errors from multiple operations
const result = await ResultAsync.allSettled([
  validateEmail(email),
  validatePassword(password),
  validateUsername(username),
]).toResult();

if (result.isOk()) {
  const [emailValid, passwordValid, usernameValid] = result.data;
  // All validations succeeded
} else {
  // One or more validations failed - result.error contains ALL errors
  console.log(`Found ${result.error.length} validation errors`);
  result.error.forEach((error, index) => {
    console.error(`Error ${index + 1}: ${error}`);
  });
}

// Process errors with mapErr
const validationResult = await ResultAsync.allSettled([
  validateField1(),
  validateField2(),
  validateField3(),
])
  .mapErr((errors) => ({
    count: errors.length,
    summary: `${errors.length} validation errors occurred`,
    details: errors,
  }))
  .toResult();

if (validationResult.isErr()) {
  console.log(validationResult.error.summary);
  // "3 validation errors occurred"
}
```

**When to use each:**

- **Use `ResultAsync.all`** when you want fail-fast behavior and only need the
  first error
- **Use `ResultAsync.allSettled`** when you need to collect all errors for
  comprehensive error reporting

```typescript
// Comparison example
const operations = [
  ResultAsync.err("error 1"),
  ResultAsync.err("error 2"),
  ResultAsync.err("error 3"),
];

// all() returns first error only
const allResult = await ResultAsync.all(operations).toResult();
if (allResult.isErr()) {
  console.log(allResult.error); // "error 1"
}

// allSettled() returns all errors
const settledResult = await ResultAsync.allSettled(operations).toResult();
if (settledResult.isErr()) {
  console.log(settledResult.error); // ["error 1", "error 2", "error 3"]
}
```

### Consuming ResultAsync

```typescript
// Convert to Result
const result = await resultAsync.toResult();
if (result.isOk()) {
  console.log(result.data);
}

// Pattern matching
const message = await resultAsync.match(
  (data) => `Success: ${data}`,
  (error) => `Error: ${error}`,
);

// Unwrap (throws on error - use sparingly)
const value = await resultAsync.unwrap();
```

## Error Handling Pattern

```typescript
function parseConfig(path: string): ResultAsync<Config, ParseError> {
  return ResultAsync.fromPromise(Deno.readTextFile(path))
    .mapErr((error) => new FileNotFoundError(path, { cause: error }))
    .flatMap((content) => parseToml(content))
    .mapErr((error) => new InvalidTomlError(path, { cause: error }));
}

const config = await parseConfig("config.toml").toResult();
if (config.isErr()) {
  // Handle specific error types
  switch (config.error._tag) {
    case "FileNotFoundError":
      console.error("Config file not found");
      break;
    case "InvalidTomlError":
      console.error("Invalid TOML syntax");
      break;
  }
}
```
