# Getting Started

This guide will help you get your new project up and running.

## Prerequisites

- Node.js 20+ installed
- pnpm installed (`npm install -g pnpm`)
- PostgreSQL database (local or cloud)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and update these required variables:

```bash
# Generate a secret key for authentication
AUTH_SECRET=$(openssl rand -base64 32)

# Your database connection string
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Your application URL
BASE_URL=http://localhost:3000

# Email configuration (for development, use a local SMTP server)
EMAIL_CONNECTION_URL=smtp://localhost:1025
SYSTEM_EMAIL_FROM=noreply@localhost
```

### 3. Start PostgreSQL

#### Option A: Using Docker

```bash
docker run -d \
  --name my-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  postgres:15
```

#### Option B: Using Local PostgreSQL

Install PostgreSQL locally and create a database:

```bash
createdb myapp
```

### 4. Push Database Schema

```bash
pnpm db:push
```

This creates the tables defined in `src/server/database/schema.ts`.

### 5. (Optional) Set Up Email Development Server

For testing email verification, run a local SMTP server:

```bash
# Using MailHog (recommended)
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

Visit http://localhost:8025 to see caught emails.

### 6. Start Development Server

```bash
pnpm dev
```

Visit http://localhost:3000

## Verify Setup

1. **Test the API**:
   - Visit http://localhost:3000
   - You should see the home page with "pong" response from the API

2. **Test Email Preview**:
   ```bash
   pnpm email
   ```
   - Visit http://localhost:3100 to preview email templates

3. **Run Type Checking**:
   ```bash
   pnpm typecheck
   ```
   - Should complete with no errors

## Next Steps

### 1. Customize the Template

- Update `package.json` name and description
- Edit `src/app/layout.tsx` to change app title
- Customize theme in `src/app/globals.css`

### 2. Add Your First Feature

#### Create a Router

```typescript
// src/server/endpoints/postsRouter.ts
import { z } from "zod";
import { authProcedure } from "./procedure";

export const postsRouter = {
  list: authProcedure
    .output(z.array(z.object({ id: z.string(), title: z.string() })))
    .handler(async ({ context }) => {
      // Your logic here
      return [];
    }),
};
```

#### Add to Main Router

```typescript
// src/server/endpoints/router.ts
import { postsRouter } from "./postsRouter";

export const appRouter = {
  // ... existing
  posts: postsRouter,
};
```

#### Use on Client

```typescript
// src/app/posts/page.tsx
"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useORPC } from "@/lib/orpc.client";

function PostsList() {
  const orpc = useORPC();
  const { data } = useSuspenseQuery(
    orpc.posts.list.queryOptions({ input: undefined })
  );

  return <div>{/* Render posts */}</div>;
}
```

### 3. Add shadcn/ui Components

```bash
# Add components you need
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add form
```

### 4. Add Database Tables

```typescript
// src/server/database/schema.ts
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

Then push to database:

```bash
pnpm db:push
```

## Common Issues

### Database Connection Failed

- Check that PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Test connection: `psql $DATABASE_URL`

### Port Already in Use

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 pnpm dev
```

### Type Errors

```bash
# Clear cache and rebuild
rm -rf .next
pnpm typecheck
pnpm dev
```

## Development Tips

1. **Use TanStack Query DevTools**:
   - Automatically enabled in development
   - Click the flower icon in bottom-right to inspect queries

2. **Hot Reload**:
   - File changes trigger automatic reload
   - API changes require full page refresh

3. **Logging**:
   - Server logs appear in terminal
   - Client logs in browser console
   - Use `context.cradle.logger` in server code

4. **Database Inspection**:
   ```bash
   # Install Drizzle Studio
   pnpm drizzle-kit studio

   # Visit https://local.drizzle.studio
   ```

## Learn More

- [Project README](./README.md) - Full documentation
- [Directory Structure](./README.md#project-structure) - Where things go
- Individual directory READMEs:
  - [src/app](./src/app/README.md)
  - [src/lib](./src/lib/README.md)
  - [src/server](./src/server/README.md)
  - [src/components](./src/components/README.md)

## Need Help?

- Check the README files in each directory
- Review example code in `exampleRouter.ts` and `ExampleService.ts`
- Open an issue on GitHub
