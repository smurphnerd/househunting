# Next.js + oRPC Template

A production-ready Next.js template with type-safe APIs, authentication, and modern tooling.

## Features

- ⚡️ **Next.js 16** - React Server Components & App Router
- 🔐 **Better Auth** - Secure email/password authentication
- 🔄 **oRPC** - Type-safe RPC with automatic client generation
- 📊 **TanStack Query** - Powerful data fetching with `useSuspenseQuery` pattern
- 🗄️ **Drizzle ORM** - Type-safe database queries with PostgreSQL
- 💉 **Awilix** - Dependency injection for clean architecture
- 🎨 **shadcn/ui** - Beautiful, accessible UI components
- 🎯 **Tailwind CSS v4** - Utility-first styling with OKLCH colors
- ✅ **TypeScript** - Full type safety across the stack
- 🧪 **Vitest** - Fast unit testing

## Quick Start

### 1. Clone & Install

```bash
# Clone this template
git clone <your-template-url> my-project
cd my-project

# Install dependencies
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Update .env with your values:
# - DATABASE_URL: PostgreSQL connection string
# - AUTH_SECRET: Generate with `openssl rand -base64 32`
# - BASE_URL: Your app URL (http://localhost:3000 for dev)
```

### 3. Database Setup

```bash
# Start PostgreSQL (using Docker)
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  postgres:15

# Push database schema
pnpm db:push
```

### 4. Start Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── rpc/            # oRPC handler
│   │   │   └── auth/           # Better Auth handler
│   │   ├── globals.css         # Global styles (Tailwind v4)
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   └── error-boundary.tsx  # Error boundary
│   ├── lib/                    # Client utilities
│   │   ├── orpc.client.tsx     # oRPC client
│   │   ├── orpc.server.tsx     # oRPC server client
│   │   ├── queryClient.ts      # TanStack Query config
│   │   └── authClient.ts       # Better Auth client
│   ├── server/                 # Server-side code
│   │   ├── endpoints/          # API endpoints
│   │   │   ├── procedure.ts    # Base procedures
│   │   │   ├── router.ts       # Main router
│   │   │   └── exampleRouter.ts # Example router
│   │   ├── services/           # Business logic
│   │   │   └── ExampleService.ts
│   │   ├── database/           # Database
│   │   │   ├── schema.ts       # Drizzle schema
│   │   │   └── database.ts     # DB connection
│   │   ├── auth.tsx            # Auth config
│   │   └── initialization.ts   # DI container
│   ├── definitions/            # Shared types & schemas
│   │   └── definitions.ts      # DTOs and Zod schemas
│   └── env-utils.ts            # Environment validation
├── package.json
├── tsconfig.json
└── drizzle.config.ts
```

## Documentation

Each directory has a `README.md` explaining its purpose and patterns:

- [/src/app](./src/app/README.md) - Pages and routing
- [/src/components](./src/components/README.md) - UI components
- [/src/lib](./src/lib/README.md) - Client utilities
- [/src/server](./src/server/README.md) - Server architecture
- [/src/server/services](./src/server/services/README.md) - Business logic
- [/src/definitions](./src/definitions/README.md) - Shared types

## Common Tasks

### Add a shadcn/ui Component

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add card
```

### Create a New API Endpoint

1. **Define DTO** in `src/definitions/definitions.ts`:

```typescript
export const PostDto = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  createdAt: z.date(),
});
export type PostDto = z.infer<typeof PostDto>;
```

2. **Create Router** in `src/server/endpoints/postsRouter.ts`:

```typescript
import { authProcedure } from "./procedure";
import { PostDto } from "@/definitions/definitions";

export const postsRouter = {
  list: authProcedure
    .output(z.array(PostDto))
    .handler(async ({ context }) => {
      return await context.cradle.database.query.posts.findMany();
    }),
};
```

3. **Add to Main Router** in `src/server/endpoints/router.ts`:

```typescript
import { postsRouter } from "./postsRouter";

export const appRouter = {
  // ... existing
  posts: postsRouter,
};
```

4. **Use on Client**:

```typescript
const orpc = useORPC();
const { data } = useSuspenseQuery(
  orpc.posts.list.queryOptions({ input: undefined })
);
```

### Create a Service

1. **Create Service** in `src/server/services/PostsService.ts`:

```typescript
import "server-only";
import type { Cradle } from "@/server/initialization";

export class PostsService {
  constructor(private deps: Cradle) {}

  async list() {
    return await this.deps.database.query.posts.findMany();
  }
}
```

2. **Register in DI Container** in `src/server/initialization.ts`:

```typescript
import { PostsService } from "@/server/services/PostsService";

export type Cradle = {
  // ... existing
  postsService: PostsService;
};

container.register({
  // ... existing
  postsService: asClass(PostsService).singleton(),
});
```

3. **Use in Router**:

```typescript
export const postsRouter = {
  list: authProcedure.handler(async ({ context }) => {
    return await context.cradle.postsService.list();
  }),
};
```

### Database Migrations

```bash
# Development - push schema changes
pnpm db:push

# Production - generate migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

## Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:push          # Push schema changes (dev)

# Code Quality
pnpm typecheck        # Run TypeScript checks
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint errors

# Testing
pnpm test             # Run unit tests
```

## Key Patterns

### useSuspenseQuery Pattern (Recommended)

Cleaner components without manual loading/error handling:

```typescript
// Wrap page with ErrorBoundary + Suspense
export default function Page() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSkeleton />}>
        <PageContent />
      </Suspense>
    </ErrorBoundary>
  );
}

// Component is clean - data is always defined
function PageContent() {
  const orpc = useORPC();
  const { data } = useSuspenseQuery(
    orpc.posts.list.queryOptions({ input: {} })
  );

  return <div>{data.map(post => ...)}</div>;
}
```

### Protected Routes

```typescript
// Use authProcedure for endpoints requiring authentication
export const postsRouter = {
  create: authProcedure
    .input(CreatePostDto)
    .handler(async ({ input, context }) => {
      // context.user is available
      return await context.cradle.postsService.create(
        context.user.id,
        input
      );
    }),
};
```

## Tech Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **API**: oRPC
- **Auth**: Better Auth
- **Database**: PostgreSQL + Drizzle ORM
- **State**: TanStack Query
- **Styling**: Tailwind CSS v4
- **UI**: shadcn/ui + Radix UI
- **DI**: Awilix
- **Icons**: Lucide React
- **Testing**: Vitest
- **Validation**: Zod

## Environment Variables

See [.env.example](./.env.example) for required variables:

- `DATABASE_URL` - PostgreSQL connection
- `AUTH_SECRET` - Auth secret key
- `BASE_URL` - Application URL
- `EMAIL_CONNECTION_URL` - SMTP or "ses"
- `SYSTEM_EMAIL_FROM` - From email address

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## License

MIT

## Support

- [Next.js Docs](https://nextjs.org/docs)
- [oRPC Docs](https://orpc.dev)
- [Better Auth Docs](https://better-auth.com)
- [Drizzle Docs](https://orm.drizzle.team)
- [shadcn/ui Docs](https://ui.shadcn.com)
