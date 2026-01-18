import type { PropertyStatus } from "@/definitions/property";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  PropertyStatus,
  { label: string; className: string }
> = {
  saved: {
    label: "Saved",
    className: "bg-muted text-muted-foreground border-border",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  shortlisted: {
    label: "Shortlisted",
    className: "bg-[#C35A38]/10 text-[#C35A38] border-[#C35A38]/20",
  },
  inspected: {
    label: "Inspected",
    className: "bg-[#7D9082]/10 text-[#5A6B5E] border-[#7D9082]/20",
  },
  offered: {
    label: "Offered",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  purchased: {
    label: "Purchased",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

export function StatusBadge({ status }: { status: PropertyStatus | string }) {
  const config = statusConfig[status as PropertyStatus] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
