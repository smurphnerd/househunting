import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the env module before importing the service
vi.mock("@/env", () => ({
  env: {
    GOOGLE_MAPS_API_KEY: undefined, // No API key, will use default driving times
  },
}));

import {
  InspectionPlannerService,
  PlannerConfig,
  InspectionSlot,
} from "./InspectionPlannerService";
import type { Cradle } from "@/server/initialization";

// Helper to create a mock Cradle with minimal dependencies
function createMockCradle(overrides: Partial<Cradle> = {}): Cradle {
  return {
    database: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    },
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
    ...overrides,
  } as unknown as Cradle;
}

// Helper to create a date at a specific time on 2026-01-18
function createTime(hours: number, minutes: number): Date {
  return new Date(2026, 0, 18, hours, minutes, 0, 0);
}

describe("InspectionPlannerService", () => {
  describe("timing calculations", () => {
    describe("single inspection timing", () => {
      it("calculates timing correctly for single inspection with window end time", async () => {
        // Inspection window: 1:00pm - 1:30pm
        // Pre-buffer: 5 min, Post-buffer: 5 min, Inspection duration: 10 min
        const mockInspection = {
          inspectionId: "insp-1",
          propertyId: "prop-1",
          address: "123 Test St",
          dateTime: createTime(13, 0), // 1:00pm
          endDateTime: createTime(13, 30), // 1:30pm
        };

        const mockCradle = createMockCradle();
        (mockCradle.database.orderBy as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockInspection,
        ]);

        const service = new InspectionPlannerService(mockCradle);
        const config: PlannerConfig = {
          preBufferMinutes: 5,
          postBufferMinutes: 5,
          inspectionDurationMinutes: 10,
        };

        const routes = await service.planInspections("2026-01-18", config);

        expect(routes).toHaveLength(1);
        expect(routes[0].slots).toHaveLength(1);

        const slot = routes[0].slots[0];

        // For single inspection: arrivalTime = windowStart - preBuffer
        // arrivalTime = 1:00pm - 5min = 12:55pm
        expect(slot.arrivalTime).toEqual(createTime(12, 55));

        // inspectionStartTime = arrivalTime + preBuffer = 12:55 + 5 = 1:00pm
        expect(slot.inspectionStartTime).toEqual(createTime(13, 0));

        // inspectionEndTime = inspectionStartTime + inspectionDuration = 1:00 + 10 = 1:10pm
        expect(slot.inspectionEndTime).toEqual(createTime(13, 10));

        // departureTime = inspectionEndTime + postBuffer = 1:10 + 5 = 1:15pm
        expect(slot.departureTime).toEqual(createTime(13, 15));
      });

      it("calculates timing correctly for single inspection without window end time", async () => {
        // Inspection window: 2:00pm (no end time)
        const mockInspection = {
          inspectionId: "insp-1",
          propertyId: "prop-1",
          address: "123 Test St",
          dateTime: createTime(14, 0), // 2:00pm
          endDateTime: null,
        };

        const mockCradle = createMockCradle();
        (mockCradle.database.orderBy as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockInspection,
        ]);

        const service = new InspectionPlannerService(mockCradle);
        const config: PlannerConfig = {
          preBufferMinutes: 10,
          postBufferMinutes: 5,
          inspectionDurationMinutes: 15,
        };

        const routes = await service.planInspections("2026-01-18", config);

        expect(routes).toHaveLength(1);
        const slot = routes[0].slots[0];

        // arrivalTime = windowStart - preBuffer = 2:00pm - 10min = 1:50pm
        expect(slot.arrivalTime).toEqual(createTime(13, 50));

        // inspectionStartTime = arrivalTime + preBuffer = 1:50 + 10 = 2:00pm
        expect(slot.inspectionStartTime).toEqual(createTime(14, 0));

        // inspectionEndTime = 2:00 + 15 = 2:15pm
        expect(slot.inspectionEndTime).toEqual(createTime(14, 15));

        // departureTime = 2:15 + 5 = 2:20pm
        expect(slot.departureTime).toEqual(createTime(14, 20));
      });
    });

    describe("latest arrival calculation with window end time", () => {
      it("calculates latest arrival as windowEnd - preBuffer - inspectionDuration", async () => {
        // When there are multiple inspections, the buildRoute method is used
        // For testing the latest arrival calculation, we need 2+ inspections
        // where the first is feasible but we're testing the timing constraints

        // Inspection 1: 10:00am - 10:30am
        // Inspection 2: 11:00am - 11:30am
        const mockInspections = [
          {
            inspectionId: "insp-1",
            propertyId: "prop-1",
            address: "123 Test St",
            dateTime: createTime(10, 0),
            endDateTime: createTime(10, 30),
          },
          {
            inspectionId: "insp-2",
            propertyId: "prop-2",
            address: "456 Test Ave",
            dateTime: createTime(11, 0),
            endDateTime: createTime(11, 30),
          },
        ];

        const mockCradle = createMockCradle();
        (mockCradle.database.orderBy as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockInspections
        );

        const service = new InspectionPlannerService(mockCradle);
        const config: PlannerConfig = {
          preBufferMinutes: 5,
          postBufferMinutes: 5,
          inspectionDurationMinutes: 10,
        };

        const routes = await service.planInspections("2026-01-18", config);

        // Should have routes with both inspections
        expect(routes.length).toBeGreaterThan(0);
        const fullRoute = routes.find((r) => r.name === "Full Route");
        expect(fullRoute).toBeDefined();
        expect(fullRoute!.slots).toHaveLength(2);

        // Check second inspection timing
        // For inspection 2 with window 11:00-11:30:
        // latestArrival = 11:30 - 5 - 10 = 11:15am
        const slot2 = fullRoute!.slots[1];
        expect(slot2.inspectionWindowEnd).toEqual(createTime(11, 30));

        // The arrival should be feasible (before or at latestArrival)
        const latestArrival = createTime(11, 15);
        expect(slot2.arrivalTime.getTime()).toBeLessThanOrEqual(
          latestArrival.getTime()
        );
      });
    });

    describe("departure time includes post-buffer", () => {
      it("departure = inspectionEnd + postBuffer", async () => {
        const mockInspection = {
          inspectionId: "insp-1",
          propertyId: "prop-1",
          address: "123 Test St",
          dateTime: createTime(14, 0),
          endDateTime: createTime(14, 30),
        };

        const mockCradle = createMockCradle();
        (mockCradle.database.orderBy as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockInspection,
        ]);

        const service = new InspectionPlannerService(mockCradle);

        // Test with different post-buffer values
        const config: PlannerConfig = {
          preBufferMinutes: 5,
          postBufferMinutes: 10, // 10 minute post-buffer
          inspectionDurationMinutes: 15,
        };

        const routes = await service.planInspections("2026-01-18", config);

        const slot = routes[0].slots[0];

        // Verify the chain: inspectionEnd + postBuffer = departure
        const expectedDeparture = new Date(
          slot.inspectionEndTime.getTime() + config.postBufferMinutes * 60000
        );
        expect(slot.departureTime).toEqual(expectedDeparture);
      });
    });

    describe("inspection timing chain", () => {
      it("follows correct sequence: arrival -> preBuffer -> inspectionStart -> inspectionDuration -> inspectionEnd -> postBuffer -> departure", async () => {
        const mockInspection = {
          inspectionId: "insp-1",
          propertyId: "prop-1",
          address: "123 Test St",
          dateTime: createTime(15, 0),
          endDateTime: createTime(15, 45),
        };

        const mockCradle = createMockCradle();
        (mockCradle.database.orderBy as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockInspection,
        ]);

        const service = new InspectionPlannerService(mockCradle);
        const config: PlannerConfig = {
          preBufferMinutes: 7,
          postBufferMinutes: 8,
          inspectionDurationMinutes: 12,
        };

        const routes = await service.planInspections("2026-01-18", config);
        const slot = routes[0].slots[0];

        // Verify the timing chain
        // inspectionStart = arrival + preBuffer
        expect(slot.inspectionStartTime.getTime()).toBe(
          slot.arrivalTime.getTime() + config.preBufferMinutes * 60000
        );

        // inspectionEnd = inspectionStart + inspectionDuration
        expect(slot.inspectionEndTime.getTime()).toBe(
          slot.inspectionStartTime.getTime() + config.inspectionDurationMinutes * 60000
        );

        // departure = inspectionEnd + postBuffer
        expect(slot.departureTime.getTime()).toBe(
          slot.inspectionEndTime.getTime() + config.postBufferMinutes * 60000
        );
      });
    });

    describe("feasibility check with driving times", () => {
      it("skips inspection if earliest arrival would be after latest arrival", async () => {
        // Set up two inspections that are too close together
        // Inspection 1: 10:00am - 10:30am
        // Inspection 2: 10:20am - 10:40am (starts before we can arrive)
        const mockInspections = [
          {
            inspectionId: "insp-1",
            propertyId: "prop-1",
            address: "123 Test St",
            dateTime: createTime(10, 0),
            endDateTime: createTime(10, 30),
          },
          {
            inspectionId: "insp-2",
            propertyId: "prop-2",
            address: "456 Test Ave",
            dateTime: createTime(10, 20),
            endDateTime: createTime(10, 40),
          },
        ];

        const mockCradle = createMockCradle();
        (mockCradle.database.orderBy as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockInspections
        );

        const service = new InspectionPlannerService(mockCradle);
        const config: PlannerConfig = {
          preBufferMinutes: 5,
          postBufferMinutes: 5,
          inspectionDurationMinutes: 15,
        };

        // With 15 min inspection + 5 min post-buffer, we leave at 10:20am
        // With 15 min default driving time, we arrive at 10:35am
        // Latest arrival for inspection 2 = 10:40 - 5 - 15 = 10:20am
        // Since 10:35 > 10:20, inspection 2 should be skipped

        const routes = await service.planInspections("2026-01-18", config);

        const fullRoute = routes.find((r) => r.name === "Full Route");
        // Full route should only have 1 inspection since 2nd is infeasible
        if (fullRoute) {
          expect(fullRoute.slots).toHaveLength(1);
          expect(fullRoute.slots[0].propertyId).toBe("prop-1");
        }
      });

      it("includes inspection if arrival is feasible within window", async () => {
        // Set up two inspections with enough time between them
        // Inspection 1: 10:00am - 10:30am
        // Inspection 2: 11:30am - 12:00pm (plenty of time to drive)
        const mockInspections = [
          {
            inspectionId: "insp-1",
            propertyId: "prop-1",
            address: "123 Test St",
            dateTime: createTime(10, 0),
            endDateTime: createTime(10, 30),
          },
          {
            inspectionId: "insp-2",
            propertyId: "prop-2",
            address: "456 Test Ave",
            dateTime: createTime(11, 30),
            endDateTime: createTime(12, 0),
          },
        ];

        const mockCradle = createMockCradle();
        (mockCradle.database.orderBy as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockInspections
        );

        const service = new InspectionPlannerService(mockCradle);
        const config: PlannerConfig = {
          preBufferMinutes: 5,
          postBufferMinutes: 5,
          inspectionDurationMinutes: 10,
        };

        const routes = await service.planInspections("2026-01-18", config);

        const fullRoute = routes.find((r) => r.name === "Full Route");
        expect(fullRoute).toBeDefined();
        expect(fullRoute!.slots).toHaveLength(2);
        expect(fullRoute!.slots[1].propertyId).toBe("prop-2");
      });
    });

    describe("inspection without end time", () => {
      it("uses windowStart - preBuffer for arrival when no endDateTime", async () => {
        // When there's no end time, we should arrive before the window starts
        const mockInspections = [
          {
            inspectionId: "insp-1",
            propertyId: "prop-1",
            address: "123 Test St",
            dateTime: createTime(10, 0),
            endDateTime: createTime(10, 30),
          },
          {
            inspectionId: "insp-2",
            propertyId: "prop-2",
            address: "456 Test Ave",
            dateTime: createTime(14, 0), // 2:00pm, no end time
            endDateTime: null,
          },
        ];

        const mockCradle = createMockCradle();
        (mockCradle.database.orderBy as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockInspections
        );

        const service = new InspectionPlannerService(mockCradle);
        const config: PlannerConfig = {
          preBufferMinutes: 5,
          postBufferMinutes: 5,
          inspectionDurationMinutes: 10,
        };

        const routes = await service.planInspections("2026-01-18", config);

        const fullRoute = routes.find((r) => r.name === "Full Route");
        expect(fullRoute).toBeDefined();

        // For inspection without end time:
        // latestArrival = windowStart - preBuffer = 2:00pm - 5min = 1:55pm
        // Since we have plenty of time to drive, arrival should be before/at 1:55pm
        const slot2 = fullRoute!.slots[1];
        expect(slot2.inspectionWindowEnd).toBeNull();

        const latestArrivalForNoEndTime = createTime(13, 55);
        expect(slot2.arrivalTime.getTime()).toBeLessThanOrEqual(
          latestArrivalForNoEndTime.getTime()
        );
      });
    });

    describe("edge cases", () => {
      it("returns empty array when no inspections found", async () => {
        const mockCradle = createMockCradle();
        (mockCradle.database.orderBy as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const service = new InspectionPlannerService(mockCradle);
        const config: PlannerConfig = {
          preBufferMinutes: 5,
          postBufferMinutes: 5,
          inspectionDurationMinutes: 10,
        };

        const routes = await service.planInspections("2026-01-18", config);

        expect(routes).toEqual([]);
      });

      it("handles zero buffer times", async () => {
        const mockInspection = {
          inspectionId: "insp-1",
          propertyId: "prop-1",
          address: "123 Test St",
          dateTime: createTime(14, 0),
          endDateTime: createTime(14, 30),
        };

        const mockCradle = createMockCradle();
        (mockCradle.database.orderBy as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockInspection,
        ]);

        const service = new InspectionPlannerService(mockCradle);
        const config: PlannerConfig = {
          preBufferMinutes: 0,
          postBufferMinutes: 0,
          inspectionDurationMinutes: 15,
        };

        const routes = await service.planInspections("2026-01-18", config);
        const slot = routes[0].slots[0];

        // With zero buffers:
        // arrival = windowStart - 0 = 2:00pm
        expect(slot.arrivalTime).toEqual(createTime(14, 0));
        // inspectionStart = arrival + 0 = 2:00pm
        expect(slot.inspectionStartTime).toEqual(createTime(14, 0));
        // inspectionEnd = 2:00 + 15 = 2:15pm
        expect(slot.inspectionEndTime).toEqual(createTime(14, 15));
        // departure = 2:15 + 0 = 2:15pm
        expect(slot.departureTime).toEqual(createTime(14, 15));
      });
    });
  });
});
