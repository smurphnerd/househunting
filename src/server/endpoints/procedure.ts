import { ORPCError } from "@orpc/client";
import { os, ValidationError } from "@orpc/server";
import type { ResponseHeadersPluginContext } from "@orpc/server/plugins";

import type { Cradle } from "@/server/initialization";

const baseProcedure = os
  .errors({
    UNAUTHORIZED: {},
    FORBIDDEN: {},
  })
  .$context<
    { headers: Headers; cradle: Cradle } & ResponseHeadersPluginContext
  >();

const loggingMiddleware = baseProcedure.middleware(
  async ({ context, next }) => {
    try {
      return await next();
    } catch (error) {
      if (
        error instanceof ORPCError &&
        error.code === "INTERNAL_SERVER_ERROR" &&
        error.cause instanceof ValidationError
      ) {
        context.cradle.logger.error(error.cause);
        throw new ORPCError("OUTPUT_VALIDATION_FAILED", {
          cause: error.cause,
        });
      }
      context.cradle.logger.error(error);
      throw error;
    }
  },
);

/**
 * Auth middleware that checks for cookie-based authentication.
 * Note: Main auth is handled by Next.js middleware (src/middleware.ts).
 * This is available for additional oRPC-level auth checks if needed.
 */
export const authMiddleware = baseProcedure.middleware(
  async ({ context, next, errors }) => {
    // Cookie-based auth is handled by Next.js middleware
    // This middleware can be used for additional checks if needed
    const authCookie = context.headers.get("cookie");
    const isAuthenticated = authCookie?.includes("house-hunting-auth=authenticated");

    if (!isAuthenticated) {
      throw errors.UNAUTHORIZED();
    }

    const response = await next({ context });
    response.context.resHeaders?.set(
      "Cache-Control",
      "no-store,private,must-revalidate",
    );
    return response;
  },
);

export const commonProcedure = baseProcedure.use(loggingMiddleware);
