import { z } from "zod";

export const CreateFilterRuleInput = z.object({
  name: z.string().min(1, "Name is required").max(100),
  expression: z.string().min(1, "Expression is required"),
});
export type CreateFilterRuleInput = z.infer<typeof CreateFilterRuleInput>;

export const UpdateFilterRuleInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  expression: z.string().min(1).optional(),
});
export type UpdateFilterRuleInput = z.infer<typeof UpdateFilterRuleInput>;

export const FilterRuleDto = z.object({
  id: z.string().uuid(),
  name: z.string(),
  expression: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type FilterRuleDto = z.infer<typeof FilterRuleDto>;
