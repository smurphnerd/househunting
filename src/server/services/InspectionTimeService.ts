import "server-only";
import { eq } from "drizzle-orm";
import type { Cradle } from "@/server/initialization";
import { inspectionTimes } from "@/server/database/schema";
import type {
  CreateInspectionTimeInput,
  UpdateInspectionTimeInput,
} from "@/definitions/inspectionTime";

/**
 * Service for managing inspection time CRUD operations
 *
 * Handles all database interactions for the inspection_times table.
 */
export class InspectionTimeService {
  constructor(private deps: Cradle) {}

  /**
   * List all inspection times for a property ordered by date/time (earliest first)
   */
  async listByProperty(propertyId: string) {
    return this.deps.database.query.inspectionTimes.findMany({
      where: eq(inspectionTimes.propertyId, propertyId),
      orderBy: (inspectionTimes, { asc }) => [asc(inspectionTimes.dateTime)],
    });
  }

  /**
   * Create a new inspection time
   */
  async create(input: CreateInspectionTimeInput) {
    const [inspectionTime] = await this.deps.database
      .insert(inspectionTimes)
      .values({
        propertyId: input.propertyId,
        dateTime: input.dateTime,
      })
      .returning();
    return inspectionTime;
  }

  /**
   * Update an existing inspection time
   */
  async update(input: UpdateInspectionTimeInput) {
    const { id, ...data } = input;
    const [inspectionTime] = await this.deps.database
      .update(inspectionTimes)
      .set(data)
      .where(eq(inspectionTimes.id, id))
      .returning();
    return inspectionTime;
  }

  /**
   * Delete an inspection time by ID
   */
  async delete(id: string) {
    await this.deps.database
      .delete(inspectionTimes)
      .where(eq(inspectionTimes.id, id));
  }
}
