# Services

This directory contains service classes for business logic.

## Overview

Services encapsulate business logic and are managed by the Awilix dependency injection container. They should be stateless and testable.

## Creating a New Service

1. **Create the service file** in this directory:

```typescript
// ExampleService.ts
import "server-only";
import type { Cradle } from "@/server/initialization";

export class ExampleService {
  constructor(private deps: Cradle) {}

  async doSomething(input: string) {
    // Access dependencies via this.deps
    const result = await this.deps.database.query.users.findMany();
    return result;
  }
}
```

2. **Register in the DI container** (`src/server/initialization.ts`):

```typescript
import { ExampleService } from "@/server/services/ExampleService";

// Add to Cradle type
export type Cradle = {
  // ... existing services
  exampleService: ExampleService;
};

// Register in container
container.register({
  // ... existing registrations
  exampleService: asClass(ExampleService).singleton(),
});
```

3. **Use in routers**:

```typescript
export const myRouter = {
  doSomething: authProcedure.handler(async ({ context }) => {
    return await context.cradle.exampleService.doSomething("input");
  }),
};
```

## Best Practices

- **Dependency Injection**: Accept all dependencies through constructor
- **Server-only**: Always import `"server-only"` at the top
- **Type Safety**: Use TypeScript types and Zod schemas
- **Error Handling**: Throw meaningful errors, let the caller handle them
- **Testing**: Write unit tests in `__tests__/` subdirectories
- **Singleton vs Scoped**:
  - Use `.singleton()` for stateless services (most cases)
  - Use `.scoped()` for request-scoped services (rare)

## Testing Services

Create tests in a `__tests__/` subdirectory:

```typescript
// __tests__/ExampleService.test.ts
import { describe, it, expect } from "vitest";
import { ExampleService } from "../ExampleService";

describe("ExampleService", () => {
  it("should do something", async () => {
    // Arrange
    const mockDeps = {
      database: mockDatabase,
      logger: mockLogger,
    };
    const service = new ExampleService(mockDeps as any);

    // Act
    const result = await service.doSomething("test");

    // Assert
    expect(result).toBeDefined();
  });
});
```

## Available Dependencies

Common dependencies available in `Cradle`:

- `database` - Drizzle ORM instance
- `logger` - Pino logger
- `auth` - Better Auth instance
- `storage` - S3 storage adapter (if configured)
- `email` - Email adapter (if configured)
- Other services you register

## Examples

See `ExampleService.ts` in this directory for a working example.
