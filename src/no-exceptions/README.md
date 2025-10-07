# No Exceptions

Rust and supermacro/neverthrow inspired error handling types for TypeScript that provide functional error
handling without exceptions.

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
  (error) => `Network error: ${error.message}`
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
  (error) => `Request failed: ${error.message}`
);
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
  (error) => `Error: ${error}`
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
