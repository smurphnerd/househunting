"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Clock, MapPin, Route } from "lucide-react";

interface InspectionSlot {
  propertyId: string;
  address: string;
  inspectionTime: Date;
  arrivalTime: Date;
  departureTime: Date;
  drivingTimeFromPrevious: number;
}

interface RouteOption {
  inspections: InspectionSlot[];
  totalDrivingTime: number;
  totalInspections: number;
  description: string;
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

function RouteOptionCard({ option, index }: { option: RouteOption; index: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="size-5" />
          Route Option {index + 1}
        </CardTitle>
        <CardDescription className="flex flex-col gap-1">
          <span className="flex items-center gap-2">
            <MapPin className="size-4" />
            {option.totalInspections} inspection{option.totalInspections !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="size-4" />
            {formatDuration(option.totalDrivingTime)} total driving
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground italic">
          {option.description}
        </p>

        {option.inspections.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No inspections scheduled for this route.
          </p>
        ) : (
          <div className="space-y-3">
            {option.inspections.map((inspection, inspectionIndex) => (
              <div
                key={`${inspection.propertyId}-${inspectionIndex}`}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="font-medium">{inspection.address}</div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Arrive:</span>
                    <span>{formatTime(inspection.arrivalTime)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Inspection:</span>
                    <span>{formatTime(inspection.inspectionTime)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Depart:</span>
                    <span>{formatTime(inspection.departureTime)}</span>
                  </div>
                  {inspection.drivingTimeFromPrevious > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Drive from prev:</span>
                      <span>{formatDuration(inspection.drivingTimeFromPrevious)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PlannerPage() {
  const router = useRouter();
  const orpc = useORPC();

  // Default to today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [bufferMinutes, setBufferMinutes] = useState(15);

  const planMutation = useMutation({
    mutationFn: (input: { date: Date; bufferMinutes: number }) =>
      orpc.inspectionPlanner.planDay.call(input),
  });

  function handlePlanRoute(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;

    planMutation.mutate({
      date: new Date(date),
      bufferMinutes,
    });
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/properties")}
          aria-label="Back to properties"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">Inspection Day Planner</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Plan Your Route
          </CardTitle>
          <CardDescription>
            Select a date and buffer time to generate optimized inspection routes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePlanRoute} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Inspection Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buffer">Buffer Time (minutes)</Label>
                <Input
                  id="buffer"
                  type="number"
                  min={0}
                  max={60}
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(Number(e.target.value))}
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground">
                  Extra time between inspections for parking, walking, etc.
                </p>
              </div>
            </div>
            <Button
              type="submit"
              disabled={planMutation.isPending || !date}
              className="w-full md:w-auto"
            >
              {planMutation.isPending ? "Planning..." : "Plan Route"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {planMutation.isPending && <LoadingSkeleton />}

      {planMutation.isError && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {planMutation.error?.message || "Failed to plan route. Please try again."}
            </p>
          </CardContent>
        </Card>
      )}

      {planMutation.isSuccess && planMutation.data && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Route Options</h2>
          {planMutation.data.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No inspections found for the selected date.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Make sure you have properties with inspection times scheduled for this date.
                </p>
              </CardContent>
            </Card>
          ) : (
            planMutation.data.map((option, index) => (
              <RouteOptionCard key={index} option={option} index={index} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
