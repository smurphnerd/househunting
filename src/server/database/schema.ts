import {
  integer,
  pgTable,
  text,
  boolean,
  timestamp,
  bigint,
  date,
} from "drizzle-orm/pg-core";
import { timestampFields } from "./databaseUtils";

// Users table for Better Auth
export const users = pgTable("users", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  ...timestampFields,
});

// Verifications table for Better Auth
export const verifications = pgTable("verifications", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp().notNull(),
  ...timestampFields,
});

// Rate limits table for Better Auth
export const rateLimits = pgTable("rateLimits", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "bigint" }).notNull(),
});

// Session table for Better Auth
export const sessions = pgTable("sessions", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text().notNull().unique(),
  expiresAt: timestamp().notNull(),
  ipAddress: text(),
  userAgent: text(),
  ...timestampFields,
});

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

export const schema = {
  users,
  verifications,
  rateLimits,
  sessions,
  properties,
};
