"use client";

import { useState, useMemo } from "react";
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
import { Hash, ToggleLeft, Type } from "lucide-react";

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

  // Group and sort fields by type
  const groupedFields = useMemo(() => {
    const sorted = [...fields].sort((a, b) => a.name.localeCompare(b.name));
    return {
      number: sorted.filter((f) => f.type === "number"),
      boolean: sorted.filter((f) => f.type === "boolean"),
      string: sorted.filter((f) => f.type === "string"),
    };
  }, [fields]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Manage Filters</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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

          {/* Field picker - grouped by type */}
          <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Available Fields</p>

            {/* Number fields */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Hash className="w-3 h-3" />
                <span>Numbers</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {groupedFields.number.map((field) => (
                  <button
                    key={field.name}
                    type="button"
                    className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 px-2 py-1 rounded-md hover:bg-blue-500/20 transition-colors"
                    onClick={() => setExpression((prev) => prev + field.name)}
                  >
                    {field.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Boolean fields */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ToggleLeft className="w-3 h-3" />
                <span>Yes/No</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {groupedFields.boolean.map((field) => (
                  <button
                    key={field.name}
                    type="button"
                    className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-1 rounded-md hover:bg-emerald-500/20 transition-colors"
                    onClick={() => setExpression((prev) => prev + field.name)}
                  >
                    {field.name}
                  </button>
                ))}
              </div>
            </div>

            {/* String fields */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Type className="w-3 h-3" />
                <span>Text</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {groupedFields.string.map((field) => (
                  <button
                    key={field.name}
                    type="button"
                    className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2 py-1 rounded-md hover:bg-amber-500/20 transition-colors"
                    onClick={() => setExpression((prev) => prev + field.name)}
                  >
                    {field.name}
                  </button>
                ))}
              </div>
            </div>
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
