import { commonProcedure } from "@/server/endpoints/procedure";
import { propertyRouter } from "@/server/endpoints/propertyRouter";
import { inspectionTimeRouter } from "@/server/endpoints/inspectionTimeRouter";
import { filterRuleRouter } from "@/server/endpoints/filterRuleRouter";

/**
 * Main application router
 *
 * Combine all your sub-routers here.
 * The router is automatically typed and available on the client via useORPC()
 */
export const appRouter = {
  // Health check endpoint
  ping: commonProcedure.handler(() => "pong"),

  // Property management router
  property: propertyRouter,

  // Inspection time management router
  inspectionTime: inspectionTimeRouter,

  // Filter rule management router
  filterRule: filterRuleRouter,

  // Add your routers here:
  // posts: postsRouter,
  // users: usersRouter,
  // etc.
};
