"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { PropertyDto } from "@/definitions/property";

type ExtractedData = {
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareMetres?: number;
  propertyType?: string;
  carParkIncluded?: boolean;
  bodyCorpFees?: number;
  agentName?: string;
  agentContact?: string;
};

type FieldDiff = {
  key: keyof ExtractedData;
  label: string;
  current: string;
  extracted: string;
  selected: boolean;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

export function AutoFillDialog({
  property,
  onApply,
}: {
  property: PropertyDto;
  onApply: (data: Partial<ExtractedData>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [diffs, setDiffs] = useState<FieldDiff[]>([]);

  const orpc = useORPC();

  const extractMutation = useMutation({
    mutationFn: () => orpc.property.autoFill.call({ input: { id: property.id } }),
    onSuccess: (data) => {
      setExtractedData(data);

      const fields: { key: keyof ExtractedData; label: string }[] = [
        { key: "price", label: "Price" },
        { key: "bedrooms", label: "Bedrooms" },
        { key: "bathrooms", label: "Bathrooms" },
        { key: "squareMetres", label: "Square Metres" },
        { key: "propertyType", label: "Property Type" },
        { key: "carParkIncluded", label: "Car Park" },
        { key: "bodyCorpFees", label: "Body Corp Fees" },
        { key: "agentName", label: "Agent Name" },
        { key: "agentContact", label: "Agent Contact" },
      ];

      const newDiffs: FieldDiff[] = [];
      for (const field of fields) {
        const extracted = data[field.key];
        if (extracted !== undefined) {
          const current = property[field.key as keyof PropertyDto];
          newDiffs.push({
            key: field.key,
            label: field.label,
            current: formatValue(current),
            extracted: formatValue(extracted),
            selected: current === null || current === undefined,
          });
        }
      }
      setDiffs(newDiffs);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleOpen() {
    setOpen(true);
    setExtractedData(null);
    setDiffs([]);
    extractMutation.mutate();
  }

  function toggleField(key: keyof ExtractedData) {
    setDiffs((prev) =>
      prev.map((d) => (d.key === key ? { ...d, selected: !d.selected } : d))
    );
  }

  function handleApply() {
    if (!extractedData) return;

    const selectedData: Partial<ExtractedData> = {};
    for (const diff of diffs) {
      if (diff.selected) {
        selectedData[diff.key] = extractedData[diff.key];
      }
    }

    onApply(selectedData);
    setOpen(false);
    toast.success("Data applied to form");
  }

  const hasUrl = !!property.websiteUrl;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        disabled={!hasUrl}
        title={hasUrl ? "Auto-fill from listing URL" : "Add a website URL first"}
      >
        Auto-fill from URL
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Auto-fill from Listing</DialogTitle>
          </DialogHeader>

          {extractMutation.isPending ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Extracting property data...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take a few seconds.</p>
            </div>
          ) : extractMutation.isError ? (
            <div className="py-8 text-center">
              <p className="text-destructive">Failed to extract data</p>
              <p className="text-sm text-muted-foreground mt-2">
                The listing site may be blocking automated access.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => extractMutation.mutate()}
              >
                Retry
              </Button>
            </div>
          ) : diffs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No data could be extracted from the listing.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select which fields to update:
                </p>
                {diffs.map((diff) => (
                  <div
                    key={diff.key}
                    className="flex items-center gap-3 p-2 border rounded"
                  >
                    <input
                      type="checkbox"
                      checked={diff.selected}
                      onChange={() => toggleField(diff.key)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                      <span className="font-medium">{diff.label}</span>
                      <span className="text-muted-foreground">{diff.current}</span>
                      <span className="text-primary">{diff.extracted}</span>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={!diffs.some((d) => d.selected)}
                >
                  Apply Selected
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
