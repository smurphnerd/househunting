// src/server/endpoints/inspectionTimeRouter.ts
import { z } from "zod";
import { commonProcedure } from "@/server/endpoints/procedure";
import {
  CreateInspectionTimeInput,
  UpdateInspectionTimeInput,
  InspectionTimeDto,
} from "@/definitions/inspectionTime";

export const inspectionTimeRouter = {
  listByProperty: commonProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .output(z.array(InspectionTimeDto))
    .handler(async ({ input, context }) => {
      return context.cradle.inspectionTimeService.listByProperty(input.propertyId);
    }),

  create: commonProcedure
    .input(CreateInspectionTimeInput)
    .output(InspectionTimeDto)
    .handler(async ({ input, context }) => {
      return context.cradle.inspectionTimeService.create(input);
    }),

  update: commonProcedure
    .input(UpdateInspectionTimeInput)
    .output(InspectionTimeDto.nullable())
    .handler(async ({ input, context }) => {
      const inspectionTime = await context.cradle.inspectionTimeService.update(input);
      return inspectionTime ?? null;
    }),

  delete: commonProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      await context.cradle.inspectionTimeService.delete(input.id);
      return { success: true };
    }),
};
