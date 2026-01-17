// src/definitions/property.ts
import { z } from "zod";

export const PropertyStatus = z.enum([
  "saved",
  "rejected",
  "shortlisted",
  "inspected",
  "offered",
  "purchased",
]);
export type PropertyStatus = z.infer<typeof PropertyStatus>;

export const PropertyType = z.enum(["apartment", "unit", "townhouse", "house"]);
export type PropertyType = z.infer<typeof PropertyType>;

export const Aspect = z.enum(["north", "south", "east", "west", "other"]);
export type Aspect = z.infer<typeof Aspect>;

export const StoveType = z.enum(["gas", "electric", "induction", "unknown"]);
export type StoveType = z.infer<typeof StoveType>;

export const CreatePropertyInput = z.object({
  websiteUrl: z.string().url().optional(),
  address: z.string().min(1, "Address is required"),
});
export type CreatePropertyInput = z.infer<typeof CreatePropertyInput>;

export const UpdatePropertyInput = z.object({
  id: z.string().uuid(),
  websiteUrl: z.union([z.string().url(), z.literal("")]).optional().nullable().transform(v => v === "" ? null : v),
  address: z.string().min(1).optional(),
  status: PropertyStatus.optional(),
  propertyType: PropertyType.optional().nullable(),
  price: z.number().int().positive().optional().nullable(),
  bedrooms: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().int().min(0).optional().nullable(),
  squareMetres: z.number().int().positive().optional().nullable(),
  ageYears: z.number().int().min(0).optional().nullable(),
  previousPrice: z.number().int().positive().optional().nullable(),
  carParkIncluded: z.boolean().optional().nullable(),
  carParkCost: z.number().int().min(0).optional().nullable(),
  bodyCorpFees: z.number().int().min(0).optional().nullable(),
  councilRates: z.number().int().min(0).optional().nullable(),
  estimatedRent: z.number().int().min(0).optional().nullable(),
  petsAllowed: z.boolean().optional().nullable(),
  storageIncluded: z.boolean().optional().nullable(),
  aspect: Aspect.optional().nullable(),
  agentName: z.string().optional().nullable(),
  agentContact: z.string().optional().nullable(),
  dateListed: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  desksFit: z.number().int().min(0).optional().nullable(),
  hasLaundrySpace: z.boolean().optional().nullable(),
  floorLevel: z.number().int().min(0).optional().nullable(),
  goodLighting: z.boolean().optional().nullable(),
  hasDishwasher: z.boolean().optional().nullable(),
  stoveType: StoveType.optional().nullable(),
  isQuiet: z.boolean().optional().nullable(),
  hasAircon: z.boolean().optional().nullable(),
  overallImpression: z.number().int().min(1).max(5).optional().nullable(),
  visibleIssues: z.string().optional().nullable(),
  postInspectionNotes: z.string().optional().nullable(),
});
export type UpdatePropertyInput = z.infer<typeof UpdatePropertyInput>;

export const PropertyDto = z.object({
  id: z.string().uuid(),
  websiteUrl: z.string().nullable(),
  address: z.string(),
  status: PropertyStatus,
  propertyType: PropertyType.nullable(),
  price: z.number().nullable(),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  squareMetres: z.number().nullable(),
  ageYears: z.number().nullable(),
  previousPrice: z.number().nullable(),
  carParkIncluded: z.boolean().nullable(),
  carParkCost: z.number().nullable(),
  bodyCorpFees: z.number().nullable(),
  councilRates: z.number().nullable(),
  estimatedRent: z.number().nullable(),
  petsAllowed: z.boolean().nullable(),
  storageIncluded: z.boolean().nullable(),
  aspect: Aspect.nullable(),
  agentName: z.string().nullable(),
  agentContact: z.string().nullable(),
  dateListed: z.date().nullable(),
  notes: z.string().nullable(),
  desksFit: z.number().nullable(),
  hasLaundrySpace: z.boolean().nullable(),
  floorLevel: z.number().nullable(),
  goodLighting: z.boolean().nullable(),
  hasDishwasher: z.boolean().nullable(),
  stoveType: StoveType.nullable(),
  isQuiet: z.boolean().nullable(),
  hasAircon: z.boolean().nullable(),
  overallImpression: z.number().nullable(),
  visibleIssues: z.string().nullable(),
  postInspectionNotes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type PropertyDto = z.infer<typeof PropertyDto>;
