"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useORPC } from "@/lib/orpc.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { validateFilterExpression, getFilterableFields } from "@/lib/filterExpression";

export function FilterRulesManager() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [expression, setExpression] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const orpc = useORPC();

  const { data: rules = [], refetch } = useQuery(
    orpc.filterRule.list.queryOptions({})
  );

  const createMutation = useMutation({
    mutationFn: (input: { name: string; expression: string }) =>
      orpc.filterRule.create.call(input),
    onSuccess: () => {
      refetch();
      resetForm();
      toast.success("Filter rule created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; name?: string; expression?: string }) =>
      orpc.filterRule.update.call(input),
    onSuccess: () => {
      refetch();
      resetForm();
      toast.success("Filter rule updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      orpc.filterRule.delete.call({ id }),
    onSuccess: () => {
      refetch();
      toast.success("Filter rule deleted");
    },
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setExpression("");
    setValidationError(null);
  }

  function handleExpressionChange(value: string) {
    setExpression(value);
    if (value.trim()) {
      const result = validateFilterExpression(value);
      setValidationError(result.valid ? null : result.error || "Invalid expression");
    } else {
      setValidationError(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validationError) return;

    if (editingId) {
      updateMutation.mutate({ id: editingId, name, expression });
    } else {
      createMutation.mutate({ name, expression });
    }
  }

  function handleEdit(rule: { id: string; name: string; expression: string }) {
    setEditingId(rule.id);
    setName(rule.name);
    setExpression(rule.expression);
    setValidationError(null);
  }

  const fields = getFilterableFields();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Manage Filters</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter Rules</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Rule name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Textarea
              placeholder="Expression (e.g., price < 350000 && bedrooms >= 2)"
              value={expression}
              onChange={(e) => handleExpressionChange(e.target.value)}
              rows={2}
              required
            />
            {validationError && (
              <p className="text-sm text-destructive mt-1">{validationError}</p>
            )}
          </div>

          {/* Field picker */}
          <div className="flex flex-wrap gap-1">
            <span className="text-sm text-muted-foreground mr-2">Fields:</span>
            {fields.slice(0, 10).map((field) => (
              <button
                key={field.name}
                type="button"
                className="text-xs bg-secondary px-2 py-0.5 rounded hover:bg-secondary/80"
                onClick={() => setExpression((prev) => prev + field.name)}
              >
                {field.name}
              </button>
            ))}
            <span className="text-xs text-muted-foreground">...</span>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!!validationError || createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Update" : "Create"} Rule
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="mt-6 space-y-2">
          <h3 className="font-medium">Saved Rules</h3>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No filter rules saved.</p>
          ) : (
            rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-3 flex justify-between items-start">
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <code className="text-xs text-muted-foreground">{rule.expression}</code>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(rule)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Delete this rule?")) {
                          deleteMutation.mutate(rule.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
