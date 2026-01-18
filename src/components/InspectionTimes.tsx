// src/components/InspectionTimes.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Clock,
  Plus,
  Trash2,
  Calendar,
  Check,
  CheckCircle2,
} from "lucide-react";

export function InspectionTimes({ propertyId }: { propertyId: string }) {
  const orpc = useORPC();
  const [newDateTime, setNewDateTime] = useState("");

  const { data: inspectionTimes, isLoading, refetch } = useQuery(
    orpc.inspectionTime.listByProperty.queryOptions({ input: { propertyId } })
  );

  const createMutation = useMutation({
    mutationFn: (dateTime: Date) =>
      orpc.inspectionTime.create.call({ propertyId, dateTime }),
    onSuccess: () => {
      refetch();
      setNewDateTime("");
      toast.success("Inspection time added");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, attended }: { id: string; attended: boolean }) =>
      orpc.inspectionTime.update.call({ id, attended }),
    onSuccess: () => {
      refetch();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      orpc.inspectionTime.delete.call({ id }),
    onSuccess: () => {
      refetch();
      toast.success("Inspection time removed");
    },
  });

  function handleAddInspection(e: React.FormEvent) {
    e.preventDefault();
    if (!newDateTime) return;
    createMutation.mutate(new Date(newDateTime));
  }

  function formatDateTime(date: Date) {
    const d = new Date(date);
    return {
      date: d.toLocaleDateString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      time: d.toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in-up">
      <div className="px-6 py-4 bg-muted/30 border-b border-border">
        <h3 className="font-serif text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Inspection Times
        </h3>
      </div>
      <div className="p-6 space-y-6">
        {/* Add new inspection form */}
        <form onSubmit={handleAddInspection} className="flex gap-3">
          <div className="flex-1 relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="datetime-local"
              value={newDateTime}
              onChange={(e) => setNewDateTime(e.target.value)}
              className="h-11 pl-10"
            />
          </div>
          <Button
            type="submit"
            disabled={createMutation.isPending || !newDateTime}
            className="gap-2 h-11"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </form>

        {/* Inspection times list */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : !inspectionTimes || inspectionTimes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-sm">No inspection times scheduled.</p>
            <p className="text-xs mt-1">Add a time above to get started.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {inspectionTimes.map((time, index) => {
              const { date, time: timeStr } = formatDateTime(time.dateTime);
              const isPast = new Date(time.dateTime) < new Date();

              return (
                <li
                  key={time.id}
                  className={`
                    flex items-center justify-between border rounded-lg p-4 transition-all
                    ${time.attended
                      ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900"
                      : isPast
                        ? "bg-muted/50 border-border"
                        : "bg-card border-border hover:border-primary/20 hover:shadow-sm"
                    }
                    animate-fade-in
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() =>
                        updateMutation.mutate({ id: time.id, attended: !time.attended })
                      }
                      className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                        ${time.attended
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-border hover:border-primary"
                        }
                      `}
                    >
                      {time.attended && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {/* Date and time */}
                    <div>
                      <p className={`font-medium ${time.attended ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {date}
                      </p>
                      <p className={`text-sm ${time.attended ? "text-muted-foreground" : "text-muted-foreground"}`}>
                        {timeStr}
                      </p>
                    </div>

                    {/* Status badge */}
                    {time.attended && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Attended
                      </span>
                    )}
                    {!time.attended && isPast && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        Missed
                      </span>
                    )}
                  </div>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(time.id)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
