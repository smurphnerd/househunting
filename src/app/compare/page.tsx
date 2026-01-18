"use client";

import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import type { PropertyDto } from "@/definitions/property";

type ComparisonField = {
  key: keyof PropertyDto;
  label: string;
  format?: (value: unknown) => string;
};

const COMPARISON_FIELDS: ComparisonField[] = [
  { key: "status", label: "Status" },
  { key: "propertyType", label: "Type" },
  { key: "price", label: "Price", format: (v) => v ? `$${(v as number).toLocaleString()}` : "-" },
  { key: "bedrooms", label: "Bedrooms", format: (v) => v?.toString() ?? "-" },
  { key: "bathrooms", label: "Bathrooms", format: (v) => v?.toString() ?? "-" },
  { key: "squareMetres", label: "Square Metres", format: (v) => v ? `${v} sqm` : "-" },
  { key: "ageYears", label: "Age", format: (v) => v ? `${v} years` : "-" },
  { key: "bodyCorpFees", label: "Body Corp", format: (v) => v ? `$${(v as number).toLocaleString()}/yr` : "-" },
  { key: "councilRates", label: "Council Rates", format: (v) => v ? `$${(v as number).toLocaleString()}/yr` : "-" },
  { key: "estimatedRent", label: "Est. Rent", format: (v) => v ? `$${v}/wk` : "-" },
  { key: "carParkIncluded", label: "Car Park", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
  { key: "petsAllowed", label: "Pets Allowed", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
  { key: "storageIncluded", label: "Storage", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
  { key: "aspect", label: "Aspect", format: (v) => v?.toString() ?? "-" },
  { key: "floorLevel", label: "Floor Level", format: (v) => v?.toString() ?? "-" },
  { key: "overallImpression", label: "Impression", format: (v) => v ? `${v}/5` : "-" },
  { key: "hasAircon", label: "Air Con", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
  { key: "hasDishwasher", label: "Dishwasher", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
  { key: "isQuiet", label: "Quiet", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
  { key: "goodLighting", label: "Good Lighting", format: (v) => v === true ? "Yes" : v === false ? "No" : "-" },
];

function formatValue(field: ComparisonField, value: unknown): string {
  if (field.format) return field.format(value);
  if (value === null || value === undefined) return "-";
  return String(value);
}

function ComparisonContent() {
  const orpc = useORPC();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialA = searchParams.get("a");
  const initialB = searchParams.get("b");

  const [propertyAId, setPropertyAId] = useState<string | null>(initialA);
  const [propertyBId, setPropertyBId] = useState<string | null>(initialB);

  const { data: properties = [] } = useQuery(
    orpc.property.list.queryOptions({ input: undefined })
  );

  const propertyA = properties.find((p) => p.id === propertyAId);
  const propertyB = properties.find((p) => p.id === propertyBId);

  function updateUrl(aId: string | null, bId: string | null) {
    const params = new URLSearchParams();
    if (aId) params.set("a", aId);
    if (bId) params.set("b", bId);
    router.replace(`/compare?${params.toString()}`);
  }

  function handleSelectA(id: string) {
    setPropertyAId(id === "none" ? null : id);
    updateUrl(id === "none" ? null : id, propertyBId);
  }

  function handleSelectB(id: string) {
    setPropertyBId(id === "none" ? null : id);
    updateUrl(propertyAId, id === "none" ? null : id);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Compare Properties</h1>
        <Button variant="outline" onClick={() => router.push("/properties")}>
          Back to Properties
        </Button>
      </div>

      {/* Property selectors */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Select value={propertyAId ?? "none"} onValueChange={handleSelectA}>
          <SelectTrigger>
            <SelectValue placeholder="Select Property A" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select Property A</SelectItem>
            {properties
              .filter((p) => p.id !== propertyBId)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.address}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select value={propertyBId ?? "none"} onValueChange={handleSelectB}>
          <SelectTrigger>
            <SelectValue placeholder="Select Property B" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select Property B</SelectItem>
            {properties
              .filter((p) => p.id !== propertyAId)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.address}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Comparison table */}
      {propertyA && propertyB ? (
        <Card>
          <CardHeader>
            <div className="grid grid-cols-3 gap-4">
              <div className="font-medium">Field</div>
              <div className="font-medium truncate">{propertyA.address}</div>
              <div className="font-medium truncate">{propertyB.address}</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {COMPARISON_FIELDS.map((field) => {
                const valueA = propertyA[field.key];
                const valueB = propertyB[field.key];
                const formattedA = formatValue(field, valueA);
                const formattedB = formatValue(field, valueB);
                const isDifferent = formattedA !== formattedB;

                return (
                  <div
                    key={field.key}
                    className={`grid grid-cols-3 gap-4 py-2 border-b ${isDifferent ? "bg-muted/50" : ""}`}
                  >
                    <div className="text-muted-foreground">{field.label}</div>
                    <div>{field.key === "status" ? <StatusBadge status={propertyA.status} /> : formattedA}</div>
                    <div>{field.key === "status" ? <StatusBadge status={propertyB.status} /> : formattedB}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Select two properties above to compare them side by side.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ComparisonContent />
    </Suspense>
  );
}
