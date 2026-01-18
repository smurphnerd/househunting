import "server-only";
import { eq } from "drizzle-orm";
import type { Cradle } from "@/server/initialization";
import { filterRules } from "@/server/database/schema";
import type {
  CreateFilterRuleInput,
  UpdateFilterRuleInput,
} from "@/definitions/filterRule";

/**
 * Service for managing filter rule CRUD operations
 *
 * Handles all database interactions for the filter_rules table.
 */
export class FilterRuleService {
  constructor(private deps: Cradle) {}

  /**
   * List all filter rules ordered by name (alphabetically)
   */
  async list() {
    return this.deps.database.query.filterRules.findMany({
      orderBy: (filterRules, { asc }) => [asc(filterRules.name)],
    });
  }

  /**
   * Get a single filter rule by ID
   */
  async getById(id: string) {
    return this.deps.database.query.filterRules.findFirst({
      where: eq(filterRules.id, id),
    });
  }

  /**
   * Create a new filter rule
   */
  async create(input: CreateFilterRuleInput) {
    const [rule] = await this.deps.database
      .insert(filterRules)
      .values({
        name: input.name,
        expression: input.expression,
      })
      .returning();
    return rule;
  }

  /**
   * Update an existing filter rule
   */
  async update(input: UpdateFilterRuleInput) {
    const { id, ...data } = input;
    const [rule] = await this.deps.database
      .update(filterRules)
      .set(data)
      .where(eq(filterRules.id, id))
      .returning();
    return rule;
  }

  /**
   * Delete a filter rule by ID
   */
  async delete(id: string) {
    await this.deps.database.delete(filterRules).where(eq(filterRules.id, id));
  }
}
