# Template Structure Guide

This document explains the architecture and patterns used in this template.

## Core Patterns

### 1. Tanstack Query with Suspense Pattern

**Why:** Cleaner component code without manual loading/error handling.

```typescript
// ✅ RECOMMENDED - Using Suspense
export default function Page() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSkeleton />}>
        <PageContent />
      </Suspense>
    </ErrorBoundary>
  );
}

function PageContent() {
  const orpc = useORPC();
  const { data } = useSuspenseQuery(
    orpc.posts.list.queryOptions({ input: {} })
  );
  // data is always defined - no null checks needed
  return <div>{data.map(...)}</div>;
}

// ❌ OLD WAY - Manual loading/error handling
function PageContent() {
  const orpc = useORPC();
  const { data, isLoading, error } = useQuery(...);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null; // Extra null check needed

  return <div>{data.map(...)}</div>;
}
```

### 2. Type-Safe APIs with oRPC

**Why:** Full type safety from server to client without manual type definitions.

```typescript
// Server - Define once
export const postsRouter = {
  list: authProcedure
    .input(z.object({ page: z.number() }))
    .output(z.array(PostDto))
    .handler(async ({ input, context }) => {
      return await context.cradle.postsService.list(input.page);
    }),
};

// Client - Automatically typed
const orpc = useORPC();
const { data } = useSuspenseQuery(
  orpc.posts.list.queryOptions({
    input: { page: 1 } // TypeScript knows this shape
  })
);
// data is typed as PostDto[] automatically
```

### 3. Dependency Injection with Awilix

**Why:** Testable, maintainable code with clear dependencies.

```typescript
// Service with injected dependencies
export class PostsService {
  constructor(private deps: Cradle) {}

  async create(userId: string, input: CreatePostInput) {
    // Access dependencies
    this.deps.logger.info("Creating post");
    return await this.deps.database.insert(schema.posts).values({
      ...input,
      userId,
    });
  }
}

// Register in container
container.register({
  postsService: asClass(PostsService).singleton(),
});

// Use in router
export const postsRouter = {
  create: authProcedure.handler(({ input, context }) => {
    return context.cradle.postsService.create(
      context.user.id,
      input
    );
  }),
};
```

### 4. Shared Type Definitions

**Why:** Single source of truth for types prevents inconsistencies.

```typescript
// definitions/definitions.ts - SINGLE SOURCE OF TRUTH
export const PostDto = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  createdAt: z.date(),
});
export type PostDto = z.infer<typeof PostDto>;

// Used in database schema
export const posts = pgTable("posts", {
  id: text().primaryKey(),
  title: text().notNull(),
  // ...matches PostDto
});

// Used in router for validation
export const postsRouter = {
  create: authProcedure
    .input(PostDto.pick({ title: true, content: true }))
    .output(z.object({ id: z.string() }))
    .handler(...),
};

// Used on client
function PostCard({ post }: { post: PostDto }) {
  return <div>{post.title}</div>;
}
```

## Architecture Layers

```
┌─────────────────────────────────────┐
│         Client (Browser)             │
│  ┌────────────────────────────────┐ │
│  │  Components (src/app/)         │ │
│  │  - Use Suspense + ErrorBoundary│ │
│  │  - Call useORPC()              │ │
│  │  - useSuspenseQuery            │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
              ↓ ↑ (oRPC)
┌─────────────────────────────────────┐
│      API Layer (src/server)          │
│  ┌────────────────────────────────┐ │
│  │  Routers (endpoints/)          │ │
│  │  - Input/output validation     │ │
│  │  - Authentication checks       │ │
│  │  - Delegate to services        │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
              ↓ ↑
┌─────────────────────────────────────┐
│    Business Logic (services/)        │
│  ┌────────────────────────────────┐ │
│  │  Services                      │ │
│  │  - Business logic              │ │
│  │  - Database queries            │ │
│  │  - External APIs               │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
              ↓ ↑
┌─────────────────────────────────────┐
│      Data Layer (database/)          │
│  ┌────────────────────────────────┐ │
│  │  Drizzle ORM + PostgreSQL      │ │
│  │  - Schema definitions          │ │
│  │  - Type-safe queries           │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## File Organization

### Where to Put New Code

| Type | Location | Example |
|------|----------|---------|
| Page/Route | `src/app/*/page.tsx` | `src/app/posts/page.tsx` |
| API Endpoint | `src/server/endpoints/*Router.ts` | `postsRouter.ts` |
| Business Logic | `src/server/services/*.ts` | `PostsService.ts` |
| Database Table | `src/server/database/schema.ts` | Add `posts` table |
| Shared Types | `src/definitions/definitions.ts` | `PostDto` |
| UI Component | `src/components/*.tsx` | `post-card.tsx` |
| shadcn Component | `src/components/ui/*.tsx` | Auto-generated |
| Client Utility | `src/lib/*.ts` | `formatDate.ts` |
| Server Utility | `src/server/*.ts` | `helpers.ts` |

### Naming Conventions

- **Files**: kebab-case (`post-card.tsx`, `posts-service.ts`)
- **Components**: PascalCase (`PostCard`, `UserProfile`)
- **Services**: PascalCase + "Service" suffix (`PostsService`)
- **Routers**: camelCase + "Router" suffix (`postsRouter`)
- **DTOs**: PascalCase + "Dto" suffix (`PostDto`)
- **Procedures**: camelCase (`authProcedure`, `commonProcedure`)

## Common Workflows

### Adding a New Feature

1. **Define types** in `src/definitions/definitions.ts`
2. **Add database table** in `src/server/database/schema.ts`
3. **Run** `pnpm db:push`
4. **Create service** in `src/server/services/`
5. **Register service** in `src/server/initialization.ts`
6. **Create router** in `src/server/endpoints/`
7. **Add to main router** in `src/server/endpoints/router.ts`
8. **Create page** in `src/app/`
9. **Add components** in `src/components/`

### Modifying Existing Feature

1. **Update DTO** if data shape changed
2. **Update schema** if database changed → `pnpm db:push`
3. **Update service** for business logic
4. **Update router** for API changes
5. **Update components** for UI changes

## Testing Strategy

### Unit Tests (Vitest)

Test services with mocked dependencies:

```typescript
// services/__tests__/PostsService.test.ts
describe("PostsService", () => {
  it("should create post", async () => {
    const mockDeps = {
      database: mockDb,
      logger: mockLogger,
    } as any;

    const service = new PostsService(mockDeps);
    const result = await service.create("user-id", {
      title: "Test",
      content: "Content",
    });

    expect(result.id).toBeDefined();
  });
});
```

### Integration Tests

Test routers with real database (using Testcontainers):

```typescript
// endpoints/__tests__/postsRouter.test.ts
describe("postsRouter", () => {
  it("should list posts", async () => {
    const result = await orpc.posts.list({ page: 1 });
    expect(result).toHaveLength(0);
  });
});
```

## Performance Tips

1. **Database Queries**:
   - Use indexes on frequently queried columns
   - Limit result sets with `limit` and `offset`
   - Use `with` for eager loading relations

2. **API Calls**:
   - Set appropriate `staleTime` in queryOptions
   - Use query prefetching for predictable navigation
   - Invalidate queries after mutations

3. **Bundle Size**:
   - Use dynamic imports for large components
   - Keep server-only code in `server/` directory
   - Use `"use client"` sparingly

## Security Best Practices

1. **Authentication**:
   - Use `authProcedure` for protected endpoints
   - Never trust client-side data
   - Validate all inputs with Zod

2. **Database**:
   - Use parameterized queries (Drizzle handles this)
   - Implement row-level security where needed
   - Never expose internal IDs in URLs

3. **Environment Variables**:
   - Never commit `.env` to git
   - Validate all env vars in `env-utils.ts`
   - Use different secrets for dev/prod

## Migration from Template

When starting a new project:

1. **Update package.json**:
   - Change `name`
   - Update `description`
   - Set version to `1.0.0`

2. **Update branding**:
   - App name in `src/app/layout.tsx`
   - Theme colors in `src/app/globals.css`
   - Favicon and metadata

3. **Remove examples**:
   - Delete `exampleRouter.ts`
   - Delete `ExampleService.ts`
   - Update router to remove example routes

4. **Configure services**:
   - Set up email provider (SMTP/SES)
   - Configure S3/storage if needed
   - Add external API keys

5. **Set up CI/CD**:
   - Add GitHub Actions / GitLab CI
   - Configure deployment (Vercel, Railway, etc.)
   - Set up monitoring (Sentry, etc.)
