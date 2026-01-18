import { commonProcedure } from "@/server/endpoints/procedure";
import { propertyRouter } from "@/server/endpoints/propertyRouter";
import { inspectionTimeRouter } from "@/server/endpoints/inspectionTimeRouter";
import { filterRuleRouter } from "@/server/endpoints/filterRuleRouter";
import { inspectionPlannerRouter } from "@/server/endpoints/inspectionPlannerRouter";

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

  // Inspection day planner router
  inspectionPlanner: inspectionPlannerRouter,

  // Add your routers here:
  // posts: postsRouter,
  // users: usersRouter,
  // etc.
};
