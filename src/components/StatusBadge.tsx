import { Badge } from "@/components/ui/badge";
import type { PropertyStatus } from "@/definitions/property";

const statusConfig: Record<
  PropertyStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  saved: { label: "Saved", variant: "secondary" },
  rejected: { label: "Rejected", variant: "destructive" },
  shortlisted: { label: "Shortlisted", variant: "default" },
  inspected: { label: "Inspected", variant: "outline" },
  offered: { label: "Offered", variant: "default" },
  purchased: { label: "Purchased", variant: "default" },
};

export function StatusBadge({ status }: { status: PropertyStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
