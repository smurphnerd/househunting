# Lib

Client-side utilities and configurations.

## Core Files

### `orpc.client.tsx`

Client-side oRPC setup with TanStack Query integration.

**Usage:**

```typescript
"use client";
import { useORPC } from "@/lib/orpc.client";
import { useSuspenseQuery } from "@tanstack/react-query";

function MyComponent() {
  const orpc = useORPC();

  // Using useSuspenseQuery - recommended pattern
  const { data } = useSuspenseQuery(
    orpc.example.hello.queryOptions({
      input: { name: "World" },
    })
  );

  return <div>{data.message}</div>;
}
```

### `orpc.server.tsx`

Server-side oRPC client for server components and server actions.

**Usage:**

```typescript
import { orpc } from "@/lib/orpc.server";

// In server components or server actions
async function ServerComponent() {
  const data = await orpc.example.hello({
    name: "Server",
  });

  return <div>{data.message}</div>;
}
```

### `queryClient.ts`

TanStack Query client configuration with sensible defaults.

- 60s stale time
- Retry disabled by default
- Dehydration support for SSR

### `auth.ts`

Simple cookie-based authentication client.

**Usage:**

```typescript
"use client";
import { login, logout } from "@/lib/auth";

// Login with password
const result = await login(password);
if (result.success) {
  // Redirect to app
} else {
  // Show error: result.error
}

// Logout
await logout();
```

### `utils.ts`

General utility functions (e.g., `cn` for className merging with Tailwind).

## Patterns

### useSuspenseQuery Pattern (Recommended)

**Benefits:**
- Cleaner component code
- No manual loading/error states
- Data is always defined
- Better UX with declarative boundaries

**Example:**

```typescript
// Wrap with ErrorBoundary and Suspense at page level
export default function Page() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSkeleton />}>
        <PageContent />
      </Suspense>
    </ErrorBoundary>
  );
}

// Component is clean - no loading/error handling needed
function PageContent() {
  const orpc = useORPC();
  const { data } = useSuspenseQuery(
    orpc.example.getData.queryOptions({ input: { id: "123" } })
  );

  // data is always defined here
  return <div>{data.title}</div>;
}
```

### Regular useQuery Pattern

Use when you need granular control over loading/error states:

```typescript
function MyComponent() {
  const orpc = useORPC();
  const { data, isLoading, error } = useQuery(
    orpc.example.getData.queryOptions({ input: { id: "123" } })
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data?.title}</div>;
}
```

### Mutations

```typescript
function MyComponent() {
  const orpc = useORPC();
  const mutation = useMutation(
    orpc.example.createItem.mutationOptions({
      onSuccess: () => {
        toast.success("Created!");
      },
    })
  );

  return (
    <button onClick={() => mutation.mutate({ name: "Item" })}>
      Create
    </button>
  );
}
```
