import "server-only";
import type { Cradle } from "@/server/initialization";
import { env } from "@/env";
import { and, eq, gte, lt } from "drizzle-orm";
import { inspectionTimes, properties } from "@/server/database/schema";

export type InspectionSlot = {
  propertyId: string;
  address: string;
  // Inspection window from listing
  inspectionWindowStart: Date;
  inspectionWindowEnd: Date | null;
  // Calculated times
  arrivalTime: Date; // When we arrive at property
  inspectionStartTime: Date; // When we start inspecting
  inspectionEndTime: Date; // When we finish inspecting
  departureTime: Date; // When we're back at the car
  drivingTimeFromPrevious: number; // Minutes
};

export type RouteOption = {
  name: string;
  description: string;
  slots: InspectionSlot[];
  totalDrivingTime: number;
  totalInspections: number;
};

export interface PlannerConfig {
  preBufferMinutes: number;
  postBufferMinutes: number;
  inspectionDurationMinutes: number;
}

export class InspectionPlannerService {
  constructor(private deps: Cradle) {}

  async planInspections(
    dateString: string,
    config: PlannerConfig
  ): Promise<RouteOption[]> {
    // Parse date string "YYYY-MM-DD" as local midnight
    // This ensures we search for the correct local day regardless of timezone
    const [year, month, day] = dateString.split("-").map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    // Query inspection times for the date for shortlisted properties
    const inspections = await this.deps.database
      .select({
        inspectionId: inspectionTimes.id,
        propertyId: properties.id,
        address: properties.address,
        dateTime: inspectionTimes.dateTime,
        endDateTime: inspectionTimes.endDateTime,
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
      const inspection = inspections[0];
      const inspectionWindowStart = inspection.dateTime;
      const inspectionWindowEnd = inspection.endDateTime;

      // Calculate arrival time: window start minus pre-buffer
      const arrivalTime = new Date(inspectionWindowStart.getTime() - config.preBufferMinutes * 60000);
      const inspectionStartTime = new Date(arrivalTime.getTime() + config.preBufferMinutes * 60000);
      const inspectionEndTime = new Date(inspectionStartTime.getTime() + config.inspectionDurationMinutes * 60000);
      const departureTime = new Date(inspectionEndTime.getTime() + config.postBufferMinutes * 60000);

      return [{
        name: "Single Inspection",
        description: "Single inspection",
        slots: [{
          propertyId: inspection.propertyId,
          address: inspection.address,
          inspectionWindowStart,
          inspectionWindowEnd,
          arrivalTime,
          inspectionStartTime,
          inspectionEndTime,
          departureTime,
          drivingTimeFromPrevious: 0,
        }],
        totalDrivingTime: 0,
        totalInspections: 1,
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
      config
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
    inspections: { propertyId: string; address: string; dateTime: Date; endDateTime: Date | null }[],
    drivingTimes: number[][],
    config: PlannerConfig
  ): RouteOption[] {
    const options: RouteOption[] = [];

    // Option 1: Try to fit all inspections
    const allOption = this.buildRoute(
      inspections,
      drivingTimes,
      config,
      inspections.length
    );
    if (allOption) {
      allOption.name = "Full Route";
      allOption.description = `All ${allOption.totalInspections} inspections`;
      options.push(allOption);
    }

    // Option 2: Relaxed pace (more buffer)
    if (inspections.length > 2) {
      const relaxedConfig: PlannerConfig = {
        ...config,
        preBufferMinutes: config.preBufferMinutes + 5,
        postBufferMinutes: config.postBufferMinutes + 5,
      };
      const relaxedOption = this.buildRoute(
        inspections,
        drivingTimes,
        relaxedConfig,
        Math.ceil(inspections.length * 0.75)
      );
      if (relaxedOption && relaxedOption.totalInspections < (allOption?.totalInspections || Infinity)) {
        relaxedOption.name = "Relaxed Pace";
        relaxedOption.description = `${relaxedOption.totalInspections} inspections, relaxed pace`;
        options.push(relaxedOption);
      }
    }

    // Option 3: Minimal (morning only)
    if (inspections.length > 3) {
      const minimalOption = this.buildRoute(
        inspections.slice(0, Math.ceil(inspections.length / 2)),
        drivingTimes,
        config,
        Math.ceil(inspections.length / 2)
      );
      if (minimalOption) {
        minimalOption.name = "Morning Only";
        minimalOption.description = `${minimalOption.totalInspections} inspections, morning only`;
        options.push(minimalOption);
      }
    }

    return options;
  }

  private buildRoute(
    inspections: { propertyId: string; address: string; dateTime: Date; endDateTime: Date | null }[],
    drivingTimes: number[][],
    config: PlannerConfig,
    maxInspections: number
  ): RouteOption | null {
    const slots: InspectionSlot[] = [];
    let totalDrivingTime = 0;
    // currentDepartureTime tracks when we're back at the car (after post-buffer)
    let currentDepartureTime: Date | null = null;

    for (let i = 0; i < inspections.length && slots.length < maxInspections; i++) {
      const inspection = inspections[i];
      const inspectionWindowStart = inspection.dateTime;
      const inspectionWindowEnd = inspection.endDateTime;

      // Calculate the latest arrival time at the property
      // Latest arrival = windowEnd - preBuffer - inspectionDuration (if windowEnd exists)
      // Otherwise = windowStart - preBuffer (arrive just before window opens)
      let latestArrival: Date;
      if (inspectionWindowEnd) {
        latestArrival = new Date(
          inspectionWindowEnd.getTime() -
            config.preBufferMinutes * 60000 -
            config.inspectionDurationMinutes * 60000
        );
      } else {
        // No end time, so arrive before the window starts
        latestArrival = new Date(inspectionWindowStart.getTime() - config.preBufferMinutes * 60000);
      }

      let arrivalTime: Date;
      let drivingTime = 0;

      if (currentDepartureTime) {
        // Calculate driving time from previous property
        drivingTime = drivingTimes[slots.length - 1]?.[i] || 15;

        // Earliest possible arrival = currentDepartureTime + drivingTime
        const earliestArrival = new Date(currentDepartureTime.getTime() + drivingTime * 60000);

        // Check feasibility: can we arrive before the latest allowed arrival time?
        if (earliestArrival > latestArrival) {
          continue; // Skip this inspection - we can't make it in time
        }

        // We arrive as early as possible (or at the latest allowed time if we arrive too early)
        // Actually, we want to arrive as early as we can, not later
        arrivalTime = earliestArrival;
        totalDrivingTime += drivingTime;
      } else {
        // First inspection - arrive before the window starts
        arrivalTime = new Date(inspectionWindowStart.getTime() - config.preBufferMinutes * 60000);
        drivingTime = 0;
      }

      // Calculate all the timing for this inspection
      // inspectionStartTime = arrivalTime + preBuffer
      const inspectionStartTime = new Date(arrivalTime.getTime() + config.preBufferMinutes * 60000);
      // inspectionEndTime = inspectionStartTime + inspectionDuration
      const inspectionEndTime = new Date(inspectionStartTime.getTime() + config.inspectionDurationMinutes * 60000);
      // departureTime = inspectionEndTime + postBuffer (when we're back at the car)
      const departureTime = new Date(inspectionEndTime.getTime() + config.postBufferMinutes * 60000);

      slots.push({
        propertyId: inspection.propertyId,
        address: inspection.address,
        inspectionWindowStart,
        inspectionWindowEnd,
        arrivalTime,
        inspectionStartTime,
        inspectionEndTime,
        departureTime,
        drivingTimeFromPrevious: drivingTime,
      });

      // Update current departure time for next iteration
      currentDepartureTime = departureTime;
    }

    if (slots.length === 0) return null;

    return {
      name: "",
      description: "",
      slots,
      totalDrivingTime,
      totalInspections: slots.length,
    };
  }
}
