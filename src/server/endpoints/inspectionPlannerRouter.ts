// src/server/endpoints/inspectionPlannerRouter.ts
import { z } from "zod";
import { commonProcedure } from "@/server/endpoints/procedure";

const InspectionSlotSchema = z.object({
  propertyId: z.string(),
  address: z.string(),
  inspectionTime: z.date(),
  arrivalTime: z.date(),
  departureTime: z.date(),
  drivingTimeFromPrevious: z.number(),
});

const RouteOptionSchema = z.object({
  inspections: z.array(InspectionSlotSchema),
  totalDrivingTime: z.number(),
  totalInspections: z.number(),
  description: z.string(),
});

export const inspectionPlannerRouter = {
  planDay: commonProcedure
    .input(z.object({
      date: z.coerce.date(),
      bufferMinutes: z.number().min(0).max(60).default(15),
    }))
    .output(z.array(RouteOptionSchema))
    .handler(async ({ input, context }) => {
      return context.cradle.inspectionPlannerService.planInspections(
        input.date,
        input.bufferMinutes
      );
    }),
};
