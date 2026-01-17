# Server

Server-side code including API endpoints, services, database, and dependency injection.

## Directory Structure

```
server/
├── endpoints/          # oRPC API endpoints
│   ├── procedure.ts    # Base procedures (common, auth)
│   ├── router.ts       # Main router combining all sub-routers
│   └── exampleRouter.ts # Example router with patterns
├── services/           # Business logic services
│   ├── ExampleService.ts
│   └── README.md
├── database/           # Database schema and utilities
│   ├── schema.ts       # Drizzle schema definitions
│   ├── database.ts     # Database connection setup
│   └── databaseUtils.ts # Shared database utilities
├── auth.tsx           # Better Auth configuration
└── initialization.ts  # Dependency injection container
```

## Key Files

### `initialization.ts`

Awilix dependency injection container. All services are registered here.

**Adding a new service:**

1. Import the service
2. Add to `Cradle` type
3. Register in the container

```typescript
import { MyService } from "@/server/services/MyService";

export type Cradle = {
  // ... existing
  myService: MyService;
};

container.register({
  // ... existing
  myService: asClass(MyService).singleton(),
});
```

### `auth.tsx`

Better Auth configuration with email/password authentication.

**Features:**
- Email verification
- Rate limiting
- Session management
- Drizzle adapter for PostgreSQL

### `endpoints/procedure.ts`

Base procedures for API endpoints:

- `commonProcedure` - Public endpoints
- `authProcedure` - Protected endpoints (requires authentication)

Both include logging middleware for error tracking.

### `endpoints/router.ts`

Main application router. Combine all sub-routers here:

```typescript
export const appRouter = {
  ping: commonProcedure.handler(() => "pong"),
  example: exampleRouter,
  // Add your routers here
};
```

## Creating an Endpoint

1. **Create a router file** (e.g., `postsRouter.ts`):

```typescript
import { z } from "zod";
import { authProcedure } from "./procedure";

export const postsRouter = {
  list: authProcedure
    .input(z.object({ page: z.number() }))
    .output(z.array(PostDto))
    .handler(async ({ input, context }) => {
      return await context.cradle.postsService.list(input.page);
    }),

  create: authProcedure
    .input(PostDto.pick({ title: true, content: true }))
    .output(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      return await context.cradle.postsService.create(
        context.user.id,
        input
      );
    }),
};
```

2. **Add to main router**:

```typescript
// router.ts
import { postsRouter } from "./postsRouter";

export const appRouter = {
  // ... existing
  posts: postsRouter,
};
```

3. **Client usage**:

```typescript
const orpc = useORPC();
const { data } = useSuspenseQuery(
  orpc.posts.list.queryOptions({ input: { page: 1 } })
);
```

## Database

### Schema

Define tables in `database/schema.ts`:

```typescript
export const posts = pgTable("posts", {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text().notNull(),
  content: text().notNull(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ...timestampFields,
});

// Add to schema export
export const schema = {
  // ... existing
  posts,
};
```

### Migrations

```bash
# Push schema changes to database (development)
pnpm db:push

# Generate migrations (production)
pnpm drizzle-kit generate

# Run migrations
pnpm drizzle-kit migrate
```

### Querying

```typescript
// In a service
async list() {
  return await this.deps.database.query.posts.findMany({
    limit: 10,
    orderBy: (posts, { desc }) => [desc(posts.createdAt)],
  });
}

// With joins
async getWithAuthor(id: string) {
  return await this.deps.database.query.posts.findFirst({
    where: (posts, { eq }) => eq(posts.id, id),
    with: {
      author: true,
    },
  });
}
```

## Best Practices

- **Type Safety**: Use Zod schemas for validation
- **Error Handling**: Throw errors in services, catch in routers
- **Testing**: Write unit tests for services
- **Server-only**: Import `"server-only"` in server code
- **DTOs**: Define in `src/definitions/definitions.ts`
