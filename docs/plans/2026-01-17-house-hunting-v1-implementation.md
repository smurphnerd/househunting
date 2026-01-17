# House Hunting V1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a password-protected house hunting checklist app with property listing, status tracking, and inspection time management.

**Architecture:** Next.js app with simple cookie-based password auth. Properties stored in Postgres via Drizzle ORM. oRPC API for CRUD operations. Table-based UI for property listing, detail page for editing.

**Tech Stack:** Next.js 16, Drizzle ORM, oRPC, React Hook Form, Zod, shadcn/ui, Tailwind CSS

---

## Task 1: Add APP_PASSWORD Environment Variable

**Files:**
- Modify: `src/env-utils.ts`

**Step 1: Add APP_PASSWORD to env schema**

Add the `APP_PASSWORD` field to the environment schema:

```typescript
// In src/env-utils.ts, add to envSchema object:
APP_PASSWORD: z.string().min(1),
```

**Step 2: Add to .env.local (manual)**

Create `.env.local` with `APP_PASSWORD=your-secret-password`

**Step 3: Commit**

```bash
git add src/env-utils.ts
git commit -m "feat: add APP_PASSWORD environment variable"
```

---

## Task 2: Create Simple Password Auth Middleware

**Files:**
- Create: `src/server/simpleAuth.ts`
- Create: `src/lib/auth.ts`

**Step 1: Create server-side auth utilities**

```typescript
// src/server/simpleAuth.ts
import "server-only";
import { cookies } from "next/headers";
import { env } from "@/env";

const AUTH_COOKIE_NAME = "house-hunting-auth";
const AUTH_COOKIE_VALUE = "authenticated";

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  return authCookie?.value === AUTH_COOKIE_VALUE;
}

export function verifyPassword(password: string): boolean {
  return password === env.APP_PASSWORD;
}

export async function setAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
```

**Step 2: Create client-side auth utilities**

```typescript
// src/lib/auth.ts
"use client";

export async function login(password: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (response.ok) {
    return { success: true };
  }

  const data = await response.json();
  return { success: false, error: data.error || "Invalid password" };
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
```

**Step 3: Commit**

```bash
git add src/server/simpleAuth.ts src/lib/auth.ts
git commit -m "feat: add simple password auth utilities"
```

---

## Task 3: Create Auth API Routes

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`

**Step 1: Create login route**

```typescript
// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { verifyPassword, setAuthCookie } from "@/server/simpleAuth";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  await setAuthCookie();
  return NextResponse.json({ success: true });
}
```

**Step 2: Create logout route**

```typescript
// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/server/simpleAuth";

export async function POST() {
  await clearAuthCookie();
  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add src/app/api/auth/login/route.ts src/app/api/auth/logout/route.ts
git commit -m "feat: add login and logout API routes"
```

---

## Task 4: Create Auth Middleware for Protected Routes

**Files:**
- Create: `src/middleware.ts`

**Step 1: Create middleware**

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "house-hunting-auth";
const AUTH_COOKIE_VALUE = "authenticated";

const PUBLIC_PATHS = ["/", "/api/auth/login", "/api/auth/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith("/api/auth/"))) {
    return NextResponse.next();
  }

  // Check auth cookie
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  const isAuthenticated = authCookie?.value === AUTH_COOKIE_VALUE;

  if (!isAuthenticated) {
    // Redirect to login for pages, return 401 for API
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
```

**Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add auth middleware for protected routes"
```

---

## Task 5: Create Login Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace home page with login form**

```typescript
// src/app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(password);

    if (result.success) {
      router.push("/properties");
    } else {
      setError(result.error || "Invalid password");
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>House Hunting</CardTitle>
          <CardDescription>Enter password to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: replace home page with login form"
```

---

## Task 6: Create Database Schema for Properties

**Files:**
- Modify: `src/server/database/schema.ts`
- Create: `src/definitions/property.ts`

**Step 1: Create property Zod schema and types**

```typescript
// src/definitions/property.ts
import { z } from "zod";

export const PropertyStatus = z.enum([
  "saved",
  "rejected",
  "shortlisted",
  "inspected",
  "offered",
  "purchased",
]);
export type PropertyStatus = z.infer<typeof PropertyStatus>;

export const PropertyType = z.enum(["apartment", "unit", "townhouse", "house"]);
export type PropertyType = z.infer<typeof PropertyType>;

export const Aspect = z.enum(["north", "south", "east", "west", "other"]);
export type Aspect = z.infer<typeof Aspect>;

export const StoveType = z.enum(["gas", "electric", "induction", "unknown"]);
export type StoveType = z.infer<typeof StoveType>;

export const CreatePropertyInput = z.object({
  websiteUrl: z.string().url().optional(),
  address: z.string().min(1, "Address is required"),
});
export type CreatePropertyInput = z.infer<typeof CreatePropertyInput>;

export const UpdatePropertyInput = z.object({
  id: z.string().uuid(),
  websiteUrl: z.string().url().optional().nullable(),
  address: z.string().min(1).optional(),
  status: PropertyStatus.optional(),
  propertyType: PropertyType.optional().nullable(),
  price: z.number().int().positive().optional().nullable(),
  bedrooms: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().int().min(0).optional().nullable(),
  squareMetres: z.number().int().positive().optional().nullable(),
  ageYears: z.number().int().min(0).optional().nullable(),
  previousPrice: z.number().int().positive().optional().nullable(),
  carParkIncluded: z.boolean().optional().nullable(),
  carParkCost: z.number().int().min(0).optional().nullable(),
  bodyCorpFees: z.number().int().min(0).optional().nullable(),
  councilRates: z.number().int().min(0).optional().nullable(),
  estimatedRent: z.number().int().min(0).optional().nullable(),
  petsAllowed: z.boolean().optional().nullable(),
  storageIncluded: z.boolean().optional().nullable(),
  aspect: Aspect.optional().nullable(),
  agentName: z.string().optional().nullable(),
  agentContact: z.string().optional().nullable(),
  dateListed: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  // Post-inspection fields
  desksFit: z.number().int().min(0).optional().nullable(),
  hasLaundrySpace: z.boolean().optional().nullable(),
  floorLevel: z.number().int().min(0).optional().nullable(),
  goodLighting: z.boolean().optional().nullable(),
  hasDishwasher: z.boolean().optional().nullable(),
  stoveType: StoveType.optional().nullable(),
  isQuiet: z.boolean().optional().nullable(),
  hasAircon: z.boolean().optional().nullable(),
  overallImpression: z.number().int().min(1).max(5).optional().nullable(),
  visibleIssues: z.string().optional().nullable(),
  postInspectionNotes: z.string().optional().nullable(),
});
export type UpdatePropertyInput = z.infer<typeof UpdatePropertyInput>;

export const PropertyDto = z.object({
  id: z.string().uuid(),
  websiteUrl: z.string().nullable(),
  address: z.string(),
  status: PropertyStatus,
  propertyType: PropertyType.nullable(),
  price: z.number().nullable(),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  squareMetres: z.number().nullable(),
  ageYears: z.number().nullable(),
  previousPrice: z.number().nullable(),
  carParkIncluded: z.boolean().nullable(),
  carParkCost: z.number().nullable(),
  bodyCorpFees: z.number().nullable(),
  councilRates: z.number().nullable(),
  estimatedRent: z.number().nullable(),
  petsAllowed: z.boolean().nullable(),
  storageIncluded: z.boolean().nullable(),
  aspect: Aspect.nullable(),
  agentName: z.string().nullable(),
  agentContact: z.string().nullable(),
  dateListed: z.date().nullable(),
  notes: z.string().nullable(),
  desksFit: z.number().nullable(),
  hasLaundrySpace: z.boolean().nullable(),
  floorLevel: z.number().nullable(),
  goodLighting: z.boolean().nullable(),
  hasDishwasher: z.boolean().nullable(),
  stoveType: StoveType.nullable(),
  isQuiet: z.boolean().nullable(),
  hasAircon: z.boolean().nullable(),
  overallImpression: z.number().nullable(),
  visibleIssues: z.string().nullable(),
  postInspectionNotes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type PropertyDto = z.infer<typeof PropertyDto>;
```

**Step 2: Add properties table to database schema**

```typescript
// src/server/database/schema.ts
// Add these imports at the top:
import { date } from "drizzle-orm/pg-core";

// Add after the sessions table:

export const propertyStatusEnum = ["saved", "rejected", "shortlisted", "inspected", "offered", "purchased"] as const;
export const propertyTypeEnum = ["apartment", "unit", "townhouse", "house"] as const;
export const aspectEnum = ["north", "south", "east", "west", "other"] as const;
export const stoveTypeEnum = ["gas", "electric", "induction", "unknown"] as const;

export const properties = pgTable("properties", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  websiteUrl: text(),
  address: text().notNull(),
  status: text({ enum: propertyStatusEnum }).notNull().default("saved"),
  propertyType: text({ enum: propertyTypeEnum }),
  price: integer(),
  bedrooms: integer().default(1),
  bathrooms: integer().default(1),
  squareMetres: integer(),
  ageYears: integer(),
  previousPrice: integer(),
  carParkIncluded: boolean(),
  carParkCost: integer(),
  bodyCorpFees: integer(),
  councilRates: integer(),
  estimatedRent: integer(),
  petsAllowed: boolean(),
  storageIncluded: boolean(),
  aspect: text({ enum: aspectEnum }),
  agentName: text(),
  agentContact: text(),
  dateListed: date({ mode: "date" }),
  notes: text(),
  // Post-inspection fields
  desksFit: integer(),
  hasLaundrySpace: boolean(),
  floorLevel: integer(),
  goodLighting: boolean(),
  hasDishwasher: boolean(),
  stoveType: text({ enum: stoveTypeEnum }),
  isQuiet: boolean(),
  hasAircon: boolean(),
  overallImpression: integer(),
  visibleIssues: text(),
  postInspectionNotes: text(),
  ...timestampFields,
});

// Update schema export:
export const schema = {
  users,
  verifications,
  rateLimits,
  sessions,
  properties,
};
```

**Step 3: Commit**

```bash
git add src/definitions/property.ts src/server/database/schema.ts
git commit -m "feat: add property database schema and types"
```

---

## Task 7: Create Inspection Times Database Schema

**Files:**
- Modify: `src/server/database/schema.ts`
- Create: `src/definitions/inspectionTime.ts`

**Step 1: Create inspection time Zod schema**

```typescript
// src/definitions/inspectionTime.ts
import { z } from "zod";

export const CreateInspectionTimeInput = z.object({
  propertyId: z.string().uuid(),
  dateTime: z.coerce.date(),
});
export type CreateInspectionTimeInput = z.infer<typeof CreateInspectionTimeInput>;

export const UpdateInspectionTimeInput = z.object({
  id: z.string().uuid(),
  dateTime: z.coerce.date().optional(),
  attended: z.boolean().optional(),
});
export type UpdateInspectionTimeInput = z.infer<typeof UpdateInspectionTimeInput>;

export const InspectionTimeDto = z.object({
  id: z.string().uuid(),
  propertyId: z.string().uuid(),
  dateTime: z.date(),
  attended: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type InspectionTimeDto = z.infer<typeof InspectionTimeDto>;
```

**Step 2: Add inspection_times table to schema**

```typescript
// src/server/database/schema.ts
// Add after properties table:

export const inspectionTimes = pgTable("inspection_times", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  propertyId: text()
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  dateTime: timestamp().notNull(),
  attended: boolean().notNull().default(false),
  ...timestampFields,
});

// Update schema export:
export const schema = {
  users,
  verifications,
  rateLimits,
  sessions,
  properties,
  inspectionTimes,
};
```

**Step 3: Commit**

```bash
git add src/definitions/inspectionTime.ts src/server/database/schema.ts
git commit -m "feat: add inspection times database schema"
```

---

## Task 8: Run Database Migration

**Step 1: Push schema to database**

Run: `pnpm db:push`

Expected: Schema pushed successfully, tables created.

**Step 2: Commit (if drizzle generates migration files)**

```bash
git add -A
git commit -m "chore: sync database schema"
```

---

## Task 9: Create Property Service

**Files:**
- Create: `src/server/services/PropertyService.ts`
- Modify: `src/server/initialization.ts`

**Step 1: Create PropertyService**

```typescript
// src/server/services/PropertyService.ts
import { eq } from "drizzle-orm";
import type { Cradle } from "@/server/initialization";
import { properties } from "@/server/database/schema";
import type { CreatePropertyInput, UpdatePropertyInput } from "@/definitions/property";

export class PropertyService {
  constructor(private deps: Cradle) {}

  async list() {
    return this.deps.database.query.properties.findMany({
      orderBy: (properties, { desc }) => [desc(properties.createdAt)],
    });
  }

  async getById(id: string) {
    return this.deps.database.query.properties.findFirst({
      where: eq(properties.id, id),
    });
  }

  async create(input: CreatePropertyInput) {
    const [property] = await this.deps.database
      .insert(properties)
      .values({
        address: input.address,
        websiteUrl: input.websiteUrl,
      })
      .returning();
    return property;
  }

  async update(input: UpdatePropertyInput) {
    const { id, ...data } = input;
    const [property] = await this.deps.database
      .update(properties)
      .set(data)
      .where(eq(properties.id, id))
      .returning();
    return property;
  }

  async delete(id: string) {
    await this.deps.database.delete(properties).where(eq(properties.id, id));
  }
}
```

**Step 2: Register service in container**

```typescript
// In src/server/initialization.ts
// Add import:
import { PropertyService } from "@/server/services/PropertyService";

// Add to Cradle type:
propertyService: PropertyService;

// Add to container.register():
propertyService: asClass(PropertyService).singleton(),
```

**Step 3: Commit**

```bash
git add src/server/services/PropertyService.ts src/server/initialization.ts
git commit -m "feat: add PropertyService for CRUD operations"
```

---

## Task 10: Create Inspection Time Service

**Files:**
- Create: `src/server/services/InspectionTimeService.ts`
- Modify: `src/server/initialization.ts`

**Step 1: Create InspectionTimeService**

```typescript
// src/server/services/InspectionTimeService.ts
import { eq } from "drizzle-orm";
import type { Cradle } from "@/server/initialization";
import { inspectionTimes } from "@/server/database/schema";
import type { CreateInspectionTimeInput, UpdateInspectionTimeInput } from "@/definitions/inspectionTime";

export class InspectionTimeService {
  constructor(private deps: Cradle) {}

  async listByProperty(propertyId: string) {
    return this.deps.database.query.inspectionTimes.findMany({
      where: eq(inspectionTimes.propertyId, propertyId),
      orderBy: (inspectionTimes, { asc }) => [asc(inspectionTimes.dateTime)],
    });
  }

  async create(input: CreateInspectionTimeInput) {
    const [inspectionTime] = await this.deps.database
      .insert(inspectionTimes)
      .values({
        propertyId: input.propertyId,
        dateTime: input.dateTime,
      })
      .returning();
    return inspectionTime;
  }

  async update(input: UpdateInspectionTimeInput) {
    const { id, ...data } = input;
    const [inspectionTime] = await this.deps.database
      .update(inspectionTimes)
      .set(data)
      .where(eq(inspectionTimes.id, id))
      .returning();
    return inspectionTime;
  }

  async delete(id: string) {
    await this.deps.database.delete(inspectionTimes).where(eq(inspectionTimes.id, id));
  }
}
```

**Step 2: Register service in container**

```typescript
// In src/server/initialization.ts
// Add import:
import { InspectionTimeService } from "@/server/services/InspectionTimeService";

// Add to Cradle type:
inspectionTimeService: InspectionTimeService;

// Add to container.register():
inspectionTimeService: asClass(InspectionTimeService).singleton(),
```

**Step 3: Commit**

```bash
git add src/server/services/InspectionTimeService.ts src/server/initialization.ts
git commit -m "feat: add InspectionTimeService"
```

---

## Task 11: Create Property API Router

**Files:**
- Create: `src/server/endpoints/propertyRouter.ts`
- Modify: `src/server/endpoints/router.ts`

**Step 1: Create property router**

```typescript
// src/server/endpoints/propertyRouter.ts
import { z } from "zod";
import { commonProcedure } from "@/server/endpoints/procedure";
import {
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyDto,
} from "@/definitions/property";

export const propertyRouter = {
  list: commonProcedure
    .output(z.array(PropertyDto))
    .handler(async ({ context }) => {
      const properties = await context.cradle.propertyService.list();
      return properties;
    }),

  getById: commonProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(PropertyDto.nullable())
    .handler(async ({ input, context }) => {
      const property = await context.cradle.propertyService.getById(input.id);
      return property ?? null;
    }),

  create: commonProcedure
    .input(CreatePropertyInput)
    .output(PropertyDto)
    .handler(async ({ input, context }) => {
      return context.cradle.propertyService.create(input);
    }),

  update: commonProcedure
    .input(UpdatePropertyInput)
    .output(PropertyDto.nullable())
    .handler(async ({ input, context }) => {
      const property = await context.cradle.propertyService.update(input);
      return property ?? null;
    }),

  delete: commonProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      await context.cradle.propertyService.delete(input.id);
      return { success: true };
    }),
};
```

**Step 2: Add to main router**

```typescript
// In src/server/endpoints/router.ts
// Add import:
import { propertyRouter } from "@/server/endpoints/propertyRouter";

// Add to appRouter:
property: propertyRouter,
```

**Step 3: Commit**

```bash
git add src/server/endpoints/propertyRouter.ts src/server/endpoints/router.ts
git commit -m "feat: add property API router"
```

---

## Task 12: Create Inspection Time API Router

**Files:**
- Create: `src/server/endpoints/inspectionTimeRouter.ts`
- Modify: `src/server/endpoints/router.ts`

**Step 1: Create inspection time router**

```typescript
// src/server/endpoints/inspectionTimeRouter.ts
import { z } from "zod";
import { commonProcedure } from "@/server/endpoints/procedure";
import {
  CreateInspectionTimeInput,
  UpdateInspectionTimeInput,
  InspectionTimeDto,
} from "@/definitions/inspectionTime";

export const inspectionTimeRouter = {
  listByProperty: commonProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .output(z.array(InspectionTimeDto))
    .handler(async ({ input, context }) => {
      return context.cradle.inspectionTimeService.listByProperty(input.propertyId);
    }),

  create: commonProcedure
    .input(CreateInspectionTimeInput)
    .output(InspectionTimeDto)
    .handler(async ({ input, context }) => {
      return context.cradle.inspectionTimeService.create(input);
    }),

  update: commonProcedure
    .input(UpdateInspectionTimeInput)
    .output(InspectionTimeDto.nullable())
    .handler(async ({ input, context }) => {
      const inspectionTime = await context.cradle.inspectionTimeService.update(input);
      return inspectionTime ?? null;
    }),

  delete: commonProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      await context.cradle.inspectionTimeService.delete(input.id);
      return { success: true };
    }),
};
```

**Step 2: Add to main router**

```typescript
// In src/server/endpoints/router.ts
// Add import:
import { inspectionTimeRouter } from "@/server/endpoints/inspectionTimeRouter";

// Add to appRouter:
inspectionTime: inspectionTimeRouter,
```

**Step 3: Commit**

```bash
git add src/server/endpoints/inspectionTimeRouter.ts src/server/endpoints/router.ts
git commit -m "feat: add inspection time API router"
```

---

## Task 13: Create Status Badge Component

**Files:**
- Create: `src/components/StatusBadge.tsx`

**Step 1: Create StatusBadge component**

```typescript
// src/components/StatusBadge.tsx
import { Badge } from "@/components/ui/badge";
import type { PropertyStatus } from "@/definitions/property";

const statusConfig: Record<PropertyStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  saved: { label: "Saved", variant: "secondary" },
  rejected: { label: "Rejected", variant: "destructive" },
  shortlisted: { label: "Shortlisted", variant: "default" },
  inspected: { label: "Inspected", variant: "outline" },
  offered: { label: "Offered", variant: "default" },
  purchased: { label: "Purchased", variant: "default" },
};

export function StatusBadge({ status }: { status: PropertyStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

**Step 2: Commit**

```bash
git add src/components/StatusBadge.tsx
git commit -m "feat: add StatusBadge component"
```

---

## Task 14: Create Properties List Page

**Files:**
- Create: `src/app/properties/page.tsx`

**Step 1: Create properties list page**

```typescript
// src/app/properties/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "@/components/error-boundary";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

function AddPropertyDialog() {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const queryClient = useQueryClient();
  const orpc = useORPC();

  const createMutation = useMutation({
    mutationFn: (input: { address: string; websiteUrl?: string }) =>
      orpc.property.create.call({ input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", "list"] });
      setOpen(false);
      setAddress("");
      setWebsiteUrl("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      address,
      websiteUrl: websiteUrl || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Property</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Address *"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              placeholder="Website URL (optional)"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Adding..." : "Add Property"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PropertiesTable() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const { data: properties } = useSuspenseQuery(
    orpc.property.list.queryOptions({ input: undefined })
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orpc.property.delete.call({ input: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", "list"] });
    },
  });

  function formatPrice(price: number | null) {
    if (price === null) return "-";
    return `$${price.toLocaleString()}`;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Status</TableHead>
          <TableHead>Address</TableHead>
          <TableHead className="w-28">Price</TableHead>
          <TableHead className="w-24">Beds/Baths</TableHead>
          <TableHead className="w-20">sqm</TableHead>
          <TableHead className="w-28">Body Corp</TableHead>
          <TableHead className="w-28">Listed</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {properties.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              No properties yet. Add your first property to get started.
            </TableCell>
          </TableRow>
        ) : (
          properties.map((property) => (
            <TableRow
              key={property.id}
              className="cursor-pointer"
              onClick={() => router.push(`/properties/${property.id}`)}
            >
              <TableCell>
                <StatusBadge status={property.status} />
              </TableCell>
              <TableCell className="font-medium truncate max-w-xs">
                {property.address}
              </TableCell>
              <TableCell>{formatPrice(property.price)}</TableCell>
              <TableCell>
                {property.bedrooms ?? "-"}/{property.bathrooms ?? "-"}
              </TableCell>
              <TableCell>{property.squareMetres ?? "-"}</TableCell>
              <TableCell>{formatPrice(property.bodyCorpFees)}</TableCell>
              <TableCell>
                {property.dateListed
                  ? new Date(property.dateListed).toLocaleDateString()
                  : "-"}
              </TableCell>
              <TableCell>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this property?")) {
                      deleteMutation.mutate(property.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function PropertiesLoading() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Properties</h1>
        <AddPropertyDialog />
      </div>
      <ErrorBoundary>
        <Suspense fallback={<PropertiesLoading />}>
          <PropertiesTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/properties/page.tsx
git commit -m "feat: add properties list page with table view"
```

---

## Task 15: Create Property Detail Page

**Files:**
- Create: `src/app/properties/[id]/page.tsx`

**Step 1: Create property detail page**

```typescript
// src/app/properties/[id]/page.tsx
"use client";

import { Suspense, use } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ErrorBoundary } from "@/components/error-boundary";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  UpdatePropertyInput,
  PropertyStatus,
  PropertyType,
  Aspect,
  StoveType,
} from "@/definitions/property";
import { toast } from "sonner";

function PropertyForm({ id }: { id: string }) {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const { data: property } = useSuspenseQuery(
    orpc.property.getById.queryOptions({ input: { id } })
  );

  const form = useForm<UpdatePropertyInput>({
    resolver: zodResolver(UpdatePropertyInput),
    defaultValues: {
      id,
      websiteUrl: property?.websiteUrl ?? "",
      address: property?.address ?? "",
      status: property?.status ?? "saved",
      propertyType: property?.propertyType ?? null,
      price: property?.price ?? null,
      bedrooms: property?.bedrooms ?? 1,
      bathrooms: property?.bathrooms ?? 1,
      squareMetres: property?.squareMetres ?? null,
      ageYears: property?.ageYears ?? null,
      previousPrice: property?.previousPrice ?? null,
      carParkIncluded: property?.carParkIncluded ?? null,
      carParkCost: property?.carParkCost ?? null,
      bodyCorpFees: property?.bodyCorpFees ?? null,
      councilRates: property?.councilRates ?? null,
      estimatedRent: property?.estimatedRent ?? null,
      petsAllowed: property?.petsAllowed ?? null,
      storageIncluded: property?.storageIncluded ?? null,
      aspect: property?.aspect ?? null,
      agentName: property?.agentName ?? "",
      agentContact: property?.agentContact ?? "",
      dateListed: property?.dateListed ?? null,
      notes: property?.notes ?? "",
      desksFit: property?.desksFit ?? null,
      hasLaundrySpace: property?.hasLaundrySpace ?? null,
      floorLevel: property?.floorLevel ?? null,
      goodLighting: property?.goodLighting ?? null,
      hasDishwasher: property?.hasDishwasher ?? null,
      stoveType: property?.stoveType ?? null,
      isQuiet: property?.isQuiet ?? null,
      hasAircon: property?.hasAircon ?? null,
      overallImpression: property?.overallImpression ?? null,
      visibleIssues: property?.visibleIssues ?? "",
      postInspectionNotes: property?.postInspectionNotes ?? "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdatePropertyInput) =>
      orpc.property.update.call({ input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property"] });
      toast.success("Property updated");
    },
    onError: () => {
      toast.error("Failed to update property");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => orpc.property.delete.call({ input: { id } }),
    onSuccess: () => {
      router.push("/properties");
    },
  });

  if (!property) {
    return <div>Property not found</div>;
  }

  function onSubmit(data: UpdatePropertyInput) {
    updateMutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{property.address}</h1>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <select
                  {...field}
                  value={field.value ?? "saved"}
                  className="mt-2 border rounded px-2 py-1"
                >
                  {PropertyStatus.options.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
          <div className="space-x-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (confirm("Delete this property?")) {
                  deleteMutation.mutate();
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Pre-inspection fields */}
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="websiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} type="url" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="propertyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Type</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="">Select...</option>
                      {PropertyType.options.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bedrooms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bedrooms</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bathrooms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bathrooms</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="squareMetres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Square Metres</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ageYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age (years)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="previousPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previous Price ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bodyCorpFees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body Corp Fees ($/year)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="councilRates"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Council Rates ($/year)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estimatedRent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Rent ($/week)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="carParkIncluded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Car Park Included</FormLabel>
                  <FormControl>
                    <select
                      value={field.value === null ? "" : field.value ? "yes" : "no"}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : e.target.value === "yes"
                        )
                      }
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="">Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="carParkCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Car Park Cost ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="petsAllowed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pets Allowed</FormLabel>
                  <FormControl>
                    <select
                      value={field.value === null ? "" : field.value ? "yes" : "no"}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : e.target.value === "yes"
                        )
                      }
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="">Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="storageIncluded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Included</FormLabel>
                  <FormControl>
                    <select
                      value={field.value === null ? "" : field.value ? "yes" : "no"}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : e.target.value === "yes"
                        )
                      }
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="">Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="aspect"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aspect</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="">Unknown</option>
                      {Aspect.options.map((aspect) => (
                        <option key={aspect} value={aspect}>
                          {aspect.charAt(0).toUpperCase() + aspect.slice(1)}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="agentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="agentContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Contact</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateListed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Listed</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? new Date(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Post-inspection fields */}
        <Collapsible>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50">
                <CardTitle>Post-Inspection Details (click to expand)</CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="overallImpression"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overall Impression (1-5)</FormLabel>
                      <FormControl>
                        <select
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : null)
                          }
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Not rated</option>
                          <option value="1">1 - Poor</option>
                          <option value="2">2 - Below Average</option>
                          <option value="3">3 - Average</option>
                          <option value="4">4 - Good</option>
                          <option value="5">5 - Excellent</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="floorLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Floor Level</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="desksFit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desks That Fit</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hasLaundrySpace"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Has Laundry Space</FormLabel>
                      <FormControl>
                        <select
                          value={field.value === null ? "" : field.value ? "yes" : "no"}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.value === "yes"
                            )
                          }
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="goodLighting"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Good Lighting</FormLabel>
                      <FormControl>
                        <select
                          value={field.value === null ? "" : field.value ? "yes" : "no"}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.value === "yes"
                            )
                          }
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hasDishwasher"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Has Dishwasher</FormLabel>
                      <FormControl>
                        <select
                          value={field.value === null ? "" : field.value ? "yes" : "no"}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.value === "yes"
                            )
                          }
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stoveType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stove Type</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Unknown</option>
                          {StoveType.options.map((type) => (
                            <option key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isQuiet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Is Quiet</FormLabel>
                      <FormControl>
                        <select
                          value={field.value === null ? "" : field.value ? "yes" : "no"}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.value === "yes"
                            )
                          }
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hasAircon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Has Air Conditioning</FormLabel>
                      <FormControl>
                        <select
                          value={field.value === null ? "" : field.value ? "yes" : "no"}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.value === "yes"
                            )
                          }
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="visibleIssues"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Visible Issues</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postInspectionNotes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Post-Inspection Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </form>
    </Form>
  );
}

function PropertyLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="outline"
        className="mb-4"
        onClick={() => window.history.back()}
      >
        Back
      </Button>
      <ErrorBoundary>
        <Suspense fallback={<PropertyLoading />}>
          <PropertyForm id={id} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/properties/[id]/page.tsx
git commit -m "feat: add property detail page with edit form"
```

---

## Task 16: Add Inspection Times Section to Property Detail

**Files:**
- Create: `src/components/InspectionTimes.tsx`
- Modify: `src/app/properties/[id]/page.tsx`

**Step 1: Create InspectionTimes component**

```typescript
// src/components/InspectionTimes.tsx
"use client";

import { useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function InspectionTimes({ propertyId }: { propertyId: string }) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [newDateTime, setNewDateTime] = useState("");

  const { data: inspectionTimes } = useSuspenseQuery(
    orpc.inspectionTime.listByProperty.queryOptions({ input: { propertyId } })
  );

  const createMutation = useMutation({
    mutationFn: (dateTime: Date) =>
      orpc.inspectionTime.create.call({ input: { propertyId, dateTime } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspectionTime"] });
      setNewDateTime("");
      toast.success("Inspection time added");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, attended }: { id: string; attended: boolean }) =>
      orpc.inspectionTime.update.call({ input: { id, attended } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspectionTime"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      orpc.inspectionTime.delete.call({ input: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspectionTime"] });
      toast.success("Inspection time removed");
    },
  });

  function handleAddInspection(e: React.FormEvent) {
    e.preventDefault();
    if (!newDateTime) return;
    createMutation.mutate(new Date(newDateTime));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspection Times</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAddInspection} className="flex gap-2">
          <Input
            type="datetime-local"
            value={newDateTime}
            onChange={(e) => setNewDateTime(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={createMutation.isPending}>
            Add
          </Button>
        </form>

        {inspectionTimes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No inspection times scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {inspectionTimes.map((time) => (
              <li
                key={time.id}
                className="flex items-center justify-between border rounded p-2"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={time.attended}
                    onChange={(e) =>
                      updateMutation.mutate({ id: time.id, attended: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <span className={time.attended ? "line-through text-muted-foreground" : ""}>
                    {new Date(time.dateTime).toLocaleString()}
                  </span>
                  {time.attended && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                      Attended
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(time.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Add InspectionTimes to property detail page**

```typescript
// In src/app/properties/[id]/page.tsx
// Add import:
import { InspectionTimes } from "@/components/InspectionTimes";

// Add after the post-inspection Collapsible in PropertyForm, before closing </Form>:
<Suspense fallback={<Skeleton className="h-48 w-full" />}>
  <InspectionTimes propertyId={id} />
</Suspense>
```

**Step 3: Commit**

```bash
git add src/components/InspectionTimes.tsx src/app/properties/[id]/page.tsx
git commit -m "feat: add inspection times management to property detail"
```

---

## Task 17: Update Layout - Remove Old Header/Footer

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Simplify layout**

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ApiClientProvider } from "@/lib/orpc.client";
import "./globals.css";
import { env } from "@/env";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "House Hunting",
    description: "Track properties during your house hunt",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <ApiClientProvider baseUrl={env.BASE_URL}>
          <main>{children}</main>
          <Toaster />
        </ApiClientProvider>
      </body>
    </html>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: simplify layout for house hunting app"
```

---

## Task 18: Clean Up Unused Template Files

**Files:**
- Delete: `src/app/api/auth/[...all]/route.ts` (Better Auth route)
- Delete: `src/server/auth.tsx` (Better Auth config)
- Modify: `src/server/initialization.ts` (remove Better Auth)
- Modify: `src/server/endpoints/procedure.ts` (simplify auth middleware)

**Step 1: Remove Better Auth from initialization**

```typescript
// src/server/initialization.ts
// Remove the auth import and registration
// Update Cradle type to remove auth
// The file should have PropertyService and InspectionTimeService only
```

**Step 2: Simplify procedure auth middleware**

The existing middleware uses Better Auth. Since we're using simple cookie auth via Next.js middleware, we can remove the authMiddleware from procedure.ts or simplify it.

**Step 3: Delete Better Auth files**

```bash
rm src/app/api/auth/\[...all\]/route.ts
rm src/server/auth.tsx
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Better Auth, use simple password auth"
```

---

## Task 19: Test the Application

**Step 1: Start the development server**

Run: `pnpm dev`

**Step 2: Test login flow**

1. Navigate to `http://localhost:3000`
2. Enter the password from `APP_PASSWORD` env var
3. Should redirect to `/properties`

**Step 3: Test property CRUD**

1. Add a new property with address
2. Click on property to view details
3. Edit fields and save
4. Add inspection times
5. Delete property

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during testing"
```

---

## Task 20: Final Cleanup and Documentation

**Step 1: Update README**

Update the README.md to reflect the house hunting app instead of the template.

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for house hunting app"
```

---

## Summary

This plan creates a functional house hunting app with:

1. **Simple password auth** - Cookie-based, single shared password
2. **Property management** - Full CRUD with all designed fields
3. **Status tracking** - Saved → Shortlisted → Inspected → Offered → Purchased (or Rejected)
4. **Inspection times** - Multiple times per property with attendance tracking
5. **Table view** - Sortable list of all properties
6. **Detail view** - Full form for editing property details

Total tasks: 20
Estimated commits: ~18
