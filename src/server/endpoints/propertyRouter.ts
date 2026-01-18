// src/server/endpoints/propertyRouter.ts
import { z } from "zod";
import { commonProcedure } from "@/server/endpoints/procedure";
import {
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyDto,
  NearbyPlace,
} from "@/definitions/property";

export const propertyRouter = {
  list: commonProcedure
    .output(z.array(PropertyDto))
    .handler(async ({ context }) => {
      const properties = await context.cradle.propertyService.list();
      return properties;
    }),

  getById: commonProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(PropertyDto.nullable())
    .handler(async ({ input, context }) => {
      const property = await context.cradle.propertyService.getById(input.id);
      return property ?? null;
    }),

  create: commonProcedure
    .input(CreatePropertyInput)
    .output(PropertyDto)
    .handler(async ({ input, context }) => {
      return context.cradle.propertyService.create(input);
    }),

  update: commonProcedure
    .input(UpdatePropertyInput)
    .output(PropertyDto.nullable())
    .handler(async ({ input, context }) => {
      const property = await context.cradle.propertyService.update(input);
      return property ?? null;
    }),

  delete: commonProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      await context.cradle.propertyService.delete(input.id);
      return { success: true };
    }),

  calculateDistances: commonProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({
      distanceToWork: z.number().nullable(),
      nearestStation: NearbyPlace.nullable(),
      nearestSupermarket: NearbyPlace.nullable(),
      nearestGym: NearbyPlace.nullable(),
    }))
    .handler(async ({ input, context }) => {
      const property = await context.cradle.propertyService.getById(input.id);
      if (!property) {
        throw new Error("Property not found");
      }

      const distances = await context.cradle.googleMapsService.calculateDistances(
        property.address
      );

      // Update property with calculated distances
      // Parse through UpdatePropertyInput to ensure proper types
      const updateData = UpdatePropertyInput.parse({
        id: input.id,
        ...distances,
      });
      await context.cradle.propertyService.update(updateData);

      return distances;
    }),

  autoFill: commonProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({
      price: z.number().optional(),
      bedrooms: z.number().optional(),
      bathrooms: z.number().optional(),
      squareMetres: z.number().optional(),
      propertyType: z.string().optional(),
      carParkIncluded: z.boolean().optional(),
      bodyCorpFees: z.number().optional(),
      agentName: z.string().optional(),
      agentContact: z.string().optional(),
    }))
    .handler(async ({ input, context }) => {
      const property = await context.cradle.propertyService.getById(input.id);
      if (!property) {
        throw new Error("Property not found");
      }

      if (!property.websiteUrl) {
        throw new Error("Property has no website URL");
      }

      const extractedData = await context.cradle.openRouterService.extractPropertyData(
        property.websiteUrl
      );

      return extractedData;
    }),
};
