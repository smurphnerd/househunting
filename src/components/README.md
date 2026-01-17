# Components

React components directory.

## Structure

```
components/
├── ui/              # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── error-boundary.tsx  # Error boundary component
└── ...              # Your custom components
```

## shadcn/ui Components (`ui/`)

Pre-styled, accessible components from shadcn/ui.

**Adding new components:**

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

**Usage:**

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

function MyComponent() {
  return (
    <Card>
      <CardHeader>Title</CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  );
}
```

**Available icons:**

Use `lucide-react` for icons:

```typescript
import { Search, User, Settings } from "lucide-react";

<Search className="size-4" />
```

## Custom Components

Place your custom components in this directory:

```typescript
// example-component.tsx
"use client"; // if it uses client-side features

import { Card } from "@/components/ui/card";

export function ExampleComponent({ title }: { title: string }) {
  return (
    <Card>
      <h1>{title}</h1>
    </Card>
  );
}
```

## Error Boundary

Catch rendering errors in your components:

```typescript
import { ErrorBoundary } from "@/components/error-boundary";

export default function Page() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

**Custom fallback:**

```typescript
<ErrorBoundary fallback={<CustomErrorComponent />}>
  <MyComponent />
</ErrorBoundary>
```

## Loading Components

Create loading skeletons for Suspense boundaries:

```typescript
// loading-skeleton.tsx
export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
      <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
      <div className="h-4 w-full bg-muted animate-pulse rounded" />
    </div>
  );
}
```

**Usage:**

```typescript
<Suspense fallback={<LoadingSkeleton />}>
  <DataComponent />
</Suspense>
```

## Best Practices

- **Client Components**: Add `"use client"` when needed
- **Server Components**: Default in Next.js 16, no directive needed
- **Composition**: Build complex UIs from small, focused components
- **Props**: Use TypeScript interfaces for props
- **Styling**: Use Tailwind CSS utility classes
- **Accessibility**: Use shadcn/ui components for built-in a11y

## Tailwind CSS

### Utility Classes

Common patterns:

```typescript
// Layout
<div className="container mx-auto px-4 py-8">

// Flexbox
<div className="flex items-center justify-between gap-4">

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Responsive
<div className="text-sm md:text-base lg:text-lg">

// Dark mode
<div className="bg-white dark:bg-black text-black dark:text-white">
```

### Theme Colors

Use CSS variables from the theme:

```typescript
// Backgrounds
className="bg-background"
className="bg-card"
className="bg-muted"

// Text
className="text-foreground"
className="text-muted-foreground"

// Borders
className="border-border"

// Interactive
className="bg-primary text-primary-foreground"
className="bg-secondary text-secondary-foreground"
```

### Custom Styling

For complex styling needs, use `className` with `cn()`:

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "base-class",
  isActive && "active-class",
  className // Allow prop override
)} />
```
