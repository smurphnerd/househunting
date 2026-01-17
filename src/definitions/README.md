# Definitions

Shared type definitions and Zod schemas.

## Overview

This directory contains **all shared types and validation schemas** used across both client and server code.

**Important:** ALL DTOs and Zod schemas should be defined here to ensure consistency.

## Structure

```typescript
// definitions.ts
import { z } from "zod";

// Example DTO with Zod schema
export const UserDto = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  image: z.string().nullable(),
  createdAt: z.date(),
});

// Infer TypeScript type from Zod schema
export type UserDto = z.infer<typeof UserDto>;
```

## Creating DTOs

### 1. Define Zod Schema

```typescript
export const PostDto = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  content: z.string(),
  authorId: z.string(),
  published: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

### 2. Infer Type

```typescript
export type PostDto = z.infer<typeof PostDto>;
```

### 3. Use in Routers

```typescript
// server/endpoints/postsRouter.ts
import { PostDto } from "@/definitions/definitions";

export const postsRouter = {
  list: authProcedure
    .output(z.array(PostDto))
    .handler(async ({ context }) => {
      // Return type is validated against PostDto
      return await context.cradle.postsService.list();
    }),

  create: authProcedure
    .input(PostDto.pick({ title: true, content: true }))
    .output(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      // Input is validated against partial PostDto
      return await context.cradle.postsService.create(input);
    }),
};
```

### 4. Use on Client

```typescript
"use client";
import type { PostDto } from "@/definitions/definitions";

function PostCard({ post }: { post: PostDto }) {
  return (
    <div>
      <h2>{post.title}</h2>
      <p>{post.content}</p>
    </div>
  );
}
```

## Common Patterns

### Partial Schemas

```typescript
// For create operations (without id, timestamps)
export const CreatePostDto = PostDto.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// For update operations (partial fields)
export const UpdatePostDto = PostDto.partial().required({ id: true });
```

### Nested Objects

```typescript
export const CommentDto = z.object({
  id: z.string(),
  content: z.string(),
  authorId: z.string(),
  postId: z.string(),
  createdAt: z.date(),
});

export const PostWithCommentsDto = PostDto.extend({
  comments: z.array(CommentDto),
});
```

### Enums

```typescript
export const PostStatus = z.enum(["draft", "published", "archived"]);
export type PostStatus = z.infer<typeof PostStatus>;

export const PostDto = z.object({
  // ... other fields
  status: PostStatus,
});
```

### Refinements

```typescript
export const CreatePostDto = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(10),
  publishedAt: z.date().optional(),
}).refine(
  (data) => {
    // If publishedAt is set, content must be longer
    if (data.publishedAt) {
      return data.content.length >= 100;
    }
    return true;
  },
  { message: "Published posts must have at least 100 characters" }
);
```

## Best Practices

- **Single Source of Truth**: Define types once, use everywhere
- **Validation**: Use Zod for runtime validation
- **Type Inference**: Always use `z.infer<typeof Schema>` for types
- **Naming**: Use `Dto` suffix for Data Transfer Objects
- **Composition**: Use `.pick()`, `.omit()`, `.extend()` for variations
- **Enums**: Use Zod enums instead of TypeScript enums
- **Documentation**: Add JSDoc comments for complex schemas

## Example: Complete CRUD DTO Set

```typescript
// Base entity
export const PostDto = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  content: z.string().min(10),
  authorId: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type PostDto = z.infer<typeof PostDto>;

// Create - omit generated fields
export const CreatePostInput = PostDto.omit({
  id: true,
  authorId: true, // Set from auth context
  createdAt: true,
  updatedAt: true,
});
export type CreatePostInput = z.infer<typeof CreatePostInput>;

// Update - partial with required id
export const UpdatePostInput = PostDto
  .omit({ authorId: true, createdAt: true, updatedAt: true })
  .partial()
  .required({ id: true });
export type UpdatePostInput = z.infer<typeof UpdatePostInput>;

// List response with pagination
export const PostListDto = z.object({
  posts: z.array(PostDto),
  total: z.number(),
  page: z.number(),
  perPage: z.number(),
});
export type PostListDto = z.infer<typeof PostListDto>;
```

## Usage in Services

```typescript
// services/PostsService.ts
import type { PostDto, CreatePostInput } from "@/definitions/definitions";

export class PostsService {
  async create(authorId: string, input: CreatePostInput): Promise<PostDto> {
    // TypeScript knows the exact shape
    const post = await this.deps.database.insert(schema.posts).values({
      ...input,
      authorId,
      id: crypto.randomUUID(),
    }).returning();

    return post[0];
  }
}
```
