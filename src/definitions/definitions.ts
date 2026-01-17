import { z } from "zod";

/**
 * Shared type definitions and Zod schemas
 *
 * ALL shared types, DTOs, and validation schemas should be defined here.
 * This ensures consistency between client and server code.
 */

// Example User DTO
export const UserDto = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  image: z.string().nullable(),
  createdAt: z.date(),
});

export type UserDto = z.infer<typeof UserDto>;

// Add your own DTOs and schemas here
// Example:
// export const PostDto = z.object({
//   id: z.string(),
//   title: z.string(),
//   content: z.string(),
//   userId: z.string(),
//   createdAt: z.date(),
//   updatedAt: z.date(),
// });
// export type PostDto = z.infer<typeof PostDto>;
