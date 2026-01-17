// src/components/InspectionTimes.tsx
"use client";

import { useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function InspectionTimes({ propertyId }: { propertyId: string }) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [newDateTime, setNewDateTime] = useState("");

  const { data: inspectionTimes } = useSuspenseQuery(
    orpc.inspectionTime.listByProperty.queryOptions({ input: { propertyId } })
  );

  const createMutation = useMutation({
    mutationFn: (dateTime: Date) =>
      orpc.inspectionTime.create.call({ input: { propertyId, dateTime } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspectionTime"] });
      setNewDateTime("");
      toast.success("Inspection time added");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, attended }: { id: string; attended: boolean }) =>
      orpc.inspectionTime.update.call({ input: { id, attended } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspectionTime"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      orpc.inspectionTime.delete.call({ input: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspectionTime"] });
      toast.success("Inspection time removed");
    },
  });

  function handleAddInspection(e: React.FormEvent) {
    e.preventDefault();
    if (!newDateTime) return;
    createMutation.mutate(new Date(newDateTime));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspection Times</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAddInspection} className="flex gap-2">
          <Input
            type="datetime-local"
            value={newDateTime}
            onChange={(e) => setNewDateTime(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={createMutation.isPending}>
            Add
          </Button>
        </form>

        {inspectionTimes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No inspection times scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {inspectionTimes.map((time) => (
              <li
                key={time.id}
                className="flex items-center justify-between border rounded p-2"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={time.attended}
                    onChange={(e) =>
                      updateMutation.mutate({ id: time.id, attended: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <span className={time.attended ? "line-through text-muted-foreground" : ""}>
                    {new Date(time.dateTime).toLocaleString()}
                  </span>
                  {time.attended && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                      Attended
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(time.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
