"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Scale,
  Calendar,
  Plus,
  MapPin,
  Bed,
  Bath,
  Ruler,
  Trash2,
  ExternalLink,
  Filter,
  Home,
  LogOut,
  LayoutGrid,
  List,
  ChevronRight,
  DollarSign,
  Building2,
} from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { logout } from "@/lib/auth";

type ViewMode = "grid" | "table";

interface Property {
  id: string;
  address: string;
  status: string;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareMetres: number | null;
  bodyCorpFees: number | null;
  councilRates: number | null;
  dateListed: Date | null;
  websiteUrl: string | null;
  propertyType: string | null;
  overallImpression: number | null;
}

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
        <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
          <Plus className="w-4 h-4" />
          Add Property
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Address
            </label>
            <Input
              placeholder="123 Collins Street, Melbourne VIC"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
              Listing URL <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              placeholder="https://realestate.com.au/..."
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Adding..." : "Add Property"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PropertyCard({
  property,
  onDelete,
}: {
  property: Property;
  onDelete: () => void;
}) {
  const router = useRouter();

  function formatPrice(price: number | null) {
    if (price === null) return null;
    return `$${price.toLocaleString()}`;
  }

  return (
    <div
      className="group bg-card border border-border rounded-lg p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer animate-fade-in-up"
      onClick={() => router.push(`/properties/${property.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <StatusBadge status={property.status} />
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Delete this property?")) {
              onDelete();
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <h3 className="font-medium text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
        {property.address}
      </h3>

      {property.price && (
        <p className="text-2xl font-serif text-foreground mb-4">
          {formatPrice(property.price)}
        </p>
      )}

      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        {property.bedrooms !== null && (
          <span className="flex items-center gap-1">
            <Bed className="w-4 h-4" />
            {property.bedrooms}
          </span>
        )}
        {property.bathrooms !== null && (
          <span className="flex items-center gap-1">
            <Bath className="w-4 h-4" />
            {property.bathrooms}
          </span>
        )}
        {property.squareMetres !== null && (
          <span className="flex items-center gap-1">
            <Ruler className="w-4 h-4" />
            {property.squareMetres}m²
          </span>
        )}
      </div>

      {(property.bodyCorpFees || property.dateListed) && (
        <div className="mt-4 pt-4 border-t border-border flex justify-between text-xs text-muted-foreground">
          {property.bodyCorpFees && (
            <span>Body Corp: {formatPrice(property.bodyCorpFees)}/yr</span>
          )}
          {property.dateListed && (
            <span>Listed {new Date(property.dateListed).toLocaleDateString()}</span>
          )}
        </div>
      )}
    </div>
  );
}

function PropertyTable({
  properties,
  onDelete,
}: {
  properties: Property[];
  onDelete: (id: string) => void;
}) {
  const router = useRouter();

  function formatPrice(price: number | null) {
    if (price === null) return "-";
    return `$${price.toLocaleString()}`;
  }

  function formatCurrency(value: number | null) {
    if (value === null) return "-";
    return `$${value.toLocaleString()}`;
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Address</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Price
                </span>
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground">
                <span className="flex items-center justify-center gap-1">
                  <Bed className="w-3.5 h-3.5" />
                  Beds
                </span>
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground">
                <span className="flex items-center justify-center gap-1">
                  <Bath className="w-3.5 h-3.5" />
                  Baths
                </span>
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground">
                <span className="flex items-center justify-center gap-1">
                  <Ruler className="w-3.5 h-3.5" />
                  Size
                </span>
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  Type
                </span>
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Body Corp</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Council</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground">Rating</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {properties.map((property, index) => (
              <tr
                key={property.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors group"
                onClick={() => router.push(`/properties/${property.id}`)}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <td className="px-4 py-3">
                  <StatusBadge status={property.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-[250px]">
                    <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {property.address}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-serif text-foreground">
                    {formatPrice(property.price)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {property.bedrooms ?? "-"}
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {property.bathrooms ?? "-"}
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {property.squareMetres ? `${property.squareMetres}m²` : "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground capitalize">
                  {property.propertyType ?? "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-sm">
                  {property.bodyCorpFees ? `${formatCurrency(property.bodyCorpFees)}/yr` : "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-sm">
                  {property.councilRates ? `${formatCurrency(property.councilRates)}/yr` : "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  {property.overallImpression ? (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {property.overallImpression}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this property?")) {
                          onDelete(property.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PropertiesView({
  activeFilterId,
  filterRules,
  viewMode,
}: {
  activeFilterId: string | null;
  filterRules: { id: string; name: string; expression: unknown }[];
  viewMode: ViewMode;
}) {
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

  const filteredProperties =
    activeRule && properties
      ? properties.filter((p) =>
          evaluateFilter(activeRule.expression as string, p)
        )
      : properties;

  if (isLoading || !properties) {
    return <PropertiesLoading viewMode={viewMode} />;
  }

  if (filteredProperties?.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-6">
          <Home className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-serif text-foreground mb-2">
          {activeRule ? "No matches found" : "No properties yet"}
        </h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          {activeRule
            ? "No properties match this filter. Try adjusting your criteria."
            : "Add your first property to start tracking your house hunt."}
        </p>
      </div>
    );
  }

  if (viewMode === "table") {
    return (
      <PropertyTable
        properties={filteredProperties as Property[]}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {filteredProperties?.map((property, index) => (
        <div
          key={property.id}
          style={{ animationDelay: `${index * 50}ms` }}
          className="opacity-0 animate-fade-in-up"
        >
          <PropertyCard
            property={property as Property}
            onDelete={() => deleteMutation.mutate(property.id)}
          />
        </div>
      ))}
    </div>
  );
}

function PropertiesLoading({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "table") {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-5">
          <Skeleton className="h-6 w-20 mb-4" />
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="flex gap-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ViewToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex items-center bg-muted rounded-lg p-1">
      <button
        onClick={() => setViewMode("grid")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === "grid"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        onClick={() => setViewMode("table")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === "table"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">Table</span>
      </button>
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
        <SelectTrigger className="w-[180px] h-10 bg-card">
          <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Filter" />
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
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const orpc = useORPC();
  const router = useRouter();

  const { data: filterRules = [] } = useQuery(
    orpc.filterRule.list.queryOptions({ input: undefined })
  );

  const { data: properties } = useQuery(
    orpc.property.list.queryOptions({ input: undefined })
  );

  const propertyCount = properties?.length ?? 0;

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-lg text-foreground">House Hunting</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/compare">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                  <Scale className="w-4 h-4" />
                  <span className="hidden sm:inline">Compare</span>
                </Button>
              </Link>
              <Link href="/planner">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Day Planner</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-1">
                Your Collection
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif text-foreground">
                Properties
              </h2>
              <p className="text-muted-foreground mt-1">
                {propertyCount} {propertyCount === 1 ? "property" : "properties"} tracked
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
              <FilterControls
                activeFilterId={activeFilterId}
                setActiveFilterId={setActiveFilterId}
                filterRules={filterRules}
              />
              <AddPropertyDialog />
            </div>
          </div>

          {/* Active filter indicator */}
          {activeFilterId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg w-fit animate-fade-in">
              <Filter className="w-4 h-4" />
              Filtering by: <span className="font-medium text-foreground">
                {filterRules.find((r) => r.id === activeFilterId)?.name}
              </span>
              <button
                onClick={() => setActiveFilterId(null)}
                className="ml-2 text-primary hover:underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Properties view */}
        <ErrorBoundary>
          <PropertiesView
            activeFilterId={activeFilterId}
            filterRules={filterRules}
            viewMode={viewMode}
          />
        </ErrorBoundary>
      </main>
    </div>
  );
}
