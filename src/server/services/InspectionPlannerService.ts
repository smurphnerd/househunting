import "server-only";
import type { Cradle } from "@/server/initialization";
import { env } from "@/env";
import { and, eq, gte, lt } from "drizzle-orm";
import { inspectionTimes, properties } from "@/server/database/schema";

export type InspectionSlot = {
  propertyId: string;
  address: string;
  inspectionTime: Date;
  arrivalTime: Date;
  departureTime: Date;
  drivingTimeFromPrevious: number;
};

export type RouteOption = {
  inspections: InspectionSlot[];
  totalDrivingTime: number;
  totalInspections: number;
  description: string;
};

export class InspectionPlannerService {
  constructor(private deps: Cradle) {}

  async planInspections(
    date: Date,
    bufferMinutes: number = 15
  ): Promise<RouteOption[]> {
    // Get start and end of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Query inspection times for the date for shortlisted properties
    const inspections = await this.deps.database
      .select({
        inspectionId: inspectionTimes.id,
        propertyId: properties.id,
        address: properties.address,
        dateTime: inspectionTimes.dateTime,
      })
      .from(inspectionTimes)
      .innerJoin(properties, eq(inspectionTimes.propertyId, properties.id))
      .where(
        and(
          gte(inspectionTimes.dateTime, startOfDay),
          lt(inspectionTimes.dateTime, endOfDay),
          eq(properties.status, "shortlisted")
        )
      )
      .orderBy(inspectionTimes.dateTime);

    if (inspections.length === 0) {
      return [];
    }

    if (inspections.length === 1) {
      return [{
        inspections: [{
          propertyId: inspections[0].propertyId,
          address: inspections[0].address,
          inspectionTime: inspections[0].dateTime,
          arrivalTime: new Date(inspections[0].dateTime.getTime() - 5 * 60000),
          departureTime: new Date(inspections[0].dateTime.getTime() + 30 * 60000),
          drivingTimeFromPrevious: 0,
        }],
        totalDrivingTime: 0,
        totalInspections: 1,
        description: "Single inspection",
      }];
    }

    // Get driving times between properties
    const drivingTimes = await this.getDrivingTimeMatrix(
      inspections.map((i) => i.address)
    );

    // Generate route options
    const routes = this.generateRouteOptions(
      inspections,
      drivingTimes,
      bufferMinutes
    );

    return routes;
  }

  private async getDrivingTimeMatrix(addresses: string[]): Promise<number[][]> {
    const apiKey = env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      // Return estimated times if no API key
      const n = addresses.length;
      const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(15));
      for (let i = 0; i < n; i++) matrix[i][i] = 0;
      return matrix;
    }

    try {
      const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      url.searchParams.set("origins", addresses.join("|"));
      url.searchParams.set("destinations", addresses.join("|"));
      url.searchParams.set("mode", "driving");
      url.searchParams.set("departure_time", "now");
      url.searchParams.set("key", apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();

      const matrix: number[][] = [];
      for (const row of data.rows) {
        const times: number[] = [];
        for (const element of row.elements) {
          if (element.status === "OK") {
            times.push(Math.ceil((element.duration_in_traffic?.value || element.duration.value) / 60));
          } else {
            times.push(20);
          }
        }
        matrix.push(times);
      }

      return matrix;
    } catch (error) {
      this.deps.logger.error({ error }, "Failed to get driving time matrix");
      const n = addresses.length;
      const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(15));
      for (let i = 0; i < n; i++) matrix[i][i] = 0;
      return matrix;
    }
  }

  private generateRouteOptions(
    inspections: { propertyId: string; address: string; dateTime: Date }[],
    drivingTimes: number[][],
    bufferMinutes: number
  ): RouteOption[] {
    const options: RouteOption[] = [];
    const inspectionDuration = 20;

    // Option 1: Try to fit all inspections
    const allOption = this.buildRoute(
      inspections,
      drivingTimes,
      bufferMinutes,
      inspectionDuration,
      inspections.length
    );
    if (allOption) {
      allOption.description = `All ${allOption.totalInspections} inspections`;
      options.push(allOption);
    }

    // Option 2: Relaxed pace (more buffer)
    if (inspections.length > 2) {
      const relaxedOption = this.buildRoute(
        inspections,
        drivingTimes,
        bufferMinutes + 10,
        inspectionDuration,
        Math.ceil(inspections.length * 0.75)
      );
      if (relaxedOption && relaxedOption.totalInspections < (allOption?.totalInspections || Infinity)) {
        relaxedOption.description = `${relaxedOption.totalInspections} inspections, relaxed pace`;
        options.push(relaxedOption);
      }
    }

    // Option 3: Minimal (morning only)
    if (inspections.length > 3) {
      const minimalOption = this.buildRoute(
        inspections.slice(0, Math.ceil(inspections.length / 2)),
        drivingTimes,
        bufferMinutes,
        inspectionDuration,
        Math.ceil(inspections.length / 2)
      );
      if (minimalOption) {
        minimalOption.description = `${minimalOption.totalInspections} inspections, morning only`;
        options.push(minimalOption);
      }
    }

    return options;
  }

  private buildRoute(
    inspections: { propertyId: string; address: string; dateTime: Date }[],
    drivingTimes: number[][],
    bufferMinutes: number,
    inspectionDuration: number,
    maxInspections: number
  ): RouteOption | null {
    const slots: InspectionSlot[] = [];
    let totalDrivingTime = 0;
    let currentEndTime: Date | null = null;

    for (let i = 0; i < inspections.length && slots.length < maxInspections; i++) {
      const inspection = inspections[i];
      const inspectionTime = inspection.dateTime;
      const arrivalTime = new Date(inspectionTime.getTime() - 5 * 60000);

      if (currentEndTime) {
        const drivingTime = drivingTimes[slots.length - 1]?.[i] || 15;
        const requiredDepartureTime = new Date(arrivalTime.getTime() - (drivingTime + bufferMinutes) * 60000);

        if (requiredDepartureTime < currentEndTime) {
          continue; // Skip this inspection
        }

        totalDrivingTime += drivingTime;

        slots.push({
          propertyId: inspection.propertyId,
          address: inspection.address,
          inspectionTime,
          arrivalTime,
          departureTime: new Date(inspectionTime.getTime() + inspectionDuration * 60000),
          drivingTimeFromPrevious: drivingTime,
        });
      } else {
        slots.push({
          propertyId: inspection.propertyId,
          address: inspection.address,
          inspectionTime,
          arrivalTime,
          departureTime: new Date(inspectionTime.getTime() + inspectionDuration * 60000),
          drivingTimeFromPrevious: 0,
        });
      }

      currentEndTime = new Date(inspectionTime.getTime() + inspectionDuration * 60000);
    }

    if (slots.length === 0) return null;

    return {
      inspections: slots,
      totalDrivingTime,
      totalInspections: slots.length,
      description: "",
    };
  }
}
