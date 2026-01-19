// src/app/properties/[id]/page.tsx
"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ErrorBoundary } from "@/components/error-boundary";
import { InspectionTimes } from "@/components/InspectionTimes";
import { AutoFillDialog } from "@/components/AutoFillDialog";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  UpdatePropertyInput,
  UpdatePropertyFormSchema,
  type UpdatePropertyFormValues,
  PropertyStatus,
  PropertyType,
  Aspect,
  StoveType,
} from "@/definitions/property";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Trash2,
  Scale,
  MapPin,
  Building2,
  DollarSign,
  Bed,
  Bath,
  Ruler,
  Calendar,
  User,
  Phone,
  ExternalLink,
  FileText,
  ChevronDown,
  Navigation,
  Train,
  ShoppingCart,
  Dumbbell,
  Star,
  Sparkles,
  Car,
  PawPrint,
  Package,
  Compass,
  Sun,
  Wind,
  Volume2,
  Flame,
  AlertCircle,
} from "lucide-react";

function PropertyForm({ id }: { id: string }) {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [postInspectionOpen, setPostInspectionOpen] = useState(false);

  const { data: property, isLoading, refetch } = useQuery(
    orpc.property.getById.queryOptions({ input: { id } })
  );

  const form = useForm<UpdatePropertyFormValues>({
    resolver: zodResolver(UpdatePropertyFormSchema),
    defaultValues: {
      id,
      websiteUrl: "",
      address: "",
      status: "saved",
      propertyType: null,
      price: null,
      bedrooms: 1,
      bathrooms: 1,
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
      agentName: "",
      agentContact: "",
      dateListed: null,
      notes: "",
      desksFit: null,
      hasLaundrySpace: null,
      floorLevel: null,
      goodLighting: null,
      hasDishwasher: null,
      stoveType: null,
      isQuiet: null,
      hasAircon: null,
      overallImpression: null,
      visibleIssues: "",
      postInspectionNotes: "",
    },
  });

  // Unsaved changes warning
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Reset form when property data loads
  useEffect(() => {
    if (property) {
      form.reset({
        id,
        websiteUrl: property.websiteUrl ?? "",
        address: property.address ?? "",
        status: property.status ?? "saved",
        propertyType: property.propertyType ?? null,
        price: property.price ?? null,
        bedrooms: property.bedrooms ?? 1,
        bathrooms: property.bathrooms ?? 1,
        squareMetres: property.squareMetres ?? null,
        ageYears: property.ageYears ?? null,
        previousPrice: property.previousPrice ?? null,
        carParkIncluded: property.carParkIncluded ?? null,
        carParkCost: property.carParkCost ?? null,
        bodyCorpFees: property.bodyCorpFees ?? null,
        councilRates: property.councilRates ?? null,
        estimatedRent: property.estimatedRent ?? null,
        petsAllowed: property.petsAllowed ?? null,
        storageIncluded: property.storageIncluded ?? null,
        aspect: property.aspect ?? null,
        agentName: property.agentName ?? "",
        agentContact: property.agentContact ?? "",
        dateListed: property.dateListed ?? null,
        notes: property.notes ?? "",
        desksFit: property.desksFit ?? null,
        hasLaundrySpace: property.hasLaundrySpace ?? null,
        floorLevel: property.floorLevel ?? null,
        goodLighting: property.goodLighting ?? null,
        hasDishwasher: property.hasDishwasher ?? null,
        stoveType: property.stoveType ?? null,
        isQuiet: property.isQuiet ?? null,
        hasAircon: property.hasAircon ?? null,
        overallImpression: property.overallImpression ?? null,
        visibleIssues: property.visibleIssues ?? "",
        postInspectionNotes: property.postInspectionNotes ?? "",
      });
    }
  }, [property, form, id]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdatePropertyInput) =>
      orpc.property.update.call(input),
    onSuccess: () => {
      // Invalidate all property-related queries so changes reflect everywhere
      queryClient.invalidateQueries({ queryKey: ["property"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      // Reset form dirty state after successful save
      form.reset(form.getValues());
      toast.success("Property updated");
    },
    onError: () => {
      toast.error("Failed to update property");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => orpc.property.delete.call({ id }),
    onSuccess: () => {
      router.push("/properties");
    },
  });

  const calculateDistancesMutation = useMutation({
    mutationFn: () => orpc.property.calculateDistances.call({ id }),
    onSuccess: () => {
      refetch();
      toast.success("Distances calculated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Loading and not found checks must come after all hooks
  if (isLoading) {
    return <PropertyLoading />;
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-serif text-foreground mb-2">Property not found</h2>
          <p className="text-muted-foreground mb-6">This property may have been deleted.</p>
          <Link href="/properties">
            <Button>Back to Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  function onSubmit(data: UpdatePropertyFormValues) {
    // Parse through UpdatePropertyInput to apply transforms (empty string to null)
    const parsed = UpdatePropertyInput.parse(data);
    updateMutation.mutate(parsed);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
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
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="font-serif text-lg text-foreground truncate max-w-[300px]">
                    {property.address}
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <AutoFillDialog
                property={property}
                onApply={(data) => {
                  if (data.price !== undefined) form.setValue("price", data.price);
                  if (data.bedrooms !== undefined) form.setValue("bedrooms", data.bedrooms);
                  if (data.bathrooms !== undefined) form.setValue("bathrooms", data.bathrooms);
                  if (data.squareMetres !== undefined) form.setValue("squareMetres", data.squareMetres);
                  if (data.propertyType !== undefined) form.setValue("propertyType", data.propertyType as "apartment" | "unit" | "townhouse" | "house");
                  if (data.carParkIncluded !== undefined) form.setValue("carParkIncluded", data.carParkIncluded);
                  if (data.bodyCorpFees !== undefined) form.setValue("bodyCorpFees", data.bodyCorpFees);
                  if (data.agentName !== undefined) form.setValue("agentName", data.agentName);
                  if (data.agentContact !== undefined) form.setValue("agentContact", data.agentContact);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => router.push(`/compare?a=${id}`)}
              >
                <Scale className="w-4 h-4" />
                <span className="hidden sm:inline">Compare</span>
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateMutation.isPending}
                size="sm"
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm("Delete this property?")) {
                    deleteMutation.mutate();
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8 max-w-5xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Property Header Card */}
            <div className="bg-card border border-border rounded-xl p-6 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-serif text-foreground">
                    {property.address}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <Select value={field.value || "saved"} onValueChange={field.onChange}>
                          <SelectTrigger className="w-[140px] h-9">
                            <SelectValue placeholder="Select status">
                              {field.value ? field.value.charAt(0).toUpperCase() + field.value.slice(1) : "Saved"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {PropertyStatus.options.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {property.price && (
                      <span className="text-2xl font-serif text-primary">
                        ${property.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                {property.websiteUrl && (
                  <a
                    href={property.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Listing
                  </a>
                )}
              </div>

              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
                {property.bedrooms && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Bed className="w-4 h-4" />
                    <span>{property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Bath className="w-4 h-4" />
                    <span>{property.bathrooms} bath{property.bathrooms !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {property.squareMetres && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Ruler className="w-4 h-4" />
                    <span>{property.squareMetres} m²</span>
                  </div>
                )}
                {property.propertyType && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span className="capitalize">{property.propertyType}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Property Details Section */}
            <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in-up stagger-1">
              <div className="px-6 py-4 bg-muted/30 border-b border-border">
                <h3 className="font-serif text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Property Details
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <ExternalLink className="w-4 h-4" />
                          Website URL
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} type="url" className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          Address
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            className="h-11 bg-muted/50 cursor-not-allowed"
                            readOnly
                            title="Address cannot be changed after property creation"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          Property Type
                        </FormLabel>
                        <Select value={field.value ?? "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Not specified</SelectItem>
                            {PropertyType.options.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="w-4 h-4" />
                          Price
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <Bed className="w-4 h-4" />
                          Bedrooms
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <Bath className="w-4 h-4" />
                          Bathrooms
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="squareMetres"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <Ruler className="w-4 h-4" />
                          Square Metres
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ageYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          Building Age (years)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="aspect"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <Compass className="w-4 h-4" />
                          Aspect
                        </FormLabel>
                        <Select value={field.value ?? "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Unknown</SelectItem>
                            {Aspect.options.map((aspect) => (
                              <SelectItem key={aspect} value={aspect}>
                                {aspect.charAt(0).toUpperCase() + aspect.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Costs & Parking Section */}
            <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in-up stagger-2">
              <div className="px-6 py-4 bg-muted/30 border-b border-border">
                <h3 className="font-serif text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Costs & Parking
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="previousPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">Previous Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bodyCorpFees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">Body Corp ($/year)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="councilRates"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">Council Rates ($/year)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estimatedRent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">Estimated Rent ($/week)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="carParkIncluded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <Car className="w-4 h-4" />
                          Car Park Included
                        </FormLabel>
                        <Select
                          value={field.value === null ? "__none__" : field.value ? "yes" : "no"}
                          onValueChange={(v) => field.onChange(v === "__none__" ? null : v === "yes")}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Unknown</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="carParkCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">Car Park Cost ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in-up stagger-3">
              <div className="px-6 py-4 bg-muted/30 border-b border-border">
                <h3 className="font-serif text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Features
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="petsAllowed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <PawPrint className="w-4 h-4" />
                          Pets Allowed
                        </FormLabel>
                        <Select
                          value={field.value === null ? "__none__" : field.value ? "yes" : "no"}
                          onValueChange={(v) => field.onChange(v === "__none__" ? null : v === "yes")}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Unknown</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="storageIncluded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <Package className="w-4 h-4" />
                          Storage Included
                        </FormLabel>
                        <Select
                          value={field.value === null ? "__none__" : field.value ? "yes" : "no"}
                          onValueChange={(v) => field.onChange(v === "__none__" ? null : v === "yes")}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Unknown</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Agent Information Section */}
            <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in-up stagger-4">
              <div className="px-6 py-4 bg-muted/30 border-b border-border">
                <h3 className="font-serif text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Agent Information
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="agentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          Agent Name
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="agentContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          Agent Contact
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateListed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          Date Listed
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          Notes
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ""} rows={3} className="resize-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Post-Inspection Section (Collapsible) */}
            <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in-up stagger-5">
              <button
                type="button"
                onClick={() => setPostInspectionOpen(!postInspectionOpen)}
                className="w-full px-6 py-4 bg-muted/30 border-b border-border flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <h3 className="font-serif text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Post-Inspection Details
                </h3>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${postInspectionOpen ? "rotate-180" : ""}`} />
              </button>
              {postInspectionOpen && (
                <div className="p-6 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="overallImpression"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-muted-foreground">
                            <Star className="w-4 h-4" />
                            Overall Impression (1-5)
                          </FormLabel>
                          <Select
                            value={field.value?.toString() ?? "__none__"}
                            onValueChange={(v) => field.onChange(v === "__none__" ? null : Number(v))}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Not rated" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Not rated</SelectItem>
                              <SelectItem value="1">1 - Poor</SelectItem>
                              <SelectItem value="2">2 - Below Average</SelectItem>
                              <SelectItem value="3">3 - Average</SelectItem>
                              <SelectItem value="4">4 - Good</SelectItem>
                              <SelectItem value="5">5 - Excellent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="floorLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Floor Level</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="desksFit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Desks That Fit</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hasLaundrySpace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Has Laundry Space</FormLabel>
                          <Select
                            value={field.value === null ? "__none__" : field.value ? "yes" : "no"}
                            onValueChange={(v) => field.onChange(v === "__none__" ? null : v === "yes")}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Unknown</SelectItem>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="goodLighting"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-muted-foreground">
                            <Sun className="w-4 h-4" />
                            Good Lighting
                          </FormLabel>
                          <Select
                            value={field.value === null ? "__none__" : field.value ? "yes" : "no"}
                            onValueChange={(v) => field.onChange(v === "__none__" ? null : v === "yes")}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Unknown</SelectItem>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hasDishwasher"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Has Dishwasher</FormLabel>
                          <Select
                            value={field.value === null ? "__none__" : field.value ? "yes" : "no"}
                            onValueChange={(v) => field.onChange(v === "__none__" ? null : v === "yes")}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Unknown</SelectItem>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stoveType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-muted-foreground">
                            <Flame className="w-4 h-4" />
                            Stove Type
                          </FormLabel>
                          <Select value={field.value ?? "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Unknown</SelectItem>
                              {StoveType.options.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type.charAt(0).toUpperCase() + type.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isQuiet"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-muted-foreground">
                            <Volume2 className="w-4 h-4" />
                            Is Quiet
                          </FormLabel>
                          <Select
                            value={field.value === null ? "__none__" : field.value ? "yes" : "no"}
                            onValueChange={(v) => field.onChange(v === "__none__" ? null : v === "yes")}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Unknown</SelectItem>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hasAircon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-muted-foreground">
                            <Wind className="w-4 h-4" />
                            Has Air Conditioning
                          </FormLabel>
                          <Select
                            value={field.value === null ? "__none__" : field.value ? "yes" : "no"}
                            onValueChange={(v) => field.onChange(v === "__none__" ? null : v === "yes")}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">Unknown</SelectItem>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-6 space-y-6">
                    <FormField
                      control={form.control}
                      name="visibleIssues"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-muted-foreground">
                            <AlertCircle className="w-4 h-4" />
                            Visible Issues
                          </FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value ?? ""} rows={2} className="resize-none" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="postInspectionNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="w-4 h-4" />
                            Post-Inspection Notes
                          </FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value ?? ""} rows={3} className="resize-none" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Distances Section */}
            <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in-up">
              <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center justify-between">
                <h3 className="font-serif text-lg flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-primary" />
                  Distances
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => calculateDistancesMutation.mutate()}
                  disabled={calculateDistancesMutation.isPending}
                  className="gap-2"
                >
                  {calculateDistancesMutation.isPending ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Calculating...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      Calculate Distances
                    </>
                  )}
                </Button>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Distance to Work</p>
                    <p className="font-serif text-lg">
                      {property.distanceToWork ? `${property.distanceToWork.toFixed(1)} km` : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Train className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nearest Station</p>
                    {property.nearestStation ? (
                      <>
                        <p className="font-serif text-lg">{property.nearestStation.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {property.nearestStation.distance.toFixed(1)} km
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">-</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nearest Supermarket</p>
                    {property.nearestSupermarket ? (
                      <>
                        <p className="font-serif text-lg">{property.nearestSupermarket.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {property.nearestSupermarket.distance.toFixed(1)} km
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">-</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nearest Gym</p>
                    {property.nearestGym ? (
                      <>
                        <p className="font-serif text-lg">{property.nearestGym.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {property.nearestGym.distance.toFixed(1)} km
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">-</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Form>

        {/* Inspection Times */}
        <div className="mt-8">
          <InspectionTimes propertyId={id} />
        </div>
      </main>
    </div>
  );
}

function PropertyLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <Skeleton className="w-9 h-9 rounded-lg" />
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 lg:px-8 py-8 max-w-5xl space-y-8">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </main>
    </div>
  );
}

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <ErrorBoundary>
      <PropertyForm id={id} />
    </ErrorBoundary>
  );
}
