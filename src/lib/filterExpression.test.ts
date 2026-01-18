import { describe, it, expect } from "vitest";
import { validateFilterExpression, evaluateFilter } from "./filterExpression";
import type { PropertyDto } from "@/definitions/property";

describe("filterExpression", () => {
  describe("validateFilterExpression", () => {
    it("validates simple comparison", () => {
      const result = validateFilterExpression("price < 350000");
      expect(result.valid).toBe(true);
    });

    it("validates boolean field comparison", () => {
      const result = validateFilterExpression("carParkIncluded == true");
      expect(result.valid).toBe(true);
    });

    it("validates compound expression with &&", () => {
      const result = validateFilterExpression("price < 350000 && bedrooms >= 2");
      expect(result.valid).toBe(true);
    });

    it("rejects type mismatch - number field with boolean", () => {
      const result = validateFilterExpression("price == true");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("type");
    });

    it("rejects unknown field", () => {
      const result = validateFilterExpression("unknownField == 5");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("nknown");
    });
  });

  describe("evaluateFilter", () => {
    const mockProperty = {
      id: "test-id",
      address: "123 Test St",
      status: "saved",
      price: 300000,
      bedrooms: 2,
      bathrooms: 1,
      squareMetres: 60,
      carParkIncluded: true,
      bodyCorpFees: 4000,
    } as PropertyDto;

    it("evaluates price < 350000 to true", () => {
      expect(evaluateFilter("price < 350000", mockProperty)).toBe(true);
    });

    it("evaluates price > 350000 to false", () => {
      expect(evaluateFilter("price > 350000", mockProperty)).toBe(false);
    });

    it("evaluates compound && expression", () => {
      expect(evaluateFilter("price < 350000 && bedrooms >= 2", mockProperty)).toBe(true);
    });

    it("handles null values gracefully", () => {
      const propertyWithNull = { ...mockProperty, price: null };
      expect(evaluateFilter("price < 350000", propertyWithNull)).toBe(false);
    });
  });
});
