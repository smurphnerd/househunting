"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Route,
  Car,
  Home,
  ChevronRight,
} from "lucide-react";

interface InspectionSlot {
  propertyId: string;
  address: string;
  inspectionWindowStart: Date;
  inspectionWindowEnd: Date | null;
  arrivalTime: Date;
  inspectionStartTime: Date;
  inspectionEndTime: Date;
  departureTime: Date;
  drivingTimeFromPrevious: number;
}

interface RouteOption {
  name: string;
  description: string;
  slots: InspectionSlot[];
  totalDrivingTime: number;
  totalInspections: number;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function RouteOptionCard({
  option,
  index,
}: {
  option: RouteOption;
  index: number;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in-up">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Route className="w-6 h-6 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-serif text-lg text-foreground">
              Route Option {index + 1}
            </h3>
            <p className="text-sm text-muted-foreground">{option.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {option.totalInspections} inspection
                {option.totalInspections !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Car className="w-4 h-4" />
                {formatDuration(option.totalDrivingTime)} driving
              </span>
            </div>
          </div>
          <ChevronRight
            className={`w-5 h-5 text-muted-foreground transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border">
          {option.slots.length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground">
              No inspections scheduled for this route.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {option.slots.map((slot, slotIndex) => (
                <div
                  key={`${slot.propertyId}-${slotIndex}`}
                  className="px-6 py-4 flex items-start gap-4"
                >
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    {slotIndex < option.slots.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {slot.address}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Arrive {formatTime(slot.arrivalTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Home className="w-3.5 h-3.5" />
                        Inspect {formatTime(slot.inspectionStartTime)} - {formatTime(slot.inspectionEndTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ChevronRight className="w-3.5 h-3.5" />
                        Depart {formatTime(slot.departureTime)}
                      </span>
                    </div>
                    {slot.drivingTimeFromPrevious > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded w-fit">
                        {formatDuration(slot.drivingTimeFromPrevious)} drive
                        from previous
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-xl p-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div>
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function PlannerPage() {
  const orpc = useORPC();

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [preBufferMinutes, setPreBufferMinutes] = useState(5);
  const [postBufferMinutes, setPostBufferMinutes] = useState(5);
  const [inspectionDurationMinutes, setInspectionDurationMinutes] = useState(10);

  const planMutation = useMutation({
    mutationFn: (input: {
      date: string;
      preBufferMinutes: number;
      postBufferMinutes: number;
      inspectionDurationMinutes: number;
    }) => orpc.inspectionPlanner.planDay.call(input),
  });

  function handlePlanRoute(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;

    planMutation.mutate({
      date,
      preBufferMinutes,
      postBufferMinutes,
      inspectionDurationMinutes,
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/properties">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <h1 className="font-serif text-lg text-foreground">
                  Day Planner
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8 max-w-3xl">
        {/* Page intro */}
        <div className="mb-8">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">
            Optimize Your Day
          </p>
          <h2 className="text-3xl font-serif text-foreground mb-2">
            Inspection Route Planner
          </h2>
          <p className="text-muted-foreground">
            Plan the optimal route for your property inspections based on timing
            and travel time.
          </p>
        </div>

        {/* Planning form */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <form onSubmit={handlePlanRoute} className="space-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="date"
                  className="flex items-center gap-2 text-foreground"
                >
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Inspection Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="h-12 text-base max-w-xs"
                />
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2 text-foreground">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Timing Settings
                </Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="preBuffer" className="block text-sm text-muted-foreground">
                      Pre-buffer
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        id="preBuffer"
                        min={0}
                        max={30}
                        value={preBufferMinutes}
                        onChange={(e) => setPreBufferMinutes(Number(e.target.value))}
                        className="h-12 text-base pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        min
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Parking + walk</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="inspectionDuration" className="block text-sm text-muted-foreground">
                      Inspection
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        id="inspectionDuration"
                        min={5}
                        max={60}
                        value={inspectionDurationMinutes}
                        onChange={(e) => setInspectionDurationMinutes(Number(e.target.value))}
                        className="h-12 text-base pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        min
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Time at property</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="postBuffer" className="block text-sm text-muted-foreground">
                      Post-buffer
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        id="postBuffer"
                        min={0}
                        max={30}
                        value={postBufferMinutes}
                        onChange={(e) => setPostBufferMinutes(Number(e.target.value))}
                        className="h-12 text-base pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        min
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Walk back to car</p>
                  </div>
                </div>
              </div>
            </div>
            <Button
              type="submit"
              disabled={planMutation.isPending || !date}
              className="w-full sm:w-auto h-12 px-8 text-base"
            >
              {planMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Planning...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Route className="w-4 h-4" />
                  Generate Route Options
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Results */}
        {planMutation.isPending && <LoadingSkeleton />}

        {planMutation.isError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-6 animate-scale-in">
            <h3 className="font-medium mb-1">Unable to plan route</h3>
            <p className="text-sm opacity-80">
              {planMutation.error?.message ||
                "Something went wrong. Please try again."}
            </p>
          </div>
        )}

        {planMutation.isSuccess && planMutation.data && (
          <div className="space-y-4">
            {planMutation.data.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-6">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-serif text-foreground mb-2">
                  No Inspections Found
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  No shortlisted properties have inspection times scheduled for
                  this date.
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Add inspection times to your shortlisted properties to plan a
                  route.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-xl text-foreground">
                    Route Options
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {planMutation.data.length} option
                    {planMutation.data.length !== 1 ? "s" : ""} found
                  </span>
                </div>
                {planMutation.data.map((option, index) => (
                  <RouteOptionCard key={index} option={option} index={index} />
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
