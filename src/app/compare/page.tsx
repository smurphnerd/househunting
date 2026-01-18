"use client";

import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import type { PropertyDto } from "@/definitions/property";
import {
  ArrowLeft,
  Scale,
  Home,
  Check,
  X,
  Minus,
  Building2,
  DollarSign,
  Car,
  Leaf,
  Star,
  Thermometer,
  Volume2,
  Sun,
} from "lucide-react";

type ComparisonField = {
  key: keyof PropertyDto;
  label: string;
  icon?: React.ReactNode;
  format?: (value: unknown) => string;
  category: "basic" | "costs" | "features" | "inspection";
};

const COMPARISON_FIELDS: ComparisonField[] = [
  { key: "status", label: "Status", category: "basic" },
  { key: "propertyType", label: "Type", icon: <Building2 className="w-4 h-4" />, category: "basic" },
  { key: "price", label: "Price", icon: <DollarSign className="w-4 h-4" />, format: (v) => v ? `$${(v as number).toLocaleString()}` : "-", category: "basic" },
  { key: "bedrooms", label: "Bedrooms", format: (v) => v?.toString() ?? "-", category: "basic" },
  { key: "bathrooms", label: "Bathrooms", format: (v) => v?.toString() ?? "-", category: "basic" },
  { key: "squareMetres", label: "Size", format: (v) => v ? `${v} m²` : "-", category: "basic" },
  { key: "ageYears", label: "Building Age", format: (v) => v ? `${v} years` : "-", category: "basic" },
  { key: "floorLevel", label: "Floor Level", format: (v) => v?.toString() ?? "-", category: "basic" },
  { key: "aspect", label: "Aspect", format: (v) => v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : "-", category: "basic" },

  { key: "bodyCorpFees", label: "Body Corp", format: (v) => v ? `$${(v as number).toLocaleString()}/yr` : "-", category: "costs" },
  { key: "councilRates", label: "Council Rates", format: (v) => v ? `$${(v as number).toLocaleString()}/yr` : "-", category: "costs" },
  { key: "estimatedRent", label: "Est. Rent", format: (v) => v ? `$${v}/wk` : "-", category: "costs" },
  { key: "carParkIncluded", label: "Car Park Included", icon: <Car className="w-4 h-4" />, format: (v) => v === true ? "Yes" : v === false ? "No" : "-", category: "costs" },

  { key: "petsAllowed", label: "Pets Allowed", icon: <Leaf className="w-4 h-4" />, format: (v) => v === true ? "Yes" : v === false ? "No" : "-", category: "features" },
  { key: "storageIncluded", label: "Storage", format: (v) => v === true ? "Yes" : v === false ? "No" : "-", category: "features" },
  { key: "hasAircon", label: "Air Conditioning", icon: <Thermometer className="w-4 h-4" />, format: (v) => v === true ? "Yes" : v === false ? "No" : "-", category: "features" },
  { key: "hasDishwasher", label: "Dishwasher", format: (v) => v === true ? "Yes" : v === false ? "No" : "-", category: "features" },

  { key: "overallImpression", label: "Overall Rating", icon: <Star className="w-4 h-4" />, format: (v) => v ? `${v}/5` : "-", category: "inspection" },
  { key: "isQuiet", label: "Quiet", icon: <Volume2 className="w-4 h-4" />, format: (v) => v === true ? "Yes" : v === false ? "No" : "-", category: "inspection" },
  { key: "goodLighting", label: "Natural Light", icon: <Sun className="w-4 h-4" />, format: (v) => v === true ? "Yes" : v === false ? "No" : "-", category: "inspection" },
];

function formatValue(field: ComparisonField, value: unknown): string {
  if (field.format) return field.format(value);
  if (value === null || value === undefined) return "-";
  return String(value);
}

function ValueCell({ value, highlight }: { value: string; highlight?: "better" | "worse" | "same" }) {
  const isBool = value === "Yes" || value === "No";

  if (isBool) {
    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
        value === "Yes"
          ? "bg-emerald-100 text-emerald-600"
          : "bg-muted text-muted-foreground"
      }`}>
        {value === "Yes" ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
      </span>
    );
  }

  return (
    <span className={`${highlight === "better" ? "text-emerald-600 font-medium" : ""}`}>
      {value}
    </span>
  );
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

  const categories = [
    { id: "basic", label: "Property Details" },
    { id: "costs", label: "Costs & Parking" },
    { id: "features", label: "Features" },
    { id: "inspection", label: "Post-Inspection" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/properties">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-primary" />
                </div>
                <h1 className="font-serif text-lg text-foreground">Compare Properties</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* Property selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Property A
            </label>
            <Select value={propertyAId ?? "none"} onValueChange={handleSelectA}>
              <SelectTrigger className="h-14 text-base bg-card">
                <SelectValue placeholder="Select first property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select first property</SelectItem>
                {properties
                  .filter((p) => p.id !== propertyBId)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="truncate">{p.address}</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {propertyA && (
              <div className="flex items-center gap-2 animate-fade-in">
                <StatusBadge status={propertyA.status} />
                {propertyA.price && (
                  <span className="text-lg font-serif">${propertyA.price.toLocaleString()}</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Property B
            </label>
            <Select value={propertyBId ?? "none"} onValueChange={handleSelectB}>
              <SelectTrigger className="h-14 text-base bg-card">
                <SelectValue placeholder="Select second property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select second property</SelectItem>
                {properties
                  .filter((p) => p.id !== propertyAId)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="truncate">{p.address}</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {propertyB && (
              <div className="flex items-center gap-2 animate-fade-in">
                <StatusBadge status={propertyB.status} />
                {propertyB.price && (
                  <span className="text-lg font-serif">${propertyB.price.toLocaleString()}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Comparison content */}
        {propertyA && propertyB ? (
          <div className="space-y-8 animate-fade-in-up">
            {categories.map((category) => {
              const fields = COMPARISON_FIELDS.filter((f) => f.category === category.id);

              return (
                <div key={category.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-muted/30 border-b border-border">
                    <h3 className="font-serif text-lg">{category.label}</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {fields.map((field) => {
                      const valueA = propertyA[field.key];
                      const valueB = propertyB[field.key];
                      const formattedA = formatValue(field, valueA);
                      const formattedB = formatValue(field, valueB);
                      const isDifferent = formattedA !== formattedB;

                      return (
                        <div
                          key={field.key}
                          className={`grid grid-cols-3 gap-4 px-6 py-4 ${
                            isDifferent ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {field.icon}
                            <span>{field.label}</span>
                          </div>
                          <div className="text-foreground">
                            {field.key === "status" ? (
                              <StatusBadge status={propertyA.status} />
                            ) : (
                              <ValueCell value={formattedA} />
                            )}
                          </div>
                          <div className="text-foreground">
                            {field.key === "status" ? (
                              <StatusBadge status={propertyB.status} />
                            ) : (
                              <ValueCell value={formattedB} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mb-6">
              <Scale className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-serif text-foreground mb-3">
              Select Properties to Compare
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Choose two properties from the dropdowns above to see a detailed side-by-side comparison of all their attributes.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-8">
          <Skeleton className="h-16 w-full mb-8" />
          <div className="grid grid-cols-2 gap-6 mb-8">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <ComparisonContent />
    </Suspense>
  );
}
