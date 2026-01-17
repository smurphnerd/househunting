import "server-only";

import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
} from "awilix";
import { type Logger, pino } from "pino";
import pinoPretty from "pino-pretty";

import { type Auth, getAuth } from "@/server/auth";
import { type Drizzle, getDatabase } from "@/server/database/database";
import { ExampleService } from "@/server/services/ExampleService";
import { InspectionTimeService } from "@/server/services/InspectionTimeService";
import { PropertyService } from "@/server/services/PropertyService";

/**
 * Cradle type definition
 *
 * Add all your services and dependencies here.
 * This provides type safety when accessing dependencies via context.cradle
 */
export type Cradle = {
  logger: Logger;
  database: Drizzle;
  auth: Auth;
  // Add your services here
  exampleService: ExampleService;
  inspectionTimeService: InspectionTimeService;
  propertyService: PropertyService;
  // storage?: S3StorageAdapter;
  // email?: EmailAdapter;
  // etc.
};

/**
 * Awilix dependency injection container
 *
 * Services are registered here and automatically injected into other services.
 * Use PROXY injection mode for optimal performance.
 */
export const container = createContainer<Cradle>({
  injectionMode: InjectionMode.PROXY,
  strict: true,
});

/**
 * Initialize container with services
 *
 * This runs at application startup (except in tests).
 * Register all your services in the container.register() call below.
 */
if (process.env.NODE_ENV !== "test") {
  const env = await import("@/env").then((mod) => mod.env);

  // Create logger
  const logger = pino(
    {
      level: env.LOG_LEVEL ?? "info",
    },
    env.NODE_ENV === "development" ? pinoPretty() : undefined,
  ).child({
    GIT_SHA: env.GIT_SHA,
  });

  // Register all services
  container.register({
    // Core dependencies
    logger: asValue(logger),

    // Database
    database: asFunction((deps: Cradle) =>
      getDatabase(deps.logger, env.DATABASE_URL),
    ).singleton(),

    // Authentication
    auth: asFunction((deps: Cradle) =>
      getAuth(deps, {
        authSecret: env.AUTH_SECRET,
        baseUrl: env.BASE_URL,
        systemEmailFrom: env.SYSTEM_EMAIL_FROM,
      }),
    ),

    // Example service
    exampleService: asClass(ExampleService).singleton(),

    // Inspection time service
    inspectionTimeService: asClass(InspectionTimeService).singleton(),

    // Property service
    propertyService: asClass(PropertyService).singleton(),

    // Add your services here:
    // postsService: asClass(PostsService).singleton(),
    // usersService: asClass(UsersService).singleton(),

    // External adapters (if needed):
    // storage: asFunction(
    //   () => new S3StorageAdapter(env.S3_OPTIONS),
    // ).singleton(),
    // email: env.EMAIL_CONNECTION_URL === "ses"
    //   ? asClass(SESEmailAdapter).singleton()
    //   : asFunction(
    //       (deps: Cradle) =>
    //         new SmtpEmailAdapter(deps, {
    //           smtpConnectionUrl: env.EMAIL_CONNECTION_URL,
    //         }),
    //     ).singleton(),
  });
}

/**
 * Service Lifetimes:
 *
 * - .singleton() - Created once, shared across all requests (recommended for stateless services)
 * - .scoped() - Created once per request (use for request-specific state)
 * - .transient() - Created every time it's needed (rarely used)
 *
 * Most services should use .singleton() for optimal performance.
 */
