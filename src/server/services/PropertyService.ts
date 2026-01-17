import "server-only";
import { eq } from "drizzle-orm";
import type { Cradle } from "@/server/initialization";
import { properties } from "@/server/database/schema";
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
} from "@/definitions/property";

/**
 * Service for managing property CRUD operations
 *
 * Handles all database interactions for the properties table.
 */
export class PropertyService {
  constructor(private deps: Cradle) {}

  /**
   * List all properties ordered by creation date (newest first)
   */
  async list() {
    return this.deps.database.query.properties.findMany({
      orderBy: (properties, { desc }) => [desc(properties.createdAt)],
    });
  }

  /**
   * Get a single property by ID
   */
  async getById(id: string) {
    return this.deps.database.query.properties.findFirst({
      where: eq(properties.id, id),
    });
  }

  /**
   * Create a new property
   */
  async create(input: CreatePropertyInput) {
    const [property] = await this.deps.database
      .insert(properties)
      .values({
        address: input.address,
        websiteUrl: input.websiteUrl,
      })
      .returning();
    return property;
  }

  /**
   * Update an existing property
   */
  async update(input: UpdatePropertyInput) {
    const { id, ...data } = input;
    const [property] = await this.deps.database
      .update(properties)
      .set(data)
      .where(eq(properties.id, id))
      .returning();
    return property;
  }

  /**
   * Delete a property by ID
   */
  async delete(id: string) {
    await this.deps.database.delete(properties).where(eq(properties.id, id));
  }
}
