import * as z from "zod/v4";

export const stringToJSONSchema = z.string().transform((str, ctx): unknown => {
  try {
    return JSON.parse(str);
  } catch {
    ctx.addIssue({ code: "custom", message: "Invalid JSON" });
    return z.NEVER;
  }
});

/**
 * Environment variable schema
 *
 * Add your environment variables here with appropriate validation.
 * The schema is validated when the server starts.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .optional(),
  GIT_SHA: z.string(),
  BASE_URL: z.string(),
  DATABASE_URL: z.string(),

  // Email configuration
  EMAIL_CONNECTION_URL: z.union([
    z.url({ protocol: /^smtp$/ }),
    z.literal("ses"),
  ]),
  SYSTEM_EMAIL_FROM: z.string(),

  // Authentication
  AUTH_SECRET: z.string(),
  APP_PASSWORD: z.string().min(1),

  // Google Maps configuration
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  DESTINATION_WORK: z.string().optional().default("Monash University Clayton VIC"),

  // Add your own environment variables here
  // Example S3 configuration (commented out by default):
  // S3_OPTIONS: stringToJSONSchema.pipe(
  //   z.object({
  //     credentials: z
  //       .object({
  //         accessKeyId: z.string(),
  //         secretAccessKey: z.string(),
  //       })
  //       .optional(),
  //     endpoint: z.string(),
  //     region: z.string(),
  //     bucketName: z.string(),
  //     forcePathStyle: z.boolean().optional(),
  //   }),
  // ),

  // Example API key:
  // EXTERNAL_API_KEY: z.string(),
});
