import { authMiddleware, commonProcedure } from "@/server/endpoints/procedure";
import { exampleRouter } from "@/server/endpoints/exampleRouter";
import { propertyRouter } from "@/server/endpoints/propertyRouter";
import { inspectionTimeRouter } from "@/server/endpoints/inspectionTimeRouter";

/**
 * Main application router
 *
 * Combine all your sub-routers here.
 * The router is automatically typed and available on the client via useORPC()
 */
export const appRouter = {
  // Health check endpoint
  ping: commonProcedure.handler(() => "pong"),

  // Example protected endpoint
  getProfile: commonProcedure
    .use(authMiddleware)
    .handler(({ context }) => ({ email: context.user.email })),

  // Example sub-router
  example: exampleRouter,

  // Property management router
  property: propertyRouter,

  // Inspection time management router
  inspectionTime: inspectionTimeRouter,

  // Add your routers here:
  // posts: postsRouter,
  // users: usersRouter,
  // etc.
};
