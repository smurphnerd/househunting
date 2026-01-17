# App Directory

Next.js 16 App Router directory.

## Structure

```
app/
├── api/                 # API routes
│   ├── rpc/[[...rest]]/ # oRPC handler
│   └── auth/[...all]/   # Better Auth handler
├── globals.css          # Global styles with Tailwind v4
├── layout.tsx           # Root layout
└── page.tsx             # Home page (example)
```

## Layout (`layout.tsx`)

Root layout wraps all pages:

```typescript
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ApiClientProvider baseUrl={env.BASE_URL}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
        </ApiClientProvider>
      </body>
    </html>
  );
}
```

**Key features:**
- Wraps app with `ApiClientProvider` for oRPC + TanStack Query
- Includes `Toaster` for notifications (from `sonner`)
- Sets up basic layout structure

## Creating Pages

### Basic Page

```typescript
// app/about/page.tsx
export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">About</h1>
      <p>This is a server component by default.</p>
    </div>
  );
}
```

### Page with Data Fetching (Recommended Pattern)

Use Suspense + ErrorBoundary with client components:

```typescript
// app/posts/page.tsx
"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { useORPC } from "@/lib/orpc.client";

function PostsContent() {
  const orpc = useORPC();
  const { data } = useSuspenseQuery(
    orpc.posts.list.queryOptions({ input: { page: 1 } })
  );

  return (
    <div>
      {data.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </article>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return <div className="animate-pulse">Loading posts...</div>;
}

export default function PostsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSkeleton />}>
        <PostsContent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Dynamic Routes

```typescript
// app/posts/[id]/page.tsx
"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { useORPC } from "@/lib/orpc.client";

function PostContent({ params }: { params: { id: string } }) {
  const orpc = useORPC();
  const { data } = useSuspenseQuery(
    orpc.posts.getById.queryOptions({ input: { id: params.id } })
  );

  return (
    <article>
      <h1>{data.title}</h1>
      <p>{data.content}</p>
    </article>
  );
}

export default function PostPage({ params }: { params: { id: string } }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <PostContent params={params} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

## Metadata

```typescript
// Static metadata
export const metadata: Metadata = {
  title: "My Page",
  description: "Page description",
};

// Dynamic metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await orpc.posts.getById({ id: params.id });
  return {
    title: post.title,
    description: post.excerpt,
  };
}
```

## API Routes

### oRPC Handler (`api/rpc/[[...rest]]/route.ts`)

Handles all oRPC API calls. Already configured - no changes needed.

### Auth Handler (`api/auth/[...all]/route.ts`)

Handles Better Auth routes. Already configured - no changes needed.

## Global Styles (`globals.css`)

Tailwind v4 configuration with theme variables:

- Dark mode support with `.dark` class
- CSS variables for colors (e.g., `--color-primary`)
- OKLCH color space for better perceptual uniformity
- Custom radius scales

**Customizing theme:**

Edit the CSS variables in `globals.css`:

```css
:root {
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  /* ... */
}

.dark {
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  /* ... */
}
```

## Best Practices

- **Server Components**: Default in App Router, fast and SEO-friendly
- **Client Components**: Use `"use client"` only when needed (interactivity, hooks)
- **Data Fetching**: Use `useSuspenseQuery` with Suspense + ErrorBoundary
- **Loading States**: Create dedicated loading components for Suspense
- **Error Handling**: Use ErrorBoundary at page level
- **Metadata**: Define for all pages for better SEO
- **File Colocation**: Keep page-specific components in the same directory

## Route Types

- `page.tsx` - Page component
- `layout.tsx` - Layout component (wraps pages)
- `loading.tsx` - Loading UI (automatic Suspense boundary)
- `error.tsx` - Error UI (automatic ErrorBoundary)
- `not-found.tsx` - 404 page
- `route.ts` - API route handler
