import { describe, it, expect } from "vitest";
import {
  PropertyStatus,
  PropertyType,
  Aspect,
  StoveType,
  CreatePropertyInput,
  UpdatePropertyInput,
  UpdatePropertyFormSchema,
  PropertyDto,
} from "./property";

describe("PropertyStatus", () => {
  it("accepts valid statuses", () => {
    const validStatuses = [
      "saved",
      "rejected",
      "shortlisted",
      "inspected",
      "offered",
      "purchased",
    ];

    validStatuses.forEach((status) => {
      const result = PropertyStatus.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid status", () => {
    const result = PropertyStatus.safeParse("invalid");
    expect(result.success).toBe(false);
  });
});

describe("PropertyType", () => {
  it("accepts valid property types", () => {
    const validTypes = ["apartment", "unit", "townhouse", "house"];

    validTypes.forEach((type) => {
      const result = PropertyType.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid property type", () => {
    const result = PropertyType.safeParse("castle");
    expect(result.success).toBe(false);
  });
});

describe("Aspect", () => {
  it("accepts valid aspects", () => {
    const validAspects = ["north", "south", "east", "west", "other"];

    validAspects.forEach((aspect) => {
      const result = Aspect.safeParse(aspect);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid aspect", () => {
    const result = Aspect.safeParse("northwest");
    expect(result.success).toBe(false);
  });
});

describe("StoveType", () => {
  it("accepts valid stove types", () => {
    const validTypes = ["gas", "electric", "induction", "unknown"];

    validTypes.forEach((type) => {
      const result = StoveType.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid stove type", () => {
    const result = StoveType.safeParse("wood");
    expect(result.success).toBe(false);
  });
});

describe("CreatePropertyInput", () => {
  it("accepts valid input with address only", () => {
    const result = CreatePropertyInput.safeParse({
      address: "123 Main St",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with address and URL", () => {
    const result = CreatePropertyInput.safeParse({
      address: "123 Main St",
      websiteUrl: "https://realestate.com.au/property/123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty address", () => {
    const result = CreatePropertyInput.safeParse({
      address: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL", () => {
    const result = CreatePropertyInput.safeParse({
      address: "123 Main St",
      websiteUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts missing websiteUrl", () => {
    const result = CreatePropertyInput.safeParse({
      address: "123 Main St",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.websiteUrl).toBeUndefined();
    }
  });
});

describe("UpdatePropertyInput", () => {
  it("requires valid UUID for id", () => {
    const result = UpdatePropertyInput.safeParse({
      id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid UUID", () => {
    const result = UpdatePropertyInput.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.success).toBe(true);
  });

  it("transforms empty websiteUrl to null", () => {
    const result = UpdatePropertyInput.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      websiteUrl: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.websiteUrl).toBeNull();
    }
  });

  it("accepts all optional fields", () => {
    const result = UpdatePropertyInput.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      address: "456 Oak Ave",
      status: "shortlisted",
      propertyType: "apartment",
      price: 500000,
      bedrooms: 2,
      bathrooms: 1,
      squareMetres: 75,
      ageYears: 10,
      bodyCorpFees: 3000,
      councilRates: 1500,
      estimatedRent: 450,
      carParkIncluded: true,
      petsAllowed: false,
      storageIncluded: true,
      aspect: "north",
      agentName: "John Smith",
      agentContact: "0400 000 000",
      notes: "Nice property",
      desksFit: 2,
      hasLaundrySpace: true,
      floorLevel: 3,
      goodLighting: true,
      hasDishwasher: true,
      stoveType: "induction",
      isQuiet: true,
      hasAircon: true,
      overallImpression: 4,
      visibleIssues: "None",
      postInspectionNotes: "Great condition",
    });
    expect(result.success).toBe(true);
  });

  it("validates overallImpression range (1-5)", () => {
    // Too low
    let result = UpdatePropertyInput.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      overallImpression: 0,
    });
    expect(result.success).toBe(false);

    // Too high
    result = UpdatePropertyInput.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      overallImpression: 6,
    });
    expect(result.success).toBe(false);

    // Valid
    result = UpdatePropertyInput.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      overallImpression: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative prices", () => {
    const result = UpdatePropertyInput.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      price: -100,
    });
    expect(result.success).toBe(false);
  });

  it("coerces date strings to Date objects for dateListed", () => {
    const result = UpdatePropertyInput.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      dateListed: "2025-01-15",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateListed).toBeInstanceOf(Date);
    }
  });
});

describe("UpdatePropertyFormSchema", () => {
  it("accepts Date objects for dateListed (form schema)", () => {
    const result = UpdatePropertyFormSchema.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      dateListed: new Date("2025-01-15"),
    });
    expect(result.success).toBe(true);
  });

  it("does not transform websiteUrl (form schema has no transform)", () => {
    const result = UpdatePropertyFormSchema.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      websiteUrl: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.websiteUrl).toBe("");
    }
  });
});

describe("PropertyDto", () => {
  it("validates complete property DTO", () => {
    const now = new Date();
    const result = PropertyDto.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      websiteUrl: "https://example.com",
      address: "123 Main St",
      status: "saved",
      propertyType: "apartment",
      price: 500000,
      bedrooms: 2,
      bathrooms: 1,
      squareMetres: 75,
      ageYears: 10,
      previousPrice: 480000,
      carParkIncluded: true,
      carParkCost: 50000,
      bodyCorpFees: 3000,
      councilRates: 1500,
      estimatedRent: 450,
      petsAllowed: true,
      storageIncluded: true,
      aspect: "north",
      agentName: "John",
      agentContact: "0400 000 000",
      dateListed: now,
      notes: "Notes",
      desksFit: 2,
      hasLaundrySpace: true,
      floorLevel: 3,
      goodLighting: true,
      hasDishwasher: true,
      stoveType: "gas",
      isQuiet: true,
      hasAircon: true,
      overallImpression: 4,
      visibleIssues: "None",
      postInspectionNotes: "Good",
      distanceToWork: 15.5,
      nearestStation: { distance: 1.2, name: "Central Station", address: "1 Station Rd" },
      nearestSupermarket: { distance: 0.5, name: "Coles", address: "10 Market St" },
      nearestGym: { distance: 0.8, name: "Anytime Fitness", address: "5 Gym Lane" },
      createdAt: now,
      updatedAt: now,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for nullable fields", () => {
    const now = new Date();
    const result = PropertyDto.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      websiteUrl: null,
      address: "123 Main St",
      status: "saved",
      propertyType: null,
      price: null,
      bedrooms: null,
      bathrooms: null,
      squareMetres: null,
      ageYears: null,
      previousPrice: null,
      carParkIncluded: null,
      carParkCost: null,
      bodyCorpFees: null,
      councilRates: null,
      estimatedRent: null,
      petsAllowed: null,
      storageIncluded: null,
      aspect: null,
      agentName: null,
      agentContact: null,
      dateListed: null,
      notes: null,
      desksFit: null,
      hasLaundrySpace: null,
      floorLevel: null,
      goodLighting: null,
      hasDishwasher: null,
      stoveType: null,
      isQuiet: null,
      hasAircon: null,
      overallImpression: null,
      visibleIssues: null,
      postInspectionNotes: null,
      distanceToWork: null,
      nearestStation: null,
      nearestSupermarket: null,
      nearestGym: null,
      createdAt: now,
      updatedAt: now,
    });
    expect(result.success).toBe(true);
  });
});
