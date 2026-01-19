import { z } from "zod";

export const PlannerConfigInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preBufferMinutes: z.number().min(0).max(30).default(5), // Time to park and walk to property
  postBufferMinutes: z.number().min(0).max(30).default(5), // Time to walk back to car
  inspectionDurationMinutes: z.number().min(5).max(60).default(10), // Time spent inspecting
});

export type PlannerConfig = z.infer<typeof PlannerConfigInput>;

// Calculated times for a single inspection slot
export const InspectionSlotTimesSchema = z.object({
  // The official inspection window from the listing
  inspectionWindowStart: z.date(),
  inspectionWindowEnd: z.date().nullable(),

  // When we need to arrive at the property (accounting for pre-buffer and inspection duration)
  arrivalTime: z.date(),

  // When we start our inspection
  inspectionStartTime: z.date(),

  // When we finish our inspection
  inspectionEndTime: z.date(),

  // When we're back at the car (after post-buffer)
  departureTime: z.date(),
});

export type InspectionSlotTimes = z.infer<typeof InspectionSlotTimesSchema>;
