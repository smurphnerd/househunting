// src/server/endpoints/inspectionPlannerRouter.ts
import { z } from "zod";
import { commonProcedure } from "@/server/endpoints/procedure";

const InspectionSlotSchema = z.object({
  propertyId: z.string(),
  address: z.string(),
  inspectionWindowStart: z.date(),
  inspectionWindowEnd: z.date().nullable(),
  arrivalTime: z.date(),
  inspectionStartTime: z.date(),
  inspectionEndTime: z.date(),
  departureTime: z.date(),
  drivingTimeFromPrevious: z.number(),
});

const RouteOptionSchema = z.object({
  name: z.string(),
  description: z.string(),
  slots: z.array(InspectionSlotSchema),
  totalDrivingTime: z.number(),
  totalInspections: z.number(),
});

export const inspectionPlannerRouter = {
  planDay: commonProcedure
    .input(z.object({
      // Accept date as string "YYYY-MM-DD" to avoid timezone confusion
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      preBufferMinutes: z.number().min(0).max(30).default(5),
      postBufferMinutes: z.number().min(0).max(30).default(5),
      inspectionDurationMinutes: z.number().min(5).max(60).default(10),
    }))
    .output(z.array(RouteOptionSchema))
    .handler(async ({ input, context }) => {
      return context.cradle.inspectionPlannerService.planInspections(
        input.date,
        {
          preBufferMinutes: input.preBufferMinutes,
          postBufferMinutes: input.postBufferMinutes,
          inspectionDurationMinutes: input.inspectionDurationMinutes,
        }
      );
    }),
};
