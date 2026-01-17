import { z } from "zod";

export const CreateInspectionTimeInput = z.object({
  propertyId: z.string().uuid(),
  dateTime: z.coerce.date(),
});
export type CreateInspectionTimeInput = z.infer<typeof CreateInspectionTimeInput>;

export const UpdateInspectionTimeInput = z.object({
  id: z.string().uuid(),
  dateTime: z.coerce.date().optional(),
  attended: z.boolean().optional(),
});
export type UpdateInspectionTimeInput = z.infer<typeof UpdateInspectionTimeInput>;

export const InspectionTimeDto = z.object({
  id: z.string().uuid(),
  propertyId: z.string().uuid(),
  dateTime: z.date(),
  attended: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type InspectionTimeDto = z.infer<typeof InspectionTimeDto>;
