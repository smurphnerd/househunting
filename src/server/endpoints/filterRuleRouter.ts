import { z } from "zod";
import { commonProcedure } from "@/server/endpoints/procedure";
import {
  CreateFilterRuleInput,
  UpdateFilterRuleInput,
  FilterRuleDto,
} from "@/definitions/filterRule";

export const filterRuleRouter = {
  list: commonProcedure
    .output(z.array(FilterRuleDto))
    .handler(async ({ context }) => {
      return context.cradle.filterRuleService.list();
    }),

  getById: commonProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(FilterRuleDto.nullable())
    .handler(async ({ input, context }) => {
      const rule = await context.cradle.filterRuleService.getById(input.id);
      return rule ?? null;
    }),

  create: commonProcedure
    .input(CreateFilterRuleInput)
    .output(FilterRuleDto)
    .handler(async ({ input, context }) => {
      return context.cradle.filterRuleService.create(input);
    }),

  update: commonProcedure
    .input(UpdateFilterRuleInput)
    .output(FilterRuleDto.nullable())
    .handler(async ({ input, context }) => {
      const rule = await context.cradle.filterRuleService.update(input);
      return rule ?? null;
    }),

  delete: commonProcedure
    .input(z.object({ id: z.string().uuid() }))
    .handler(async ({ input, context }) => {
      await context.cradle.filterRuleService.delete(input.id);
      return { success: true };
    }),
};
