import { describe, it, expect } from "vitest";
import {
  CreateInspectionTimeInput,
  UpdateInspectionTimeInput,
  InspectionTimeDto,
} from "./inspectionTime";

describe("CreateInspectionTimeInput", () => {
  it("accepts valid input", () => {
    const result = CreateInspectionTimeInput.safeParse({
      propertyId: "123e4567-e89b-12d3-a456-426614174000",
      dateTime: new Date("2025-01-20T10:00:00"),
    });
    expect(result.success).toBe(true);
  });

  it("coerces date string to Date object", () => {
    const result = CreateInspectionTimeInput.safeParse({
      propertyId: "123e4567-e89b-12d3-a456-426614174000",
      dateTime: "2025-01-20T10:00:00",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateTime).toBeInstanceOf(Date);
    }
  });

  it("rejects invalid propertyId (not UUID)", () => {
    const result = CreateInspectionTimeInput.safeParse({
      propertyId: "not-a-uuid",
      dateTime: new Date(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing propertyId", () => {
    const result = CreateInspectionTimeInput.safeParse({
      dateTime: new Date(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing dateTime", () => {
    const result = CreateInspectionTimeInput.safeParse({
      propertyId: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date string", () => {
    const result = CreateInspectionTimeInput.safeParse({
      propertyId: "123e4567-e89b-12d3-a456-426614174000",
      dateTime: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateInspectionTimeInput", () => {
  it("requires valid UUID for id", () => {
    const result = UpdateInspectionTimeInput.safeParse({
      id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts only id (other fields optional)", () => {
    const result = UpdateInspectionTimeInput.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts id with attended flag", () => {
    const result = UpdateInspectionTimeInput.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      attended: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attended).toBe(true);
    }
  });

  it("accepts id with new dateTime", () => {
    const newDate = new Date("2025-01-25T14:00:00");
    const result = UpdateInspectionTimeInput.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      dateTime: newDate,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateTime).toEqual(newDate);
    }
  });

  it("coerces date string for optional dateTime", () => {
    const result = UpdateInspectionTimeInput.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      dateTime: "2025-01-25T14:00:00",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateTime).toBeInstanceOf(Date);
    }
  });

  it("accepts both dateTime and attended updates", () => {
    const result = UpdateInspectionTimeInput.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      dateTime: "2025-01-25T14:00:00",
      attended: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attended).toBe(true);
      expect(result.data.dateTime).toBeInstanceOf(Date);
    }
  });
});

describe("InspectionTimeDto", () => {
  it("validates complete inspection time DTO", () => {
    const now = new Date();
    const result = InspectionTimeDto.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      propertyId: "987fcdeb-51a2-12d3-b456-426614174000",
      dateTime: now,
      attended: false,
      createdAt: now,
      updatedAt: now,
    });
    expect(result.success).toBe(true);
  });

  it("requires all fields", () => {
    const now = new Date();

    // Missing id
    let result = InspectionTimeDto.safeParse({
      propertyId: "987fcdeb-51a2-12d3-b456-426614174000",
      dateTime: now,
      attended: false,
      createdAt: now,
      updatedAt: now,
    });
    expect(result.success).toBe(false);

    // Missing propertyId
    result = InspectionTimeDto.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      dateTime: now,
      attended: false,
      createdAt: now,
      updatedAt: now,
    });
    expect(result.success).toBe(false);

    // Missing attended
    result = InspectionTimeDto.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      propertyId: "987fcdeb-51a2-12d3-b456-426614174000",
      dateTime: now,
      createdAt: now,
      updatedAt: now,
    });
    expect(result.success).toBe(false);
  });

  it("requires valid UUIDs", () => {
    const now = new Date();
    const result = InspectionTimeDto.safeParse({
      id: "not-uuid",
      propertyId: "also-not-uuid",
      dateTime: now,
      attended: false,
      createdAt: now,
      updatedAt: now,
    });
    expect(result.success).toBe(false);
  });

  it("requires Date objects (not strings)", () => {
    const result = InspectionTimeDto.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      propertyId: "987fcdeb-51a2-12d3-b456-426614174000",
      dateTime: "2025-01-20T10:00:00",
      attended: false,
      createdAt: "2025-01-15T10:00:00",
      updatedAt: "2025-01-15T10:00:00",
    });
    // Zod date() doesn't coerce strings - it only accepts Date objects
    expect(result.success).toBe(false);
  });
});
