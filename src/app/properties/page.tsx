"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "@/components/error-boundary";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterRulesManager } from "@/components/FilterRulesManager";
import { evaluateFilter } from "@/lib/filterExpression";

function AddPropertyDialog() {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const router = useRouter();
  const orpc = useORPC();

  const createMutation = useMutation({
    mutationFn: (input: { address: string; websiteUrl?: string }) =>
      orpc.property.create.call(input),
    onSuccess: (newProperty) => {
      setOpen(false);
      setAddress("");
      setWebsiteUrl("");
      router.push(`/properties/${newProperty.id}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      address,
      websiteUrl: websiteUrl || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Property</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Address *"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              placeholder="Website URL (optional)"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Adding..." : "Add Property"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PropertiesTable({
  activeFilterId,
  filterRules,
}: {
  activeFilterId: string | null;
  filterRules: { id: string; name: string; expression: unknown }[];
}) {
  const router = useRouter();
  const orpc = useORPC();

  const { data: properties, isLoading, refetch } = useQuery(
    orpc.property.list.queryOptions({ input: undefined })
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orpc.property.delete.call({ id }),
    onSuccess: () => {
      refetch();
    },
  });

  const activeRule = filterRules.find((r) => r.id === activeFilterId);

  // Filter properties based on active rule
  const filteredProperties = activeRule && properties
    ? properties.filter((p) => evaluateFilter(activeRule.expression as string, p))
    : properties;

  if (isLoading || !properties) {
    return <PropertiesLoading />;
  }

  function formatPrice(price: number | null) {
    if (price === null) return "-";
    return `$${price.toLocaleString()}`;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Status</TableHead>
          <TableHead>Address</TableHead>
          <TableHead className="w-28">Price</TableHead>
          <TableHead className="w-24">Beds/Baths</TableHead>
          <TableHead className="w-20">sqm</TableHead>
          <TableHead className="w-28">Body Corp</TableHead>
          <TableHead className="w-28">Listed</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredProperties?.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              {activeRule ? "No properties match this filter." : "No properties yet. Add your first property to get started."}
            </TableCell>
          </TableRow>
        ) : (
          filteredProperties?.map((property) => (
            <TableRow
              key={property.id}
              className="cursor-pointer"
              onClick={() => router.push(`/properties/${property.id}`)}
            >
              <TableCell>
                <StatusBadge status={property.status} />
              </TableCell>
              <TableCell className="font-medium truncate max-w-xs">
                {property.address}
              </TableCell>
              <TableCell>{formatPrice(property.price)}</TableCell>
              <TableCell>
                {property.bedrooms ?? "-"}/{property.bathrooms ?? "-"}
              </TableCell>
              <TableCell>{property.squareMetres ?? "-"}</TableCell>
              <TableCell>{formatPrice(property.bodyCorpFees)}</TableCell>
              <TableCell>
                {property.dateListed
                  ? new Date(property.dateListed).toLocaleDateString()
                  : "-"}
              </TableCell>
              <TableCell>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this property?")) {
                      deleteMutation.mutate(property.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function PropertiesLoading() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function FilterControls({
  activeFilterId,
  setActiveFilterId,
  filterRules,
}: {
  activeFilterId: string | null;
  setActiveFilterId: (id: string | null) => void;
  filterRules: { id: string; name: string }[];
}) {
  return (
    <div className="flex gap-2 items-center">
      <Select
        value={activeFilterId ?? "all"}
        onValueChange={(v) => setActiveFilterId(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filter properties" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Properties</SelectItem>
          {filterRules.map((rule) => (
            <SelectItem key={rule.id} value={rule.id}>
              {rule.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FilterRulesManager />
    </div>
  );
}

export default function PropertiesPage() {
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const orpc = useORPC();

  const { data: filterRules = [] } = useQuery(
    orpc.filterRule.list.queryOptions({ input: undefined })
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Properties</h1>
        <div className="flex gap-4 items-center">
          <FilterControls
            activeFilterId={activeFilterId}
            setActiveFilterId={setActiveFilterId}
            filterRules={filterRules}
          />
          <AddPropertyDialog />
        </div>
      </div>
      <ErrorBoundary>
        <PropertiesTable
          activeFilterId={activeFilterId}
          filterRules={filterRules}
        />
      </ErrorBoundary>
    </div>
  );
}
