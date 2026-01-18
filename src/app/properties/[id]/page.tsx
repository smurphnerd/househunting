// src/app/properties/[id]/page.tsx
"use client";

import { use, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ErrorBoundary } from "@/components/error-boundary";
import { InspectionTimes } from "@/components/InspectionTimes";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

function PropertyForm({ id }: { id: string }) {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ["property"] });
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
    mutationFn: () => orpc.property.calculateDistances.call({ input: { id } }),
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
    return <div>Property not found</div>;
  }

  function onSubmit(data: UpdatePropertyFormValues) {
    // Parse through UpdatePropertyInput to apply transforms (empty string to null)
    const parsed = UpdatePropertyInput.parse(data);
    updateMutation.mutate(parsed);
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{property.address}</h1>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <select
                  {...field}
                  value={field.value ?? "saved"}
                  className="mt-2 border rounded px-2 py-1"
                >
                  {PropertyStatus.options.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
          <div className="space-x-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/compare?a=${id}`)}
            >
              Compare with...
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (confirm("Delete this property?")) {
                  deleteMutation.mutate();
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Pre-inspection fields */}
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="websiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} type="url" />
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
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
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
                  <FormLabel>Property Type</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="">Select...</option>
                      {PropertyType.options.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
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
                  <FormLabel>Bedrooms</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
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
                  <FormLabel>Bathrooms</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
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
                  <FormLabel>Square Metres</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
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
                  <FormLabel>Age (years)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="previousPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previous Price ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
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
                  <FormLabel>Body Corp Fees ($/year)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
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
                  <FormLabel>Council Rates ($/year)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
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
                  <FormLabel>Estimated Rent ($/week)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
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
                  <FormLabel>Car Park Included</FormLabel>
                  <FormControl>
                    <select
                      value={field.value === null ? "" : field.value ? "yes" : "no"}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : e.target.value === "yes"
                        )
                      }
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="">Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="carParkCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Car Park Cost ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="petsAllowed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pets Allowed</FormLabel>
                  <FormControl>
                    <select
                      value={field.value === null ? "" : field.value ? "yes" : "no"}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : e.target.value === "yes"
                        )
                      }
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="">Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="storageIncluded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Included</FormLabel>
                  <FormControl>
                    <select
                      value={field.value === null ? "" : field.value ? "yes" : "no"}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : e.target.value === "yes"
                        )
                      }
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="">Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
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
                  <FormLabel>Aspect</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="w-full border rounded px-2 py-2"
                    >
                      <option value="">Unknown</option>
                      {Aspect.options.map((aspect) => (
                        <option key={aspect} value={aspect}>
                          {aspect.charAt(0).toUpperCase() + aspect.slice(1)}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="agentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
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
                  <FormLabel>Agent Contact</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
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
                  <FormLabel>Date Listed</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? new Date(e.target.value) : null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Post-inspection fields */}
        <Collapsible>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50">
                <CardTitle>Post-Inspection Details (click to expand)</CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="overallImpression"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overall Impression (1-5)</FormLabel>
                      <FormControl>
                        <select
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : null)
                          }
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Not rated</option>
                          <option value="1">1 - Poor</option>
                          <option value="2">2 - Below Average</option>
                          <option value="3">3 - Average</option>
                          <option value="4">4 - Good</option>
                          <option value="5">5 - Excellent</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="floorLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Floor Level</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : null)
                          }
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
                      <FormLabel>Desks That Fit</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : null)
                          }
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
                      <FormLabel>Has Laundry Space</FormLabel>
                      <FormControl>
                        <select
                          value={field.value === null ? "" : field.value ? "yes" : "no"}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.value === "yes"
                            )
                          }
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="goodLighting"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Good Lighting</FormLabel>
                      <FormControl>
                        <select
                          value={field.value === null ? "" : field.value ? "yes" : "no"}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.value === "yes"
                            )
                          }
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hasDishwasher"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Has Dishwasher</FormLabel>
                      <FormControl>
                        <select
                          value={field.value === null ? "" : field.value ? "yes" : "no"}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.value === "yes"
                            )
                          }
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stoveType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stove Type</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Unknown</option>
                          {StoveType.options.map((type) => (
                            <option key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isQuiet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Is Quiet</FormLabel>
                      <FormControl>
                        <select
                          value={field.value === null ? "" : field.value ? "yes" : "no"}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.value === "yes"
                            )
                          }
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hasAircon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Has Air Conditioning</FormLabel>
                      <FormControl>
                        <select
                          value={field.value === null ? "" : field.value ? "yes" : "no"}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.value === "yes"
                            )
                          }
                          className="w-full border rounded px-2 py-2"
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="visibleIssues"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Visible Issues</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postInspectionNotes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Post-Inspection Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Distance Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Distances</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => calculateDistancesMutation.mutate()}
              disabled={calculateDistancesMutation.isPending}
            >
              {calculateDistancesMutation.isPending ? "Calculating..." : "Calculate Distances"}
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Distance to Work</p>
              <p className="font-medium">
                {property.distanceToWork ? `${property.distanceToWork.toFixed(1)} km` : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nearest Station</p>
              {property.nearestStation ? (
                <div>
                  <p className="font-medium">{property.nearestStation.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {property.nearestStation.distance.toFixed(1)} km
                  </p>
                </div>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nearest Supermarket</p>
              {property.nearestSupermarket ? (
                <div>
                  <p className="font-medium">{property.nearestSupermarket.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {property.nearestSupermarket.distance.toFixed(1)} km
                  </p>
                </div>
              ) : (
                <p>-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nearest Gym</p>
              {property.nearestGym ? (
                <div>
                  <p className="font-medium">{property.nearestGym.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {property.nearestGym.distance.toFixed(1)} km
                  </p>
                </div>
              ) : (
                <p>-</p>
              )}
            </div>
          </CardContent>
        </Card>

      </form>
    </Form>

    <InspectionTimes propertyId={id} />
  </>
  );
}

function PropertyLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="outline"
        className="mb-4"
        onClick={() => window.history.back()}
      >
        Back
      </Button>
      <ErrorBoundary>
        <PropertyForm id={id} />
      </ErrorBoundary>
    </div>
  );
}
