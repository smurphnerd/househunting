import { describe, it, expect } from "vitest";
import { envSchema, stringToJSONSchema } from "./env-utils";

describe("stringToJSONSchema", () => {
  it("parses valid JSON", () => {
    const result = stringToJSONSchema.safeParse('{"key": "value"}');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ key: "value" });
    }
  });

  it("parses JSON arrays", () => {
    const result = stringToJSONSchema.safeParse("[1, 2, 3]");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([1, 2, 3]);
    }
  });

  it("rejects invalid JSON", () => {
    const result = stringToJSONSchema.safeParse("not json");
    expect(result.success).toBe(false);
  });

  it("rejects non-string input", () => {
    const result = stringToJSONSchema.safeParse(123);
    expect(result.success).toBe(false);
  });
});

describe("envSchema", () => {
  const validEnv = {
    NODE_ENV: "development",
    GIT_SHA: "abc123",
    BASE_URL: "http://localhost:3000",
    DATABASE_URL: "postgres://localhost:5432/db",
    APP_PASSWORD: "password123",
  };

  it("accepts valid environment variables", () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  it("accepts all valid NODE_ENV values", () => {
    for (const env of ["development", "production", "test"]) {
      const result = envSchema.safeParse({
        ...validEnv,
        NODE_ENV: env,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid NODE_ENV", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NODE_ENV: "staging",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional LOG_LEVEL", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      LOG_LEVEL: "debug",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid LOG_LEVEL values", () => {
    for (const level of ["trace", "debug", "info", "warn", "error", "fatal"]) {
      const result = envSchema.safeParse({
        ...validEnv,
        LOG_LEVEL: level,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid LOG_LEVEL", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      LOG_LEVEL: "verbose",
    });
    expect(result.success).toBe(false);
  });

  it("requires APP_PASSWORD to be non-empty", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      APP_PASSWORD: "",
    });
    expect(result.success).toBe(false);
  });


  it("requires all mandatory fields", () => {
    const mandatoryFields = [
      "NODE_ENV",
      "GIT_SHA",
      "BASE_URL",
      "DATABASE_URL",
      "APP_PASSWORD",
    ];

    for (const field of mandatoryFields) {
      const envWithout = { ...validEnv };
      delete envWithout[field as keyof typeof envWithout];

      const result = envSchema.safeParse(envWithout);
      expect(result.success).toBe(false);
    }
  });
});
